"""Render each F02 heel at the retained worst own-shell pose, without saving the source."""
import sys
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path.cwd()/'tools/blender/catalog'))
from build_catalog_t01 import reset, world_mesh
revision=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(revision/'F02.blend'))
arm=bpy.data.objects['Armature_Catalog'];obj=bpy.data.objects['F02_slip_ons'];camera=bpy.context.scene.camera
reset(arm);action=bpy.data.actions['run'];arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]
bpy.context.scene.frame_set(12,subframe=.25);bpy.context.view_layer.update();points,_=world_mesh(obj)
scene=bpy.context.scene;scene.render.resolution_x=320;scene.render.resolution_y=320;scene.render.resolution_percentage=100
camera.data.ortho_scale=.48
output=Path('artifacts/verification/avatar-catalog/F02/independent-keys-repair')
for side,sign in [('left',1),('right',-1)]:
    foot=[point for i,point in enumerate(points) if obj.data.vertices[i].co.x*sign>0]
    target=Vector(tuple((min(point[axis] for point in foot)+max(point[axis] for point in foot))/2 for axis in range(3)))
    camera.location=target+Vector((0,3,.15));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str((output/('own-shell-run-12.25-'+side+'-review.png')).resolve());bpy.ops.render.render(write_still=True)
print('F02_FAILURE_REVIEW',{'frame':12.25,'review_width':320,'source_saved':False})
