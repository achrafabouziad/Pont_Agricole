-- ========================================================================
-- PONT AGRICOLE - SCHÉMA DE BASE DE DONNÉES SUPABASE (PostgreSQL + RLS)
-- Plateforme B2B de Fourniture de Fruits, Légumes et Herbes Fraîches au Maroc
-- ========================================================================

-- Extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Comptes utilisateurs reliés à auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BUSINESSES (Établissements B2B : Cafés, Restaurants, Hôtels, Traiteurs)
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL CHECK (business_type IN ('restaurant', 'cafe', 'hotel', 'caterer', 'other')),
    city TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CATEGORIES (Catégories de produits frais)
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

-- 4. PRODUCTS (Fruits, légumes, herbes avec prix B2B en MAD)
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

-- 5. DELIVERY ZONES (Villes marocaines et frais de livraison)
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

-- 6. ORDERS (Commandes B2B)
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

-- 7. ORDER ITEMS (Snapshot immuable des produits au moment de la commande)
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

-- 8. COMPANY SETTINGS (Paramètres commerciaux)
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
-- ROW LEVEL SECURITY (RLS) POLICIES
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

-- PROFILES Policies
DROP POLICY IF EXISTS "Profiles are viewable by owners and admins" ON public.profiles;
CREATE POLICY "Profiles are viewable by owners and admins"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- BUSINESSES Policies
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

-- CATEGORIES & PRODUCTS (Public read, admin write)
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

-- DELIVERY ZONES & SETTINGS (Public read, admin write)
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

-- ORDERS Policies
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

-- ORDER ITEMS Policies
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

-- ========================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH.SIGNUP
-- ========================================================================
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
      'approved'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-confirmer immédiatement les utilisateurs et approuver les établissements
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    confirmed_at = COALESCE(confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

UPDATE public.businesses 
SET approval_status = 'approved' 
WHERE approval_status = 'pending';

CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, NOW());
  NEW.confirmed_at = COALESCE(NEW.confirmed_at, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_confirm_user ON auth.users;
CREATE TRIGGER trigger_auto_confirm_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_new_user();

-- 4. Promouvoir le compte de direction / Achraf au rôle 'admin'
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email ILIKE '%achrafabouziad%' 
     OR email ILIKE '%admin%'
);


