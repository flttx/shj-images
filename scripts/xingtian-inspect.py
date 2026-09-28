"""Inspect the actual surface and orientation before local anatomy additions."""
import bpy
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/anatomy/xingtian"
OUT.mkdir(parents=True, exist_ok=True)
source = ROOT / "public/models/xingtian.glb"
if not (OUT / "source-web.glb").exists():
    (OUT / "source-web.glb").write_bytes(source.read_bytes())
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT / "source-web.glb"))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
for obj in meshes:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.select_set(False)
corners = [obj.matrix_world @ Vector(c) for obj in meshes for c in obj.bound_box]
lo = Vector(tuple(min(c[i] for c in corners) for i in range(3)))
hi = Vector(tuple(max(c[i] for c in corners) for i in range(3)))
center = (lo + hi) / 2
span = max(hi-lo)
print("BOUNDING", list(lo), list(hi), flush=True)
for obj in meshes:
    print("MESH", obj.name, len(obj.data.vertices), list(obj.dimensions), flush=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 12
scene.cycles.use_denoising = True
scene.render.resolution_x = 700
scene.render.resolution_y = 700
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.world = bpy.data.worlds.new("Review")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[1].default_value = .5
for name, direction, energy in [("Key", (-2, -3, 4), 180), ("Fill", (2, -2, 1), 100)]:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy * span * span
    data.size = span * 2
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = center + Vector(direction)*span
    obj.rotation_euler = (center-obj.location).to_track_quat("-Z", "Y").to_euler()
data = bpy.data.cameras.new("Review")
camera = bpy.data.objects.new("Review", data)
scene.collection.objects.link(camera)
scene.camera = camera
data.type = "ORTHO"
data.ortho_scale = span * 1.1
for name, direction in []:
    camera.location = center + Vector(direction)*span
    camera.rotation_euler = (center-camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(OUT / f"inspect-{name}.png")
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "inspection.blend"))
obj = meshes[0]
from mathutils.bvhtree import BVHTree
bvh = BVHTree.FromObject(obj, bpy.context.evaluated_depsgraph_get())
for z in [.12,.16,.2,.24,.28,.32,.36]:
    row = []
    for y in [-.12,-.08,0,.08,.12]:
        hit, normal, index, distance = bvh.ray_cast(obj.matrix_world.inverted() @ Vector((2,y,z)), Vector((-1,0,0)))
        row.append([y,z,list(obj.matrix_world @ hit) if hit else None])
    print("SURFACE", row, flush=True)
