/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import React from 'react';
import { AuditoryPromptBadge } from './AuditoryPromptBadge';

let replayCount = 0;
const handleReplay = () => {
  replayCount += 1;
};

// 1. Verify default props and accessibility attributes
const defaultBadge = AuditoryPromptBadge({
  isPlaying: false,
  onReplay: handleReplay,
});

assert.equal(defaultBadge.props.role, 'button');
assert.equal(defaultBadge.props.tabIndex, 0);
assert.equal(defaultBadge.props['aria-label'], 'Prehrať zadanie znova');
assert.ok(defaultBadge.props.className.includes('cursor-pointer'));
assert.ok(defaultBadge.props.className.includes('!shadow-block'));

// Verify children when isPlaying is false
type ElementWithChildren = React.ReactElement<{ children?: React.ReactNode }>;
const [iconWrapperNotPlaying, labelSpanDefault] = React.Children.toArray(defaultBadge.props.children) as ElementWithChildren[];
assert.equal(labelSpanDefault.props.children, 'Počúvaj');

// When isPlaying is false, ripple rings should not be rendered
const iconChildrenNotPlaying = iconWrapperNotPlaying.props.children;
assert.equal(Array.isArray(iconChildrenNotPlaying) ? iconChildrenNotPlaying[0] : null, false);

// 2. Verify isPlaying=true and custom label
const playingBadge = AuditoryPromptBadge({
  isPlaying: true,
  onReplay: handleReplay,
  label: 'Znova',
  className: 'custom-class',
});

assert.ok(playingBadge.props.className.includes('custom-class'));
const [iconWrapperPlaying, labelSpanCustom] = React.Children.toArray(playingBadge.props.children) as ElementWithChildren[];
assert.equal(labelSpanCustom.props.children, 'Znova');

// When isPlaying is true, concentric ripples exist
const iconChildrenPlaying = iconWrapperPlaying.props.children;
const rippleFragment = Array.isArray(iconChildrenPlaying) ? iconChildrenPlaying[0] : null;
assert.ok(rippleFragment, 'Ripple fragment should exist when isPlaying is true');

// 3. Verify interaction handlers
// Trigger onClick
defaultBadge.props.onClick();
assert.equal(replayCount, 1, 'onClick triggers onReplay');

// Trigger onKeyDown with Enter and Space
let preventDefaultCalls = 0;
const mockEvent = (key: string) => ({
  key,
  preventDefault: () => {
    preventDefaultCalls += 1;
  },
});

defaultBadge.props.onKeyDown(mockEvent('Enter'));
assert.equal(replayCount, 2, 'Enter key activates onReplay');
assert.equal(preventDefaultCalls, 1, 'Enter calls preventDefault');

defaultBadge.props.onKeyDown(mockEvent(' '));
assert.equal(replayCount, 3, 'Space key activates onReplay');
assert.equal(preventDefaultCalls, 2, 'Space calls preventDefault');

// Other keys should not trigger onReplay
defaultBadge.props.onKeyDown(mockEvent('ArrowDown'));
assert.equal(replayCount, 3, 'Other keys do not activate onReplay');
assert.equal(preventDefaultCalls, 2, 'Other keys do not call preventDefault');

console.log('✅ AuditoryPromptBadge verification tests passed');
