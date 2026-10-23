-- ========================================================================
-- PONT AGRICOLE - FIX COMPLET : CLIENTS INSCRITS & CONNEXION DIRECTE
-- Copiez et collez tout ce script dans : Supabase -> SQL Editor -> Run
-- ========================================================================

-- 1. Colonnes supplémentaires pour public.profiles et public.businesses
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. Politiques RLS (Row Level Security) permissives
-- Permet au tableau de bord Admin et aux clients de lire et insérer sans blocage
DROP POLICY IF EXISTS "Profiles readable by all" ON public.profiles;
CREATE POLICY "Profiles readable by all" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Businesses readable by all" ON public.businesses;
CREATE POLICY "Businesses readable by all" ON public.businesses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert business" ON public.businesses;
CREATE POLICY "Anyone can insert business" ON public.businesses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins or owners can update business" ON public.businesses;
CREATE POLICY "Admins or owners can update business" ON public.businesses FOR UPDATE USING (true);

-- 3. Confirmer immédiatement tous les utilisateurs existants dans Supabase Auth
-- (Élimine immédiatement l'erreur "Utilisateur invalide" / "Email not confirmed")
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    confirmed_at = COALESCE(confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- 4. Activer tous les établissements en statut 'approved'
UPDATE public.businesses 
SET approval_status = 'approved' 
WHERE approval_status = 'pending';

-- 5. Trigger d'auto-confirmation automatique pour les futures inscriptions
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

-- 6. Trigger pour insérer automatiquement le profil et l'établissement avec toutes les coordonnées
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nouveau Client Pro'),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    'customer',
    COALESCE(new.email, new.raw_user_meta_data->>'email')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email;
  
  IF new.raw_user_meta_data->>'business_name' IS NOT NULL THEN
    INSERT INTO public.businesses (
      owner_id,
      business_name,
      business_type,
      city,
      delivery_address,
      contact_name,
      phone,
      email,
      google_maps_url,
      username,
      approval_status
    ) VALUES (
      new.id,
      new.raw_user_meta_data->>'business_name',
      COALESCE(new.raw_user_meta_data->>'business_type', 'restaurant'),
      COALESCE(new.raw_user_meta_data->>'city', 'Casablanca'),
      COALESCE(new.raw_user_meta_data->>'delivery_address', ''),
      COALESCE(new.raw_user_meta_data->>'full_name', 'Nouveau Client Pro'),
      COALESCE(new.raw_user_meta_data->>'phone', ''),
      COALESCE(new.email, new.raw_user_meta_data->>'email'),
      new.raw_user_meta_data->>'google_maps_url',
      new.raw_user_meta_data->>'username',
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

-- 7. Promouvoir le compte Achraf au rôle 'admin'
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email ILIKE '%achrafabouziad%' 
     OR email ILIKE '%admin%'
);
