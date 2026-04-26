/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ToggleControl } from '../ui';

interface SettingToggleProps {
  label: string;
  icon: React.ReactNode;
  description?: string;
  checked: boolean;
  onToggle: () => void;
  iconBackgroundClassName: string;
  activeColorClassName?: string;
  className?: string;
}

export function SettingToggle(props: SettingToggleProps) {
  return <ToggleControl {...props} />;
}
