import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Box, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '../shared/ui';
import type { CatalogLibraryAsset, CatalogLibraryManifest } from './catalogLibrary';
import { CatalogModelInspector } from './CatalogModelInspector';

interface ImageProps { src?: string; alt: string; className?: string; testId?: string }
export function CatalogImage({ src, alt, className = '', testId }: ImageProps) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt={alt} loading="lazy" data-testid={testId} className={className} onError={() => setFailed(true)} /> : (
    <div className={`flex flex-col items-center justify-center gap-2 text-text-muted ${className}`} role="img" aria-label={`${alt}: image unavailable`}>
      <ImageIcon size={32} aria-hidden="true" /><span className="text-xs font-semibold">{src ? 'Image unavailable' : 'No reference image'}</span>
    </div>
  );
}

interface Props { asset: CatalogLibraryAsset; animations: CatalogLibraryManifest['animations']; onBack: () => void }
export function AvatarAssetInspector({ asset, animations, onBack }: Props) {
  const [referenceId, setReferenceId] = useState('');
  const reference = asset.references.find(item => item.id === referenceId) ?? asset.references[0];
  const modelIdentity = asset.model ? [asset.model.id, asset.model.modelUrl, asset.model.garmentUrl, asset.model.slot, asset.supportsGait].join('|') : '';
  return (
    <div className="space-y-6">
      <Button size="parent" tone="quiet" density="compact" icon={<ArrowLeft size={17} />} onClick={onBack}>Back to gallery</Button>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><p className="break-all text-xs font-black uppercase tracking-[0.18em] text-accent-blue">{asset.id} / {asset.category} / {asset.base}</p>
          <h1 data-testid="asset-title" className="mt-2 break-words text-3xl font-black leading-tight sm:text-4xl">{asset.label}</h1>
          <p data-testid="asset-status" className="mt-3 max-w-3xl text-sm leading-relaxed text-text-muted">{asset.statusDetail}</p>
        </div>
        <span className="rounded-full border border-accent-blue/20 bg-accent-blue/10 px-4 py-2 text-xs font-bold text-text-main">{asset.status.replaceAll('-', ' ')}</span>
      </header>
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <section className="overflow-hidden rounded-3xl border border-shadow/10 bg-white shadow-chip" aria-label="Reference images">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-shadow/10 p-5">
              <h2 className="flex items-center gap-2 text-lg font-black"><ImageIcon size={20} aria-hidden="true" />2D references</h2>
              {reference && <a href={reference.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg text-sm font-bold text-accent-blue outline-offset-4 focus-visible:outline-2 focus-visible:outline-accent-blue">Open original image <ArrowUpRight size={16} aria-hidden="true" /></a>}
            </div>
            {reference ? <>
              <div className="flex min-h-60 items-center justify-center bg-[#f4f5f2] p-4 sm:p-6"><CatalogImage key={reference.url} src={reference.url} alt={reference.label} testId="asset-reference" className="max-h-[500px] w-full object-contain" /></div>
              <div className="space-y-4 p-5">
                <p className="break-words text-sm font-bold">{reference.label}</p>
                {asset.references.length > 1 && <div className="flex flex-wrap gap-2" aria-label="Select reference image">{asset.references.map(item => <Button key={item.id} size="parent" density="compact" tone={item.id === reference.id ? 'primary' : 'neutral'} aria-pressed={item.id === reference.id} onClick={() => setReferenceId(item.id)} className="max-w-full break-words text-left">{item.label}</Button>)}</div>}
                {reference.prompt ? <details className="rounded-2xl border border-shadow/10 bg-bg-light p-4"><summary className="cursor-pointer rounded-lg text-sm font-bold outline-offset-4 focus-visible:outline-2 focus-visible:outline-accent-blue">Generation prompt</summary><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-muted">{reference.prompt}</p></details> : <p className="text-xs text-text-muted">Generation prompt unavailable for this reference.</p>}
              </div>
            </> : <div className="p-8 text-sm text-text-muted">No 2D reference is available for this asset.</div>}
          </section>
          {asset.model ? <section aria-label="Interactive 3D inspection" className="min-w-0"><CatalogModelInspector key={modelIdentity} entry={asset.model} animations={animations} supportsGait={asset.supportsGait === true} layout="comparison" /></section> : <section className="rounded-3xl border border-dashed border-accent-blue/30 bg-accent-blue/5 p-6">
            <h2 className="flex items-center gap-2 text-lg font-black"><Box size={20} aria-hidden="true" />3D pending</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">This asset has no inspectable 3D model in the current inventory. {asset.base === 'female' ? 'Female references are available; a fitted female 3D catalog is still pending.' : 'Continue from the available references and source files.'}</p>
          </section>}
      </div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-shadow/10 bg-white p-5 shadow-chip">
            <h2 className="text-lg font-black">Progress facts</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-text-muted">Fit verification</dt><dd className="text-right font-bold">{asset.fitVerified ? 'Verified' : 'Not verified'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-text-muted">Visual acceptance</dt><dd className="text-right font-bold">{asset.accepted ? 'Accepted' : 'Not accepted'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-text-muted">Inventory</dt><dd className="text-right font-bold">{asset.history ? 'Earlier attempt / history' : 'Current'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-text-muted">Available formats</dt><dd className="text-right font-bold">{[asset.references.length > 0 && '2D', asset.model && '3D'].filter(Boolean).join(' + ') || 'Sources only'}</dd></div>
            </dl>
          </section>
          <section className="rounded-3xl border border-shadow/10 bg-white p-5 shadow-chip">
            <h2 className="flex items-center gap-2 text-lg font-black"><FileText size={19} aria-hidden="true" />Source files</h2>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">Original models, native scenes, build scripts and available proof.</p>
            {asset.sources.length > 0 ? <ul className="mt-4 grid gap-2 sm:grid-cols-2">{asset.sources.map(source => <li key={source.url} className="min-w-0"><a data-testid="asset-source" href={source.url} target="_blank" rel="noreferrer" className="group block rounded-xl border border-shadow/10 p-3 transition-colors hover:border-accent-blue/40 hover:bg-accent-blue/5 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-blue"><span className="flex min-w-0 items-start justify-between gap-2 text-sm font-bold"><span className="min-w-0 break-all">{source.label}</span><ArrowUpRight size={15} className="shrink-0" aria-hidden="true" /></span><span className="mt-1 block break-all font-mono text-[11px] leading-relaxed text-text-muted">{source.path}</span><span className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-accent-blue">{source.role}</span></a></li>)}</ul> : <p className="mt-4 text-sm text-text-muted">No source files or verification reports are available for this asset.</p>}
          </section>
      </div>
    </div>
  );
}
