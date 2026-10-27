import { ProductType } from '../types';

export interface ProductDefinition {
  type: ProductType;
  label: string;
  tagline: string;
  iconName: string;
  styles: { key: string; label: string; desc: string }[];
  allowedPlacements: { key: string; label: string }[];
  detailFields: {
    key: string;
    label: string;
    type: 'select' | 'text' | 'checkbox';
    options?: { value: string; label: string }[];
    defaultValue?: any;
  }[];
}

export const PRODUCT_CATALOGUE: Record<ProductType, ProductDefinition> = {
  ring: {
    type: 'ring',
    label: 'Custom Ring',
    tagline: 'Solitaires, Signets, Name Bands & Couple Rings',
    iconName: 'CircleDot',
    styles: [
      { key: 'let_vary', label: 'Let the 5 designs vary', desc: 'Curated mix across band, signet, statement & solitaire' },
      { key: 'name_band', label: 'Name Band', desc: 'Name sculpted seamlessly across a comfortable luxury band' },
      { key: 'signet', label: 'Signet Ring', desc: 'Flat crown face with deep calligraphy or monogram relief' },
      { key: 'statement', label: 'Statement Ring', desc: 'Architectural letterforms creating the crown structure' },
      { key: 'couple_pair', label: 'Couple Pair', desc: 'Matching his & hers design set with intertwined names' },
    ],
    allowedPlacements: [
      { key: 'across-top', label: 'Across the top face' },
      { key: 'around-outside', label: 'Around the outside of the band' },
      { key: 'engraved-inside', label: 'Engraved inside the band' },
      { key: 'none', label: 'No lettering' },
    ],
    detailFields: [
      {
        key: 'ringSize',
        label: 'Ring Size (Indian Standard 6–30)',
        type: 'select',
        options: Array.from({ length: 25 }, (_, i) => ({ value: `${i + 6}`, label: `Size ${i + 6}` })),
        defaultValue: '14',
      },
      {
        key: 'bandWidth',
        label: 'Band Width',
        type: 'select',
        options: [
          { value: 'thin', label: 'Thin & Delicate (2mm - 3mm)' },
          { value: 'medium', label: 'Medium Classic (4mm - 5mm)' },
          { value: 'wide', label: 'Wide Statement (6mm - 8mm)' },
        ],
        defaultValue: 'medium',
      },
    ],
  },
  pendant: {
    type: 'pendant',
    label: 'Custom Pendant',
    tagline: 'Script Cut-outs, Calligraphy, Bars & Filigree Medallions',
    iconName: 'Sparkles',
    styles: [
      { key: 'let_vary', label: 'Let the 5 designs vary', desc: 'Curated mix of cut-out script, bar, disc & royal filigree' },
      { key: 'name_cutout', label: 'Name Cut-out', desc: 'Letters carved out in solid gold suspended on chain' },
      { key: 'bar', label: 'Minimalist Bar', desc: 'Sleek rectangular bar with vertical or horizontal inscription' },
      { key: 'disc', label: 'Disc / Coin Medallion', desc: 'Circular coin medallion with raised relief typography' },
      { key: 'heart', label: 'Heart Pendant', desc: 'Romantic heart silhouette with calligraphy or cut-out script' },
    ],
    allowedPlacements: [
      { key: 'cutout', label: 'Cut-out letters (Freeform)' },
      { key: 'raised-plate', label: 'Raised on a solid plate' },
      { key: 'engraved-plate', label: 'Engraved into a plate' },
      { key: 'none', label: 'No lettering' },
    ],
    detailFields: [
      {
        key: 'withChain',
        label: 'Include Chain',
        type: 'checkbox',
        defaultValue: true,
      },
      {
        key: 'chainStyle',
        label: 'Chain Style',
        type: 'select',
        options: [
          { value: 'fine_cable', label: 'Fine Cable Chain (1.2mm)' },
          { value: 'curb_chain', label: 'Diamond-Cut Curb Chain (1.8mm)' },
          { value: 'box_chain', label: 'Venetian Box Chain (1.5mm)' },
          { value: 'rope_chain', label: 'French Rope Chain (2.0mm)' },
        ],
        defaultValue: 'fine_cable',
      },
    ],
  },
  locket: {
    type: 'locket',
    label: 'Keepsake Locket',
    tagline: 'Vintage Keepsakes, Memory Compartments & Monograms',
    iconName: 'HeartHandshake',
    styles: [
      { key: 'let_vary', label: 'Let the 5 designs vary', desc: 'Mix of oval, round, and heart locket heirlooms' },
      { key: 'oval', label: 'Vintage Oval', desc: 'Classic Victorian oval with milgrain and central monogram' },
      { key: 'round', label: 'Round Medallion', desc: 'Spherical locket with geometric lattice opening' },
      { key: 'heart', label: 'Heart Locket', desc: 'Embossed romantic keepsake with dual photo chambers' },
    ],
    allowedPlacements: [
      { key: 'front-face', label: 'Embossed on the front cover' },
      { key: 'engraved-inside', label: 'Secret engraving inside chamber' },
      { key: 'none', label: 'No lettering' },
    ],
    detailFields: [
      {
        key: 'locketShape',
        label: 'Opening Mechanism',
        type: 'select',
        options: [
          { value: 'side_hinge', label: 'Side Hinged (Dual Photo Space)' },
          { value: 'swivel_spin', label: 'Swivel Spin Medallion' },
        ],
        defaultValue: 'side_hinge',
      },
    ],
  },
  bracelet: {
    type: 'bracelet',
    label: 'Luxury Bracelet',
    tagline: 'Name Bars, Hinged Cuffs & Link Charm Chains',
    iconName: 'Watch',
    styles: [
      { key: 'let_vary', label: 'Let the 5 designs vary', desc: 'Mix of curved bar, solid cuff, and link charm bracelets' },
      { key: 'name_bar', label: 'Name Bar Bracelet', desc: 'Curved gold nameplate connected to delicate chain' },
      { key: 'cuff', label: 'Solid Calligraphy Cuff', desc: 'Sturdy hinged open cuff with engraved or raised text' },
      { key: 'charm', label: 'Letter Charm Bracelet', desc: 'Paperclip link chain with custom initial charms' },
    ],
    allowedPlacements: [
      { key: 'centre-bar', label: 'Centre of the front bar' },
      { key: 'engraved-cuff', label: 'Engraved along the outer cuff' },
      { key: 'inside-cuff', label: 'Inside comfort curve' },
      { key: 'none', label: 'No lettering' },
    ],
    detailFields: [
      {
        key: 'wristSize',
        label: 'Wrist Circumference',
        type: 'select',
        options: [
          { value: 'small_6in', label: 'Small (6.0 in / 15.2 cm)' },
          { value: 'medium_6.5in', label: 'Medium (6.5 in / 16.5 cm)' },
          { value: 'large_7in', label: 'Large (7.0 in / 17.8 cm)' },
          { value: 'xlarge_7.5in', label: 'X-Large (7.5 in / 19.0 cm)' },
        ],
        defaultValue: 'medium_6.5in',
      },
    ],
  },
  earrings: {
    type: 'earrings',
    label: 'Designer Earrings',
    tagline: 'Initial Studs, Calligraphy Drops & Huggie Hoops',
    iconName: 'Crown',
    styles: [
      { key: 'let_vary', label: 'Let the 5 designs vary', desc: 'Mix of initial studs, chandelier drops, and huggies' },
      { key: 'studs', label: 'Initial Studs', desc: 'Dainty initial letters seated directly on the ear lobe' },
      { key: 'drops', label: 'Calligraphy Drops', desc: 'Swaying chandelier earrings with dangling script' },
      { key: 'huggies', label: 'Monogram Huggies', desc: 'Small hinged hoops with micro-engraved medallions' },
    ],
    allowedPlacements: [
      { key: 'initials-only', label: 'Initials on earring face' },
      { key: 'none', label: 'No lettering' },
    ],
    detailFields: [
      {
        key: 'earringType',
        label: 'Earring Set',
        type: 'select',
        options: [
          { value: 'pair', label: 'Matching Pair (Left & Right)' },
          { value: 'single', label: 'Single Statement Earring' },
        ],
        defaultValue: 'pair',
      },
    ],
  },
};

export const GOLD_OPTIONS = [
  { value: '22K yellow gold', label: '22K Yellow Gold (High Karat Heritage)', swatch: '#D4AF37' },
  { value: '18K yellow gold', label: '18K Yellow Gold (Classic Royal)', swatch: '#E6CA65' },
  { value: '18K white gold', label: '18K White Gold (Rhodium Polished)', swatch: '#E2E4E6' },
  { value: '18K rose gold', label: '18K Rose Gold (Romantic Warmth)', swatch: '#E8A38F' },
  { value: 'Two-tone 18K yellow & white', label: 'Two-Tone 18K Yellow & White Gold', swatch: 'linear-gradient(135deg, #E6CA65 50%, #E2E4E6 50%)' },
  { value: 'Platinum 950', label: 'Platinum 950 (Ultra Pure & Heavy)', swatch: '#D8DCE3' },
];
