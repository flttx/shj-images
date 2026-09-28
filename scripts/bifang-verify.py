"""Validate corrected topology and antler root contact before final publication."""
import bpy
import json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[1]
for slug in ['fuzhu','bifang']:
    out=ROOT/'assets/anatomy'/slug
    bpy.ops.wm.open_mainfile(filepath=str(out/'corrected.blend'))
    output=[obj for obj in bpy.context.scene.objects if obj.type=='MESH' and 'original-untouched' not in obj.name]
    results=[]
    for obj in output:
        changed=obj.data.validate(verbose=True,clean_customdata=True)
        obj.data.update(calc_edges=True)
        results.append({'object':obj.name,'validation_cleaned_data':changed,'triangles':sum(len(p.vertices)-2 for p in obj.data.polygons)})
    if slug=='fuzhu':
        original=bpy.data.objects['fuzhu-original-untouched']
        tree=BVHTree.FromPolygons([v.co for v in original.data.vertices],[list(p.vertices) for p in original.data.polygons],all_triangles=True)
        for obj in output:
            if 'second-pair' not in obj.name:continue
            bottom=min(v.co.z for v in obj.data.vertices)
            points=[v.co for v in obj.data.vertices if v.co.z<bottom+.002]
            center=sum(points,Vector())/len(points)
            hit,normal,face,distance=tree.find_nearest(center)
            results.append({'object':obj.name,'root_center':list(center),'nearest_surface_distance':distance,'root_signed_distance':(center-hit).dot(normal),'embedded_root':(center-hit).dot(normal)<0})
    for obj in bpy.context.scene.objects:obj.select_set(False)
    for obj in output:obj.select_set(True)
    bpy.context.view_layer.objects.active=output[0]
    bpy.ops.export_scene.gltf(filepath=str(out/'corrected.glb'),export_format='GLB',use_selection=True,export_image_format='AUTO',export_materials='EXPORT',export_yup=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'corrected.blend'))
    (out/'topology-validation.json').write_text(json.dumps(results,indent=2))
    print('VALIDATION',slug,json.dumps(results),flush=True)
