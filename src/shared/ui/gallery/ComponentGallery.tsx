import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../Card';
import { SearchInput } from '../FormControls';
import { appComponentInventory } from './componentInventory.generated';
import { filterComponents, type GalleryComponent } from './filterComponents';

const categories: Record<string, string> = {
  ui: 'Zdieľané UI', materials: 'Herné materiály', 'game-shell': 'Herný rám a prekrytia',
  games: 'Hry a hracie plochy', parent: 'Rodičovská zóna', content: 'Vlastný obsah',
  recordings: 'Nahrávky', home: 'Domov a PWA', avatar: 'Avatar (experiment)', shell: 'Aplikácia a kontexty',
};

const liveSections: Record<string, readonly string[]> = {
  'Actions — typed variants': ['Button', 'IconButton'],
  Surfaces: ['Card', 'RecordingListItem', 'IconMenuButton'],
  Choices: ['ChoiceTile', 'SegmentedChoice'],
  'Game Surfaces': ['TopBar', 'RoundCounter', 'AppScreen', 'BackButton'],
  'Literárne materiály': ['PictureCard', 'PlayTray', 'InsetSlot', 'WordRail'],
  'Materiály množstiev': ['QuantityTray', 'BalancePlayfield'],
  'Prompt Badge': ['PromptBadge'],
  Forms: ['ToggleControl', 'SearchInput', 'TextAreaControl'],
  Dialogs: ['DialogShell', 'AlertDialogShell'],
  'Rádiové skupiny, prepínače, karty, menu a polia': ['RadioGroupControl', 'SwitchControl', 'Tabs', 'TabPanel', 'DropdownMenu', 'Field'],
  'Page Header': ['PageHeader'],
  'Overlay Frame': ['OverlayFrame', 'ConfettiLayer'],
  'Game Cards & Grouped Home': ['GameCard', 'GameIcon'],
  'Game Lobby Shell': ['GameLobby', 'LobbyBody'],
};

function preview(component: GalleryComponent): { href: string; label: string; live: boolean } | null {
  if (component.name === 'TactilePiece') return { href: '/ui-kit?example=game-materials', label: 'Živá ukážka materiálov', live: true };
  if (['GameShell', 'GamePrompt', 'AnswerGroup', 'RetryAnnouncement'].includes(component.name)) {
    const state = component.name === 'RetryAnnouncement' ? 'retry' : 'ready';
    return { href: `/ui-kit?example=game-shell&state=${state}`, label: 'Živá ukážka herného rámu', live: true };
  }
  if (component.name === 'FindItGame') return { href: '/ui-kit?example=game-empty-pool', label: 'Živá ukážka prázdneho zásobníka', live: true };
  const section = Object.entries(liveSections).find(([, names]) => names.includes(component.name))?.[0];
  if (section) return { href: `#ui-demo-${section.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-')}`, label: 'Živá ukážka na tejto stránke', live: true };
  if (component.usages.length === 0) return null;
  if (component.name === 'HomeAvatarOverlay') return { href: '/', label: 'Otvoriť domov (vyžaduje zapnutý avatar experiment)', live: false };
  if (component.category === 'games') return { href: `/${component.source.split('/')[2]}`, label: 'Otvoriť hru (celý priebeh)', live: false };
  if (component.category === 'content') return { href: '/content', label: 'Otvoriť obsah (rodičovská brána)', live: false };
  if (component.category === 'home' || component.name === 'App') return { href: '/', label: 'Otvoriť domov', live: false };
  if (component.category === 'avatar') return { href: '/avatar-preview', label: 'Otvoriť experiment s avatarom', live: false };
  const parentRoutes: Record<string, string> = {
    ParentDashboardScreen: '/settings', ParentLayout: '/settings', ParentsGate: '/settings', ProtectedParentRoute: '/settings',
    GameSettingsOverviewScreen: '/settings/games', GameSettingsList: '/settings/games',
    GameSettingsScreen: '/settings/games/ALPHABET', SettingField: '/settings/games/ALPHABET', SettingsRenderer: '/settings/games/ALPHABET',
    AppSettingsScreen: '/settings/app', AutosaveNotice: '/settings/app', HelpFeedbackScreen: '/settings/help', FeedbackForm: '/settings/help',
  };
  return parentRoutes[component.name] ? { href: parentRoutes[component.name], label: 'Otvoriť rodičovský priebeh', live: false } : null;
}

