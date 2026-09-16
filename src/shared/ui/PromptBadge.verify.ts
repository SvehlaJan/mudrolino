/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { Button } from './Button';
import { Card } from './Card';
import { PromptBadge } from './PromptBadge';

// Static badge renders a non-interactive Card, never a fake `div[role="button"]`.
const staticBadge = PromptBadge({ children: '🚗', ariaLabel: 'Auto' });
assert.equal(staticBadge.type, Card, 'static badge renders Card');
assert.equal(staticBadge.props['aria-label'], 'Auto');
assert.equal(staticBadge.props.onClick, undefined);
assert.ok(staticBadge.props.className.includes('min-w-[140px]'));
assert.ok(!staticBadge.props.className.includes('!'), 'no !important overrides remain');

// Clickable badge renders a native Button, which owns focus/keyboard semantics for free.
let clickCount = 0;
const clickableBadge = PromptBadge({
  children: '🍎',
  ariaLabel: 'Jablko',
  onClick: () => {
    clickCount += 1;
  },
});

assert.equal(clickableBadge.type, Button, 'clickable badge renders Button');
assert.equal(clickableBadge.props['aria-label'], 'Jablko');
assert.equal(clickableBadge.props.tone, 'neutral');
assert.ok(clickableBadge.props.className.includes('cursor-pointer'));

clickableBadge.props.onClick();
assert.equal(clickCount, 1, 'onClick handler is wired to the native button');

console.log('✅ PromptBadge verification tests passed');
