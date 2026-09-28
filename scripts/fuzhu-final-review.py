"""Read-only review of the already attached GLB; never reapplies root offsets."""
import bpy
import gc
import importlib.util
import json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/anatomy/fuzhu'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT / 'corrected.glb'))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
body = next(obj for obj in meshes if 'second-pair' not in obj.name)
horns = [obj for obj in meshes if 'second-pair' in obj.name]
if len(horns) != 2:
    raise RuntimeError('Expected two additional antler meshes')
report = {
    'source': 'assets/anatomy/fuzhu/corrected.glb',
    'transformed_geometry': False,
    'triangles': sum(sum(len(p.vertices) - 2 for p in obj.data.polygons) for obj in meshes),
    'textures': [{'name': image.name, 'size': list(image.size)} for image in bpy.data.images if image.size[0] > 0],
    'roots': [],
}
tree = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
body_inverse = body.matrix_world.inverted()
root_centers = []
for horn in horns:
    world = [horn.matrix_world @ vertex.co for vertex in horn.data.vertices]
    bottom = min(point.z for point in world)
    points = [point for point in world if point.z < bottom + .002]
    center = sum(points, Vector()) / len(points)
    local = body_inverse @ center
    hit, normal, face, distance = tree.find_nearest(local)
    signed = (local - hit).dot(normal)
    report['roots'].append({'object': horn.name, 'center': list(center), 'signed_surface_distance': signed, 'embedded': signed < 0})
    if signed >= 0:
        raise RuntimeError('An antler root is not embedded in the measured surface')
    root_centers.append(center)
del tree, world, points
gc.collect()
(OUT / 'final-anatomy-validation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')

# Preserve an editable Blender scene that exactly matches the newest GLB.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'verified-final.blend'))
spec = importlib.util.spec_from_file_location('anatomy_renderer', ROOT / 'scripts/fuzhu-anatomy.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.render(bpy.context.scene, OUT, meshes)
scene = bpy.context.scene
camera = scene.camera
focus = sum(root_centers, Vector()) / len(root_centers) + Vector((0, 0, .08))
camera.data.ortho_scale = .42
for name, direction in [('roots-front', (1.7, -3, 2.2)), ('roots-back', (-1.7, 3, 2.2))]:
    camera.location = focus + Vector(direction)
    camera.rotation_euler = (focus - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(OUT / f'corrected-{name}.png')
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'verified-final.blend'))
print('FINAL_ANATOMY', json.dumps(report), flush=True)
