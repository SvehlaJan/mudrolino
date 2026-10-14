export interface AudioInventoryInput {
  expected: string[];
  existing: string[];
  pending: string[];
  strict: boolean;
}

export interface AudioInventoryResult {
  issues: string[];
  pendingCount: number;
}

/** Apply the development and shipping rules to relative audio paths. */
export function evaluateAudioInventory({
  expected,
  existing,
  pending,
  strict,
}: AudioInventoryInput): AudioInventoryResult {
  const issues: string[] = [];
  const expectedSet = new Set(expected);
  const existingSet = new Set(existing);
  const pendingSet = new Set(pending);

  for (const path of new Set(pending)) {
    if (pending.filter(candidate => candidate === path).length > 1) {
      issues.push(`Duplicate pending recording: ${path}`);
    }
    if (!expectedSet.has(path)) {
      issues.push(`Pending recording is not expected: ${path}`);
    }
    if (existingSet.has(path)) {
      issues.push(`Pending recording already exists: ${path}`);
    }
  }

  for (const path of new Set(existing)) {
    if (!expectedSet.has(path)) {
      issues.push(`Orphan recording: ${path}`);
    }
  }

  if (strict) {
    for (const path of expected) {
      if (!existingSet.has(path)) {
        issues.push(`Strict mode requires recording: ${path}`);
      }
    }
    if (pending.length > 0) {
      issues.push('Strict mode requires an empty pending list');
    }
  } else {
    for (const path of expected) {
      if (!existingSet.has(path) && !pendingSet.has(path)) {
        issues.push(`Missing recording is not pending: ${path}`);
      }
    }
  }

  return { issues, pendingCount: pending.length };
}
