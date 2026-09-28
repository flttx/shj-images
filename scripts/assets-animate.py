"""Author a subtle, looping skeletal idle on the successful Tripo Yinglong rig."""
import bpy
import math
import pathlib
from mathutils import Euler

ROOT=pathlib.Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/"assets/tripo-out/shj-yinglong-rig-rig-95885440/model.glb"))
armature=next(o for o in bpy.context.scene.objects if o.type=="ARMATURE")
scene=bpy.context.scene
scene.render.fps=30
scene.frame_start=1
scene.frame_end=121
armature.animation_data_create()
for frame in range(1,122,5):
    phase=(frame-1)/120*math.tau
    for name,axis,amount in [("tripo::Head_0",2,0.018),("tripo::Head_1",0,0.012),
                             ("tripo::Tail_0",2,0.022),("tripo::Tail_2",2,0.027),
                             ("tripo::Tail_4",2,0.033)]:
        bone=armature.pose.bones.get(name)
        if bone is None: continue
        bone.rotation_mode="XYZ"
        rotation=[0,0,0]
        rotation[axis]=math.sin(phase)*amount
        bone.rotation_euler=Euler(rotation)
        bone.keyframe_insert(data_path="rotation_euler",frame=frame,group=name)
    bone=armature.pose.bones.get("tripo::Spine_2")
    if bone:
        expansion=1+0.004*(1-math.cos(phase))
        bone.scale=(expansion,1,expansion)
        bone.keyframe_insert(data_path="scale",frame=frame,group=bone.name)
action=armature.animation_data.action
action.name="Idle_Breath"
scene.frame_set(1)
output=ROOT/"assets/animated/yinglong.glb"
output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",export_yup=True,
                         export_animations=True,export_animation_mode="ACTIVE_ACTIONS",
                         export_frame_range=True,export_force_sampling=True,
                         export_nla_strips_merged_animation_name="Idle_Breath",
                         export_image_format="AUTO")
print("ANIMATED_GLB",output,flush=True)
