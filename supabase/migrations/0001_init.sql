-- Enable UUID and pgcrypto extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- Trigger to create profile when auth.users signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'staff')
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Product Presets Table
CREATE TABLE IF NOT EXISTS public.product_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL CHECK (product_type IN ('ring', 'pendant', 'locket', 'bracelet', 'earrings')),
  variant_index int NOT NULL CHECK (variant_index BETWEEN 1 AND 5),
  preset_key text NOT NULL,
  label text NOT NULL,
  design_text text NOT NULL,
  style_text text NOT NULL,
  font_en text,
  font_ar text,
  gold_colour text,
  finish text,
  stone_text text,
  view_text text NOT NULL,
  prompt_version text NOT NULL DEFAULT 'v1',
  active boolean DEFAULT true,
  UNIQUE (product_type, variant_index)
);

-- 3. Design Requests Table
CREATE TABLE IF NOT EXISTS public.design_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES public.profiles(id),
  product_type text NOT NULL CHECK (product_type IN ('ring', 'pendant', 'locket', 'bracelet', 'earrings')),
  product_style text,
  product_options jsonb DEFAULT '{}'::jsonb,
  include_name boolean NOT NULL DEFAULT false,
  name_mode text DEFAULT 'none' CHECK (name_mode IN ('none', 'english', 'arabic', 'both')),
  name_en text,
  name_ar text,
  name2_en text,
  name2_ar text,
  name_placement text,
  name_ar_confirmed boolean NOT NULL DEFAULT false,
  allowed_golds text[],
  stones_allowed boolean DEFAULT true,
  notes text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'done', 'failed')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT name_needed CHECK (include_name = false OR name_en IS NOT NULL OR name_ar IS NOT NULL)
);

-- 4. Reference Images Table
CREATE TABLE IF NOT EXISTS public.reference_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.design_requests(id) ON DELETE CASCADE,
  kind text CHECK (kind IN ('lettering', 'customer')),
  preset_key text,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 5. Design Variations Table
CREATE TABLE IF NOT EXISTS public.design_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.design_requests(id) ON DELETE CASCADE,
  preset_id uuid REFERENCES public.product_presets(id),
  variant_index int CHECK (variant_index BETWEEN 1 AND 5),
  parent_id uuid REFERENCES public.design_variations(id),
  prompt text NOT NULL,
  prompt_version text NOT NULL DEFAULT 'v1',
  model text NOT NULL,
  openai_request_id text,
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  image_path text,
  error text,
  is_selected boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_variations ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin());

-- Product Presets Policies
DROP POLICY IF EXISTS "product_presets_select" ON public.product_presets;
CREATE POLICY "product_presets_select" ON public.product_presets
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "product_presets_all_admin" ON public.product_presets;
CREATE POLICY "product_presets_all_admin" ON public.product_presets
  FOR ALL TO authenticated USING (public.is_admin());

-- Design Requests Policies
DROP POLICY IF EXISTS "design_requests_select" ON public.design_requests;
CREATE POLICY "design_requests_select" ON public.design_requests
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "design_requests_insert" ON public.design_requests;
CREATE POLICY "design_requests_insert" ON public.design_requests
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

DROP POLICY IF EXISTS "design_requests_update" ON public.design_requests;
CREATE POLICY "design_requests_update" ON public.design_requests
  FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "design_requests_delete" ON public.design_requests;
CREATE POLICY "design_requests_delete" ON public.design_requests
  FOR DELETE TO authenticated USING (public.is_admin());

-- Reference Images Policies
DROP POLICY IF EXISTS "reference_images_select" ON public.reference_images;
CREATE POLICY "reference_images_select" ON public.reference_images
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "reference_images_insert" ON public.reference_images;
CREATE POLICY "reference_images_insert" ON public.reference_images
  FOR INSERT TO authenticated WITH CHECK (true);

