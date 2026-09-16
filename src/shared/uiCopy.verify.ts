import { getUiCopy } from './uiCopy';

if (getUiCopy('sk', 'category.literacy') !== 'Písmená a slová') {
  throw new Error('Slovak literacy label missing');
}
if (getUiCopy('cs', 'game.alphabet.title') !== 'Abeceda') {
  throw new Error('Stub locale must fall back to Slovak');
}
console.log('✓ UI copy fallback passed');
