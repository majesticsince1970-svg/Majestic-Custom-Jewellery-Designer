import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ProductPreset, ProductType } from '../types';
import { Settings as SettingsIcon, Save, RefreshCw, Sliders, Shield, Database, Check, AlertCircle, Edit3, Plus } from 'lucide-react';

export const Settings: React.FC = () => {
  const [presets, setPresets] = useState<ProductPreset[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductType>('ring');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // App settings state
  const [dailyLimit, setDailyLimit] = useState<number>(100);
  const [modelName, setModelName] = useState<string>('gpt-image-2-2026-04-21');
  const [todayUsageCount, setTodayUsageCount] = useState<number>(0);

  useEffect(() => {
    fetchPresets();
    fetchUsage();
  }, [selectedProduct]);

  const fetchPresets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_presets')
        .select('*')
        .eq('product_type', selectedProduct)
        .order('variant_index', { ascending: true });

      if (error) throw error;
      setPresets(data || []);
    } catch (err: any) {
      console.error('Fetch presets error:', err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsage = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('design_variations')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      setTodayUsageCount(count || 0);
    } catch (err) {
      console.warn('Fetch usage error:', err);
    }
  };

  const handlePresetChange = (id: string, field: keyof ProductPreset, value: any) => {
    setPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSavePreset = async (preset: ProductPreset) => {
    try {
      setSaving(true);
      setSuccessMsg(null);
      setErrorMsg(null);

      const { error } = await supabase
        .from('product_presets')
        .update({
          label: preset.label,
          design_text: preset.design_text,
          style_text: preset.style_text,
          gold_colour: preset.gold_colour,
          finish: preset.finish,
          stone_text: preset.stone_text,
          view_text: preset.view_text,
          font_en: preset.font_en,
          font_ar: preset.font_ar,
        })
        .eq('id', preset.id);

      if (error) throw error;
      setSuccessMsg(`Preset "${preset.label}" updated successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save preset.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="border-b border-majestic-200 pb-6">
        <span className="text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-majestic-100 text-majestic-900 border border-majestic-300">
          Admin Console
        </span>
        <h1 className="text-3xl font-serif font-bold text-stone-900 mt-2">
          Atelier Settings & Preset Management
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Configure daily generation rate limits, OpenAI image model snapshots, and live preset prompt formulations.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Cost & Limits Card */}
      <div className="bg-white p-6 rounded-3xl border border-majestic-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
          <Sliders className="w-5 h-5 text-majestic-700" />
          <h2 className="text-lg font-serif font-bold text-stone-900">
            Generation Quotas & AI Model Settings
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700">
              Daily Image Quota Limit:
            </label>
            <input
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold outline-none focus:border-majestic-500"
            />
            <p className="text-[11px] text-stone-400">
              Maximum AI concept images generated per calendar day across all showroom counters.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700">
              Today's Realtime Usage:
            </label>
            <div className="px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
              <span className="font-serif font-bold text-lg text-stone-900">{todayUsageCount} images</span>
              <span className="text-[11px] font-semibold text-majestic-700">
                {Math.round((todayUsageCount / dailyLimit) * 100)}% quota
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Tracked live in Supabase PostgreSQL database.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700">
              Target OpenAI Image Model:
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold outline-none focus:border-majestic-500 font-mono text-xs"
            />
            <p className="text-[11px] text-stone-400">
              Configured via OPENAI_IMAGE_MODEL environment variable in Supabase functions.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Catalogue Editor */}
      <div className="bg-white p-6 rounded-3xl border border-majestic-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-majestic-700" />
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-900">
                Product Presets Catalogue ({selectedProduct.toUpperCase()})
              </h2>
              <p className="text-xs text-stone-500">
                Customize design prompt instructions, fonts, and gold styling for each of the 5 variants.
              </p>
            </div>
          </div>

          {/* Product tabs */}
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
            {(['ring', 'pendant', 'locket', 'bracelet', 'earrings'] as ProductType[]).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedProduct(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  selectedProduct === p
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 5 Presets Accordion / Form List */}
        <div className="space-y-4">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="p-5 rounded-2xl border border-stone-200 bg-[#FAF9F5] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-majestic-700 text-white flex items-center justify-center text-xs font-bold">
                    {preset.variant_index}
                  </span>
                  <input
                    type="text"
                    value={preset.label}
                    onChange={(e) => handlePresetChange(preset.id, 'label', e.target.value)}
                    className="font-serif font-bold text-base text-stone-900 bg-transparent border-b border-dashed border-stone-400 focus:border-majestic-600 outline-none px-1"
                  />
                  <span className="text-[10px] text-stone-400 font-mono">({preset.preset_key})</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSavePreset(preset)}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-majestic-600 hover:bg-majestic-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" /> Save Preset #{preset.variant_index}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Design Shape & Structure:
                  </label>
                  <textarea
                    rows={2}
                    value={preset.design_text}
                    onChange={(e) => handlePresetChange(preset.id, 'design_text', e.target.value)}
                    className="w-full p-2 rounded-lg border border-stone-300 bg-white outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Lettering & Typography Look:
                  </label>
                  <textarea
                    rows={2}
                    value={preset.style_text}
                    onChange={(e) => handlePresetChange(preset.id, 'style_text', e.target.value)}
                    className="w-full p-2 rounded-lg border border-stone-300 bg-white outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Gemstone Specification:
                  </label>
                  <textarea
                    rows={2}
                    value={preset.stone_text || ''}
                    onChange={(e) => handlePresetChange(preset.id, 'stone_text', e.target.value)}
                    className="w-full p-2 rounded-lg border border-stone-300 bg-white outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Gold Colour & Finish:
                  </label>
                  <input
                    type="text"
                    value={preset.gold_colour || ''}
                    onChange={(e) => handlePresetChange(preset.id, 'gold_colour', e.target.value)}
                    className="w-full p-2 rounded-lg border border-stone-300 bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    English Font:
                  </label>
                  <input
                    type="text"
                    value={preset.font_en || ''}
                    onChange={(e) => handlePresetChange(preset.id, 'font_en', e.target.value)}
                    className="w-full p-2 rounded-lg border border-stone-300 bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Arabic Font:
                  </label>
                  <input
                    type="text"
                    value={preset.font_ar || ''}
                    onChange={(e) => handlePresetChange(preset.id, 'font_ar', e.target.value)}
                    className="w-full p-2 rounded-lg border border-stone-300 bg-white outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

