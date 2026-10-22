-- ========================================================================
-- PONT AGRICOLE - SEED DATA POUR SUPABASE
-- ========================================================================

-- Catégories
INSERT INTO public.categories (id, name, slug, description, image_url, display_order)
VALUES
('cat-legumes', 'Légumes Frais', 'legumes', 'Légumes maraîchers de première fraîcheur, calibrés pour la restauration.', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80', 1),
('cat-fruits', 'Fruits de Saison', 'fruits', 'Fruits gorgés de soleil issus des meilleurs vergers du Royaume.', 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80', 2),
('cat-herbes', 'Herbes Aromatiques', 'herbes-aromatiques', 'Bottes fraîches cueillies à l’aube pour parfumer vos créations culinaires.', 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=800&q=80', 3),
('cat-saison', 'Produits Saisonniers & Rares', 'produits-saisonniers', 'Sélections éphémères du terroir marocain au pic de leur maturité.', 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?auto=format&fit=crop&w=800&q=80', 4)
ON CONFLICT (id) DO NOTHING;

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
ON CONFLICT (id) DO NOTHING;

-- Zones de livraison
INSERT INTO public.delivery_zones (id, city, zone_name, delivery_fee, minimum_order_amount, is_active, estimated_hours)
VALUES
('zone-casa', 'Casablanca', 'Grand Casablanca (Anfa, Maarif, Gauthier, Ain Diab, Sidi Maarouf)', 35.00, 300.00, true, 'Livraison le matin avant 09h00'),
('zone-rabat', 'Rabat - Salé', 'Rabat Ville, Agdal, Souissi, Hay Riad & Salé Marina', 45.00, 400.00, true, 'Livraison matinale 07h00 - 10h00'),
('zone-kech', 'Marrakech', 'Guéliz, Hivernage, Palmeraie, Médina & Zone Touristique', 50.00, 500.00, true, 'Livraison quotidienne 06h30 - 09h30'),
('zone-tanger', 'Tanger', 'Centre-Ville, Malabata, Boubana & Tanger Free Zone', 50.00, 450.00, true, 'Livraison avant 10h00'),
('zone-fes', 'Fès - Meknès', 'Fès Ville Nouvelle & Zone Hôtelière', 40.00, 350.00, true, 'Livraison 07h00 - 10h30'),
('zone-agadir', 'Agadir', 'Front de Mer, Sonaba, Dakhla & Baie d’Agadir', 40.00, 350.00, true, 'Livraison matinale 06h30 - 09h00')
ON CONFLICT (id) DO NOTHING;
