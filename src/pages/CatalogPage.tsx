import React, { useState, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronDown,
  Check,
  X,
  Heart,
  SlidersHorizontal,
  ArrowLeft,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { store } from '../services/store';
import { Category, Product, CartItem } from '../types';

interface CatalogPageProps {
  initialCategoryId?: string;
  showOnlyFavorites?: boolean;
  onOpenCart: () => void;
  onNavigate?: (page: string) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  initialCategoryId,
  showOnlyFavorites = false,
  onOpenCart,
  onNavigate,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc'>('default');
  const [showSearchBox, setShowSearchBox] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<string[]>(store.getFavorites());
  const [cart, setCart] = useState<CartItem[]>(store.getCart());

  useEffect(() => {
    store.getCategories().then(setCategories);
    store.getProducts().then(setProducts);

    const unsub = store.subscribe(() => {
      store.getProducts().then(setProducts);
      setFavorites(store.getFavorites());
      setCart([...store.getCart()]);
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
  };

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);

  // Filter logic
  let filteredProducts = products.filter((p) => {
    // Favorites mode
    if (showOnlyFavorites && !favorites.includes(p.id)) {
      return false;
    }
    // Category match
    if (!showOnlyFavorites && selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
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

  // Sort logic
  if (sortBy === 'price_asc') {
    filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price_desc') {
    filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
  }

  return (
    <div className="catalog-page-wrapper">
      <div className="container">
        {/* Mobile App-Style Header (Matching Reference Image 1) */}
        <div className="catalog-mobile-topbar">
          <button
            type="button"
            onClick={() => {
              if (showOnlyFavorites && onNavigate) {
                onNavigate('home');
              } else if (selectedCategory !== 'all') {
                setSelectedCategory('all');
              } else if (onNavigate) {
                onNavigate('categories');
              }
            }}
            className="mobile-round-action-btn"
            aria-label="Retour"
          >
            <ChevronLeft size={22} />
          </button>

          <h1 className="catalog-mobile-topbar-title">
            {showOnlyFavorites
              ? 'Mes Favoris'
              : selectedCategoryObj
              ? selectedCategoryObj.name
              : 'Produits Frais'}
          </h1>

          <button
            type="button"
            onClick={() => setShowSearchBox((prev) => !prev)}
            className={`mobile-round-action-btn ${showSearchBox || searchQuery ? 'active' : ''}`}
            aria-label="Rechercher"
          >
            <Search size={18} />
          </button>
        </div>

        {/* Collapsible Mobile Search Bar */}
        {(showSearchBox || searchQuery) && (
          <div className="catalog-search-reveal">
            <Search size={18} className="catalog-search-reveal-icon" />
            <input
              type="text"
              autoFocus
              className="catalog-search-reveal-input"
              placeholder="Rechercher tomates, menthe, citrons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="catalog-search-reveal-clear"
                aria-label="Effacer"
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}

        {/* Mobile Filter Chips Row (Matching Image 1: Price ∨, Brand ∨, Popularity ∨) */}
        <div className="catalog-mobile-filter-pills">
          {/* Price Sort Pill */}
          <div className="mobile-filter-pill-wrap">
            <select
              className="mobile-filter-pill-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Trier par prix"
            >
              <option value="default">Prix</option>
              <option value="price_asc">Prix: Croissant</option>
              <option value="price_desc">Prix: Décroissant</option>
            </select>
            <ChevronDown size={14} className="mobile-filter-pill-arrow" />
          </div>

          {/* Unit Pill */}
          <div className="mobile-filter-pill-wrap">
            <select
              className="mobile-filter-pill-select"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              aria-label="Filtrer par unité"
            >
              <option value="all">Unité</option>
              <option value="caisse">Caisse</option>
              <option value="carton">Carton</option>
              <option value="kg">Au Kg</option>
              <option value="botte">Botte</option>
              <option value="piece">Pièce</option>
            </select>
            <ChevronDown size={14} className="mobile-filter-pill-arrow" />
          </div>

          {/* In Stock Pill */}
          <button
            type="button"
            onClick={() => setOnlyAvailable((prev) => !prev)}
            className={`mobile-filter-pill-btn ${onlyAvailable ? 'active' : ''}`}
          >
            <span>En stock</span>
            {onlyAvailable && <Check size={13} strokeWidth={2.5} />}
          </button>
        </div>

        {/* Desktop Header & Filters (Hidden on Mobile) */}
        <div className="catalog-desktop-header-area">
          <div className="catalog-header">
            <h1 className="catalog-title">
              {showOnlyFavorites
                ? 'Mes Produits Favoris'
                : selectedCategoryObj
                ? selectedCategoryObj.name
                : 'Catalogue Produits Frais'}
            </h1>
            <p className="catalog-subtitle">
              Approvisionnement direct pour Cafés, Restaurants et Hôtels au Maroc.
            </p>
          </div>

          {/* Desktop Search & Filters Bar */}
          <div className="catalog-filter-card">
            <div className="catalog-filter-top">
              <div className="catalog-search-wrap">
                <Search size={18} className="catalog-search-icon" />
                <input
                  type="text"
                  className="catalog-search-input"
                  placeholder="Rechercher tomates, menthe, citrons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="catalog-search-clear"
                    aria-label="Effacer la recherche"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="catalog-filter-subrow">
                <div className="catalog-unit-select-wrap">
                  <select
                    className="catalog-unit-select"
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    aria-label="Filtrer par unité"
                  >
                    <option value="all">Toutes unités</option>
                    <option value="caisse">Caisse</option>
                    <option value="carton">Carton</option>
                    <option value="kg">Au Kilogramme</option>
                    <option value="botte">Botte (Herbes)</option>
                    <option value="piece">Pièce / Plateau</option>
                  </select>
                </div>

                <label className={`catalog-stock-toggle ${onlyAvailable ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(e) => setOnlyAvailable(e.target.checked)}
                  />
                  <span>En stock</span>
                </label>
              </div>
            </div>

            {/* Desktop Category Rail */}
            {!showOnlyFavorites && (
              <div className="catalog-category-rail">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`catalog-cat-pill ${selectedCategory === 'all' ? 'active' : ''}`}
                >
                  <span>Tous les produits</span>
                  <span className="catalog-cat-count">{products.length}</span>
                </button>
                {categories.map((cat) => {
                  const count = products.filter((p) => p.categoryId === cat.id).length;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`catalog-cat-pill ${isSelected ? 'active' : ''}`}
                    >
                      <span>{cat.name}</span>
                      <span className="catalog-cat-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Products Grid (2 Columns on Mobile matching Image 1) */}
        {filteredProducts.length === 0 ? (
          <div className="catalog-empty-box">
            <div className="catalog-empty-icon-wrap">
              {showOnlyFavorites ? <Heart size={28} /> : <Search size={28} />}
            </div>
            <h3 className="catalog-empty-title">
              {showOnlyFavorites
                ? 'Aucun produit favori pour le moment'
                : 'Aucun produit ne correspond à vos critères'}
            </h3>
            <p className="catalog-empty-desc">
              {showOnlyFavorites
                ? 'Cliquez sur le cœur sur n’importe quel produit pour le retrouver facilement ici.'
                : 'Vérifiez l’orthographe ou réinitialisez vos filtres pour afficher l’ensemble des arrivages.'}
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setOnlyAvailable(false);
                setSelectedUnit('all');
                setSortBy('default');
                if (showOnlyFavorites && onNavigate) {
                  onNavigate('catalog');
                }
              }}
              className="btn btn-primary btn-sm"
            >
              {showOnlyFavorites ? 'Explorer le catalogue' : 'Réinitialiser les filtres'}
            </button>
          </div>
        ) : (
          <div>
            <div className="catalog-count-indicator">
              Affichage de <strong>{filteredProducts.length}</strong> produit
              {filteredProducts.length > 1 ? 's' : ''} disponible
              {filteredProducts.length > 1 ? 's' : ''}
            </div>

            <div className="modern-products-grid">
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

      {/* Floating Bottom Cart Bar for Seamless Multi-Product Grouped Ordering */}
      {cart.length > 0 && (
        <div
          className="catalog-floating-cart-bar"
          style={{
            position: 'fixed',
            bottom: '76px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            width: 'calc(100% - 1.5rem)',
            maxWidth: '520px',
            animation: 'slideUp 0.2s ease-out',
          }}
        >
          <button
            type="button"
            onClick={onOpenCart}
            style={{
              width: '100%',
              backgroundColor: '#166534',
              color: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 10px 25px rgba(22, 101, 52, 0.4)',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.92rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.22)',
                  borderRadius: '10px',
                  padding: '0.3rem 0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.85rem',
                  fontWeight: 900,
                }}
              >
                <ShoppingBag size={15} />
                <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <span>
                {cart.length} produit{cart.length > 1 ? 's' : ''} dans le panier
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 900 }}>
                {cart.reduce((s, i) => s + i.product.price * i.quantity, 0).toFixed(2)} DH
              </span>
              <span
                style={{
                  backgroundColor: '#ffffff',
                  color: '#166534',
                  borderRadius: '8px',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                Commander <ArrowRight size={13} strokeWidth={2.5} />
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
