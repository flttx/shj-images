"""Seat the duplicated antler burrs into the measured skull surface."""
import bpy
import importlib.util
import gc
import json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'assets/anatomy/fuzhu'
bpy.ops.wm.open_mainfile(filepath=str(out/'corrected.blend'))
original=bpy.data.objects['fuzhu-original-untouched']
tree=BVHTree.FromPolygons([v.co for v in original.data.vertices],[list(p.vertices) for p in original.data.polygons],all_triangles=True)
output=[obj for obj in bpy.context.scene.objects if obj.type=='MESH' and 'original-untouched' not in obj.name]
report=[]
for obj in output:
    if 'second-pair' not in obj.name:continue
    bottom=min(v.co.z for v in obj.data.vertices)
    points=[v.co for v in obj.data.vertices if v.co.z<bottom+.002]
    center=sum(points,Vector())/len(points)
    hit,normal,face,distance=tree.ray_cast(center,Vector((0,0,-1)),.08)
    if hit is None:raise RuntimeError('No measured skull contact beneath '+obj.name)
    offset=Vector((0,0,hit.z-center.z-.004))
    for vertex in obj.data.vertices:vertex.co+=offset
    obj.data.update()
    seated=center+offset
    near,normal,face,distance=tree.find_nearest(seated)
    signed=(seated-near).dot(normal)
    if signed>=0:raise RuntimeError('Antler root failed surface embedding')
    report.append({'object':obj.name,'translation':list(offset),'root':list(seated),'signed_surface_distance':signed,'embedded':True})
del tree
gc.collect()
for obj in bpy.context.scene.objects:obj.select_set(False)
for obj in output:obj.select_set(True)
bpy.context.view_layer.objects.active=output[0]
bpy.ops.export_scene.gltf(filepath=str(out/'corrected.glb'),export_format='GLB',use_selection=True,export_image_format='AUTO',export_materials='EXPORT',export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'corrected.blend'))
(out/'root-attachment.json').write_text(json.dumps(report,indent=2))
# Reuse the exact review lights and framing, so before/after proportions stay comparable.
for obj in list(bpy.context.scene.objects):
    if obj.type in {'LIGHT','CAMERA'}:bpy.data.objects.remove(obj,do_unlink=True)
spec=importlib.util.spec_from_file_location('anatomy_renderer',ROOT/'scripts/fuzhu-anatomy.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
module.render(bpy.context.scene,out,output)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'corrected.blend'))
(out/'root-attachment.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report),flush=True)
