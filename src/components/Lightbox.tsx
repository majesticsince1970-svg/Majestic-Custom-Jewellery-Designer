import React from 'react';
import { DesignVariation, ProductPreset } from '../types';
import { X, Download, RefreshCw, Wand2, ZoomIn, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

interface LightboxProps {
  variation: DesignVariation | null;
  preset?: ProductPreset;
  letteringPreviewUrl?: string;
  onClose: () => void;
  onDownload: (variation: DesignVariation) => void;
  onRegenerate: (variation: DesignVariation) => void;
  onRefine: (variation: DesignVariation) => void;
}

export const Lightbox: React.FC<LightboxProps> = ({
  variation,
  preset,
  letteringPreviewUrl,
  onClose,
  onDownload,
  onRegenerate,
  onRefine,
}) => {
  if (!variation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-stone-100">
        
        {/* Top Lightbox Bar */}
        <div className="px-6 py-4 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-majestic-400"></span>
            <div>
              <h3 className="font-serif text-lg font-bold text-white tracking-wide">
                {preset?.label || `Concept Variation #${variation.variant_index}`}
              </h3>
              <p className="text-xs text-stone-400">
                {preset?.gold_colour} · {preset?.style_text}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onRefine(variation)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-majestic-300 border border-stone-700 text-xs font-semibold transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" /> Refine Design
            </button>
            <button
              onClick={() => onRegenerate(variation)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </button>
            <button
              onClick={() => onDownload(variation)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-majestic-500 hover:bg-majestic-600 text-stone-950 text-xs font-bold transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Side-by-Side Comparison */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center justify-center">
          
          {/* Main AI Render (Left / 7 cols) */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center bg-black/40 rounded-2xl p-2 border border-stone-800">
            <div className="relative max-h-[62vh] aspect-square rounded-xl overflow-hidden shadow-2xl">
              <img
                src={variation.signedUrl!}
                alt="High Resolution Concept"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-[11px] text-stone-500 mt-2 text-center">
              AI Visual Concept · 1024×1024 Studio High Resolution
            </p>
          </div>

          {/* Side Reference & Typography Verification (Right / 4 cols) */}
          <div className="lg:col-span-4 space-y-4 bg-stone-950/60 p-5 rounded-2xl border border-stone-800/80">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-majestic-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> Lettering Verification
              </span>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-medium">
                Ground Truth
              </span>
            </div>

            {/* Approved lettering canvas preview */}
            {letteringPreviewUrl ? (
              <div className="space-y-2">
                <div className="aspect-square w-full max-w-[220px] mx-auto bg-white rounded-xl p-3 shadow-inner border border-stone-700 overflow-hidden flex items-center justify-center">
                  <img
                    src={letteringPreviewUrl}
                    alt="Lettering Vector Reference"
                    className="w-full h-full object-contain filter contrast-125"
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-stone-200">Customer Lettering Artwork</p>
                  <p className="text-[11px] text-stone-400">
                    Fonts: {preset?.font_en || 'Default'} {preset?.font_ar && ` / ${preset.font_ar}`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-stone-900 rounded-xl text-center text-xs text-stone-400">
                Design without lettering or typography
              </div>
            )}

            {/* Prompt details drawer */}
            <div className="space-y-1.5 pt-2 border-t border-stone-800">
              <span className="text-[11px] font-semibold text-stone-300">Prompt & Specifications:</span>
              <p className="text-[11px] text-stone-400 leading-relaxed max-h-36 overflow-y-auto bg-stone-900/90 p-3 rounded-lg border border-stone-800 select-all font-mono">
                {variation.prompt}
              </p>
            </div>

            {/* Production note */}
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-[11px] text-amber-200/90 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Visual reference for showroom selection only. Workshop CAD files and casting molds are created from the approved vector file.
              </span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
