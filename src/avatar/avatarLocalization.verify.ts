/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { AVATAR_TOP_ITEMS, AVATAR_SHOES_ITEMS, AVATAR_ACCESSORY_ITEMS } from './avatarCatalog';
import { AVATAR_TOP_LABELS as SK_TOP_LABELS, AVATAR_SHOES_LABELS as SK_SHOES_LABELS, AVATAR_ACCESSORY_LABELS as SK_ACCESSORY_LABELS } from '../shared/locales/sk';
import { AVATAR_TOP_LABELS as CS_TOP_LABELS, AVATAR_SHOES_LABELS as CS_SHOES_LABELS, AVATAR_ACCESSORY_LABELS as CS_ACCESSORY_LABELS } from '../shared/locales/cs';

for (const item of AVATAR_TOP_ITEMS) {
  assert.ok(SK_TOP_LABELS[item.id], `Missing SK label for top: ${item.id}`);
  assert.ok(CS_TOP_LABELS[item.id], `Missing CS label for top: ${item.id}`);
}

for (const item of AVATAR_SHOES_ITEMS) {
  assert.ok(SK_SHOES_LABELS[item.id], `Missing SK label for shoe: ${item.id}`);
  assert.ok(CS_SHOES_LABELS[item.id], `Missing CS label for shoe: ${item.id}`);
}

for (const item of AVATAR_ACCESSORY_ITEMS) {
  assert.ok(SK_ACCESSORY_LABELS[item.id], `Missing SK label for accessory: ${item.id}`);
  assert.ok(CS_ACCESSORY_LABELS[item.id], `Missing CS label for accessory: ${item.id}`);
}

console.log('✅ Avatar localization verification passed: all catalog items have SK and CS labels.');
