"""Blender background: transparent orthographic thumbnail; raw model stays intact."""
import bpy
import json
import math
import os
import pathlib
import sys
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[1]
BENCHMARK = os.environ.get("ASSET_BENCHMARK") == "1"
slugs = sys.argv[sys.argv.index("--")+1:]
for slug in slugs:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    records=ROOT/"assets"/("reference-benchmark/records" if BENCHMARK else "records")
    record=json.loads((records/(slug+".stdout.json")).read_text("utf-8").strip().splitlines()[-1])
    source=pathlib.Path(record["model_file"])
    if not source.is_absolute(): source=ROOT/source
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
    corners=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
    lo=Vector(tuple(min(c[i] for c in corners) for i in range(3)))
    hi=Vector(tuple(max(c[i] for c in corners) for i in range(3)))
    center=(lo+hi)/2
    span=max(hi-lo)
    scene=bpy.context.scene
    scene.render.engine="CYCLES"
    scene.cycles.samples=24
    scene.cycles.use_denoising=True
    scene.render.resolution_x=1024 if BENCHMARK else 512
    scene.render.resolution_y=1024 if BENCHMARK else 512
    scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.view_settings.view_transform="AgX"
    world=bpy.data.worlds.new("Neutral softbox")
    world.use_nodes=True
    world.node_tree.nodes["Background"].inputs[0].default_value=(0.32,0.39,0.48,1)
    world.node_tree.nodes["Background"].inputs[1].default_value=0.35
    scene.world=world
    def area(name, direction, strength, color, size):
        light=bpy.data.lights.new(name,"AREA")
        light.energy=strength*span*span
        light.color=color
        light.shape="DISK"
        light.size=size*span
        obj=bpy.data.objects.new(name,light)
        scene.collection.objects.link(obj)
        obj.location=center+Vector(direction)*span
        obj.rotation_euler=(center-obj.location).to_track_quat("-Z","Y").to_euler()
    area("Warm key",(1.6,-1.6,2.6),180,(1,0.85,0.70),2)
    area("Cool fill",(-1.8,-0.6,1.0),100,(0.53,0.72,1),2.5)
    area("Rim",(0.4,1.8,2.2),240,(0.8,0.92,1),1.8)
    camera=bpy.data.cameras.new("Portrait camera")
    obj=bpy.data.objects.new("Portrait camera",camera)
    scene.collection.objects.link(obj)
    view=os.environ.get("ASSET_VIEW","front")
    direction={"front":(1.7,-3,1.35),"side":(3,1.7,0.85),"back":(-1.7,3,0.85)}[view]
    obj.location=center+Vector(direction)*span
    obj.rotation_euler=(center-obj.location).to_track_quat("-Z","Y").to_euler()
    camera.type="ORTHO"
    camera.ortho_scale=span*1.28
    camera.clip_end=span*100
    scene.camera=obj
    output=ROOT/"public"/"previews"/(slug+".png")
    if view!="front":
        (ROOT/"assets"/"review").mkdir(parents=True,exist_ok=True)
        output=ROOT/"assets"/"review"/(slug+"-"+view+".png")
    if BENCHMARK:
        (ROOT/"assets/reference-benchmark/previews").mkdir(parents=True,exist_ok=True)
        output=ROOT/"assets/reference-benchmark/previews"/(slug+"-"+view+".png")
    scene.render.filepath=str(output)
    bpy.ops.render.render(write_still=True)
    print(json.dumps({"slug":slug,"rendered":scene.render.filepath,"bounds":list(hi-lo)}),flush=True)
