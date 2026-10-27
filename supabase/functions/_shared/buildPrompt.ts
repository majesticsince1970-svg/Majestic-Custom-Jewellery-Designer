export interface RequestData {
  product_type: string;
  product_style?: string | null;
  product_options?: Record<string, any>;
  include_name: boolean;
  name_mode?: string | null;
  name_en?: string | null;
  name_ar?: string | null;
  name2_en?: string | null;
  name2_ar?: string | null;
  name_placement?: string | null;
  allowed_golds?: string[] | null;
  stones_allowed?: boolean | null;
  notes?: string | null;
}

export interface PresetData {
  id: string;
  product_type: string;
  variant_index: number;
  preset_key: string;
  label: string;
  design_text: string;
  style_text: string;
  font_en?: string | null;
  font_ar?: string | null;
  gold_colour?: string | null;
  finish?: string | null;
  stone_text?: string | null;
  view_text: string;
}

export function buildPrompt(req: RequestData, preset: PresetData, hasCustomerRefs: boolean = false): string {
  // 1. PRODUCT_TYPE & PRODUCT_STYLE_DESCRIPTION
  const productType = req.product_type.toUpperCase();
  const styleDesc = req.product_style && req.product_style !== 'let_vary'
    ? `${req.product_style} style, ${preset.design_text}`
    : preset.design_text;

  // 2. METAL & FINISH
  const gold = (req.allowed_golds && req.allowed_golds.length > 0)
    ? req.allowed_golds.join(' or ')
    : (preset.gold_colour || '18K yellow gold');
  const finish = preset.finish || 'high polish luxury finish';

  // 3. PRODUCT_DETAILS
  let productDetails = '';
  if (req.product_options && Object.keys(req.product_options).length > 0) {
    const opts = req.product_options;
    const parts: string[] = [];
    if (opts.ringSize) parts.push(`Indian Ring Size ${opts.ringSize}`);
    if (opts.bandWidth) parts.push(`Band width: ${opts.bandWidth}`);
    if (opts.chainStyle) parts.push(`Chain: ${opts.chainStyle} (${opts.chainLength || 'standard'})`);
    if (opts.withChain === false) parts.push('Pendant only without chain');
    if (opts.wristSize) parts.push(`Wrist size: ${opts.wristSize}`);
    if (opts.locketShape) parts.push(`Locket shape: ${opts.locketShape}`);
    if (opts.earringType) parts.push(`Type: ${opts.earringType}`);
    if (parts.length > 0) {
      productDetails = `Details: ${parts.join(', ')}. `;
    }
  }

  // 4. NAME BLOCK
  let nameBlock = '';
  if (req.include_name) {
    const namesList: string[] = [];
    if (req.name_en) namesList.push(req.name_en);
    if (req.name_ar) namesList.push(req.name_ar);
    if (req.name2_en) namesList.push(`& ${req.name2_en}`);
    if (req.name2_ar) namesList.push(`& ${req.name2_ar}`);

    const nameText = namesList.join(' ') || 'Custom Name';
    const placement = req.name_placement || 'front face';
    nameBlock = `Include the name "${nameText}" as ${placement}. Copy the exact letters, shapes, dots and joins from the FIRST reference image. Do not change spelling, add letters or translate. Arabic reads right to left. `;
  } else {
    nameBlock = 'Do not add any letters, words, numerals or text. Keep all surfaces clean and ornamental without inscriptions. ';
  }

  // 5. LETTERING AND DESIGN STYLE
  const letteringAndStyle = preset.style_text;

  // 6. GEMSTONES
  let stoneDesc = 'Plain gold without gemstones.';
  if (req.stones_allowed !== false && preset.stone_text) {
    stoneDesc = preset.stone_text;
  }

  // 7. REFERENCES BLOCK
  const refsBlock = hasCustomerRefs
    ? 'Use the other reference images only for mood, finish, and design inspiration, not for the letters. '
    : '';

  // 8. VIEW
  const view = preset.view_text;

  // 9. NOTES
  const customerNotes = req.notes ? `Customer specific preference: ${req.notes}. ` : '';

  // Construct complete prompt following the document template:
  // "Create a realistic studio product photo of a {PRODUCT_TYPE}: {PRODUCT_STYLE_DESCRIPTION}.Metal: {GOLD_COLOUR}, {FINISH}. {PRODUCT_DETAILS}[NAME/NO NAME]Lettering and design style: {STYLE_DESCRIPTION} Gemstones: {STONE_DESCRIPTION}[REFERENCES]View: {VIEW}. Plain soft white background, soft jewellery lighting, sharp focus, no hands, no logo, no watermark."
  return `Create a realistic studio product photo of a ${productType}: ${styleDesc}. Metal: ${gold}, ${finish}. ${productDetails}${nameBlock}Lettering and design style: ${letteringAndStyle}. Gemstones: ${stoneDesc}. ${customerNotes}${refsBlock}View: ${view}. Plain soft white background, soft jewellery lighting, sharp focus, macro jewelry photography, no hands, no person, no watermark, no logo.`;
}
