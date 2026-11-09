let sceneModule: Promise<typeof import('./AvatarScene')> | undefined;
let loadedSceneModule: typeof import('./AvatarScene') | null = null;
let modelPrewarmer: ((url: string) => void) | null = null;

export function getLoadedAvatarSceneModule(): typeof import('./AvatarScene') | null {
  return loadedSceneModule;
}

export function registerCompanionModelPrewarmer(prewarm: (url: string) => void): void {
  modelPrewarmer = prewarm;
}

export function prewarmCompanionModel(url: string): void {
  modelPrewarmer?.(url);
}

/** A failed chunk remains failed until the next page visit. */
export function loadAvatarSceneModule(): Promise<typeof import('./AvatarScene')> {
  return sceneModule ??= import('./AvatarScene').then((module) => {
    loadedSceneModule = module;
    return module;
  });
}
