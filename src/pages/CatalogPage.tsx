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
    <div className="catalog-page-wrapper">
      <div className="container">
        {/* Header & Title */}
        <div className="catalog-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-brand">Tarifs Professionnels B2B</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-800)',
                border: '1px solid var(--primary-100)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.2rem 0.6rem',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-600)', display: 'inline-block' }} />
              Cours du jour actualisés
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Facturation en Dirham Marocain (MAD)</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.3rem)', color: 'var(--primary-950)', marginBottom: '0.4rem' }}>
            Catalogue Produits Frais
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '680px' }}>
            Approvisionnement direct pour Cafés, Restaurants et Hôtels au Maroc.
          </p>
        </div>

        {/* Filters and Search Bar Container */}
        <div className="card catalog-filter-card">
          {/* Top Row: Search and Quick Toggles */}
          <div className="catalog-filter-top">
            {/* Search Input */}
            <div className="catalog-search-wrap">
              <Search
                size={17}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Rechercher tomates, menthe, citrons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.3rem' }}
              />
            </div>

            {/* Quick row for unit & in-stock */}
            <div className="catalog-filter-subrow">
              <div style={{ flex: 1, minWidth: '120px' }}>
                <select
                  className="form-select"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  style={{ width: '15px', height: '15px', accentColor: 'var(--primary-600)' }}
                />
                <span>En stock</span>
              </label>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="mobile-scroll-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
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
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-700)' }}>
                <Search size={28} strokeWidth={1.75} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-900)', marginBottom: '0.4rem', fontWeight: 700 }}>
              Aucun produit ne correspond à vos critères
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem', maxWidth: '380px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              Vérifiez l’orthographe ou réinitialisez vos filtres pour afficher l’ensemble de la mercuriale.
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
