-- ==============================================================================
-- PONT AGRICOLE : NETTOYAGE DU STOCKAGE SUPABASE (0 MO CLOUD)
-- Exécutez cette commande dans : Supabase Dashboard > SQL Editor > New query > Run
-- ==============================================================================

UPDATE public.products 
SET image_url = 'local_storage'
WHERE image_url LIKE 'data:image%' OR LENGTH(image_url) > 500;
