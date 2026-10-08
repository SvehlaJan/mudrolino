import { ArrowRight, Box } from 'lucide-react';
import { CatalogImage } from './AvatarAssetInspector';
import type { CatalogItem, CatalogItemRevision, CatalogLibraryAsset } from './catalogLibrary';
import { catalogCardSummary } from './catalogReview';

export function CatalogDesignCard({ item, asset, review, base }: { item: CatalogItem; asset: CatalogLibraryAsset; review?: CatalogItemRevision; base?: string }) {
  const { modelLabels, reviewLabel, needsAttention } = catalogCardSummary(item, { asset, revision: review }, base);
  const preview = asset.previewUrl && !asset.references.some(reference => reference.thumbnailUrl === asset.previewUrl) && !asset.previewUrl.includes('/concepts/') ? asset.previewUrl : undefined;
  return <>
    <div className="relative grid h-56 grid-cols-2 gap-1 border-b border-shadow/5 bg-[#eff1ed] p-3">
      <div className="flex min-w-0 flex-col"><span className="mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-text-muted">Reference</span><CatalogImage src={asset.references[0]?.thumbnailUrl} alt={`${item.label} design reference`} className="min-h-0 flex-1 object-contain" /></div>
      <div className="flex min-w-0 flex-col"><span className="mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-text-muted">3D version</span>{preview && asset.model ? <CatalogImage src={preview} alt={`${item.label} model preview`} className="min-h-0 flex-1 object-contain" /> : <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-white/60 p-2 text-center text-text-muted"><Box size={30} aria-hidden="true" /><span className="text-xs font-semibold">{asset.model ? 'Open to inspect' : '3D pending'}</span></div>}</div>
    </div>
    <div className="p-4"><p className="text-[10px] font-black uppercase tracking-widest text-text-muted">{item.id} · {item.category}</p><h3 className="mt-2 break-words text-lg font-black leading-snug">{item.label}</h3>
      <p className="mt-2 text-xs leading-relaxed text-text-muted">{modelLabels.length ? modelLabels.join(' · ') : 'Reference available · 3D pending'}</p>
      <div className="mt-4 flex items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${needsAttention ? 'bg-amber-50 text-amber-900' : 'bg-accent-blue/10 text-text-main'}`}>{reviewLabel}</span><ArrowRight size={17} className="text-accent-blue" aria-hidden="true" /></div>
    </div>
  </>;
}
