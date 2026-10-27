import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DesignRequest, DesignVariation, ProductPreset, ReferenceImage } from '../types';
import { DesignCard } from '../components/DesignCard';
import { Lightbox } from '../components/Lightbox';
import { RefineModal } from '../components/RefineModal';
import { getSignedDesignUrl, downloadSingleDesign, downloadSelectedDesignsAsZip } from '../lib/download';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  ArrowLeft,
  Download,
  CheckSquare,
  Square,
  RefreshCw,
  Loader2,
  AlertCircle,
  Gem,
  Layers,
  FileArchive
} from 'lucide-react';

export const Results: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();

  const [request, setRequest] = useState<DesignRequest | null>(null);
  const [variations, setVariations] = useState<DesignVariation[]>([]);
  const [presets, setPresets] = useState<Record<string, ProductPreset>>({});
  const [letteringMap, setLetteringMap] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeLightboxVar, setActiveLightboxVar] = useState<DesignVariation | null>(null);
  const [refineTargetVar, setRefineTargetVar] = useState<DesignVariation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!requestId) return;

    try {
      // 1. Fetch design request
      const { data: reqData, error: reqErr } = await supabase
        .from('design_requests')
        .select('*, profiles(*)')
        .eq('id', requestId)
        .single();

      if (reqErr || !reqData) {
        throw new Error('Design request not found');
      }
      setRequest(reqData);

      // 2. Fetch presets
      const { data: presetData } = await supabase
        .from('product_presets')
        .select('*')
        .eq('product_type', reqData.product_type);

      const pMap: Record<string, ProductPreset> = {};
      presetData?.forEach((p) => {
        pMap[p.id] = p;
      });
      setPresets(pMap);

      // 3. Fetch lettering references
      const { data: refData } = await supabase
        .from('reference_images')
        .select('*')
        .eq('request_id', requestId)
        .eq('kind', 'lettering');

      const letUrls: Record<string, string> = {};
      if (refData) {
        for (const ref of refData) {
          try {
            const { data: signed } = await supabase.storage
              .from('lettering')
              .createSignedUrl(ref.storage_path, 3600);
            if (signed?.signedUrl && ref.preset_key) {
              letUrls[ref.preset_key] = signed.signedUrl;
            }
          } catch (e) {
            console.warn('Lettering signed url error:', e);
          }
        }
      }
      setLetteringMap(letUrls);

      // 4. Fetch design variations
      const { data: varData, error: varErr } = await supabase
        .from('design_variations')
        .select('*')
        .eq('request_id', requestId)
        .order('variant_index', { ascending: true })
        .order('created_at', { ascending: true });

      if (varErr) throw varErr;

      // Group parent and refined variations
      const topLevel: DesignVariation[] = [];
      const childrenMap: Record<string, DesignVariation[]> = {};

      for (const v of varData || []) {
        // Hydrate signed URL if done
        let signedUrl = v.signedUrl;
        if (v.status === 'done' && v.image_path) {
          try {
            signedUrl = await getSignedDesignUrl(v.image_path);
          } catch (e) {
            console.warn('Signed url error:', e);
          }
        }

        const item: DesignVariation = {
          ...v,
          signedUrl,
          product_presets: pMap[v.preset_id],
        };

        if (v.parent_id) {
          if (!childrenMap[v.parent_id]) childrenMap[v.parent_id] = [];
          childrenMap[v.parent_id].push(item);
        } else {
          topLevel.push(item);
        }
      }

      // Attach refined versions to parents
      topLevel.forEach((parent) => {
        parent.children = childrenMap[parent.id] || [];
      });

      setVariations(topLevel);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to load design results');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to Supabase Realtime updates on design_variations
  useEffect(() => {
    if (!requestId) return;

    const channel = supabase
      .channel(`design_variations_${requestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_variations',
          filter: `request_id=eq.${requestId}`,
        },
        async (payload) => {
          // Refresh list on realtime status change
          await fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, fetchData]);

  // Trigger celebration confetti when all 5 top-level designs are done
  useEffect(() => {
    if (variations.length >= 5 && variations.every((v) => v.status === 'done')) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C59E4E', '#EFE2C2', '#8F6C2A', '#D4AF37'],
      });
    }
  }, [variations]);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const readyIds = variations.filter((v) => v.status === 'done').map((v) => v.id);
    if (selectedIds.length === readyIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(readyIds);
    }
  };

  // Download single image
  const handleDownloadSingle = async (variation: DesignVariation) => {
    try {
      await downloadSingleDesign(variation, request || undefined);
    } catch (err: any) {
      alert('Download error: ' + err.message);
    }
  };

  // Download selected as ZIP
  const handleDownloadSelectedZip = async () => {
    const selectedVars = variations.filter((v) => selectedIds.includes(v.id) && v.status === 'done');
    if (selectedVars.length === 0) return;

    try {
      setDownloadingZip(true);
      await downloadSelectedDesignsAsZip(selectedVars, request || undefined, (p) => {
        setZipProgress(p);
      });
    } catch (err: any) {
      alert('ZIP creation error: ' + err.message);
    } finally {
      setDownloadingZip(false);
      setZipProgress(0);
    }
  };

  // Regenerate variation
  const handleRegenerate = async (variation: DesignVariation) => {
    try {
      const { error } = await supabase.functions.invoke('regenerate-variation', {
        body: { variation_id: variation.id },
      });
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert('Regeneration failed: ' + err.message);
    }
  };

  // Refine variation
  const handleRefineSubmit = async (variationId: string, instruction: string) => {
    const { error } = await supabase.functions.invoke('refine-variation', {
      body: { variation_id: variationId, instruction },
    });
    if (error) throw error;
    await fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-majestic-600" />
        <p className="text-sm font-serif font-bold text-stone-800">
          Loading Majestic Atelier Showroom Set...
        </p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-bold font-serif text-stone-900">
          {error || 'Design Request Not Found'}
        </h2>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl bg-majestic-600 hover:bg-majestic-700 text-white text-xs font-bold shadow-sm"
        >
          Create New Design
        </Link>
      </div>
    );
  }

  const readyCount = variations.filter((v) => v.status === 'done').length;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* Top Banner & Request Details */}
      <div className="bg-white p-6 rounded-3xl border border-majestic-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
              title="Back to New Design"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                  {request.include_name
                    ? `${request.name_en || request.name_ar} ${request.name2_en ? `& ${request.name2_en}` : ''}`
                    : 'Bespoke Atelier Concept'}
                </h1>
                <span className="capitalize px-2.5 py-0.5 rounded-full text-xs font-bold bg-majestic-100 text-majestic-900 border border-majestic-300">
                  {request.product_type}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Created on {new Date(request.created_at).toLocaleDateString()} · Showroom Concept Set
              </p>
            </div>
          </div>

          {/* Tag Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {request.allowed_golds?.map((g) => (
              <span key={g} className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium">
                {g}
              </span>
            ))}
            <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium">
              {request.stones_allowed ? 'With Gemstones' : 'Plain Gold (No Stones)'}
            </span>
            {request.name_placement && (
              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium">
                Placement: {request.name_placement}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {readyCount > 0 && (
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-semibold bg-white transition-colors"
            >
              {selectedIds.length === readyCount ? (
                <>
                  <CheckSquare className="w-4 h-4 text-majestic-600" /> Deselect All
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-stone-400" /> Select All ({readyCount})
                </>
              )}
            </button>
          )}

          <button
            onClick={handleDownloadSelectedZip}
            disabled={selectedIds.length === 0 || downloadingZip}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-majestic-600 hover:bg-majestic-700 text-white text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-40 transition-all"
          >
            {downloadingZip ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Packaging ZIP ({zipProgress}%)...
              </>
            ) : (
              <>
                <FileArchive className="w-4 h-4" /> Download Selected as ZIP ({selectedIds.length})
              </>
            )}
          </button>

          <button
            onClick={fetchData}
            title="Refresh status"
            className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* 5 Presets Design Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {variations.slice(0, 5).map((variation) => {
          const preset = presets[variation.preset_id || ''] || variation.product_presets;
          const letteringUrl = preset?.preset_key ? letteringMap[preset.preset_key] : undefined;

          return (
            <DesignCard
              key={variation.id}
              variation={variation}
              preset={preset}
              isSelected={selectedIds.includes(variation.id)}
              onToggleSelect={handleToggleSelect}
              onOpenLightbox={(v) => setActiveLightboxVar(v)}
              onRegenerate={handleRegenerate}
              onRefine={(v) => setRefineTargetVar(v)}
              onDownload={handleDownloadSingle}
              letteringPreviewUrl={letteringUrl}
            />
          );
        })}
      </div>

      {/* Production Notice */}
      <div className="p-4 rounded-2xl bg-majestic-50 border border-majestic-200 text-majestic-950 text-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gem className="w-5 h-5 text-majestic-600 shrink-0" />
          <span>
            <strong>Majestic Showroom Notice:</strong> Selected concept images provide visual and aesthetic guidance for customer approval. Lettering vector and CAD casting files are produced according to approved engineering specifications.
          </span>
        </div>
        <Link
          to="/"
          className="shrink-0 text-xs font-bold text-majestic-800 hover:underline ml-4"
        >
          + Design Another Piece
        </Link>
      </div>

      {/* Lightbox Modal */}
      <Lightbox
        variation={activeLightboxVar}
        preset={activeLightboxVar ? presets[activeLightboxVar.preset_id || ''] || activeLightboxVar.product_presets : undefined}
        letteringPreviewUrl={activeLightboxVar?.product_presets?.preset_key ? letteringMap[activeLightboxVar.product_presets.preset_key] : undefined}
        onClose={() => setActiveLightboxVar(null)}
        onDownload={handleDownloadSingle}
        onRegenerate={handleRegenerate}
        onRefine={(v) => {
          setActiveLightboxVar(null);
          setRefineTargetVar(v);
        }}
      />

      {/* Refine Modal */}
      <RefineModal
        variation={refineTargetVar}
        preset={refineTargetVar ? presets[refineTargetVar.preset_id || ''] || refineTargetVar.product_presets : undefined}
        onClose={() => setRefineTargetVar(null)}
        onSubmit={handleRefineSubmit}
      />

    </div>
  );
};
