import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

export interface AppComponent {
  name: string;
  source: string;
  category: string;
  exported: boolean;
  usages: string[];
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function category(source: string): string {
  if (source.startsWith('src/shared/ui/')) return 'ui';
  if (source.startsWith('src/shared/game/materials/')) return 'materials';
  if (source.startsWith('src/shared/game/') || source.startsWith('src/shared/components/')) return 'game-shell';
  if (source.startsWith('src/games/')) return 'games';
  if (source.startsWith('src/parent/')) return 'parent';
  if (source.startsWith('src/content/')) return 'content';
  if (source.startsWith('src/recordings/')) return 'recordings';
  if (source.startsWith('src/avatar/')) return 'avatar';
  if (source.startsWith('src/home/') || source.startsWith('src/pwa/')) return 'home';
  return 'shell';
}

function hasJsx(node: ts.Node): boolean {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return true;
  return ts.forEachChild(node, child => hasJsx(child)) ?? false;
}

function isExported(node: ts.Node): boolean {
  if (ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) return true;
  return ts.isVariableDeclaration(node) ? isExported(node.parent.parent) : false;
}

/** Metadata only. This tool never loads or executes app/component modules. */
export function scanAppComponents(root: string): AppComponent[] {
  const files = sourceFiles(join(root, 'src')).filter(file => !/\.(?:test|verify)\.tsx?$/.test(file));
  const program = ts.createProgram(files, {
    jsx: ts.JsxEmit.Preserve, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022,
    skipLibCheck: true, noEmit: true,
  });
  const checker = program.getTypeChecker();
  const sources = program.getSourceFiles().filter(source => files.includes(source.fileName)
    && !source.fileName.endsWith('/UiKitScreen.tsx') && !source.fileName.includes('/shared/ui/gallery/'));
  const components = new Map<ts.Symbol, AppComponent>();
  const candidates: { node: ts.Node; name: ts.Identifier; source: string }[] = [];
  const jsxReferenced = new Set<ts.Symbol>();
  const references: { symbol: ts.Symbol; source: string }[] = [];

  function reference(node: ts.Node, source: string, jsx = false) {
    let symbol = checker.getSymbolAtLocation(node);
    if (!symbol) return;
    if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    if (jsx) jsxReferenced.add(symbol);
    references.push({ symbol, source });
  }

  for (const sourceFile of sources) {
    const source = relative(root, sourceFile.fileName).replaceAll('\\', '/');
    function visit(node: ts.Node) {
      if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name && /^[A-Z]/.test(node.name.text)) {
        candidates.push({ node, name: node.name, source });
      } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /^[A-Z]/.test(node.name.text) && node.initializer) {
        const initializer = node.initializer;
        const wrapper = ts.isCallExpression(initializer) && /(?:^|\.)(?:memo|forwardRef)$/.test(initializer.expression.getText(sourceFile));
        if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer) || wrapper) candidates.push({ node, name: node.name, source });
      }
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) reference(node.tagName, source, true);
      if (ts.isImportSpecifier(node) && !node.isTypeOnly) reference(node.name, source);
      if (ts.isImportClause(node) && !node.isTypeOnly && node.name) reference(node.name, source);
      // Includes lazy module mappings: module.Scene and m.AlphabetGame.
      if (ts.isPropertyAccessExpression(node)) reference(node.name, source);
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }

  for (const candidate of candidates) {
    const symbol = checker.getSymbolAtLocation(candidate.name);
    if (!symbol || (!hasJsx(candidate.node) && !jsxReferenced.has(symbol))) continue;
    components.set(symbol, {
      name: candidate.name.text, source: candidate.source, category: category(candidate.source),
      exported: isExported(candidate.node), usages: [],
    });
  }
  for (const { symbol, source } of references) {
    const component = components.get(symbol);
    if (component && !component.usages.includes(source)) component.usages.push(source);
  }
  return [...components.values()].map(component => ({ ...component, usages: component.usages.sort() }))
    .sort((left, right) => left.name.localeCompare(right.name, 'en') || left.source.localeCompare(right.source, 'en'));
}
