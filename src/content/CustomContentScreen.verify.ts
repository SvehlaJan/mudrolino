import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./CustomContentScreen.tsx', import.meta.url), 'utf8');
function assert(value: boolean, message: string) { if (!value) throw new Error(message); }

assert(source.includes('word.enabled && word.status === \'ready\''), 'word count must exclude disabled rows');
assert(source.includes('praise.enabled && praise.status === \'ready\''), 'praise count must exclude disabled rows');
assert(source.includes('word.isDefault && !word.enabled'), 'word hidden count must use enabled state');
assert(source.includes('praise.isDefault && !praise.enabled'), 'praise hidden count must use enabled state');
assert(source.includes("label: 'Obnoviť slovo'"), 'disabled default word restore must be reachable');
assert(source.includes("label: 'Obnoviť pochvalu'"), 'disabled default praise restore must be reachable');
console.log('✓ legacy content management enabled-state seam passed');
