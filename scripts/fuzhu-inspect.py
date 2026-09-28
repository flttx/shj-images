"""Read-only anatomy inspection of the original 4K textured source meshes."""
import bpy
import json
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'fuzhu': 'assets/tripo-out/shj-hq-fuzhu-531c74c0/model.glb',
    'bifang': 'assets/tripo-out/shj-hq-bifang-33289e7b/model.glb',
}
for slug, source in SOURCES.items():
    out = ROOT / 'assets/anatomy' / slug
    out.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / source))
    rows = []
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
        edges = np.empty(len(obj.data.edges) * 2, dtype=np.int32)
        obj.data.edges.foreach_get('vertices', edges)
        np.savez_compressed(out / (obj.name + '-geometry.npz'), vertices=vertices, edges=edges.reshape(-1, 2))
        rows.append({'object': obj.name, 'vertices': len(vertices), 'faces': len(obj.data.polygons), 'min': vertices.min(axis=0).tolist(), 'max': vertices.max(axis=0).tolist()})
    (out / 'inspection.json').write_text(json.dumps({'source': source, 'objects': rows}, indent=2), encoding='utf-8')
    bpy.ops.wm.save_as_mainfile(filepath=str(out / 'inspection.blend'))
    print(slug, json.dumps(rows), flush=True)
