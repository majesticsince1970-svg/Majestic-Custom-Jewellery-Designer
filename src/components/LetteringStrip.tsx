import React from 'react';
import { ProductPreset } from '../types';
import { RenderedLetteringResult } from '../lib/renderLettering';
import { CheckCircle2, AlertTriangle, Eye } from 'lucide-react';

interface LetteringStripProps {
  presets: ProductPreset[];
  previews: Record<string, RenderedLetteringResult>;
  nameMode: 'none' | 'english' | 'arabic' | 'both';
  nameArConfirmed: boolean;
  onConfirmArabic: (confirmed: boolean) => void;
  onPreviewClick?: (preview: RenderedLetteringResult, preset: ProductPreset) => void;
}

export const LetteringStrip: React.FC<LetteringStripProps> = ({
  presets,
  previews,
  nameMode,
  nameArConfirmed,
  onConfirmArabic,
  onPreviewClick,
}) => {
  const isArabicInvolved = nameMode === 'arabic' || nameMode === 'both';

  return (
    <div className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-majestic-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-serif font-bold text-stone-900">
              Live Lettering & Calligraphy Previews
            </h3>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Vector Accurate
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Confirmed browser-rendered typography sent directly to the AI model as ground truth reference.
          </p>
        </div>

        {isArabicInvolved && (
          <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
            nameArConfirmed
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-amber-50/80 border-amber-300 text-amber-950 animate-pulse'
          }`}>
            <input
              type="checkbox"
              checked={nameArConfirmed}
              onChange={(e) => onConfirmArabic(e.target.checked)}
              className="w-4 h-4 rounded text-majestic-600 focus:ring-majestic-500 border-stone-300"
            />
            <div className="text-xs">
              <span className="font-semibold block">Arabic spelling & dots confirmed</span>
              <span className="text-[11px] opacity-80">Required before generation</span>
            </div>
          </label>
        )}
      </div>

      {/* 5 Presets Typography Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {presets.slice(0, 5).map((preset) => {
          const preview = previews[preset.preset_key];
          return (
            <div
              key={preset.id}
              onClick={() => preview && onPreviewClick && onPreviewClick(preview, preset)}
              className="group relative bg-[#FAF9F5] border border-stone-200 rounded-xl p-3 flex flex-col items-center justify-between hover:border-majestic-400 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="w-full flex items-center justify-between text-[11px] font-semibold text-stone-500 mb-2">
                <span className="truncate max-w-[120px]">{preset.label}</span>
                <span className="text-majestic-600 font-bold">#{preset.variant_index}</span>
              </div>

              {/* Canvas Preview Image */}
              <div className="w-full aspect-square bg-white rounded-lg border border-stone-200 overflow-hidden flex items-center justify-center p-2 group-hover:scale-[1.02] transition-transform">
                {preview ? (
                  <img
                    src={preview.dataUrl}
                    alt={preset.label}
                    className="w-full h-full object-contain filter contrast-125"
                  />
                ) : (
                  <div className="text-stone-300 text-xs italic">Rendering...</div>
                )}
              </div>

              {/* Font Label */}
              <div className="w-full mt-2 text-center text-[11px] text-stone-500 truncate">
                {preset.font_en && <span>{preset.font_en}</span>}
                {preset.font_en && preset.font_ar && <span> · </span>}
                {preset.font_ar && <span>{preset.font_ar}</span>}
              </div>

              <div className="absolute inset-0 bg-majestic-900/10 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                <span className="px-2.5 py-1 bg-white/95 rounded-full text-xs font-semibold text-stone-800 shadow-sm flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Enlarge
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {isArabicInvolved && !nameArConfirmed && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-amber-800 text-xs border border-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Please verify all dots, joins and harakat above. Check the confirmation box above to unlock AI generation.
          </span>
        </div>
      )}
    </div>
  );
};

