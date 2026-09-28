"""Identical-light, normalized-scale raw GLB comparison; never writes public assets."""
import bpy
import json
import pathlib
import sys
from mathutils import Vector

ROOT=pathlib.Path(__file__).resolve().parents[1]
BENCH=ROOT/"assets/reference-benchmark"
OUT=BENCH/"review-2026-09-28"
SOURCES={"A":BENCH/"tripo-out/yinglong-a-gpt-33849391/model.glb", "B":BENCH/"recovered-b/model.glb"}
args=sys.argv[sys.argv.index("--")+1:]
label=args[0]
views=args[1:] or ["front","side","back"]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCES[label]))
scene=bpy.context.scene
meshes=[o for o in scene.objects if o.type=="MESH"]
corners=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
lo=Vector(tuple(min(c[i] for c in corners) for i in range(3)))
hi=Vector(tuple(max(c[i] for c in corners) for i in range(3)))
center=(lo+hi)/2
span=max(hi-lo)
root=bpy.data.objects.new("Normalized comparison root",None)
scene.collection.objects.link(root)
for obj in list(scene.objects):
    if obj!=root and obj.parent is None:obj.parent=root
root.scale=(1/span,)*3
root.location=-center/span
scene.render.engine="CYCLES"
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_x=1200
scene.render.resolution_y=1200
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGBA"
scene.render.film_transparent=True
scene.view_settings.view_transform="AgX"
world=bpy.data.worlds.new("Equal neutral environment")
world.use_nodes=True
world.node_tree.nodes["Background"].inputs[0].default_value=(0.45,0.45,0.45,1)
world.node_tree.nodes["Background"].inputs[1].default_value=0.5
scene.world=world
def area(name,pos,power,color,size):
    light=bpy.data.lights.new(name,"AREA")
    light.energy=power
    light.color=color
    light.size=size
    obj=bpy.data.objects.new(name,light)
    scene.collection.objects.link(obj)
    obj.location=pos
    obj.rotation_euler=(-obj.location).to_track_quat("-Z","Y").to_euler()
area("Key",(1.5,-2,2.5),180,(1,.94,.86),2)
area("Fill",(-2,-.5,1),110,(.86,.93,1),2.5)
area("Rim",(.2,2,2),200,(1,1,1),1.8)
camera=bpy.data.cameras.new("Same camera")
camera.type="ORTHO"
camera.clip_end=100
obj=bpy.data.objects.new("Same camera",camera)
scene.collection.objects.link(obj)
scene.camera=obj
presets={"front":((1.7,-3,.9),(0,0,0),1.2),"side":((3,.2,.7),(0,0,0),1.2),
         "back":((-1.7,3,.9),(0,0,0),1.2),"detail":((1.7,-3,.9),(0,-.25,-.04),.52)}
for view in views:
    direction,target,size=presets[view]
    obj.location=Vector(target)+Vector(direction)
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()
    camera.ortho_scale=size
    scene.render.filepath=str(OUT/(label+"-"+view+".png"))
    bpy.ops.render.render(write_still=True)
    print(json.dumps({"label":label,"view":view,"path":scene.render.filepath}),flush=True)
(OUT/(label+"-render-settings.json")).write_text(json.dumps({"source":str(SOURCES[label].relative_to(ROOT)),"originalBounds":list(hi-lo),"scale":1/span,"samples":32,"resolution":1200,"presets":presets},indent=2),"utf-8")
