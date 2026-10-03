# Development component gallery

The user requested an app-wide component gallery alongside the approved task/answer styling work. Extend the existing `/ui-kit`; preserve its demos, selectors and query examples. No new dependency or route is needed.

The gallery lists app components discovered from TypeScript syntax and resolved references: exported controls, local subcomponents, screen/game compositions, parent/content/recording UI, app providers/boundaries, home/PWA and gated avatar internals. Exclude the development gallery and its own demos. Show component name, category, source path, whether exported, and actual app reference files. Label entries with no app references as source-only rather than claiming reachability. Imported third-party components and anonymous render callbacks are outside the inventory of app-defined named components.

Search covers names, categories, sources and usage paths. Categories narrow the inventory. Link shared components to preserved live examples. Composites link to their normal app routes when a safe route exists; explain that these are full app flows with normal state and parent gate requirements. Other infrastructure entries explicitly have no standalone preview. Never mount a game session, recorder, parent flow or avatar renderer merely to build the index.

A TypeScript AST generator owns the committed inventory. Its freshness unit test compares against current source, so adding, removing or moving a component or its references requires regeneration. Run `node --import tsx tools/ui-gallery/generate.ts` after such changes. Preview metadata stays deliberately small; new entries still appear automatically even without a configured preview.

The app conditionally creates a direct lazy import only for `import.meta.env.DEV || import.meta.env.MODE === 'test'`, with Suspense and the existing boundary. Remove the gallery from the shared UI barrel. Production `/ui-kit` redirects home and emits no gallery chunk or inventory code. Avatar internals remain metadata only.

Verification: first fail AST discovery/reference tests, then implement discovery and freshness; add browser search/category/source/preview regressions using the silent fixture; extend production route guard and bundle checker. Root runs integrated browser/build/production checks after the shared styling migration. Update tactile demos with explicit task/answer roles and two labelled material rows.
