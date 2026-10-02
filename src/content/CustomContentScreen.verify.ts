import { canDisableOrDelete, summarizeContent } from './contentState';

const items = [
  { id: 'ready', enabled: true, status: 'ready' as const, isDefault: true },
  { id: 'draft', enabled: true, status: 'draft' as const, isDefault: false },
  { id: 'hidden', enabled: false, status: 'ready' as const, isDefault: true },
  { id: 'custom-hidden', enabled: false, status: 'ready' as const, isDefault: false },
];
const summary = summarizeContent(items);
if (summary.readyCount !== 1) throw new Error('Only enabled ready content is playable');
if (summary.enabled.map(item => item.id).join(',') !== 'ready,draft') throw new Error('Drafts remain editable');
if (summary.disabledDefaults.map(item => item.id).join(',') !== 'hidden') throw new Error('Only disabled defaults are restorable');
if (canDisableOrDelete(items, 'ready')) throw new Error('Last playable item must stay enabled');
if (!canDisableOrDelete(items, 'draft')) throw new Error('Draft removal is allowed');
const restored = items.map(item => item.id === 'hidden' ? { ...item, enabled: true } : item);
if (summarizeContent(restored).readyCount !== 2 || !canDisableOrDelete(restored, 'ready')) throw new Error('Restoring a default changes availability');
console.log('✓ custom content filtering and restore availability passed (row menus/undo covered in browser)');
