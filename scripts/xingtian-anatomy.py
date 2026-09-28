"""Non-destructive local anatomy completion from the inspected web mesh.

The immutable source-web.glb and original Tripo source remain untouched. Eye
and mouth openings are shallow local booleans on a working mesh; additions
live in a separate collection. UVs at the outer eyelids/lips are projected
from the original body so the existing 4K skin texture continues across them.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/anatomy/xingtian"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT / "source-web.glb"))
body = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH")
body.name = "Xingtian_original_body_axe_shield"
bpy.context.view_layer.objects.active = body
body.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
body.select_set(False)
skin = body.data.materials[0]
# Keep a read-only reference for original surface intersections and UV transfer.
reference = body.copy()
reference.data = body.data.copy()
reference.name = "Original_surface_reference"
bpy.context.scene.collection.objects.link(reference)
reference.hide_render = True
reference.hide_set(True)
bvh = BVHTree.FromObject(reference, bpy.context.evaluated_depsgraph_get())
collection = bpy.data.collections.new("Anatomy_completion_chest_eyes_navel_mouth")
bpy.context.scene.collection.children.link(collection)

def add_to_collection(obj):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)
    return obj

def material(name, color, roughness=.5, metal=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metal
    return mat

cavity = material("Deep warm oral and orbital cavity", (.014,.005,.004), .78)
lip = material("Inner lid and aged lip tissue", (.105,.040,.025), .56)
sclera = material("Warm shaded sclera", (.19,.145,.082), .31)
iris = material("Amber chest-eye iris", (.23,.105,.022), .32)
iris_dark = material("Iris limbal ring", (.037,.018,.006), .4)
pupil = material("Black pupil", (.002,.002,.001), .18)
tooth_mat = material("Worn ivory teeth", (.38,.29,.17), .48)
tongue_mat = material("Desaturated tongue", (.085,.025,.02), .48)
body.data.materials.append(cavity)
skin_image = skin.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].links[0].from_node.image
skin_pixels = list(skin_image.pixels)
skin_width,skin_height = skin_image.size
blended_skin = material("Skin sampled from original 4K albedo",(.2,.1,.06),.56)
color_node = blended_skin.node_tree.nodes.new("ShaderNodeVertexColor")
color_node.layer_name = "SkinColor"
blended_skin.node_tree.links.new(color_node.outputs["Color"],blended_skin.node_tree.nodes["Principled BSDF"].inputs["Base Color"])

def sampled_color(uv):
    xx = min(skin_width-1,max(0,int((uv[0]%1)*skin_width)))
    yy = min(skin_height-1,max(0,int((uv[1]%1)*skin_height)))
    offset = 4*(yy*skin_width+xx)
    rgb = skin_pixels[offset:offset+3]
    # Image pixels are encoded albedo values; vertex attributes are scene-linear.
    return tuple(v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb)+(1,)

def surface(y,z):
    hit, normal, index, _ = bvh.ray_cast(Vector((1.5,y,z)), Vector((-1,0,0)))
    if hit is None:
        raise ValueError(f"No original body surface at {y}, {z}")
    face = reference.data.polygons[index]
    loops = list(face.loop_indices)[:3]
    verts = [reference.data.vertices[reference.data.loops[i].vertex_index].co for i in loops]
    uvs = [Vector((*reference.data.uv_layers.active.data[i].uv,0)) for i in loops]
    uv = barycentric_transform(hit,*verts,*uvs)
    return hit.x, (uv.x,uv.y)

def ellipsoid(name, location, scale, mat, segments=64, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = add_to_collection(bpy.context.object)
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    obj.select_set(False)
    return obj

def cut(name,y,z,width,height,depth):
    x,_ = surface(y,z)
    cutter = ellipsoid(name, (x-.007,y,z),(depth,width,height),cavity)
    cutter.data.materials.clear()
    cutter.data.materials.append(skin)
    cutter.data.materials.append(cavity)
    for face in cutter.data.polygons:
        face.material_index = 1
    bpy.context.view_layer.objects.active = body
    modifier = body.modifiers.new(name,"BOOLEAN")
    modifier.operation = "DIFFERENCE"
    modifier.solver = "EXACT"
    modifier.object = cutter
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
    return x

def rim(name, y,z,width,height, mouth=False):
    # Four concentric loops taper from raised inner wet rim into original skin.
    verts, uv_points, faces = [],[],[]
    segments = 192
    factors = [1,1.035,1.07,1.10,1.16,1.22,1.28,1.34,1.40,1.46]
    for row,factor in enumerate(factors):
        for j in range(segments):
            angle = j/segments*math.tau
            dy = width*factor*math.cos(angle)
            dz = height*factor*math.sin(angle)
            if not mouth:
                dz *= .74 + .26*abs(math.sin(angle))
                dz += .003*(dy/width)**2
            xx,uv = surface(y+dy,z+dz)
            rise = .005*math.sin(row/(len(factors)-1)*math.pi) + .0025*(1-row/(len(factors)-1)) - .0005
            verts.append((xx+rise,y+dy,z+dz))
            uv_points.append(uv)
    for row in range(len(factors)-1):
        for j in range(segments):
            a = row*segments+j
            b = row*segments+(j+1)%segments
            faces.append((a,b,b+segments,a+segments))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.materials.append(blended_skin)
    mesh.materials.append(lip)
    uv_layer = mesh.uv_layers.new(name="Projected original skin UV")
    colors = mesh.color_attributes.new(name="SkinColor",type="FLOAT_COLOR",domain="POINT")
    for index,uv in enumerate(uv_points):
        colors.data[index].color = sampled_color(uv)
    for poly in mesh.polygons:
        poly.use_smooth = True
        poly.material_index = 1 if poly.index < segments else 0
        for index in poly.loop_indices:
            uv_layer.data[index].uv = uv_points[mesh.loops[index].vertex_index]
    obj = bpy.data.objects.new(name,mesh)
    collection.objects.link(obj)
    return obj

landmarks = []
for label,y,z in [("Right",-.025,.292),("Left",.125,.292)]:
    x = cut(f"{label}_orbital_recess",y,z,.030,.013,.026)
    rim(f"{label}_sculpted_eyelids",y,z,.027,.0085)
    # Flattened eyeball sits mostly inside the pectoral mass, not on a stalk.
    ellipsoid(f"{label}_embedded_eyeball",(x-.008,y,z),(.013,.028,.010),sclera)
    ellipsoid(f"{label}_iris_limbal_ring",(x+.0045,y,z),(.0014,.0085,.0085),iris_dark)
    ellipsoid(f"{label}_amber_iris",(x+.0055,y,z),(.001,.0073,.0073),iris)
    ellipsoid(f"{label}_pupil",(x+.0063,y,z),(.0007,.0033,.0045),pupil)
    # Fine radial iris streak geometry avoids a featureless flat iris disk.
    for j in range(24):
        angle = j/24*math.tau
        radius = .0055
        streak = ellipsoid(f"{label}_iris_fiber_{j:02}",
            (x+.0066,y+radius*math.cos(angle),z+radius*math.sin(angle)),
            (.0002,.00025,.0014),iris_dark,segments=8,rings=6)
        streak.rotation_euler.x = -angle + math.pi/2
    landmarks.append({"feature":f"{label} chest eye","surface":[x,y,z]})

y,z = .052,.161
x = cut("Navel_oral_cavity",y,z,.058,.025,.041)
rim("Abdominal_lips_blended_into_skin",y,z,.055,.022,mouth=True)
ellipsoid("Deep_mouth_back",(x-.034,y,z),(.010,.050,.021),cavity)
ellipsoid("Lower_inner_tongue",(x-.017,y,z-.015),(.015,.034,.006),tongue_mat)
for upper,count in [(True,6),(False,5)]:
    for i in range(count):
        t = (i-(count-1)/2)/((count-1)/2)
        yy = y+t*.043
        sign = 1 if upper else -1
        root_z = z+sign*(.024-.005*abs(t))
        length = .014 + .006*(.5+.5*math.sin(i*2.3))
        verts,faces = [],[]
        for row,(fraction,width) in enumerate([(0,1),(.25,1.06),(.80,.87),(1,.68)]):
            for j in range(12):
                angle = j/12*math.tau
                # Superelliptic crown: broad, worn tooth rather than a pearl.
                dx = math.copysign(abs(math.cos(angle))**.55,math.cos(angle))*.0045*width
                dy = math.copysign(abs(math.sin(angle))**.55,math.sin(angle))*.0049*width
                verts.append((x-.005+dx+fraction*.002,yy+dy+t*fraction*.0015,
                              root_z-sign*length*fraction+(.0006*math.sin(j*2.7) if row==3 else 0)))
        for row in range(3):
            for j in range(12):
                a=row*12+j
                b=row*12+(j+1)%12
                faces.append((a,b,b+12,a+12))
        faces.append(tuple(range(36,48)))
        mesh = bpy.data.meshes.new("Irregular worn tooth")
        mesh.from_pydata(verts,[],faces)
        mesh.materials.append(tooth_mat)
        for face in mesh.polygons:
            face.use_smooth = True
        tooth = bpy.data.objects.new(f"{'Upper' if upper else 'Lower'}_worn_tooth_{i+1}",mesh)
        collection.objects.link(tooth)
landmarks.append({"feature":"Navel mouth","surface":[x,y,z],"teeth":11})
body.data.validate(clean_customdata=False)

# Keep original geometry hidden in the editable file; export only the corrected body.
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.world = bpy.data.worlds.new("Neutral anatomy review")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[1].default_value = .45
for name,direction,energy in [("Warm key",(2,-2,4),190),("Soft fill",(3,3,1),80),("Rim",(-2,1,3),160)]:
    light = bpy.data.lights.new(name,"AREA")
    light.energy = energy
    light.size = 2
    obj = bpy.data.objects.new(name,light)
    scene.collection.objects.link(obj)
    obj.location = direction
    obj.rotation_euler = (Vector((0,0,0))-obj.location).to_track_quat("-Z","Y").to_euler()
camera_data = bpy.data.cameras.new("Anatomy inspection")
camera = bpy.data.objects.new("Anatomy inspection",camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.type = "ORTHO"
for name,target,direction,scale in [
    ("front",(0,0,0),(3,0,.25),1.10),
    ("three-quarter",(0,0,0),(3,-1.7,.5),1.10),
    ("anatomy-close",(0,.05,.255),(3,0,.1),.42)]:
    target = Vector(target)
    camera.location = target+Vector(direction)
    camera.rotation_euler = (target-camera.location).to_track_quat("-Z","Y").to_euler()
    camera_data.ortho_scale = scale
    scene.render.filepath = str(OUT/f"completed-{name}.png")
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"xingtian-anatomy.blend"))
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
for obj in collection.objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/"xingtian-completed.glb"),export_format="GLB",
    use_selection=True,export_yup=True,export_animations=False,export_image_format="AUTO")
(OUT/"landmarks.json").write_text(json.dumps(landmarks,indent=2),encoding="utf-8")
print("COMPLETED_ANATOMY",json.dumps(landmarks),flush=True)
