"""Coverage holes as a viewer sees them: hidden body faces visible from standard cameras.

A garment's vertex mask removes every body face touching a hidden vertex. Such a
face is a hole if a camera can see its spot (a ray from the face to the camera
escapes the garments and remaining body) and, looking through that spot, the
first thing behind it is remaining visible skin seen from inside, as when a cut
inside a sleeve opening shows the far side of the arm. If garment or nothing lies
behind it, the render only shows the garment's own outline, as when hidden skin
pokes slightly out through cloth. Cameras stand 3 m away in 8
directions at hip, chest, eye and overhead heights, so a face is judged from where a
viewer can actually be (nobody looks up a trouser leg from the floor). Faces
turned away from a camera are skipped, since other skin in front would hide them.
"""
import math

from mathutils import Vector
from mathutils.bvhtree import BVHTree

CAMERA_HEIGHTS_M = (.9, 1.2, 1.5, 2.2)
CAMERA_DISTANCE_M = 3.0


def standard_cameras():
    return [Vector((CAMERA_DISTANCE_M * math.cos(2 * math.pi * k / 8), CAMERA_DISTANCE_M * math.sin(2 * math.pi * k / 8), h))
            for h in CAMERA_HEIGHTS_M for k in range(8)]


def visible_hidden_faces(points, faces, hidden, occluders, cameras=None, select=None):
    """Indices of faces removed by `hidden` that a standard camera can see.

    points/faces: rest body mesh. hidden: hidden vertex indices. occluders: BVH trees
    of garments. select(face_index) optionally limits which removed faces are tested.
    """
    cameras = cameras or standard_cameras()
    removed = [i for i, face in enumerate(faces) if any(v in hidden for v in face)]
    visible_body = BVHTree.FromPolygons(points, [face for face in faces if not any(v in hidden for v in face)])
    trees = [*occluders, visible_body]
    exposed = []
    for i in removed:
        if select and not select(i):
            continue
        face = faces[i]
        a, b, c = (points[face[0]], points[face[1]], points[face[2]])
        normal = (b - a).cross(c - a)
        if normal.length < 1e-12:
            continue
        normal.normalize()
        centre = sum((points[v] for v in face), Vector()) / len(face)
        origin = centre + normal * .0005
        for camera in cameras:
            view = camera - origin
            reach = view.length
            view.normalize()
            if normal.dot(view) <= .1:
                continue
            if any(tree.ray_cast(origin, view, reach)[0] is not None for tree in trees):
                continue
            # Behind the spot: visible skin seen from inside before any garment is a hole.
            behind = centre - normal * .0005
            body_hit = visible_body.ray_cast(behind, -view, reach)[3]
            garment_hits = [d for d in (tree.ray_cast(behind, -view, reach)[3] for tree in occluders) if d is not None]
            if body_hit is not None and (not garment_hits or body_hit < min(garment_hits)):
                exposed.append(i)
                break
    return exposed, len(removed)


def release_visible(points, faces, hidden, garment_points, garment_faces, select=None, inside=.004, rounds=8):
    """Unhide vertices of visible removed faces unless they sit inside the garment shell.

    Returns the new hidden set, the number of released vertices and the hidden vertices
    kept because they touch the garment (contact skin).
    """
    garment = BVHTree.FromPolygons(garment_points, garment_faces)
    hidden, released, touching = set(hidden), 0, set()
    for _ in range(rounds):
        exposed, _ = visible_hidden_faces(points, faces, hidden, [garment], select=select)
        release = set()
        for i in exposed:
            for v in faces[i]:
                if v not in hidden:
                    continue
                location = garment.find_nearest(points[v])[0]
                # Skin touching or inside the cloth stays hidden; the shell's inner-layer
                # normals face the body, so only distance is used.
                if location is None or (points[v] - location).length > inside:
                    release.add(v)
                else:
                    touching.add(v)
        if not release:
            break
        hidden -= release
        released += len(release)
    return hidden, released, touching & hidden


def gait_samples():
    """Quarter-frame walk/run samples, the same inventory the fit gates sweep."""
    import bpy
    samples = []
    for motion in ('walk', 'run'):
        start, end = bpy.data.actions[motion].frame_range
        samples += [(motion, f) for f in sorted({round(start, 5), round(end, 5)} | {i / 4 for i in range(math.ceil(start * 4), math.floor(end * 4) + 1)})]
    return samples


