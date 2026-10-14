/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppScreen, BackButton, PageHeader, TopBar } from '../shared/ui';
import { FeedbackForm } from './FeedbackForm';
import { useT } from '../shared/hooks/useT';

export function HelpFeedbackScreen() {
  const navigate = useNavigate();
  const t = useT();
  return (
    <AppScreen mode="parent" height="viewport" scroll="vertical" maxWidth="narrow">
      <TopBar left={<BackButton onClick={() => navigate('/settings')} />} />
      <PageHeader title={t('Pomoc a spätná väzba')} />
      <FeedbackForm screen="help" />
    </AppScreen>
  );
}
