import React from 'react';
import { DesignVariation, ProductPreset } from '../types';
import { Download, RefreshCw, Wand2, Check, AlertCircle, Eye, Loader2, Sparkles } from 'lucide-react';

interface DesignCardProps {
  variation: DesignVariation;
  preset?: ProductPreset;
  isSelected?: boolean;
  onToggleSelect: (id: string) => void;
  onOpenLightbox: (variation: DesignVariation) => void;
  onRegenerate: (variation: DesignVariation) => void;
  onRefine: (variation: DesignVariation) => void;
  onDownload: (variation: DesignVariation) => void;
  letteringPreviewUrl?: string;
  isRegenerating?: boolean;
}

export const DesignCard: React.FC<DesignCardProps> = ({
  variation,
  preset,
  isSelected,
  onToggleSelect,
  onOpenLightbox,
  onRegenerate,
  onRefine,
  onDownload,
  letteringPreviewUrl,
  isRegenerating,
}) => {
  const isDone = variation.status === 'done' && !!variation.signedUrl;
  const isRunning = variation.status === 'running' || isRegenerating;
  const isQueued = variation.status === 'queued';
  const isFailed = variation.status === 'failed';

  return (
    <div className={`relative bg-white rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden shadow-sm hover:shadow-lg ${
      isSelected ? 'ring-2 ring-majestic-500 border-majestic-400' : 'border-stone-200'
    }`}>
      {/* Top Header */}
      <div className="px-4 py-3 bg-[#FAF8F5] border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDone && (
            <input
              type="checkbox"
              checked={!!isSelected}
              onChange={() => onToggleSelect(variation.id)}
              className="w-4 h-4 rounded text-majestic-600 focus:ring-majestic-500 border-stone-300 cursor-pointer"
            />
          )}
          <span className="font-serif font-bold text-stone-900 text-sm truncate max-w-[170px]">
            {preset?.label || `Design #${variation.variant_index}`}
          </span>
        </div>

        {/* Status Badge */}
        <div>
          {isDone && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              <Check className="w-3 h-3" /> Ready
            </span>
          )}
          {isRunning && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Generating...
            </span>
          )}
          {isQueued && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600">
              Queued
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
              <AlertCircle className="w-3 h-3" /> Failed
            </span>
          )}
        </div>
      </div>

      {/* Image Display Area */}
      <div className="relative aspect-square w-full bg-[#F5F2EB] flex items-center justify-center overflow-hidden group">
        {isDone ? (
          <>
            <img
              src={variation.signedUrl!}
              alt={preset?.label || 'Generated Jewellery'}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
              onClick={() => onOpenLightbox(variation)}
            />
            {/* Quick action overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLightbox(variation);
                }}
                className="pointer-events-auto p-2 rounded-full bg-white/90 hover:bg-white text-stone-800 shadow-md hover:scale-110 transition-transform"
                title="View in Lightbox"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(variation);
                }}
                className="pointer-events-auto p-2 rounded-full bg-majestic-600 hover:bg-majestic-700 text-white shadow-md hover:scale-110 transition-transform"
                title="Download PNG"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
            {isRunning && (
              <div className="space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-majestic-100 flex items-center justify-center text-majestic-700">
                  <Sparkles className="w-7 h-7 animate-spin text-majestic-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-majestic-900">Crafting Concept...</p>
                  <p className="text-[11px] text-stone-500 mt-1">Sculpting metal & lettering reflections</p>
                </div>
              </div>
            )}

            {isQueued && (
              <div className="space-y-2 text-stone-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-stone-300" />
                <p className="text-xs">Waiting in studio queue...</p>
              </div>
            )}

            {isFailed && (
              <div className="space-y-3 max-w-[200px]">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                <p className="text-xs text-rose-700 line-clamp-3">
                  {variation.error || 'Generation timed out or service busy'}
                </p>
                <button
                  onClick={() => onRegenerate(variation)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Retry Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* Floating Mini Lettering Reference Badge */}
        {letteringPreviewUrl && (
          <div
            title="Approved Lettering Reference"
            className="absolute bottom-2 left-2 w-9 h-9 rounded-lg border-2 border-white shadow-md overflow-hidden bg-white cursor-pointer hover:scale-125 transition-transform"
            onClick={() => onOpenLightbox(variation)}
          >
            <img src={letteringPreviewUrl} alt="Lettering" className="w-full h-full object-contain" />
          </div>
        )}
      </div>

      {/* Preset Details & Metal Summary */}
      <div className="p-3.5 bg-white flex-1 flex flex-col justify-between text-xs space-y-2">
        <div>
          <p className="font-semibold text-stone-800 line-clamp-1">{preset?.gold_colour || 'Luxury Gold'}</p>
          <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5">{preset?.stone_text || preset?.design_text}</p>
        </div>

        {/* Refined Children Version Badges */}
        {variation.children && variation.children.length > 0 && (
          <div className="pt-2 border-t border-stone-100">
            <span className="text-[10px] text-stone-400 block mb-1">Refined Versions:</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {variation.children.map((child, idx) => (
                <button
                  key={child.id}
                  onClick={() => onOpenLightbox(child)}
                  className="w-7 h-7 rounded border border-majestic-300 overflow-hidden shrink-0 hover:scale-110 transition-transform"
                  title={`Refinement v${idx + 2}`}
                >
                  {child.signedUrl ? (
                    <img src={child.signedUrl} alt="Refinement" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-stone-100 flex items-center justify-center text-[9px]">
                      v{idx + 2}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Card Action Buttons */}
        {isDone && (
          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-stone-100">
            <button
              onClick={() => onRefine(variation)}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-majestic-50 hover:bg-majestic-100 text-majestic-800 font-semibold text-[11px] border border-majestic-200 transition-colors"
              title="Refine this design with specific instructions"
            >
              <Wand2 className="w-3 h-3 text-majestic-600" /> Refine
            </button>

            <button
              onClick={() => onRegenerate(variation)}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-700 font-medium text-[11px] border border-stone-200 transition-colors"
              title="Regenerate another concept for this preset"
            >
              <RefreshCw className="w-3 h-3 text-stone-500" /> New
            </button>

            <button
              onClick={() => onDownload(variation)}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-majestic-600 hover:bg-majestic-700 text-white font-semibold text-[11px] shadow-xs transition-colors"
              title="Download high-resolution image"
            >
              <Download className="w-3 h-3" /> Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