export function ComponentGallery() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const visible = filterComponents(appComponentInventory, query, category);

  return (
    <section aria-labelledby="component-gallery-title" className="space-y-4" data-testid="component-gallery">
      <h2 id="component-gallery-title" className="text-2xl font-black sm:text-3xl">Katalóg všetkých komponentov</h2>
      <p className="max-w-3xl text-base font-medium text-text-muted">
        Inventár pomenovaných komponentov z celého src: zdieľané prvky, lokálne podkomponenty a celé obrazovky.
        Živé ukážky sú nižšie. Odkazy na celé priebehy používajú bežné nastavenia a rodičovskú bránu;
        hry, nahrávanie a 3D scéna sa v katalógu automaticky nespúšťajú.
      </p>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <SearchInput
          aria-label="Hľadať komponent, zdroj alebo použitie"
          placeholder="Názov, src/ cesta alebo miesto použitia…"
          value={query} onChange={event => setQuery(event.target.value)}
          onClear={() => setQuery('')} clearLabel="Vymazať hľadanie komponentov"
        />
        <label className="flex min-w-0 items-center gap-2 font-bold">
          Kategória
          <select aria-label="Kategória komponentov" value={category} onChange={event => setCategory(event.target.value)} className="min-h-12 min-w-0 max-w-full rounded-2xl border border-border-subtle bg-surface px-3 py-2">
            <option value="all">Všetky</option>
            {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <p role="status" aria-live="polite" className="text-sm font-bold text-text-muted" data-testid="gallery-result-count">
        {visible.length} z {appComponentInventory.length} komponentov
      </p>
      <div className="max-h-[32rem] overflow-y-auto rounded-2xl border border-border-subtle p-3" tabIndex={0} role="region" aria-label="Výsledky katalógu komponentov">
        {visible.length === 0 ? <p className="p-3 text-text-muted">Žiadne komponenty nezodpovedajú hľadaniu.</p> : (
          <div className="space-y-5">
            {Object.entries(categories).map(([key, label]) => {
              const entries = visible.filter(component => component.category === key);
              if (!entries.length) return null;
              return (
                <section key={key} aria-label={label} className="space-y-2">
                  <h3 className="text-lg font-black">{label} <span className="text-text-muted">({entries.length})</span></h3>
                  <ul className="grid gap-2 lg:grid-cols-2">
                    {entries.map(component => {
                      const example = preview(component);
                      return (
                        <li key={`${component.source}:${component.name}`} className="min-w-0" data-testid="gallery-component" data-component={component.name}>
                          <Card variant="row" className="h-full min-w-0 space-y-2">
                            <h4 className="break-words font-black">{component.name}</h4>
                            <p className="text-xs font-bold text-text-muted">{component.exported ? 'Exportovaný komponent' : 'Lokálny podkomponent'} · {component.usages.length ? `${component.usages.length} miest použitia` : 'Iba v zdroji — bez referencií v aplikácii'}</p>
                            <code className="block break-all text-xs">{component.source}</code>
                            {component.usages.length > 0 && (
                              <details className="text-sm">
                                <summary className="cursor-pointer font-bold">Miesta použitia</summary>
                                <ul className="mt-1 space-y-1">
                                  {component.usages.map(source => <li key={source}><code className="break-all text-xs">{source}</code></li>)}
                                </ul>
                              </details>
                            )}
                            {example ? (
                              <div className="text-sm">
                                {example.href.startsWith('#') ? <a href={example.href} className="font-bold text-action-primary underline">{example.label}</a> : <Link to={example.href} className="font-bold text-action-primary underline">{example.label}</Link>}
                                {!example.live && <p className="mt-1 text-xs text-text-muted">Kompozícia v aplikácii; bez samostatnej živej ukážky.</p>}
                              </div>
                            ) : <p className="text-xs text-text-muted">Komponent bez samostatnej živej ukážky.</p>}
                          </Card>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-xs text-text-muted">
        Generované zo zdrojov; zahŕňa aj kompatibilné a experimentálne komponenty. Externé knižnice a anonymné render funkcie nie sú samostatné položky.
        Aktualizácia: <code className="break-all">node --import tsx tools/ui-gallery/generate.ts</code>. Úplnosť kontrolujú unit testy.
      </p>
    </section>
  );
}
