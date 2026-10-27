import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from './supabase';
import { DesignVariation, DesignRequest } from '../types';

/**
 * Gets a 10-minute signed download URL for an image in the private 'designs' bucket
 */
export async function getSignedDesignUrl(imagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('designs')
    .createSignedUrl(imagePath, 600); // 10 minutes = 600 seconds

  if (error || !data?.signedUrl) {
    throw new Error('Failed to create signed URL: ' + (error?.message || 'unknown error'));
  }
  return data.signedUrl;
}

/**
 * Sanitizes a string for use in filename
 */
function sanitizeFileName(str: string): string {
  return str.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_');
}

/**
 * Downloads a single image directly with formatted name: Majestic_{name}_{preset}.png
 */
export async function downloadSingleDesign(
  variation: DesignVariation,
  request?: DesignRequest
): Promise<void> {
  let downloadUrl = variation.signedUrl;
  if (!downloadUrl && variation.image_path) {
    downloadUrl = await getSignedDesignUrl(variation.image_path);
  }

  if (!downloadUrl) {
    throw new Error('Image URL is not available for download');
  }

  const namePart = request?.name_en || request?.name_ar || 'Bespoke';
  const presetPart = variation.product_presets?.preset_key || `Preset_${variation.variant_index}`;
  const fileName = `Majestic_${sanitizeFileName(namePart)}_${sanitizeFileName(presetPart)}.png`;

  const response = await fetch(downloadUrl);
  const blob = await response.blob();
  saveAs(blob, fileName);
}

/**
 * Downloads multiple selected designs packaged inside a single ZIP archive
 */
export async function downloadSelectedDesignsAsZip(
  variations: DesignVariation[],
  request?: DesignRequest,
  onProgress?: (percent: number) => void
): Promise<void> {
  if (variations.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder('Majestic_Custom_Designs') || zip;
  const namePart = request?.name_en || request?.name_ar || 'Bespoke';

  for (let i = 0; i < variations.length; i++) {
    const v = variations[i];
    let url = v.signedUrl;
    if (!url && v.image_path) {
      try {
        url = await getSignedDesignUrl(v.image_path);
      } catch (err) {
        console.warn(`Could not get signed URL for variation ${v.id}:`, err);
      }
    }

    if (url) {
      try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        const presetPart = v.product_presets?.preset_key || `Preset_${v.variant_index}`;
        const fileName = `Majestic_${sanitizeFileName(namePart)}_${sanitizeFileName(presetPart)}.png`;
        folder.file(fileName, blob);
      } catch (e) {
        console.error('Error fetching image for zip:', e);
      }
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / variations.length) * 100));
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipFileName = `Majestic_Custom_Designs_${sanitizeFileName(namePart)}_${new Date().toISOString().slice(0, 10)}.zip`;
  saveAs(zipBlob, zipFileName);
}
