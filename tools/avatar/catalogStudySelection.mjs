/** Select explicit study registrations for a source-bound browser proof run. */
export function selectCatalogStudyIds(progress, requested) {
  const registered = progress.model_studies?.map(study => study.id) ?? [];
  if (!registered.length) throw new Error('No registered model studies to verify');
  if (registered.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id) || id.length > 100)) throw new Error('Invalid model study ID');
  if (new Set(registered).size !== registered.length) throw new Error('Duplicate model study registration');
  const ids = [...new Set(requested.length ? requested : registered)];
  for (const id of ids) if (!registered.includes(id)) throw new Error(`Study must be registered before verification: ${id}`);
  return ids;
}
