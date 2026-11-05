/// <reference types="vite/client" />

/** Short commit of the build, set by `vite.config.ts`; shown to parents and sent with feedback and error reports. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  /** Set by Vercel at build time: `production`, `preview` or `development`. */
  readonly VITE_VERCEL_ENV?: string;
  /** Development only: "true" shows the approved bear from this checkout before it is published. */
  readonly VITE_AVATAR_LOCAL_COMPANION?: string;
}
