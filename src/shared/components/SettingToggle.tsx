/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ToggleControl, type SwitchTone } from '../ui';

interface SettingToggleProps {
  label: string;
  icon: React.ReactNode;
  description?: string;
  checked: boolean;
  onToggle: () => void;
  tone?: SwitchTone;
  className?: string;
}

export function SettingToggle(props: SettingToggleProps) {
  return <ToggleControl {...props} />;
}
