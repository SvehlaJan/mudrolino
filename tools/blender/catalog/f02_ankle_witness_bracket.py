"""One bounded read-only iso-angle witness; no parameter search or model edits."""
import math


def solve(evaluate, target, start, end, tolerance=1e-8, max_iterations=32):
    if not all(math.isfinite(v) for v in [target, start, end, tolerance]) or not start < end or tolerance <= 0 or not 1 <= max_iterations <= 32:
        raise ValueError('Invalid diagnostic bracket')
    records = []
    def sample(frame):
        value = evaluate(frame)
        if not math.isfinite(value): raise ValueError('Nonfinite angle')
        records.append({'frame': frame, 'angle_rad': value})
        return value-target
    low, high = start, end; a, b = sample(low), sample(high)
    if a*b > 0: raise ValueError('Target not bracketed; no extrapolation')
    if abs(a) <= tolerance: frame, error = low, abs(a)
    elif abs(b) <= tolerance: frame, error = high, abs(b)
    else:
        for _ in range(max_iterations):
            frame = (low+high)/2; value = sample(frame); error = abs(value)
            if error <= tolerance: break
            if a*value <= 0: high = frame
            else: low, a = frame, value
        else: raise ValueError('Diagnostic bracket did not converge within bound')
    return {'frame': frame, 'angle_error_rad': error, 'target_angle_rad': target, 'tolerance_rad': tolerance, 'initial_bracket_frames': [start, end], 'branch': 'principal signed twist (-pi,pi], no unwrapping', 'evaluations': records}
