-- ========================================================================
-- PONT AGRICOLE - SETUP COMPLET ET IDEMPOTENT POUR SUPABASE
-- Vous pouvez exécuter ce script autant de fois que vous le souhaitez !
-- ========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BUSINESSES
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL CHECK (business_type IN ('restaurant', 'cafe', 'hotel', 'caterer', 'other')),
    city TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    unit TEXT NOT NULL CHECK (unit IN ('kg', 'caisse', 'carton', 'botte', 'piece')),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    minimum_quantity INT NOT NULL DEFAULT 1 CHECK (minimum_quantity >= 1),
    is_available BOOLEAN NOT NULL DEFAULT true,
    origin TEXT,
    badge TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DELIVERY ZONES
CREATE TABLE IF NOT EXISTS public.delivery_zones (
    id TEXT PRIMARY KEY,
    city TEXT NOT NULL,
    zone_name TEXT NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    minimum_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 300.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    estimated_hours TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled')),
    delivery_address TEXT NOT NULL,
    delivery_city TEXT NOT NULL,
    requested_delivery_date DATE NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (delivery_fee >= 0),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    customer_notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name_snapshot TEXT NOT NULL,
    unit_snapshot TEXT NOT NULL,
    unit_price_snapshot NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. COMPANY SETTINGS
CREATE TABLE IF NOT EXISTS public.company_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    company_name TEXT NOT NULL DEFAULT 'Pont Agricole SARL-AU',
    tagline TEXT NOT NULL DEFAULT 'Le lien entre la terre et l’avenir',
    phone TEXT NOT NULL DEFAULT '+212 5 22 45 78 90',
    whatsapp TEXT NOT NULL DEFAULT '+212 6 61 98 76 54',
    email TEXT NOT NULL DEFAULT 'contact@pontagricole.ma',
    address TEXT NOT NULL DEFAULT 'Marché de Gros, Casablanca, Maroc',
    min_order_default NUMERIC(10, 2) NOT NULL DEFAULT 300.00,
    free_delivery_threshold NUMERIC(10, 2) NOT NULL DEFAULT 1200.00,
    order_cutoff_time TEXT NOT NULL DEFAULT '21h00 pour livraison le lendemain matin',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES IDEMPOTENTES
-- ========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES
DROP POLICY IF EXISTS "Profiles are viewable by owners and admins" ON public.profiles;
CREATE POLICY "Profiles are viewable by owners and admins"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- BUSINESSES
DROP POLICY IF EXISTS "Businesses viewable by owner or admin" ON public.businesses;
CREATE POLICY "Businesses viewable by owner or admin"
ON public.businesses FOR SELECT
USING (owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Owners can insert their business" ON public.businesses;
CREATE POLICY "Owners can insert their business"
ON public.businesses FOR INSERT
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Only admins can update approval_status" ON public.businesses;
CREATE POLICY "Only admins can update approval_status"
ON public.businesses FOR UPDATE
USING (public.is_admin() OR (owner_id = auth.uid() AND approval_status = (SELECT approval_status FROM public.businesses WHERE id = businesses.id)));

-- CATEGORIES & PRODUCTS
DROP POLICY IF EXISTS "Categories are readable by everyone" ON public.categories;
CREATE POLICY "Categories are readable by everyone"
ON public.categories FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Only admins can modify categories" ON public.categories;
CREATE POLICY "Only admins can modify categories"
ON public.categories FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Products are readable by everyone" ON public.products;
CREATE POLICY "Products are readable by everyone"
ON public.products FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Only admins can modify products" ON public.products;
CREATE POLICY "Only admins can modify products"
ON public.products FOR ALL
USING (public.is_admin());

-- DELIVERY ZONES & SETTINGS
DROP POLICY IF EXISTS "Zones readable by everyone" ON public.delivery_zones;
CREATE POLICY "Zones readable by everyone"
ON public.delivery_zones FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Settings readable by everyone" ON public.company_settings;
CREATE POLICY "Settings readable by everyone"
ON public.company_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Only admins can modify settings" ON public.company_settings;
CREATE POLICY "Only admins can modify settings"
ON public.company_settings FOR ALL
USING (public.is_admin());

-- ORDERS
DROP POLICY IF EXISTS "Customers view own orders, admins view all" ON public.orders;
CREATE POLICY "Customers view own orders, admins view all"
ON public.orders FOR SELECT
USING (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Approved customers can create orders" ON public.orders;
CREATE POLICY "Approved customers can create orders"
ON public.orders FOR INSERT
WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Only admins can update order status" ON public.orders;
CREATE POLICY "Only admins can update order status"
ON public.orders FOR UPDATE
USING (public.is_admin());

-- ORDER ITEMS
DROP POLICY IF EXISTS "Users view items of their accessible orders" ON public.order_items;
CREATE POLICY "Users view items of their accessible orders"
ON public.order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
        AND (orders.customer_id = auth.uid() OR public.is_admin())
    )
);

DROP POLICY IF EXISTS "Insert items for accessible orders" ON public.order_items;
CREATE POLICY "Insert items for accessible orders"
ON public.order_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
    )
);