def rehide_moving_contacts(body, garment, arm, hidden, released, poses):
    """Re-hide released vertices whose visible faces touch the garment in any sampled pose.

    Only vertices this coverage released are re-hidden, so canonical coverage never
    loosens. Body masks are disabled while sampling; visibility comes from `hidden`.
    Returns the new hidden set and the set of re-hidden vertices.
    """
    import bpy
    from mathutils import Matrix
    faces = [tuple(f.vertices) for f in body.data.polygons]
    masks = [(m, m.show_viewport) for m in body.modifiers if m.type == 'MASK']
    hidden, rehidden = set(hidden), set()
    try:
        for modifier, _ in masks:
            modifier.show_viewport = False
        for _ in range(4):
            visible_faces = [f for f in faces if not any(v in hidden for v in f)]
            touching = set()
            for motion, frame in [(None, 0), *poses]:
                for bone in arm.pose.bones:
                    bone.matrix_basis = Matrix.Identity(4)
                arm.animation_data.action = None
                if motion:
                    action = bpy.data.actions[motion]
                    arm.animation_data.action = action
                    arm.animation_data.action_slot = action.slots[0]
                    bpy.context.scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
                bpy.context.view_layer.update()
                depsgraph = bpy.context.evaluated_depsgraph_get()
                trees = []
                for obj in (body, garment):
                    mesh = obj.evaluated_get(depsgraph).to_mesh()
                    trees.append([obj.matrix_world @ v.co for v in mesh.vertices])
                    obj.evaluated_get(depsgraph).to_mesh_clear()
                body_tree = BVHTree.FromPolygons(trees[0], visible_faces)
                garment_tree = BVHTree.FromPolygons(trees[1], [tuple(f.vertices) for f in garment.data.polygons])
                for face_index, _ in body_tree.overlap(garment_tree):
                    touching.update(v for v in visible_faces[face_index] if v in released)
            if not touching:
                break
            hidden |= touching
            rehidden |= touching
    finally:
        for modifier, state in masks:
            modifier.show_viewport = state
        for bone in arm.pose.bones:
            bone.matrix_basis = Matrix.Identity(4)
        arm.animation_data.action = None
        bpy.context.view_layer.update()
    return hidden, rehidden


def posed_visible_hidden_faces(body, garments, arm, hidden, poses, select=None):
    """Hidden faces a standard camera can see in each sampled gait pose (masks disabled).

    `garments` are the occluding objects. Returns per-pose counts and the union of
    exposed face indices. Loose openings (shorts legs) can show skin in motion that
    is covered at rest.
    """
    import bpy
    from mathutils import Matrix
    faces = [tuple(f.vertices) for f in body.data.polygons]
    masks = [(m, m.show_viewport) for m in body.modifiers if m.type == 'MASK']
    rows, seen = [], set()
    try:
        for modifier, _ in masks:
            modifier.show_viewport = False
        for motion, frame in poses:
            for bone in arm.pose.bones:
                bone.matrix_basis = Matrix.Identity(4)
            action = bpy.data.actions[motion]
            arm.animation_data.action = action
            arm.animation_data.action_slot = action.slots[0]
            bpy.context.scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
            bpy.context.view_layer.update()
            depsgraph = bpy.context.evaluated_depsgraph_get()
            posed = {}
            for obj in (body, *garments):
                mesh = obj.evaluated_get(depsgraph).to_mesh()
                posed[obj.name] = ([obj.matrix_world @ v.co for v in mesh.vertices], [tuple(f.vertices) for f in mesh.polygons])
                obj.evaluated_get(depsgraph).to_mesh_clear()
            occluders = [BVHTree.FromPolygons(*posed[obj.name]) for obj in garments]
            exposed, _ = visible_hidden_faces(posed[body.name][0], faces, hidden, occluders, select=select)
            rows.append({'motion': motion, 'frame': frame, 'visible_faces': len(exposed), 'faces': exposed})
            seen.update(exposed)
    finally:
        for modifier, state in masks:
            modifier.show_viewport = state
        for bone in arm.pose.bones:
            bone.matrix_basis = Matrix.Identity(4)
        arm.animation_data.action = None
        bpy.context.view_layer.update()
    return rows, seen


def release_posed(body, garment, arm, hidden, contact, select, poses, removable=None, rounds=4):
    """Unhide skin visible in any of `poses`; re-hide what then touches the garment in the gait.

    Rest-only release misses openings that gape in motion (sleeves as arms swing, shorts
    legs). Re-hidden skin joins `contact` and is never released again, so the loop
    converges. `removable` limits which hidden vertices may be released. Returns
    (hidden, contact, released count).
    """
    faces = [tuple(f.vertices) for f in body.data.polygons]
    hidden, contact, released = set(hidden), set(contact), 0
    for _ in range(rounds):
        _, seen = posed_visible_hidden_faces(body, [garment], arm, hidden, poses, select=select)
        release = {v for i in seen for v in faces[i] if v in hidden and v not in contact and (removable is None or v in removable)}
        if not release:
            break
        hidden -= release
        released += len(release)
        hidden, rehidden = rehide_moving_contacts(body, garment, arm, hidden, release, poses)
        contact |= rehidden
    return hidden, contact & hidden, released


def settle_coverage(body, garment, arm, hidden, select, poses, inside=.004, rounds=4):
    """Alternate camera-visibility release and gait-contact re-hiding until stable.

    Returns (hidden, released count, contact set): contact is hidden skin that touches
    the garment at rest (within `inside`) or anywhere in `poses`.
    """
    points = [body.matrix_world @ v.co for v in body.data.vertices]
    faces = [tuple(f.vertices) for f in body.data.polygons]
    garment_points = [garment.matrix_world @ v.co for v in garment.data.vertices]
    garment_faces = [tuple(f.vertices) for f in garment.data.polygons]
    original, hidden, contact, released = set(hidden), set(hidden), set(), 0
    for _ in range(rounds):
        before = set(hidden)
        hidden, count, touching = release_visible(points, faces, hidden, garment_points, garment_faces, select=select, inside=inside)
        released += count
        hidden, rehidden = rehide_moving_contacts(body, garment, arm, hidden, original - hidden, poses)
        contact |= touching | rehidden
        if hidden == before:
            break
    return hidden, released, contact & hidden
