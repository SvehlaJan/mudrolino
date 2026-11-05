/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ModuleLoader<T> {
  /** Starts the one load, or joins it while it runs. A failed load is forgotten, so the next call retries. */
  load(): Promise<T>;
  /** The module once its load has finished; undefined before that and after a failure. */
  loaded(): T | undefined;
}

/**
 * One download per module, shared by every caller. Knowing when it has finished lets a route
 * render the module straight away instead of suspending on a promise that has already resolved;
 * React holds a suspended screen behind its fallback for about 300 ms even when the code is there.
 */
export function createModuleLoader<T>(load: () => Promise<T>): ModuleLoader<T> {
  let pending: Promise<T> | undefined;
  let module: T | undefined;
  return {
    load() {
      pending ??= load().then(
        (result) => {
          module = result;
          return result;
        },
        (error: unknown) => {
          pending = undefined;
          throw error;
        },
      );
      return pending;
    },
    loaded: () => module,
  };
}
