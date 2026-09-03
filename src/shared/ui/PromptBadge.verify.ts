/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { PromptBadge } from './PromptBadge';

// Verify non-clickable badge behavior and accessibility attributes
const staticBadge = PromptBadge({
  children: '🚗',
  ariaLabel: 'Auto',
});

assert.equal(staticBadge.props['aria-label'], 'Auto');
assert.equal(staticBadge.props.role, undefined);
assert.equal(staticBadge.props.tabIndex, undefined);
assert.ok(staticBadge.props.className.includes('min-w-[140px]'));
assert.ok(staticBadge.props.className.includes('!shadow-block'));

// Verify clickable badge behavior and accessibility attributes
let clickCount = 0;
const clickableBadge = PromptBadge({
  children: '🍎',
  ariaLabel: 'Jablko',
  onClick: () => {
    clickCount += 1;
  },
});

assert.equal(clickableBadge.props['aria-label'], 'Jablko');
assert.equal(clickableBadge.props.role, 'button');
assert.equal(clickableBadge.props.tabIndex, 0);
assert.ok(clickableBadge.props.className.includes('cursor-pointer'));
assert.ok(clickableBadge.props.className.includes('active:scale-95'));

// Trigger onClick
clickableBadge.props.onClick();
assert.equal(clickCount, 1, 'onClick handler was called');

// Trigger onKeyDown with Enter and Space
clickableBadge.props.onKeyDown({ key: 'Enter' });
assert.equal(clickCount, 2, 'Enter key activated onClick');

clickableBadge.props.onKeyDown({ key: ' ' });
assert.equal(clickCount, 3, 'Space key activated onClick');

// Trigger onKeyDown with other key
clickableBadge.props.onKeyDown({ key: 'Tab' });
assert.equal(clickCount, 3, 'Other keys do not activate onClick');

console.log('✅ PromptBadge verification tests passed');
