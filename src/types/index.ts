export type ProductType = 'ring' | 'pendant' | 'locket' | 'bracelet' | 'earrings';

export type UserRole = 'staff' | 'admin';

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface ProductPreset {
  id: string;
  product_type: ProductType;
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
  prompt_version: string;
  active: boolean;
}

export type RequestStatus = 'draft' | 'generating' | 'done' | 'failed';
export type VariationStatus = 'queued' | 'running' | 'done' | 'failed';
export type NameMode = 'none' | 'english' | 'arabic' | 'both';

export interface DesignRequest {
  id: string;
  created_by?: string | null;
  product_type: ProductType;
  product_style?: string | null;
  product_options: Record<string, any>;
  include_name: boolean;
  name_mode: NameMode;
  name_en?: string | null;
  name_ar?: string | null;
  name2_en?: string | null;
  name2_ar?: string | null;
  name_placement?: string | null;
  name_ar_confirmed: boolean;
  allowed_golds: string[];
  stones_allowed: boolean;
  notes?: string | null;
  status: RequestStatus;
  created_at: string;
  profiles?: Profile | null;
  design_variations?: DesignVariation[];
}

export interface ReferenceImage {
  id: string;
  request_id: string;
  kind: 'lettering' | 'customer';
  preset_key?: string | null;
  storage_path: string;
  created_at: string;
}

export interface DesignVariation {
  id: string;
  request_id: string;
  preset_id?: string | null;
  variant_index: number;
  parent_id?: string | null;
  prompt: string;
  prompt_version: string;
  model: string;
  openai_request_id?: string | null;
  status: VariationStatus;
  image_path?: string | null;
  error?: string | null;
  is_selected?: boolean;
  created_at: string;
  product_presets?: ProductPreset;
  signedUrl?: string;
  children?: DesignVariation[];
}

