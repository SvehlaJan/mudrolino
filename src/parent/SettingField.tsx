/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { SettingDefinition, SettingValue } from '../shared/settings/settingsRegistry';
import { RadioGroupControl, SwitchControl } from '../shared/ui';

interface SettingFieldProps {
  definition: SettingDefinition;
  value: SettingValue;
  onValueChange: (value: SettingValue) => void;
}

/** Stable string key for a setting value, including range objects RadioGroupControl's string-only `T` can't carry directly. */
function optionKey(value: SettingValue): string {
  return typeof value === 'object' && value !== null ? JSON.stringify(value) : `${typeof value}:${value}`;
}

/**
 * Renders exactly one catalogued setting by `definition.kind`. Owns the
 * control's label/description and value mapping; knows nothing about game
 * IDs, storage, or cross-field dependencies — those live in the registry.
 */
export function SettingField({ definition, value, onValueChange }: SettingFieldProps) {
  if (definition.kind === 'switch') {
    return (
      <SwitchControl
        label={definition.label}
        description={definition.description}
        checked={value === true}
        onCheckedChange={onValueChange}
        tone="accent"
      />
    );
  }

  const columns = definition.options.length === 2 ? 2 : definition.options.length === 4 ? 4 : 3;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-bold text-text-main sm:text-xl">{definition.label}</h3>
        <p className="mt-1 text-sm font-medium text-text-muted sm:text-base">{definition.description}</p>
      </div>
      <RadioGroupControl
        ariaLabel={definition.label}
        tone="accent"
        columns={columns}
        value={optionKey(value)}
        onValueChange={(key) => {
          const option = definition.options.find(candidate => optionKey(candidate.value) === key);
          if (option) onValueChange(option.value);
        }}
        options={definition.options.map(option => ({ value: optionKey(option.value), label: option.label }))}
      />
    </div>
  );
}