-- TRIGGER ON AUTH.SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nouveau Client Pro'),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  
  IF new.raw_user_meta_data->>'business_name' IS NOT NULL THEN
    INSERT INTO public.businesses (
      owner_id,
      business_name,
      business_type,
      city,
      delivery_address,
      approval_status
    ) VALUES (
      new.id,
      new.raw_user_meta_data->>'business_name',
      COALESCE(new.raw_user_meta_data->>'business_type', 'restaurant'),
      COALESCE(new.raw_user_meta_data->>'city', 'Casablanca'),
      COALESCE(new.raw_user_meta_data->>'delivery_address', ''),
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ========================================================================
-- SEED DATA (PRODUITS MAROCAINS, CATÉGORIES & ZONES)
-- ========================================================================

-- Catégories
INSERT INTO public.categories (id, name, slug, description, image_url, display_order)
VALUES
('cat-legumes', 'Légumes Frais', 'legumes', 'Légumes maraîchers de première fraîcheur, calibrés pour la restauration.', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80', 1),
('cat-fruits', 'Fruits de Saison', 'fruits', 'Fruits gorgés de soleil issus des meilleurs vergers du Royaume.', 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80', 2),
('cat-herbes', 'Herbes Aromatiques', 'herbes-aromatiques', 'Bottes fraîches cueillies à l’aube pour parfumer vos créations culinaires.', 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=800&q=80', 3),
('cat-saison', 'Produits Saisonniers & Rares', 'produits-saisonniers', 'Sélections éphémères du terroir marocain au pic de leur maturité.', 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?auto=format&fit=crop&w=800&q=80', 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url;

-- Produits
INSERT INTO public.products (id, category_id, name, description, image_url, unit, price, minimum_quantity, is_available, origin, badge)
VALUES
('prod-tomates', 'cat-legumes', 'Tomates Rondes Extra (Caisse)', 'Tomates fermes, peau lisse et chair dense. Idéales pour salades, sauces et carpaccios.', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80', 'caisse', 85.00, 2, true, 'Région Souss-Massa', 'Incontournable'),
('prod-pdt', 'cat-legumes', 'Pommes de Terre Spéciales Frite & Rôtie', 'Variété Spunta/Nicola calibrée, faible teneur en eau pour une friture dorée et croustillante.', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80', 'caisse', 110.00, 1, true, 'Plaines du Saïss', 'Top Vente'),
('prod-oignons', 'cat-legumes', 'Oignons Jaunes Secs Calibrés', 'Oignons de conservation sains, pelure dorée et arôme corsé pour fonds de cuisson.', 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80', 'caisse', 75.00, 1, true, 'Région Meknès-Fès', NULL),
('prod-carottes', 'cat-legumes', 'Carottes Maraîchères Lavées', 'Carottes croquantes, sucrées et sans cœur ligneux. Triées et lavées prêtes à l’emploi.', 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?auto=format&fit=crop&w=800&q=80', 'kg', 6.50, 10, true, 'Doukkala', NULL),
('prod-courgettes', 'cat-legumes', 'Courgettes Vertes Fines Extra', 'Calibre 14-18 cm, sans pépins, peau brillante sans amertume.', 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=800&q=80', 'caisse', 95.00, 1, true, 'Souss-Massa', NULL),

('prod-bananes', 'cat-fruits', 'Bananes Marocaines Premium (Carton)', 'Bananes douces sous serre du littoral marocain. Texture fondante et saveur parfumée.', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80', 'carton', 180.00, 1, true, 'Côte Atlantique - Tamri', 'Produit Local'),
('prod-oranges', 'cat-fruits', 'Oranges Valencia Late à Jus (Caisse)', 'Idéales pour bars et petits-déjeuners d’hôtels. Rendement en jus exceptionnel > 55%.', 'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=800&q=80', 'caisse', 90.00, 2, true, 'Beni Mellal / Berkane', 'Spécial CHR'),
('prod-pommes', 'cat-fruits', 'Pommes Golden de l’Atlas Extra', 'Pommes d’altitude croquantes, juteuses et équilibrées en acidité.', 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80', 'caisse', 160.00, 1, true, 'Moyen Atlas (Midelt)', NULL),
('prod-citrons', 'cat-fruits', 'Citrons 4 Saisons Non Traités', 'Zeste aromatique très riche en huiles essentielles et jus abondant pour mixologie et cuisine.', 'https://images.unsplash.com/photo-1534706936160-d5ee67737249?auto=format&fit=crop&w=800&q=80', 'kg', 12.00, 5, true, 'Taroudant', NULL),

('prod-persil', 'cat-herbes', 'Persil Plat Frais Marocain (Lot de bottes)', 'Feuilles larges, vert profond, tige tendre. Cueillies chaque matin.', 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&w=800&q=80', 'botte', 2.50, 10, true, 'Maraîchage Zenata', NULL),
('prod-coriandre', 'cat-herbes', 'Coriandre Fraîche (Qozbor)', 'Parfum intense indispensable pour soupes marocaines, tajines et marinades chermoula.', 'https://images.unsplash.com/photo-1588879462809-5a5df977a450?auto=format&fit=crop&w=800&q=80', 'botte', 2.50, 10, true, 'Maraîchage Zenata', NULL),
('prod-menthe', 'cat-herbes', 'Menthe Fraîche Bréjite Sélectionnée', 'La véritable menthe de Meknès/Settat au parfum puissant pour le thé traditionnel et mocktails.', 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?auto=format&fit=crop&w=800&q=80', 'botte', 3.00, 10, true, 'Plaine de la Chaouia', 'Fleuron National'),

('prod-fraises', 'cat-saison', 'Fraises Fortuna du Loukkos (Plateau)', 'Plateau bois 2 kg de fraises sucrées et calibrées, idéales pour pâtisserie et desserts raffinés.', 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80', 'piece', 45.00, 2, true, 'Larache / Bassin du Loukkos', 'Primeur'),
('prod-avocats', 'cat-saison', 'Avocats Hass Marocains Extra', 'Chair onctueuse sans fibres, calibre 16-18, maturation contrôlée.', 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=800&q=80', 'caisse', 280.00, 1, true, 'Gharb (Kenitra)', NULL)
ON CONFLICT (id) DO UPDATE SET
  price = EXCLUDED.price,
  is_available = EXCLUDED.is_available,
  minimum_quantity = EXCLUDED.minimum_quantity;

-- Zones de livraison
INSERT INTO public.delivery_zones (id, city, zone_name, delivery_fee, minimum_order_amount, is_active, estimated_hours)
VALUES
('zone-casa', 'Casablanca', 'Grand Casablanca (Anfa, Maarif, Gauthier, Ain Diab, Sidi Maarouf)', 35.00, 300.00, true, 'Livraison le matin avant 09h00'),
('zone-rabat', 'Rabat - Salé', 'Rabat Ville, Agdal, Souissi, Hay Riad & Salé Marina', 45.00, 400.00, true, 'Livraison matinale 07h00 - 10h00'),
('zone-kech', 'Marrakech', 'Guéliz, Hivernage, Palmeraie, Médina & Zone Touristique', 50.00, 500.00, true, 'Livraison quotidienne 06h30 - 09h30'),
('zone-tanger', 'Tanger', 'Centre-Ville, Malabata, Boubana & Tanger Free Zone', 50.00, 450.00, true, 'Livraison avant 10h00'),
('zone-fes', 'Fès - Meknès', 'Fès Ville Nouvelle & Zone Hôtelière', 40.00, 350.00, true, 'Livraison 07h00 - 10h30'),
('zone-agadir', 'Agadir', 'Front de Mer, Sonaba, Dakhla & Baie d’Agadir', 40.00, 350.00, true, 'Livraison matinale 06h30 - 09h00')
ON CONFLICT (id) DO UPDATE SET
  delivery_fee = EXCLUDED.delivery_fee,
  minimum_order_amount = EXCLUDED.minimum_order_amount;
