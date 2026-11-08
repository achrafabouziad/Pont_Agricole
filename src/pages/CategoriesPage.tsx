import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, ArrowRight, Sparkles, Layers } from 'lucide-react';
import { store } from '../services/store';
import { Category, Product } from '../types';

interface CategoriesPageProps {
  onSelectCategory: (categoryId: string) => void;
  onNavigate: (page: string) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  onSelectCategory,
  onNavigate,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>(() => store.getProductsSync());
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    store.getCategories().then(setCategories);
    store.getProducts().then(setProducts);

    const unsub = store.subscribe(() => {
      store.getCategories().then(setCategories);
      store.getProducts().then(setProducts);
    });
    return unsub;
  }, []);

  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      cat.name.toLowerCase().includes(q) ||
      (cat.description && cat.description.toLowerCase().includes(q))
    );
  });

  const handleCategoryClick = (categoryId: string) => {
    onSelectCategory(categoryId);
    onNavigate('catalog');
  };

  return (
    <div className="categories-page-wrapper">
      <div className="container">
        {/* Mobile / Modern Top Header Bar */}
        <div className="categories-topbar">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="categories-back-btn"
            aria-label="Retour à l'accueil"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="categories-header-title">Nos Catégories</h1>
          <div style={{ width: 40 }} /> {/* Spacer to balance back button */}
        </div>

        {/* Quick Search for Categories */}
        <div className="categories-search-box">
          <Search size={18} className="categories-search-icon" />
          <input
            type="text"
            className="categories-search-input"
            placeholder="Rechercher une catégorie (Légumes, Fruits, Herbes...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Quick Shortcut Card: All Products */}
        {!searchQuery && (
          <div
            onClick={() => handleCategoryClick('all')}
            className="category-all-banner"
            role="button"
            tabIndex={0}
          >
            <div className="category-all-content">
              <div className="category-all-badge">
                <Sparkles size={13} />
                <span>Catalogue Complet</span>
              </div>
              <h2 className="category-all-title">Toute la Mercuriale du Jour</h2>
              <p className="category-all-desc">
                Accédez à l'ensemble de nos {products.length} références fraîches B2B.
              </p>
            </div>
            <div className="category-all-arrow">
              <ArrowRight size={18} />
            </div>
          </div>
        )}

        {/* Categories Grid */}
        <div className="categories-modern-grid">
          {filteredCategories.map((cat) => {
            const count = products.filter((p) => p.categoryId === cat.id).length;
            return (
              <div
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className="category-modern-card"
                role="button"
                tabIndex={0}
              >
                <div className="category-modern-img-wrap">
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="category-modern-img"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <span className="category-modern-count-badge">
                    {count} produit{count > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="category-modern-body">
                  <h3 className="category-modern-name">{cat.name}</h3>
                  <div className="category-modern-footer">
                    <span>Voir les arrivages</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredCategories.length === 0 && (
          <div className="categories-empty">
            <p>Aucune catégorie ne correspond à votre recherche "{searchQuery}".</p>
            <button
              onClick={() => setSearchQuery('')}
              className="btn btn-outline btn-sm"
              style={{ marginTop: '0.75rem' }}
            >
              Réinitialiser la recherche
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
