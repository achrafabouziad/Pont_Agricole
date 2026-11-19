-- ==============================================================================
-- PONT AGRICOLE : NETTOYAGE DU STOCKAGE SUPABASE (0 MO CLOUD)
-- Exécutez ce script dans : Supabase Dashboard > SQL Editor > New query > Run
-- ==============================================================================

-- 1. Vider les images lourdes (Base64) de la table products
-- Toutes les photos sont désormais sauvegardées et servies depuis le localStorage
UPDATE public.products 
SET image_url = 'local_storage'
WHERE image_url LIKE 'data:image%' OR LENGTH(image_url) > 500;

-- 2. Nettoyer les fichiers de Supabase Storage (Buckets) si des photos y ont été uploadées
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
        DELETE FROM storage.objects;
    END IF;
END $$;

-- 3. Récupérer immédiatement l'espace disque sur PostgreSQL
VACUUM FULL public.products;
