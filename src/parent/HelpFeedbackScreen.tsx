/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { AppScreen, BackButton, Button, Card, PageHeader, TopBar } from '../shared/ui';
import { FeedbackModal } from '../shared/components/FeedbackModal';

export function HelpFeedbackScreen() {
  const navigate = useNavigate();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <AppScreen mode="parent" height="content" scroll="vertical" maxWidth="narrow">
      <TopBar left={<BackButton onClick={() => navigate('/settings')} />} />
      <PageHeader title="Rodičovská zóna" description="Pomoc a spätná väzba" />
      <Card className="mt-5 space-y-4 sm:mt-6">
        <div>
          <h3 className="text-xl font-bold sm:text-2xl">Potrebujete pomoc?</h3>
          <p className="mt-1 text-sm font-medium text-text-muted sm:text-base">
            Pre otázky alebo snímku obrazovky napíšte na{' '}
            <a className="font-bold text-text-main underline" href="mailto:jan.svehla@pm.me">
              jan.svehla@pm.me
            </a>
            .
          </p>
        </div>
        <Button onClick={() => setIsFeedbackOpen(true)} icon={<MessageSquare size={20} />}>
          Odoslať spätnú väzbu
        </Button>
      </Card>

      {isFeedbackOpen &&
        createPortal(
          <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} screen="help" />,
          document.body,
        )}
    </AppScreen>
  );
}
