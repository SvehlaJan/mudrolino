/** Profile ownership is explicit: tests using their own viewport loop stay with the core owner. */
export const INTEGRATION_IGNORED_SPECS = ['**/production-guards.spec.ts', '**/offline.spec.ts', '**/release-*.spec.ts'];
export const GEOMETRY_TAG = /@geometry/;
export const RELEASE_CORE_SPECS = /release-(?:journeys|audio-order|parent-data|rotations)\.spec\.ts/;
