"""Build an isolated stocky bear from reference proportions, without a human mesh.

This is an editable likeness blockout, not a rigged or export-accepted asset.
"""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bear_companion_common import digest, ellipsoid, material, tube, write_json
from build_catalog_t01 import setup_render


def join_smooth(parts, name, voxel=.012):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    remesh = obj.modifiers.new('Continuous blockout volume', 'REMESH')
    remesh.mode = 'VOXEL'
    remesh.voxel_size = voxel
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth = obj.modifiers.new('Soft transitions', 'SMOOTH')
    smooth.factor = .65
    smooth.iterations = 3
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def loft(name, rings, mat, segments=48, caps=True, folds=0):
    vertices, faces = [], []
    for x, y, z, rx, ry in rings:
        for index in range(segments):
            angle = 2 * math.pi * index / segments
            ease = 1 + folds * math.cos(angle * 3 + z * 17)
            vertices.append((x + rx * math.cos(angle) * ease,
                             y + ry * math.sin(angle) * ease, z))
    for ring in range(len(rings) - 1):
        for index in range(segments):
            a = ring * segments + index
            b = ring * segments + (index + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    if caps:
        faces.extend([tuple(reversed(range(segments))),
                      tuple((len(rings) - 1) * segments + i for i in range(segments))])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def ring_curve(name, center, rx, ry, radius, mat, axis=None):
    center = Vector(center)
    if axis is None:
        u, v = Vector((1, 0, 0)), Vector((0, 1, 0))
    else:
        direction = Vector(axis).normalized()
        u = Vector((0, 1, 0))
        v = direction.cross(u).normalized()
    points = [center + u * rx * math.cos(i * math.tau / 64)
              + v * ry * math.sin(i * math.tau / 64) for i in range(65)]
    return tube(name, points, radius, mat)


def round_box(name, center, dimensions, mat, bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    modifier = obj.modifiers.new('Rounded construction', 'BEVEL')
    modifier.width = bevel
    modifier.segments = 5
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    weighted = obj.modifiers.new('Broad smooth panels', 'WEIGHTED_NORMAL')
    weighted.keep_sharp = True
    return obj


def micro_surface(mat, scale, strength, distance):
    nodes = mat.node_tree.nodes
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = scale
    noise.inputs['Detail'].default_value = 2
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = strength
    bump.inputs['Distance'].default_value = distance
    mat.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    mat.node_tree.links.new(bump.outputs['Normal'], nodes.get('Principled BSDF').inputs['Normal'])


def front_y(center, radii, x, z):
    return center[1] - radii[1] * math.sqrt(max(.01, 1 - ((x-center[0])/radii[0])**2 - ((z-center[2])/radii[2])**2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--design', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    design = json.loads(args.design.read_text())
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.context.preferences.filepaths.save_version = 0
    mats = {name: material('Bear reference '+name, color, .87)
            for name, color in design['colors'].items()}
    mats['eyes'].node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .23
    mats['nose'].node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .48
    micro_surface(mats['fur'], 190, .18, .0008)
    micro_surface(mats['blue'], 260, .11, .0005)
    micro_surface(mats['navy'], 230, .12, .0006)
    # A complete new bear volume. No canonical body, index map, garments or rig is loaded.
    body_parts = [ellipsoid('Bear belly', (0, .015, 1.03), (.37, .25, .43), mats['fur']),
                  ellipsoid('Bear neck', (0, .01, 1.39), (.17, .15, .17), mats['fur'])]
    for sign in (-1, 1):
        side = 'left' if sign > 0 else 'right'
        for x, y, z, rx, ry, rz in [(.40, 0, 1.10, .125, .135, .18),
                                    (.465, -.01, 1.00, .128, .14, .235),
                                    (.50, -.035, .82, .12, .135, .22),
                                    (.50, -.055, .68, .118, .135, .15),
                                    (.412, -.085, .71, .055, .08, .09),
                                    (.19, .01, .48, .14, .16, .32),
                                    (.20, -.07, .12, .14, .24, .10)]:
            body_parts.append(ellipsoid('Bear '+side+' body volume', (sign*x, y, z), (rx, ry, rz), mats['fur'], 32, 20))
    join_smooth(body_parts, 'Bear_body_new_stocky_anatomy')
    head_center, head_radii = design['head']['center'], design['head']['radii']
    head = ellipsoid('Bear_head_new', head_center, head_radii, mats['fur'], 64, 48)
    for vertex in head.data.vertices:
        t = (vertex.co.z-head_center[2])/head_radii[2]
        vertex.co.x *= 1 + .075 * math.exp(-((t+.22)/.48)**2) - .045 * max(t, 0)
    for sign in (-1, 1):
        ear = (sign*.34, .02, design.get('ears', {}).get('centerZ', 2.12))
        ellipsoid('Bear round ear', ear, (.16, .095, .16), mats['fur'], 40, 24)
        ellipsoid('Bear ear inset', (ear[0], -.058, ear[2]), (.104, .031, .108), mats['inner'], 32, 20)
    muzzle_center, muzzle_radii = (0, -.282, 1.640), (.195, .147, .155)
    ellipsoid('Bear cream muzzle', muzzle_center, muzzle_radii, mats['cream'], 48, 32)
    for sign in (-1, 1):
        x, z = sign*.157, 1.856
        y = front_y(head_center, head_radii, x, z)-.008
        ellipsoid('Bear soft eye', (x, y, z), (.036, .022, .046), mats['eyes'], 32, 24)
        ellipsoid('Bear eye catchlight', (x-.008, y-.021, z+.015), (.007, .0035, .008), mats['ivory'], 16, 12)
        points=[]
        for i in range(25):
            t=i/24
            px=x+(t-.5)*.105
            pz=1.958+.014*math.sin(t*math.pi)-sign*(t-.5)*.014
            points.append((px, front_y(head_center, head_radii, px, pz)-.008, pz))
        tube('Bear warm brow', points, .009, mats['brow'])
    nose=ellipsoid('Bear rounded triangle nose', (0, -.429, 1.701), (.065, .034, .043), mats['nose'], 40, 24)
    for vertex in nose.data.vertices:
        t=(vertex.co.z-1.701)/.043
        vertex.co.x *= .78+.22*(t+1)/2
    points=[]
    for i in range(41):
        x=-.096+.192*i/40
        z=1.569+.038*(x/.096)**2
        points.append((x, front_y(muzzle_center, muzzle_radii, x, z)-.004, z))
    tube('Bear soft smile', points, .005, mats['nose'])
    tube('Bear muzzle centre', [(0,-.434,1.673),(0,-.435,1.623),(0,-.422,1.569)], .0045, mats['nose'])
    # Broad belly, dropped shoulders and short sleeves, sized to the new body.
    tee = loft('Bear blue tee torso', [(0,.01,.735,.39,.255),(0,.01,.76,.407,.268),
         (0,.01,.86,.416,.279),(0,.01,1.02,.405,.273),(0,.01,1.18,.378,.246),
         (0,.01,1.30,.335,.213),(0,.01,1.37,.245,.166),(0,.01,1.425,.173,.135)], mats['blue'])
    ring_curve('Tee soft collar', (0,.01,1.425), .175,.138,.014,mats['blueSeam'])
    ring_curve('Tee hem stitching', (0,.01,.755), .399,.261,.007,mats['blueSeam'])
    tee_parts=[tee]
    for sign in (-1,1):
        # Taper the shoulder into the sleeve instead of attaching spherical caps.
        tee_parts.append(loft('Tee sloping short sleeve', [
            (sign*.20,.005,1.365,.11,.16),
            (sign*.28,.005,1.31,.145,.193),
            (sign*.355,0,1.24,.157,.185),
            (sign*.425,-.005,1.145,.17,.18),
            (sign*.44,-.005,1.112,.163,.177)], mats['blue']))
        ring_curve('Tee sleeve cuff', (sign*.44,-.005,1.116), .163,.177,.006,mats['blueSeam'])
    join_smooth(tee_parts,'Bear continuous tee blockout',.009)
    pants=[ellipsoid('Trouser rounded seat',(0,.018,.748),(.355,.232,.212),mats['navy'],48,32)]
    for sign in (-1,1):
        pants.append(loft('Trouser short relaxed leg',[(sign*.205,-.022,.215,.155,.17),
             (sign*.208,-.018,.25,.171,.182),(sign*.21,-.01,.31,.184,.194),
             (sign*.205,0,.40,.175,.193),(sign*.19,.012,.53,.178,.194),
             (sign*.185,.018,.68,.191,.204),(sign*.175,.018,.80,.19,.205)],mats['navy'],folds=.018))
    join_smooth(pants,'Bear navy relaxed trousers',.010)
    for sign in (-1,1):
        ring_curve('Trouser soft hem',(sign*.205,-.022,.235),.160,.174,.008,mats['navySeam'])
        x=sign*.205
        round_box('Sneaker ivory sole',(x,-.074,.055),(.37,.60,.09),mats['ivory'],.043)
        round_box('Sneaker outsole',(x,-.074,.018),(.37,.59,.03),mats['sole'],.013)
        ellipsoid('Sneaker blue upper',(x,-.055,.14),(.176,.29,.10),mats['shoe'],48,28)
        ellipsoid('Sneaker ivory toe bumper',(x,-.282,.09),(.174,.085,.06),mats['ivory'],40,24)
        # Broad flat fabric strap, with the actual upper's curved top surface.
        vertices, faces = [], []
        for y in (-.240,-.180):
            for i in range(25):
                dx=.145*(2*i/24-1)
                top=.14+.10*math.sqrt(max(.01,1-(dx/.176)**2-((y+.055)/.29)**2))
                vertices.append((x+dx,y,top+.008))
        for i in range(24):
            faces.append((i,i+1,26+i,25+i))
        mesh=bpy.data.meshes.new('Broad sneaker strap')
        mesh.from_pydata(vertices,[],faces)
        mesh.update()
        strap=bpy.data.objects.new('Sneaker broad cream strap',mesh)
        bpy.context.collection.objects.link(strap)
        strap.data.materials.append(mats['ivory'])
        thickness=strap.modifiers.new('Strap fabric thickness','SOLIDIFY')
        thickness.thickness=.009
        for polygon in mesh.polygons:
            polygon.use_smooth=True
    meshes=[o for o in bpy.data.objects if o.type=='MESH']
    for obj in meshes:
        obj['bear_stage']='reference-likeness-blockout-unrigged'
    camera=setup_render()
    scene=bpy.context.scene
    scene.cycles.samples=24
    scene.render.resolution_x=320
    scene.render.resolution_y=400
    scene.render.film_transparent=False
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.83,.79,.72,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.75
    ground=material('Reference studio floor','#EFE8DB',.9)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.001))
    bpy.context.object.name='Review-only studio floor'
    bpy.context.object.data.materials.append(ground)
    target=Vector((0,0,1.155))
    camera.data.ortho_scale=2.60
    views={}
    for label,offset in [('three-quarter',(-2.0,-5,.35)),('front',(0,-5,.28)),('side',(-5,0,.28)),('back',(0,5,.28))]:
        camera.location=target+Vector(offset)
        camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
        path=args.output_dir/f'{label}-review.png'
        scene.render.filepath=str(path.resolve())
        bpy.ops.render.render(write_still=True)
        views[label]=str(path)
    blend=args.output_dir/'bear-blockout.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()))
    write_json(args.output_dir/'blockout-report.json',{'stage':'unrigged reference-likeness blockout; not runtime accepted',
        'source_human_mesh_used':False,'rigged':False,'design':str(args.design),'design_sha256':digest(args.design),
        'builder_sha256':digest(Path(__file__)),'blend':str(blend),'blend_sha256':digest(blend),
        'blender_version':bpy.app.version_string,'views':views,'review_width':320,
        'limitations':['Single source view; side/back volumes are reconstruction proposals.',
                      'Procedural fur/cloth bump is review-only and must be baked for glTF.',
                      'Voxel blockout topology needs intentional deformation topology before rigging.']})
    print(json.dumps({'blend':str(blend),'views':views}))


if __name__=='__main__':
    main()
