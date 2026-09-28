"""Read-only original surface inspection before locating lip-attached canines."""
import bpy
import json
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/anatomy/xiwangmu'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
source = ROOT / 'assets/tripo-out/shj-hq-xiwangmu-e0f4cc36/model.glb'
bpy.ops.import_scene.gltf(filepath=str(source))
report = []
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH':
        continue
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.select_set(False)
    vertices = np.empty(len(obj.data.vertices) * 3, dtype=np.float32)
    obj.data.vertices.foreach_get('co', vertices)
    vertices = vertices.reshape(-1, 3)
    np.savez_compressed(OUT / 'original-geometry.npz', vertices=vertices)
    report.append({'name': obj.name, 'vertices': len(vertices), 'triangles': len(obj.data.polygons), 'min': vertices.min(axis=0).tolist(), 'max': vertices.max(axis=0).tolist()})
(OUT / 'inspection.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'inspection.blend'))
print('INSPECTION', json.dumps(report), flush=True)
