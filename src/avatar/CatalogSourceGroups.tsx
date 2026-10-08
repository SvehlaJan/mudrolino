import { ArrowUpRight } from 'lucide-react';
import type { CatalogSource } from './catalogLibrary';
import { splitCatalogSources } from './catalogReview';

const labels = { construction: 'Blender scenes, builders & metadata', proof: 'Technical evidence', exports: '3D exports', history: 'Historical files' };
export function CatalogSourceGroups({ sources }: { sources: CatalogSource[] }) {
  const groups = splitCatalogSources(sources);
  return <div className="mt-4 space-y-3">{(Object.keys(labels) as (keyof typeof labels)[]).filter(key => groups[key].length).map(key => <details key={key} className="rounded-xl border border-shadow/10 p-3">
    <summary className="cursor-pointer text-sm font-bold outline-offset-4 focus-visible:outline-2 focus-visible:outline-accent-blue">{labels[key]} <span className="font-normal text-text-muted">({groups[key].length})</span></summary>
    {key === 'history' && <p className="mt-3 text-xs text-text-muted">Earlier attempts and rejected work. These files do not establish the current revision’s status.</p>}
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">{groups[key].map(source => <li key={source.url} className="min-w-0"><a data-testid="asset-source" href={source.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-shadow/10 p-3 hover:border-accent-blue/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-blue">
      <span className="flex items-start justify-between gap-2 text-sm font-bold"><span className="min-w-0 break-all">{source.label}</span><ArrowUpRight size={15} className="shrink-0" aria-hidden="true" /></span>
      <span className="mt-1 block break-all font-mono text-[11px] text-text-muted">{source.path}</span>
    </a></li>)}</ul>
  </details>)}</div>;
}
