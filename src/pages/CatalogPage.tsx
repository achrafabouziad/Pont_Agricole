import React, { useState, useEffect } from 'react';
import { Search, Filter, Sparkles, CheckCircle2 } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { store } from '../services/store';
import { Category, Product } from '../types';

interface CatalogPageProps {
  initialCategoryId?: string;
  onOpenCart: () => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ initialCategoryId, onOpenCart }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [selectedUnit, setSelectedUnit] = useState<string>('all');

  useEffect(() => {
    store.getCategories().then(setCategories);
    store.getProducts().then(setProducts);

    const unsub = store.subscribe(() => {
      store.getProducts().then(setProducts);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (initialCategoryId) {
      setSelectedCategory(initialCategoryId);
    }
  }, [initialCategoryId]);

  const handleAddToCart = (product: Product, quantity: number) => {
    store.addToCart(product, quantity);
    onOpenCart();
  };

  // Filter logic
  const filteredProducts = products.filter((p) => {
    // Category match
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
      return false;
    }
    // Availability match
    if (onlyAvailable && !p.isAvailable) {
      return false;
    }
    // Unit match
    if (selectedUnit !== 'all' && p.unit !== selectedUnit) {
      return false;
    }
    // Search match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchOrigin = p.origin ? p.origin.toLowerCase().includes(q) : false;
      return matchName || matchDesc || matchOrigin;
    }
    return true;
  });

  return (
    <div style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        {/* Header & Title */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <span className="badge badge-brand">Tarifs Professionnels B2B</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'var(--emerald-50)',
                color: 'var(--primary-800)',
                border: '1px solid var(--emerald-200)',
                borderRadius: '20px',
                padding: '0.25rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
              Cours du jour actualisés quotidiennement
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Prix en Dirham Marocain (MAD)</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)', color: 'var(--primary-900)' }}>
            Catalogue Produits Frais
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '680px' }}>
            Approvisionnement direct pour Cafés, Restaurants et Hôtels. Prix dégressifs et calibrages adaptés aux brigades professionnelles.
          </p>
        </div>

        {/* Filters and Search Bar Container */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
            padding: '1.25rem',
            marginBottom: '2.5rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Top Row: Search and Quick Toggles */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 280px' }}>
              <Search
                size={18}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Rechercher tomates, menthe, citrons, pommes de terre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>

            {/* Unit Filter */}
            <div style={{ minWidth: '150px' }}>
              <select
                className="form-select"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                style={{ padding: '0.72rem 1rem' }}
              >
                <option value="all">Toutes unités</option>
                <option value="caisse">Caisse</option>
                <option value="carton">Carton</option>
                <option value="kg">Au Kilogramme</option>
                <option value="botte">Botte (Herbes)</option>
                <option value="piece">Pièce / Plateau</option>
              </select>
            </div>

            {/* In stock only toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary-600)' }}
              />
              <span>En stock uniquement</span>
            </label>
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Tous les produits ({products.length})
            </button>
            {categories.map((cat) => {
              const count = products.filter((p) => p.categoryId === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-900)', marginBottom: '0.5rem' }}>
              Aucun produit ne correspond à votre recherche
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
              Essayez de réinitialiser vos filtres ou de modifier votre terme de recherche.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setOnlyAvailable(false);
                setSelectedUnit('all');
              }}
              className="btn btn-outline"
            >
              Réinitialiser tous les filtres
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '1.25rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Affichage de <strong>{filteredProducts.length}</strong> produit{filteredProducts.length > 1 ? 's' : ''} frais disponible{filteredProducts.length > 1 ? 's' : ''} à la livraison
            </div>

            <div
              className="catalog-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
