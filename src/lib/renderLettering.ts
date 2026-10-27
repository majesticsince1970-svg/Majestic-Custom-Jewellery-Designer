import { ProductPreset } from '../types';

export interface RenderLetteringOptions {
  nameEn?: string | null;
  nameAr?: string | null;
  name2En?: string | null;
  name2Ar?: string | null;
  nameMode: 'none' | 'english' | 'arabic' | 'both';
  preset: ProductPreset;
}

export interface RenderedLetteringResult {
  presetKey: string;
  dataUrl: string;
  blob: Blob;
}

/**
 * Ensures all custom web fonts (Google Fonts) have loaded completely
 */
export async function ensureFontsLoaded(): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (err) {
      console.warn('document.fonts.ready error:', err);
    }
  }
}

/**
 * Renders high resolution 1024x1024 black lettering on solid white background.
 * The browser handles full native Arabic ligatures, dots, harakat, and RTL shaping.
 */
export async function renderLetteringCanvas(options: RenderLetteringOptions): Promise<RenderedLetteringResult> {
  await ensureFontsLoaded();

  const { nameEn, nameAr, name2En, name2Ar, nameMode, preset } = options;

  const width = 1024;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not obtain 2D canvas context');

  // Fill crisp pure white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Determine fonts to use based on preset and nameMode
  const fontEnName = preset.font_en || 'Cinzel';
  const fontArName = preset.font_ar || 'Aref Ruqaa';

  const centerX = width / 2;
  const centerY = height / 2;

  const hasPrimaryAr = (nameMode === 'arabic' || nameMode === 'both') && !!nameAr?.trim();
  const hasPrimaryEn = (nameMode === 'english' || nameMode === 'both') && !!nameEn?.trim();
  const hasSecondAr = !!name2Ar?.trim();
  const hasSecondEn = !!name2En?.trim();

  // Draw dual-script or multi-name layouts
  if (nameMode === 'both' && hasPrimaryEn && hasPrimaryAr) {
    // Top: English Name
    ctx.direction = 'ltr';
    ctx.font = `600 76px "${fontEnName}", serif`;
    let enText = nameEn!.trim();
    if (hasSecondEn) enText += ` & ${name2En!.trim()}`;
    ctx.fillText(enText, centerX, centerY - 80);

    // Subtle divider line
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 160, centerY);
    ctx.lineTo(centerX + 160, centerY);
    ctx.stroke();

    // Bottom: Arabic Name (with native RTL)
    ctx.direction = 'rtl';
    ctx.font = `bold 84px "${fontArName}", serif`;
    let arText = nameAr!.trim();
    if (hasSecondAr) arText += ` و ${name2Ar!.trim()}`;
    ctx.fillText(arText, centerX, centerY + 85);
  } else if (hasPrimaryAr) {
    // Pure Arabic Name
    ctx.direction = 'rtl';
    let arText = nameAr!.trim();
    if (hasSecondAr) arText += ` و ${name2Ar!.trim()}`;

    // Adjust font size based on length
    const fontSize = arText.length > 12 ? 90 : (arText.length > 7 ? 120 : 140);
    ctx.font = `bold ${fontSize}px "${fontArName}", serif`;
    ctx.fillText(arText, centerX, centerY);
  } else if (hasPrimaryEn) {
    // Pure English Name
    ctx.direction = 'ltr';
    let enText = nameEn!.trim();
    if (hasSecondEn) enText += ` & ${name2En!.trim()}`;

    const fontSize = enText.length > 15 ? 75 : (enText.length > 9 ? 95 : 120);
    ctx.font = `600 ${fontSize}px "${fontEnName}", cursive, serif`;
    ctx.fillText(enText, centerX, centerY);
  } else {
    // Fallback watermark if no name provided
    ctx.direction = 'ltr';
    ctx.font = '500 48px "Cinzel", serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('MAJESTIC ATELIER', centerX, centerY);
  }

  // Convert canvas to Blob & DataURL
  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas blob generation failed'));
    }, 'image/png');
  });

  return {
    presetKey: preset.preset_key,
    dataUrl,
    blob,
  };
}