-- Design Variations Policies
DROP POLICY IF EXISTS "design_variations_select" ON public.design_variations;
CREATE POLICY "design_variations_select" ON public.design_variations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "design_variations_insert" ON public.design_variations;
CREATE POLICY "design_variations_insert" ON public.design_variations
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "design_variations_update" ON public.design_variations;
CREATE POLICY "design_variations_update" ON public.design_variations
  FOR UPDATE TO authenticated USING (true);

-- Enable Realtime for design_variations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'design_variations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.design_variations;
  END IF;
END $$;

-- Storage Buckets Creation
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('lettering', 'lettering', false),
  ('references', 'references', false),
  ('designs', 'designs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for authenticated staff
CREATE POLICY "Allow authenticated staff select storage" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id IN ('lettering', 'references', 'designs'));

CREATE POLICY "Allow authenticated staff insert storage" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('lettering', 'references', 'designs'));

CREATE POLICY "Allow authenticated staff update storage" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id IN ('lettering', 'references', 'designs'));

-- Seed Ring and Pendant Presets
INSERT INTO public.product_presets (product_type, variant_index, preset_key, label, design_text, style_text, font_en, font_ar, gold_colour, finish, stone_text, view_text)
VALUES
  -- Ring Presets
  ('ring', 1, 'classic-name-band', 'Classic Name Band', 'Name raised across the top of a smooth luxury band with polished edges', 'English cursive handwriting style with fluid flourishes', 'Great Vibes', NULL, '22K yellow gold', 'high polish mirror finish', 'Plain polished gold, no gemstones', 'three-quarter angle with the top face and name clearly readable, resting on white silk'),
  ('ring', 2, 'arabic-signet', 'Arabic Signet', 'Solid flat oval top signet ring with the custom calligraphy embossed on the face', 'Traditional Arabic Ruqaa calligraphy style with bold graceful curves', NULL, 'Aref Ruqaa', '22K yellow gold', 'matte textured top face with high polished bevelled band', 'One small round faceted natural emerald embedded as an accent dot', 'angled macro perspective showing the oval signet crown and crisp calligraphy relief'),
  ('ring', 3, 'dual-script-band', 'Dual Script Band', 'Sophisticated dual-tier comfort fit band featuring dual language inscriptions', 'Playfair Display modern serif outside, traditional flowing Arabic Amiri script engraved inside', 'Playfair Display', 'Amiri', '18K white gold', 'radiant rhodium high polish', 'Delicate channel-set brilliant-cut pavé diamonds along the rim', 'isometric close-up showing both the exterior English lettering and inner band Arabic engraving'),
  ('ring', 4, 'modern-kufi-statement', 'Modern Kufi Statement', 'Bold contemporary architectural ring where the letterforms structure the band top', 'Geometric Arabic Kufic script with clean sharp lines and structured proportions', NULL, 'Reem Kufi', '18K rose gold', 'satin brushed contemporary finish', 'One flush-set vibrant cushion-cut Burma ruby accent', 'dramatic top-down three-quarter perspective highlighting the architectural Kufic forms'),
  ('ring', 5, 'royal-solitaire', 'Royal Solitaire', 'Majestic cathedral solitaire setting with personal lettering sculpted along both shoulders', 'Noble Roman imperial capital lettering', 'Cinzel', NULL, 'Two-tone 18K yellow gold band with 18K white gold crown prongs', 'luxurious high polish', 'Exquisite 2-carat royal blue sapphire centre stone with VS diamond pavé accents', 'three-quarter macro shot highlighting the majestic sapphire centrepiece and shoulder lettering'),

  -- Pendant Presets
  ('pendant', 1, 'signature-script', 'Signature Script', 'Delicate nameplate cutout pendant suspended on a fine diamond-cut link chain', 'Graceful English cursive calligraphy with joined letters and a flourishing underline tail', 'Great Vibes', NULL, '22K yellow gold', 'mirror high polish', 'One tiny bezel-set natural diamond integrated into the final flourish dot', 'front-facing flat lay, chain gently curved gracefully above on soft neutral studio surface'),
  ('pendant', 2, 'arabic-calligraphy', 'Arabic Calligraphy', 'Intricate openwork Arabic calligraphy pendant crafted into a harmonious organic silhouette', 'Flowing traditional Arabic Ruqaa calligraphy joined seamlessly in solid gold', NULL, 'Aref Ruqaa', '22K yellow gold', 'sandblasted micro-matte texture with bevelled mirror-polished highlights', 'One cabochon emerald accent droplet suspended at the bottom', 'front-facing studio lighting, chain elegantly draped upward, sharp lettering detail'),
  ('pendant', 3, 'dual-script-bar', 'Dual Script Bar', 'Vertical sleek minimalist pendant bar featuring harmonious dual script inscriptions', 'Crisp Playfair Display lettering stacked elegantly above engraved Arabic Amiri calligraphy', 'Playfair Display', 'Amiri', '18K white gold', 'smooth satin and mirror dual finish', 'Micro-pavé brilliant diamonds encrusting the initial English capital letter', 'direct front perspective showcasing the crisp dual-script typography and diamond brilliance'),
  ('pendant', 4, 'modern-kufi-disc', 'Modern Kufi Disc', 'Substantial circular coin medallion featuring raised geometric letters in deep relief', 'Modern Arabic Kufic typography sculpted in sharp geometric relief against a recessed bed', NULL, 'Reem Kufi', '18K rose gold', 'brushed disc surface with polished rim and faceted bail', 'One sparkling round ruby accent star-set in the centre medallion', 'slightly angled top flat lay highlighting the three-dimensional Kufic letter depth'),
  ('pendant', 5, 'heritage-royal', 'Heritage Royal', 'Opulent heritage cartouche medallion framed by fine filigree and micro-beaded milgrain', 'Regal Cinzel capital lettering with intertwined Arabic Amiri calligraphy monogram', 'Cinzel', 'Amiri', 'Two-tone 18K yellow gold cartouche with 18K white gold filigree border', 'vintage hand-burnished high polish', 'Deep Ceylon sapphire centre droplet with halo of round brilliant diamonds', 'front-facing grand presentation on ivory stone background with subtle realistic shadows'),

  -- Locket Presets
  ('locket', 1, 'vintage-oval-script', 'Vintage Oval Script', 'Classic oval keepsake heirloom locket with beaded milgrain border', 'Romantic cursive English script', 'Great Vibes', NULL, '18K yellow gold', 'hand-engraved vintage polish', 'Petite diamond star accent', 'front-facing, slightly parted showing golden photo chamber'),
  ('locket', 2, 'arabic-ruqaa-heart', 'Arabic Ruqaa Heart', 'Contoured heart locket with raised calligraphy relief', 'Graceful Arabic Ruqaa', NULL, 'Aref Ruqaa', '22K yellow gold', 'satin matte face with mirror border', 'One natural ruby heart accent', 'front-facing flat lay on soft ivory velvet'),
  ('locket', 3, 'modern-geo-locket', 'Modern Geometric Locket', 'Sleek octagonal contemporary locket with dual inscriptions', 'Playfair Display serif', 'Playfair Display', NULL, '18K white gold', 'brushed satin finish', 'Channel-set baguette diamonds', 'front-facing studio composition'),
  ('locket', 4, 'kufi-round-medallion', 'Kufi Round Medallion', 'Circular medallion locket with Kufic monogram lattice', 'Geometric Reem Kufi', NULL, 'Reem Kufi', '18K rose gold', 'brushed contemporary finish', 'Ruby accent dot', 'flat lay macro shot'),
  ('locket', 5, 'royal-crest-locket', 'Royal Crest Locket', 'Grand royal cartouche locket with baroque filigree frame', 'Cinzel regal capitals', 'Cinzel', 'Amiri', 'Two-tone yellow and white gold', 'high polish luxury finish', 'Emerald centre with diamond halo', 'three-quarter hero angle'),

  -- Bracelet Presets
  ('bracelet', 1, 'script-name-bar', 'Script Name Bar', 'Curved bar bracelet connected to double-strand cable chain', 'English cursive Great Vibes', 'Great Vibes', NULL, '18K yellow gold', 'high polish mirror finish', 'Tiny diamond accent on the closure', 'draped gracefully in a gentle curve on plain white surface'),
  ('bracelet', 2, 'arabic-cuff', 'Arabic Calligraphy Cuff', 'Open hinged cuff bracelet with embossed calligraphy phrase', 'Arabic Ruqaa calligraphy', NULL, 'Aref Ruqaa', '22K yellow gold', 'matte face with polished borders', 'Twin emerald finials at open ends', 'resting on side showing cuff curvature and typography depth'),
  ('bracelet', 3, 'dual-script-cuff', 'Dual Script Cuff', 'Substantial luxury cuff with English outer rim and Arabic inner engraving', 'Playfair Display and Amiri', 'Playfair Display', 'Amiri', '18K white gold', 'rhodium high polish', 'Pavé diamond line along edges', 'three-quarter profile highlighting both outer and inner letters'),
  ('bracelet', 4, 'kufi-charm-bracelet', 'Kufi Charm Bracelet', 'Paperclip link bracelet with geometric cut-out letter medallion', 'Reem Kufi modern geometric', NULL, 'Reem Kufi', '18K rose gold', 'brushed medallion with mirror links', 'Flush-set ruby centre', 'laid out flat with charm prominent in foreground'),
  ('bracelet', 5, 'regal-bangle', 'Regal Solitaire Bangle', 'Hinged oval bangle featuring prominent monogram crest', 'Cinzel imperial capitals', 'Cinzel', NULL, 'Two-tone yellow and white gold', 'high polish mirror finish', 'Sapphire crest with diamond pavé accents', 'angled perspective on clean white marble pedestal'),

  -- Earrings Presets
  ('earrings', 1, 'script-initial-studs', 'Script Initial Studs', 'Petite delicate initial letter stud earrings with butterfly backings', 'English cursive Great Vibes', 'Great Vibes', NULL, '18K yellow gold', 'high polish mirror finish', 'Bezel-set diamond accent dot', 'pair of studs floating side-by-side on clean white backdrop'),
  ('earrings', 2, 'arabic-calligraphy-drops', 'Arabic Calligraphy Drops', 'Swaying chandelier drop earrings with suspended calligraphy motifs', 'Arabic Ruqaa calligraphy', NULL, 'Aref Ruqaa', '22K yellow gold', 'faceted polish and micro-matte', 'Pear-cut emerald drop pendants', 'hanging gracefully side-by-side in soft studio light'),
  ('earrings', 3, 'dual-monogram-huggie', 'Dual Monogram Huggie', 'Mini huggie hoops with micro-engraved monogram medallions', 'Playfair Display serif', 'Playfair Display', NULL, '18K white gold', 'rhodium mirror polish', 'Huggie front channel pavé diamonds', 'pair of earrings angled to display face and clasp mechanism'),
  ('earrings', 4, 'kufi-geometric-studs', 'Kufi Geometric Studs', 'Modernist architectural square studs featuring cut-out Kufic letters', 'Geometric Reem Kufi', NULL, 'Reem Kufi', '18K rose gold', 'matte satin finish', 'Flush ruby accent in letter corner', 'macro view of matching pair on white silk cushion'),
  ('earrings', 5, 'royal-crest-drops', 'Royal Crest Drops', 'Majestic cartouche drop earrings with regal monogram and gemstone halo', 'Cinzel imperial lettering', 'Cinzel', NULL, 'Two-tone yellow and white gold', 'high polish filigree finish', 'Sapphire centre cabochons with diamond halo', 'pair of earrings hanging straight with light catching facets')
ON CONFLICT (product_type, variant_index) DO UPDATE
SET 
  preset_key = EXCLUDED.preset_key,
  label = EXCLUDED.label,
  design_text = EXCLUDED.design_text,
  style_text = EXCLUDED.style_text,
  font_en = EXCLUDED.font_en,
  font_ar = EXCLUDED.font_ar,
  gold_colour = EXCLUDED.gold_colour,
  finish = EXCLUDED.finish,
  stone_text = EXCLUDED.stone_text,
  view_text = EXCLUDED.view_text;

