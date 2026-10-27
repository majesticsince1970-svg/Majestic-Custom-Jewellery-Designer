import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PRODUCT_CATALOGUE, GOLD_OPTIONS } from '../lib/presets';
import { ProductType, ProductPreset, NameMode } from '../types';
import { renderLetteringCanvas, RenderedLetteringResult } from '../lib/renderLettering';
import { LetteringStrip } from '../components/LetteringStrip';
import {
  Sparkles,
  CircleDot,
  HeartHandshake,
  Watch,
  Crown,
  ChevronDown,
  Upload,
  X,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Layers,
  Image as ImageIcon
} from 'lucide-react';

export const NewDesign: React.FC = () => {
  const navigate = useNavigate();

  // Wizard state
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [showMoreProducts, setShowMoreProducts] = useState(false);

  // Step 2: Style & details
  const [selectedStyle, setSelectedStyle] = useState<string>('let_vary');
  const [productOptions, setProductOptions] = useState<Record<string, any>>({});

  // Step 3: Names
  const [includeName, setIncludeName] = useState(false);
  const [nameMode, setNameMode] = useState<NameMode>('english');
  const [isCouple, setIsCouple] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [name2En, setName2En] = useState('');
  const [name2Ar, setName2Ar] = useState('');
  const [namePlacement, setNamePlacement] = useState<string>('');
  const [nameArConfirmed, setNameArConfirmed] = useState(false);

  // Step 4: Finishing
  const [selectedGolds, setSelectedGolds] = useState<string[]>(['22K yellow gold']);
  const [stonesAllowed, setStonesAllowed] = useState(true);
  const [notes, setNotes] = useState('');
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);

  // System & presets state
  const [presets, setPresets] = useState<ProductPreset[]>([]);
  const [letteringPreviews, setLetteringPreviews] = useState<Record<string, RenderedLetteringResult>>({});
  const [renderingLettering, setRenderingLettering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch presets whenever selected product changes
  useEffect(() => {
    if (!selectedProduct) return;

    const fetchPresets = async () => {
      const { data, error } = await supabase
        .from('product_presets')
        .select('*')
        .eq('product_type', selectedProduct)
        .eq('active', true)
        .order('variant_index', { ascending: true });

      if (!error && data) {
        setPresets(data);
      }
    };

    fetchPresets();

    // Reset style & placement for newly picked product
    const productDef = PRODUCT_CATALOGUE[selectedProduct];
    setSelectedStyle('let_vary');
    setNamePlacement(productDef.allowedPlacements[0]?.key || '');

    // Initialize default detail fields
    const initialOpts: Record<string, any> = {};
    productDef.detailFields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        initialOpts[field.key] = field.defaultValue;
      }
    });
    setProductOptions(initialOpts);
  }, [selectedProduct]);

  // Live lettering canvas re-generation
  useEffect(() => {
    if (!includeName || !selectedProduct || presets.length === 0) {
      setLetteringPreviews({});
      return;
    }

    const hasNameContent =
      (nameMode === 'english' && nameEn.trim()) ||
      (nameMode === 'arabic' && nameAr.trim()) ||
      (nameMode === 'both' && (nameEn.trim() || nameAr.trim()));

    if (!hasNameContent) {
      setLetteringPreviews({});
      return;
    }

    let isCancelled = false;
    const generateAllPreviews = async () => {
      setRenderingLettering(true);
      try {
        const results: Record<string, RenderedLetteringResult> = {};
        for (const preset of presets) {
          if (isCancelled) break;
          const res = await renderLetteringCanvas({
            preset,
            nameEn: nameEn.trim(),
            nameAr: nameAr.trim(),
            name2En: isCouple ? name2En.trim() : undefined,
            name2Ar: isCouple ? name2Ar.trim() : undefined,
            nameMode,
          });
          results[preset.preset_key] = res;
        }
        if (!isCancelled) {
          setLetteringPreviews(results);
        }
      } catch (err) {
        console.error('Lettering rendering error:', err);
      } finally {
        if (!isCancelled) setRenderingLettering(false);
      }
    };

    generateAllPreviews();

    return () => {
      isCancelled = true;
    };
  }, [includeName, selectedProduct, presets, nameMode, nameEn, nameAr, name2En, name2Ar, isCouple]);

  // Warning when name on ring top exceeds 8 characters
  const showRingLengthWarning = useMemo(() => {
    if (selectedProduct !== 'ring' || !includeName) return false;
    if (namePlacement !== 'across-top') return false;
    const primaryLen = (nameMode === 'arabic' ? nameAr : nameEn).length;
    const secondLen = isCouple ? (nameMode === 'arabic' ? name2Ar : name2En).length : 0;
    return primaryLen > 8 || secondLen > 8;
  }, [selectedProduct, includeName, namePlacement, nameMode, nameEn, nameAr, name2En, name2Ar, isCouple]);

  // Handle reference images upload (max 4, JPG/PNG, 10MB each)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const valid = files.filter((f) => {
      const isImage = f.type === 'image/jpeg' || f.type === 'image/png' || f.type === 'image/webp';
      const isSize = f.size <= 10 * 1024 * 1024;
      return isImage && isSize;
    });

    setReferenceFiles((prev) => [...prev, ...valid].slice(0, 4));
  };

  const removeReferenceFile = (index: number) => {
    setReferenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle gold selections
  const toggleGold = (val: string) => {
    if (selectedGolds.includes(val)) {
      if (selectedGolds.length > 1) {
        setSelectedGolds(selectedGolds.filter((g) => g !== val));
      }
    } else {
      setSelectedGolds([...selectedGolds, val]);
    }
  };

  // Validation before Generate
  const canGenerate = useMemo(() => {
    if (!selectedProduct) return false;
    if (includeName) {
      if (nameMode === 'english' && !nameEn.trim()) return false;
      if (nameMode === 'arabic' && !nameAr.trim()) return false;
      if (nameMode === 'both' && (!nameEn.trim() || !nameAr.trim())) return false;
      if (isCouple && nameMode === 'english' && !name2En.trim()) return false;
      if (isCouple && nameMode === 'arabic' && !name2Ar.trim()) return false;
      if (isCouple && nameMode === 'both' && (!name2En.trim() || !name2Ar.trim())) return false;
      if ((nameMode === 'arabic' || nameMode === 'both') && !nameArConfirmed) return false;
    }
    return true;
  }, [selectedProduct, includeName, nameMode, nameEn, nameAr, name2En, name2Ar, isCouple, nameArConfirmed]);

  // Execution: Submit and Generate
  const handleGenerate = async () => {
    if (!canGenerate || !selectedProduct) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const { data: { user } } = await supabase.auth.getUser();

      // 1. Insert row in design_requests
      const { data: requestRow, error: reqErr } = await supabase
        .from('design_requests')
        .insert({
          created_by: user?.id || null,
          product_type: selectedProduct,
          product_style: selectedStyle === 'let_vary' ? null : selectedStyle,
          product_options: productOptions,
          include_name: includeName,
          name_mode: includeName ? nameMode : 'none',
          name_en: includeName && (nameMode === 'english' || nameMode === 'both') ? nameEn.trim() : null,
          name_ar: includeName && (nameMode === 'arabic' || nameMode === 'both') ? nameAr.trim() : null,
          name2_en: includeName && isCouple && (nameMode === 'english' || nameMode === 'both') ? name2En.trim() : null,
          name2_ar: includeName && isCouple && (nameMode === 'arabic' || nameMode === 'both') ? name2Ar.trim() : null,
          name_placement: includeName ? namePlacement : null,
          name_ar_confirmed: nameArConfirmed,
          allowed_golds: selectedGolds,
          stones_allowed: stonesAllowed,
          notes: notes.trim() || null,
          status: 'generating',
        })
        .select()
        .single();

      if (reqErr || !requestRow) {
        throw new Error('Failed to create design request: ' + reqErr?.message);
      }

      const requestId = requestRow.id;

      // 2. Upload Lettering PNGs to Storage bucket 'lettering'
      if (includeName && Object.keys(letteringPreviews).length > 0) {
        for (const presetKey of Object.keys(letteringPreviews)) {
          const item = letteringPreviews[presetKey];
          const storagePath = `${requestId}/${presetKey}.png`;
          const { error: upErr } = await supabase.storage
            .from('lettering')
            .upload(storagePath, item.blob, { contentType: 'image/png', upsert: true });

          if (!upErr) {
            await supabase.from('reference_images').insert({
              request_id: requestId,
              kind: 'lettering',
              preset_key: presetKey,
              storage_path: storagePath,
            });
          }
        }
      }

      // 3. Upload customer reference photos to Storage bucket 'references'
      for (let i = 0; i < referenceFiles.length; i++) {
        const file = referenceFiles[i];
        const ext = file.name.split('.').pop() || 'png';
        const storagePath = `${requestId}/ref_${i}_${Date.now()}.${ext}`;

        const { error: refUpErr } = await supabase.storage
          .from('references')
          .upload(storagePath, file, { contentType: file.type, upsert: true });

        if (!refUpErr) {
          await supabase.from('reference_images').insert({
            request_id: requestId,
            kind: 'customer',
            storage_path: storagePath,
          });
        }
      }

      // 4. Trigger Edge Function generate-designs
      try {
        const { error: fnErr } = await supabase.functions.invoke('generate-designs', {
          body: { request_id: requestId },
        });
        if (fnErr) {
          console.warn('Edge function invoke notice:', fnErr.message);
        }
      } catch (err: any) {
        console.warn('Edge function call exception (will still open results):', err);
      }

      // 5. Navigate to Results page
      navigate(`/results/${requestId}`);
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmitError(err.message || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const productDef = selectedProduct ? PRODUCT_CATALOGUE[selectedProduct] : null;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
        <span className="text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-majestic-100 text-majestic-900 border border-majestic-300">
          Step-by-Step Bespoke Atelier
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900">
          Create Custom Jewellery Concept
        </h1>
        <p className="text-sm text-stone-500">
          Follow the 5 showroom steps to produce five distinct high-resolution AI designs with vector-accurate lettering.
        </p>
      </div>

      <div className="space-y-8">
        
        {/* STEP 1: PRODUCT PICKER */}
        <section className="bg-white p-6 sm:p-8 rounded-3xl border border-majestic-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
            <span className="w-7 h-7 rounded-full bg-majestic-800 text-majestic-100 flex items-center justify-center font-bold text-xs">
              1
            </span>
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-900">
                Choose the Product
              </h2>
              <p className="text-xs text-stone-500">
                Pick what to create first. The styles, placements, and 5 presets adapt immediately.
              </p>
            </div>
          </div>

          {/* Two Main Cards: Ring & Pendant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Ring Card */}
            <div
              onClick={() => setSelectedProduct('ring')}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex items-center gap-5 ${
                selectedProduct === 'ring'
                  ? 'border-majestic-500 bg-majestic-50/80 shadow-md ring-2 ring-majestic-200'
                  : 'border-stone-200 hover:border-majestic-300 hover:bg-[#FAF9F5]'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-majestic-800 to-majestic-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                <CircleDot className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-lg text-stone-900">Custom Ring</h3>
                  <span className="text-[10px] font-bold bg-majestic-100 text-majestic-800 px-2 py-0.5 rounded">
                    Popular
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  Name bands, signets, statement crowns & couple rings with Indian sizes.
                </p>
              </div>
            </div>

            {/* Pendant Card */}
            <div
              onClick={() => setSelectedProduct('pendant')}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex items-center gap-5 ${
                selectedProduct === 'pendant'
                  ? 'border-majestic-500 bg-majestic-50/80 shadow-md ring-2 ring-majestic-200'
                  : 'border-stone-200 hover:border-majestic-300 hover:bg-[#FAF9F5]'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-majestic-800 to-majestic-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-lg text-stone-900">Custom Pendant</h3>
                  <span className="text-[10px] font-bold bg-majestic-100 text-majestic-800 px-2 py-0.5 rounded">
                    Bestseller
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  Script cut-out nameplates, Arabic calligraphy bars, discs & royal filigree.
                </p>
              </div>
            </div>
          </div>

          {/* Under 'More': Locket, Bracelet, Earrings */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreProducts(!showMoreProducts)}
              className="text-xs font-semibold text-majestic-800 hover:text-majestic-950 flex items-center gap-1.5 transition-colors"
            >
              <span>{showMoreProducts ? 'Hide additional products' : 'More Jewellery Categories (Locket, Bracelet, Earrings)'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreProducts ? 'rotate-180' : ''}`} />
            </button>

            {showMoreProducts && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-stone-100 animate-fade-in">
                {/* Locket */}
                <div
                  onClick={() => setSelectedProduct('locket')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    selectedProduct === 'locket'
                      ? 'border-majestic-500 bg-majestic-50 ring-1 ring-majestic-400'
                      : 'border-stone-200 hover:border-majestic-300 bg-stone-50/50'
                  }`}
                >
                  <HeartHandshake className="w-5 h-5 text-majestic-700 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-stone-800">Keepsake Locket</p>
                    <p className="text-stone-400 text-[11px]">Oval, round, heart</p>
                  </div>
                </div>

                {/* Bracelet */}
                <div
                  onClick={() => setSelectedProduct('bracelet')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    selectedProduct === 'bracelet'
                      ? 'border-majestic-500 bg-majestic-50 ring-1 ring-majestic-400'
                      : 'border-stone-200 hover:border-majestic-300 bg-stone-50/50'
                  }`}
                >
                  <Watch className="w-5 h-5 text-majestic-700 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-stone-800">Luxury Bracelet</p>
                    <p className="text-stone-400 text-[11px]">Name bar, cuff, charm</p>
                  </div>
                </div>

                {/* Earrings */}
                <div
                  onClick={() => setSelectedProduct('earrings')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    selectedProduct === 'earrings'
                      ? 'border-majestic-500 bg-majestic-50 ring-1 ring-majestic-400'
                      : 'border-stone-200 hover:border-majestic-300 bg-stone-50/50'
                  }`}
                >
                  <Crown className="w-5 h-5 text-majestic-700 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-stone-800">Designer Earrings</p>
                    <p className="text-stone-400 text-[11px]">Studs & drops</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ONLY SHOW STEPS 2 to 5 AFTER PRODUCT IS PICKED */}
        {selectedProduct && productDef && (
          <>
            {/* STEP 2: PRODUCT STYLE AND DETAILS */}
            <section className="bg-white p-6 sm:p-8 rounded-3xl border border-majestic-200 shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                <span className="w-7 h-7 rounded-full bg-majestic-800 text-majestic-100 flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <div>
                  <h2 className="text-lg font-serif font-bold text-stone-900">
                    Product Style & Specifications
                  </h2>
                  <p className="text-xs text-stone-500">
                    Tailored options for {productDef.label}. Choose a specific style or let the 5 presets explore all variations.
                  </p>
                </div>
              </div>

              {/* Style Picker */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-2">
                  Select Architectural Style:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {productDef.styles.map((style) => (
                    <div
                      key={style.key}
                      onClick={() => setSelectedStyle(style.key)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedStyle === style.key
                          ? 'border-majestic-500 bg-majestic-50/90 ring-1 ring-majestic-400 shadow-xs'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <p className="text-xs font-bold text-stone-900">{style.label}</p>
                      <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">{style.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specific Detail Fields */}
              {productDef.detailFields.length > 0 && (
                <div className="pt-2 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {productDef.detailFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                        {field.label}:
                      </label>
                      {field.type === 'select' && (
                        <select
                          value={productOptions[field.key] || ''}
                          onChange={(e) =>
                            setProductOptions((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-majestic-500 text-xs outline-none bg-white font-medium"
                        >
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {field.type === 'checkbox' && (
                        <label className="flex items-center gap-2.5 mt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={productOptions[field.key] ?? true}
                            onChange={(e) =>
                              setProductOptions((prev) => ({ ...prev, [field.key]: e.target.checked }))
                            }
                            className="w-4 h-4 rounded text-majestic-600 focus:ring-majestic-500 border-stone-300"
                          />
                          <span className="text-xs text-stone-700 font-medium">Attach suspension chain to pendant</span>
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* STEP 3: NAMES (OPTIONAL) */}
            <section className="bg-white p-6 sm:p-8 rounded-3xl border border-majestic-200 shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-majestic-800 text-majestic-100 flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-stone-900">
                      Personalized Lettering & Inscriptions
                    </h2>
                    <p className="text-xs text-stone-500">
                      Include customer names in English cursive, Arabic calligraphy, or dual-script.
                    </p>
                  </div>
                </div>

                {/* Include a name switch */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <span className="text-xs font-bold text-stone-700">Include a Name</span>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeName}
                      onChange={(e) => setIncludeName(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-majestic-600"></div>
                  </div>
                </label>
              </div>

              {includeName && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Language Mode Selector */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setNameMode('english')}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                        nameMode === 'english'
                          ? 'bg-majestic-600 text-white border-majestic-600 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      English Script
                    </button>
                    <button
                      type="button"
                      onClick={() => setNameMode('arabic')}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                        nameMode === 'arabic'
                          ? 'bg-majestic-600 text-white border-majestic-600 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Arabic Calligraphy (عربي)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNameMode('both')}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                        nameMode === 'both'
                          ? 'bg-majestic-600 text-white border-majestic-600 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Both (Dual Script)
                    </button>
                  </div>

                  {/* Couple switch */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="coupleSwitch"
                      checked={isCouple}
                      onChange={(e) => setIsCouple(e.target.checked)}
                      className="w-4 h-4 rounded text-majestic-600 focus:ring-majestic-500 border-stone-300"
                    />
                    <label htmlFor="coupleSwitch" className="text-xs font-semibold text-stone-700 cursor-pointer">
                      Couple Design (Two names, e.g. "Hadi & Sara" or couple matching ring)
                    </label>
                  </div>

                  {/* Input Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Primary English Name */}
                    {(nameMode === 'english' || nameMode === 'both') && (
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Primary Name (English):
                        </label>
                        <input
                          type="text"
                          value={nameEn}
                          onChange={(e) => setNameEn(e.target.value)}
                          placeholder="e.g. Hadi"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-majestic-500 text-sm outline-none font-medium"
                        />
                      </div>
                    )}

                    {/* Primary Arabic Name */}
                    {(nameMode === 'arabic' || nameMode === 'both') && (
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          الاسم بالعربية (Arabic Input - RTL):
                        </label>
                        <input
                          type="text"
                          dir="rtl"
                          value={nameAr}
                          onChange={(e) => setNameAr(e.target.value)}
                          placeholder="مثال: هادي"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-majestic-500 text-sm outline-none font-arabic font-bold text-right"
                        />
                      </div>
                    )}

                    {/* Second English Name for Couple */}
                    {isCouple && (nameMode === 'english' || nameMode === 'both') && (
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Second Name (English):
                        </label>
                        <input
                          type="text"
                          value={name2En}
                          onChange={(e) => setName2En(e.target.value)}
                          placeholder="e.g. Sara"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-majestic-500 text-sm outline-none font-medium"
                        />
                      </div>
                    )}

                    {/* Second Arabic Name for Couple */}
                    {isCouple && (nameMode === 'arabic' || nameMode === 'both') && (
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          الاسم الثاني بالعربية (Second Arabic Name):
                        </label>
                        <input
                          type="text"
                          dir="rtl"
                          value={name2Ar}
                          onChange={(e) => setName2Ar(e.target.value)}
                          placeholder="مثال: سارة"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-majestic-500 text-sm outline-none font-arabic font-bold text-right"
                        />
                      </div>
                    )}
                  </div>

                  {/* Name Placement Picker (Limited to product's allowed placements) */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Name Placement on {productDef.label}:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {productDef.allowedPlacements.map((plc) => (
                        <button
                          key={plc.key}
                          type="button"
                          onClick={() => setNamePlacement(plc.key)}
                          className={`py-2 px-3 rounded-xl text-xs font-medium border text-left truncate transition-all ${
                            namePlacement === plc.key
                              ? 'bg-majestic-100 text-majestic-900 border-majestic-400 font-bold'
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {plc.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Character Length Warning for Ring Top */}
                  {showRingLengthWarning && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>
                        Names longer than 8 letters may appear condensed on a ring top. Consider moving to band outer curvature or inner engraving for optimal legibility.
                      </span>
                    </div>
                  )}

                </div>
              )}
            </section>

            {/* STEP 4: LETTERING PREVIEW (ONLY WHEN NAME IS ON) */}
            {includeName && presets.length > 0 && Object.keys(letteringPreviews).length > 0 && (
              <section className="animate-fade-in">
                <LetteringStrip
                  presets={presets}
                  previews={letteringPreviews}
                  nameMode={nameMode}
                  nameArConfirmed={nameArConfirmed}
                  onConfirmArabic={setNameArConfirmed}
                />
              </section>
            )}

            {/* STEP 5: FINISHING, REFERENCES & GENERATE */}
            <section className="bg-white p-6 sm:p-8 rounded-3xl border border-majestic-200 shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                <span className="w-7 h-7 rounded-full bg-majestic-800 text-majestic-100 flex items-center justify-center font-bold text-xs">
                  5
                </span>
                <div>
                  <h2 className="text-lg font-serif font-bold text-stone-900">
                    Finishing, Reference Photos & Generation
                  </h2>
                  <p className="text-xs text-stone-500">
                    Select gold finishes, gemstone preferences, optional customer reference photos, and trigger atelier generation.
                  </p>
                </div>
              </div>

              {/* Gold Colours */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-2">
                  Permitted Gold Colours & Alloys:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {GOLD_OPTIONS.map((gold) => {
                    const isSelected = selectedGolds.includes(gold.value);
                    return (
                      <div
                        key={gold.value}
                        onClick={() => toggleGold(gold.value)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                          isSelected
                            ? 'border-majestic-500 bg-majestic-50/80 ring-1 ring-majestic-400'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full border border-stone-300 shadow-xs shrink-0"
                          style={{ background: gold.swatch }}
                        />
                        <span className="text-xs font-medium text-stone-800 truncate">
                          {gold.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gemstones Switch */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-stone-50 border border-stone-200">
                <div>
                  <p className="text-xs font-bold text-stone-800">Include Gemstone Accents</p>
                  <p className="text-[11px] text-stone-500">
                    When enabled, presets add emeralds, rubies, sapphires, and diamond pavé. When off, all 5 presets render in plain gold.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                  <input
                    type="checkbox"
                    checked={stonesAllowed}
                    onChange={(e) => setStonesAllowed(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-majestic-600"></div>
                </label>
              </div>

              {/* Customer Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Showroom Special Notes / Customer Request:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Customer prefers matte bevelled shoulders, vintage milgrain edge, or high cathedral setting..."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:border-majestic-500 text-xs outline-none resize-none font-medium"
                />
              </div>

              {/* Customer Reference Photos (Up to 4) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-stone-700">
                    Customer Reference Photos (Optional, up to 4 photos):
                  </label>
                  <span className="text-[11px] text-stone-400">
                    {referenceFiles.length}/4 uploaded
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {referenceFiles.map((file, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-300 group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Customer Reference"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeReferenceFile(idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {referenceFiles.length < 4 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-stone-300 hover:border-majestic-500 bg-[#FAF9F5] flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors group">
                      <Upload className="w-6 h-6 text-stone-400 group-hover:text-majestic-600 mb-1" />
                      <span className="text-[11px] font-semibold text-stone-600 group-hover:text-majestic-800">
                        Add Photo
                      </span>
                      <span className="text-[9px] text-stone-400 mt-0.5">JPG/PNG &lt; 10MB</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {submitError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Generate Button */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <div className="text-xs text-stone-500">
                  {includeName && (nameMode === 'arabic' || nameMode === 'both') && !nameArConfirmed ? (
                    <span className="text-amber-700 font-medium">
                      Confirm Arabic spelling in Step 4 to unlock generation.
                    </span>
                  ) : (
                    <span>Ready to launch 5 parallel AI design renders.</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canGenerate || submitting}
                  className="py-3.5 px-8 rounded-xl bg-gradient-to-r from-majestic-700 via-majestic-600 to-majestic-500 hover:from-majestic-800 hover:to-majestic-600 text-white font-serif font-bold text-sm tracking-wide shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Design Set...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate 5 Designs</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </section>
          </>
        )}

      </div>
    </div>
  );
};
