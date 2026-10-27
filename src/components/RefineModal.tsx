import React, { useState } from 'react';
import { DesignVariation, ProductPreset } from '../types';
import { X, Wand2, Sparkles, Loader2 } from 'lucide-react';

interface RefineModalProps {
  variation: DesignVariation | null;
  preset?: ProductPreset;
  onClose: () => void;
  onSubmit: (variationId: string, instruction: string) => Promise<void>;
}

export const RefineModal: React.FC<RefineModalProps> = ({
  variation,
  preset,
  onClose,
  onSubmit,
}) => {
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!variation) return null;

  const suggestions = [
    'Make the gold band thinner and more delicate',
    'Add fine pavé diamonds along both edges',
    'Make the gold colour deeper 22K yellow',
    'Enhance the matte texture on the signet top',
    'Make the lettering cut-outs more pronounced',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await onSubmit(variation.id, instruction.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to refine variation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-majestic-200">
        
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-majestic-100 flex items-center justify-center text-majestic-700">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900">
                Refine Design Concept
              </h3>
              <p className="text-xs text-stone-500">
                {preset?.label} · Keep styling & apply modification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Refinement Instruction for AI Atelier:
            </label>
            <textarea
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Make the band thinner, make gold a warm rose tone, add smaller accent stones..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-majestic-500 focus:ring-2 focus:ring-majestic-200 text-sm outline-none transition-all resize-none"
              required
            />
          </div>

          {/* Quick suggestions */}
          <div>
            <span className="text-[11px] font-semibold text-stone-500 block mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-majestic-600" /> Showroom suggestions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInstruction(s)}
                  className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-majestic-100 text-[11px] text-stone-700 hover:text-majestic-900 border border-stone-200 transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !instruction.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-majestic-600 hover:bg-majestic-700 text-white text-xs font-bold shadow-md disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" /> Generate Refined Version
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

