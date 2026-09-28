"""Inspect the preserved Tripo skeleton before authoring local motion."""
import bpy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / "assets/animated/yinglong.glb"))
armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
result = []
for bone in armature.data.bones:
    result.append({"name": bone.name, "parent": bone.parent.name if bone.parent else None,
                   "head": list(bone.head_local), "tail": list(bone.tail_local),
                   "axes": [list(bone.matrix_local.to_3x3().col[i]) for i in range(3)]})
output = ROOT / "assets/animated/skeleton.json"
output.write_text(json.dumps(result, indent=2), encoding="utf-8")
print(json.dumps(result))
