import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { scanAppComponents } from './inventory';

const fixtures: string[] = [];
afterEach(() => fixtures.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

function fixture(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'ui-gallery-'));
  fixtures.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

describe('app component inventory', () => {
  it('discovers local, exported, ref-wrapped and render-null components without demo pollution', () => {
    const root = fixture({
      'src/shared/ui/Piece.tsx': `export const Piece = forwardRef(function Piece() { return <button />; });`,
      'src/shared/ui/index.ts': `export { Piece } from './Piece';`,
      'src/App.tsx': `import { Piece as Answer } from './shared/ui';
        import { Repository } from './service';
        function Task() { return <span />; }
        function Listener() { return null; }
        function NumericHelper() { return 42; }
        export function App() { return <><Task /><Listener /><Answer /></>; }`,
      'src/service.ts': `export class Repository { read() { return []; } }`,
      'src/avatar/UnusedExperiment.tsx': `export function UnusedExperiment() { return <group />; }`,
      'src/shared/ui/UiKitScreen.tsx': `export function UiKitScreen() { return <main />; }`,
      'src/shared/ui/gallery/ComponentGallery.tsx': `export function ComponentGallery() { return <main />; }`,
    });
    const inventory = scanAppComponents(root);
    expect(inventory.map(component => component.name)).toEqual(['App', 'Listener', 'Piece', 'Task', 'UnusedExperiment']);
    expect(inventory.find(component => component.name === 'Piece')).toMatchObject({ source: 'src/shared/ui/Piece.tsx', usages: ['src/App.tsx'] });
    expect(inventory.find(component => component.name === 'Task')).toMatchObject({ exported: false, usages: ['src/App.tsx'] });
    expect(inventory.find(component => component.name === 'UnusedExperiment')).toMatchObject({ usages: [] });
  });

  it('does not turn verifier-only or unit-test imports into app usage evidence', () => {
    const root = fixture({
      'src/shared/ui/LegacyBadge.tsx': `export function LegacyBadge() { return <span />; }`,
      'src/shared/ui/LegacyBadge.verify.ts': `import { LegacyBadge } from './LegacyBadge'; export const verified = LegacyBadge;`,
      'src/shared/ui/LegacyBadge.test.ts': `import { LegacyBadge } from './LegacyBadge'; export const tested = LegacyBadge;`,
    });
    expect(scanAppComponents(root)).toEqual([
      { name: 'LegacyBadge', source: 'src/shared/ui/LegacyBadge.tsx', category: 'ui', exported: true, usages: [] },
    ]);
  });

  it('tracks class boundaries and lazy module references without importing renderer code', () => {
    const root = fixture({
      'src/avatar/Scene.tsx': `export function Scene() { return <group />; }`,
      'src/App.tsx': `const Scene = lazy(() => import('./avatar/Scene').then(module => ({ default: module.Scene })));
        export class Boundary extends Component { render() { return <Scene />; } }`,
    });
    expect(scanAppComponents(root)).toEqual([
      { name: 'Boundary', source: 'src/App.tsx', category: 'shell', exported: true, usages: [] },
      { name: 'Scene', source: 'src/avatar/Scene.tsx', category: 'avatar', exported: true, usages: ['src/App.tsx'] },
    ]);
  });
});

it('keeps the checked-in app inventory complete when source components or references change', async () => {
  const { appComponentInventory } = await import('../../src/shared/ui/gallery/componentInventory.generated');
  expect(appComponentInventory, 'Regenerate with node --import tsx tools/ui-gallery/generate.ts').toEqual(scanAppComponents(process.cwd()));
});
