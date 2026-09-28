"""Create a restrained 8-second idle from the preserved, weighted Tripo rig.

All rotations are small and authored around inspected rest-space axes. The
original leg and wing joints remain in their bind rotations. No locomotion or
flight is implied. Re-run with Blender --background --python this-file.py.
"""
import bpy
import math
from pathlib import Path
from mathutils import Quaternion, Vector

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets/animated"
OUTPUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / "assets/tripo-out/shj-yinglong-rig-rig-95885440/model.glb"))
rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
scene = bpy.context.scene
scene.render.fps = 30
scene.frame_start = 1
scene.frame_end = 241
rig.animation_data_create()

for frame in range(1, 242):
    phase = (frame - 1) / 240 * math.tau
    # A slow scan shared by the neck, without stretching the jaw or horns.
    for name, amplitude, offset in [("tripo::Head_0", 0.030, 0.0),
                                    ("tripo::Head_1", 0.020, -0.25)]:
        bone = rig.pose.bones[name]
        yaw_axis = bone.bone.matrix_local.to_3x3().inverted() @ Vector((0, 0, 1))
        yaw = amplitude * math.sin(phase + offset)
        pitch = 0.007 * math.sin(2 * phase)
        bone.rotation_mode = "QUATERNION"
        bone.rotation_quaternion = Quaternion(yaw_axis, yaw) @ Quaternion((0, 0, 1), pitch)
        bone.keyframe_insert("rotation_quaternion", frame=frame, group=name)
    # A small traveling lateral wave; every sample and its velocity loop.
    for index, amplitude in [(0, 0.016), (2, 0.021), (4, 0.026)]:
        bone = rig.pose.bones[f"tripo::Tail_{index}"]
        yaw_axis = bone.bone.matrix_local.to_3x3().inverted() @ Vector((0, 0, 1))
        bone.rotation_mode = "QUATERNION"
        bone.rotation_quaternion = Quaternion(yaw_axis, amplitude * math.sin(phase - index * 0.28))
        bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
    # Less than 0.6% chest expansion limits inherited displacement in this
    # automatically weighted skeleton, where wings and legs share Spine_2.
    chest = rig.pose.bones["tripo::Spine_2"]
    expansion = 1 + 0.003 * (1 - math.cos(2 * phase))
    chest.scale = (expansion, 1, expansion)
    chest.keyframe_insert("scale", frame=frame, group=chest.name)

rig.animation_data.action.name = "Idle_Breath"
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "yinglong-idle.blend"))
bpy.ops.export_scene.gltf(filepath=str(OUTPUT / "yinglong.glb"), export_format="GLB",
    export_yup=True, export_animations=True, export_animation_mode="ACTIVE_ACTIONS",
    export_frame_range=True, export_force_sampling=True, export_image_format="AUTO",
    export_nla_strips_merged_animation_name="Idle_Breath", export_anim_slide_to_zero=True)
print("YINGLONG_IDLE_EXPORTED", flush=True)
