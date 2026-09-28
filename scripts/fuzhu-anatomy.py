"""Non-destructive four-antler and single-leg corrections from inspected mesh components."""
import bpy
import bmesh
import json
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]

def render(scene,out,meshes):
    corners=[obj.matrix_world@Vector(c) for obj in meshes for c in obj.bound_box]
    lo=Vector(tuple(min(c[i] for c in corners) for i in range(3)))
    hi=Vector(tuple(max(c[i] for c in corners) for i in range(3)))
    center=(lo+hi)/2;span=max(hi-lo)
    scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.device='CPU';scene.cycles.use_denoising=True
    scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100
    scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.view_settings.view_transform='AgX'
    world=bpy.data.worlds.new('Anatomy review softbox');world.use_nodes=True
    background=next((node for node in world.node_tree.nodes if node.type=='BACKGROUND'),None) or world.node_tree.nodes.new('ShaderNodeBackground')
    world_output=next((node for node in world.node_tree.nodes if node.type=='OUTPUT_WORLD'),None) or world.node_tree.nodes.new('ShaderNodeOutputWorld')
    world.node_tree.links.new(background.outputs[0],world_output.inputs[0])
    background.inputs[0].default_value=(.32,.39,.48,1)
    background.inputs[1].default_value=.35;scene.world=world
    for name,direction,strength,color,size in [('Warm key',(1.6,-1.6,2.6),180,(1,.85,.70),2),('Cool fill',(-1.8,-.6,1),100,(.53,.72,1),2.5),('Rim',(.4,1.8,2.2),240,(.8,.92,1),1.8)]:
        data=bpy.data.lights.new(name,'AREA');data.energy=strength*span*span;data.color=color;data.shape='DISK';data.size=size*span
        obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=center+Vector(direction)*span
        obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('Anatomy review');camera=bpy.data.objects.new('Anatomy review',data);scene.collection.objects.link(camera)
    scene.camera=camera;data.type='ORTHO';data.ortho_scale=span*1.20;data.clip_end=100
    for name,direction in [('front',(1.7,-3,1.35)),('back',(-1.7,3,.85)),('side',(3,1.7,.85))]:
        camera.location=center+Vector(direction)*span;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(out/f'corrected-{name}.png');bpy.ops.render.render(write_still=True)

for slug in (['fuzhu','bifang'] if __name__=='__main__' else []):
    out=ROOT/'assets/anatomy'/slug
    bpy.ops.wm.open_mainfile(filepath=str(out/'inspection.blend'))
    original=next(obj for obj in bpy.context.scene.objects if obj.type=='MESH')
    original.name=f'{slug}-original-untouched'
    corrected=original.copy();corrected.data=original.data.copy();bpy.context.scene.collection.objects.link(corrected);corrected.name=f'{slug}-corrected'
    original.hide_render=True;original.hide_set(True)
    local=np.load(out/'local-selection.npz');indices=local['indices'];labels=local['labels']
    names,counts=np.unique(labels,return_counts=True);order=np.argsort(-counts)
    output=[corrected];evidence={'source_preserved':True,'before_triangles':len(original.data.polygons)}
    if slug=='fuzhu':
        anchors=[]
        for i in range(2):
            selected=indices[labels==names[order[i]]]
            keep=set(selected.tolist())
            horn=original.copy();horn.data=original.data.copy();bpy.context.scene.collection.objects.link(horn)
            horn.name=f'fuzhu-second-pair-{i+1}';horn.hide_render=False;horn.hide_set(False)
            bm=bmesh.new();bm.from_mesh(horn.data);bm.verts.ensure_lookup_table()
            bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index not in keep],context='VERTS')
            coords=np.array([tuple(v.co) for v in bm.verts])
            anchor=Vector(coords[coords[:,2]<.250].mean(axis=0))
            # Inspected head faces +X. The smaller rear pair emerges behind the existing burrs.
            target=anchor+Vector((-.047,.004,-.011))
            for vertex in bm.verts:
                vertex.co=target+(vertex.co-anchor)*.78
            bm.normal_update();bm.to_mesh(horn.data);bm.free();horn.data.update();output.append(horn)
            anchors.append({'source_root':list(anchor),'new_root':list(target),'scale':.78,'copied_vertices':len(horn.data.vertices)})
        evidence['antlers']=anchors
    else:
        remove=set(indices[labels==names[order[1]]].tolist())
        bm=bmesh.new();bm.from_mesh(corrected.data);bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index in remove],context='VERTS')
        local_verts=[v for v in bm.verts if -.11<v.co.z<-.09 and .045<v.co.x<.145 and -.08<v.co.y<-.01]
        bmesh.ops.remove_doubles(bm,verts=local_verts,dist=.000015)
        boundary=[e for e in bm.edges if e.is_boundary and all(-.11<v.co.z<-.09 and .045<v.co.x<.145 and -.08<v.co.y<-.01 for v in e.verts)]
        cap=bmesh.ops.holes_fill(bm,edges=boundary,sides=0)['faces'] if boundary else []
        uv=bm.loops.layers.uv.active
        for face in cap:
            face.smooth=True
            if uv:
                neighbors=[loop[uv].uv.copy() for edge in face.edges for adjacent in edge.link_faces if adjacent!=face for loop in adjacent.loops]
                if neighbors:
                    center=sum(neighbors,Vector((0,0)))/len(neighbors)
                    for loop in face.loops:loop[uv].uv=center
        if cap:bmesh.ops.triangulate(bm,faces=cap)
        bm.normal_update();bm.to_mesh(corrected.data);bm.free();corrected.data.update()
        evidence.update({'removed_short_leg_vertices':len(remove),'filled_boundary_edges':len(boundary),'cap_faces':len(cap),'preserved_long_leg_min_z':min(v.co.z for v in corrected.data.vertices if .01<v.co.y<.065 and .04<v.co.x<.15)})
    bpy.context.view_layer.update()
    for obj in bpy.context.scene.objects:obj.select_set(False)
    for obj in output:obj.hide_set(False);obj.select_set(True)
    bpy.context.view_layer.objects.active=corrected
    evidence['after_triangles']=sum(len(obj.data.polygons) for obj in output)
    evidence['textures']=[{'name':image.name,'size':list(image.size)} for image in bpy.data.images if image.size[0]>0 and image.name!='Render Result']
    bpy.ops.export_scene.gltf(filepath=str(out/'corrected.glb'),export_format='GLB',use_selection=True,export_image_format='AUTO',export_materials='EXPORT',export_yup=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'corrected.blend'))
    (out/'correction.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8')
    render(bpy.context.scene,out,output)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'corrected.blend'))
    (out/'correction.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8')
    print('CORRECTION',slug,json.dumps(evidence),flush=True)
