"""Short-sleeve coverage helpers: which hidden arm skin sits inside a tee sleeve.

The canonical short-top coverage hides arm skin up to 0.39 of the upper arm, which
leaves a jagged cut visible through a loose sleeve opening. `sleeve_interior`
selects the removed faces on the arm inside each sleeve (up to its measured hem) so
catalog_coverage_visibility.release_visible can unhide only the ones a standard
camera would see; `arm_skin` widens that to arm skin below the sleeve. Skin that
touches the tee at rest or anywhere in the gait stays hidden as `contact_<ID>`: in
the A-pose the inner arm presses against the torso, so its visible cut edge is the
known defect the user accepted (2026-10-08). Relieving the side panel there did not
converge (see the female O01 retrospective).
"""

ARM_PARTS = ('Arm', 'ForeArm', 'Hand')


def dominant(obj, vertex):
    """Strongest bone influence; coverage groups such as covered_T01 are not bones."""
    bones = {b.name for m in obj.modifiers if m.type == 'ARMATURE' and m.object for b in m.object.data.bones}
    weights = [w for w in vertex.groups if not bones or obj.vertex_groups[w.group].name in bones]
    return obj.vertex_groups[max(weights, key=lambda w: w.weight).group].name if weights else ''


def is_arm(name):
    return any(name == side + part for side in ('Left', 'Right') for part in ARM_PARTS)


def sleeve_interior(body, tee, arm, faces, points):
    """Selector for removed faces on the arm inside each short sleeve (up to its hem)."""
    names = [dominant(body, v) for v in body.data.vertices]
    sleeves = {}
    for side in ('Left', 'Right'):
        shoulder = arm.data.bones[side + 'Arm'].head_local
        axis = arm.data.bones[side + 'ForeArm'].head_local - shoulder
        hem = max((tee.matrix_world @ v.co - shoulder).dot(axis) / axis.length_squared
                  for v in tee.data.vertices if dominant(tee, v) in (side + 'Arm', side + 'ForeArm'))
        sleeves[side] = (shoulder, axis, hem)

    def select(index):
        for v in faces[index]:
            if not is_arm(names[v]):
                continue
            shoulder, axis, hem = sleeves['Left' if points[v].x > 0 else 'Right']
            if (points[v] - shoulder).dot(axis) / axis.length_squared <= hem + .01:
                return True
        return False
    return select


def arm_skin(body, faces):
    """Selector for removed faces with any arm-weighted vertex (inside or below the sleeve)."""
    names = [dominant(body, v) for v in body.data.vertices]
    return lambda index: any(is_arm(names[v]) for v in faces[index])
