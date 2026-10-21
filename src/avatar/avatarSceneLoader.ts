let sceneModule: Promise<typeof import('./AvatarScene')> | undefined;

/** A failed chunk remains failed until the next page visit. */
export function loadAvatarSceneModule(): Promise<typeof import('./AvatarScene')> {
  return sceneModule ??= import('./AvatarScene');
}
