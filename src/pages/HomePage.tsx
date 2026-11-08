import React, { useState, useEffect } from 'react';
import { Hero } from '../components/Hero';
import { ProductCard } from '../components/ProductCard';
import { store } from '../services/store';
import { Category, Product, CartItem } from '../types';
import {
  ArrowRight,
  Truck,
  ClipboardCheck,
  MoonStar,
  ShoppingBag,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string) => void;
  onSelectCategory?: (categoryId: string) => void;
  onOpenCart: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectCategory, onOpenCart }) => {
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>(store.getCart());

  useEffect(() => {
    store.getProducts().then((prods) => {
      // Pick popular / badge products
      setPopularProducts(prods.slice(0, 8));
    });
    store.getCategories().then((cats) => {
      setCategories(cats.filter((c) => c.isActive));
    });

    const unsub = store.subscribe(() => {
      store.getProducts().then((prods) => {
        setPopularProducts(prods.slice(0, 8));
      });
      store.getCategories().then((cats) => {
        setCategories(cats.filter((c) => c.isActive));
      });
      setCart([...store.getCart()]);
    });
    return unsub;
  }, []);

  const handleAddToCart = (product: Product, quantity: number) => {
    store.addToCart(product, quantity);
  };

  return (
    <div>
      {/* 1. Hero Section */}
      <Hero
        onExploreCatalog={() => onNavigate('catalog')}
        onCreateAccount={() => onNavigate('auth')}
      />

      {/* 2. Catégories — rail horizontal (mobile) / grille 4 (desktop) */}
      {categories.length > 0 && (
        <section className="home-categories-section" aria-label="Nos catégories">
          <div className="container">
            <div className="home-section-header">
              <h2 className="home-section-title">Nos Rayons du Jour</h2>
              <p className="home-section-subtitle">
                Le meilleur du carreau, rayon par rayon — sélectionné chaque nuit.
              </p>
            </div>

            {/* Desktop grid */}
            <div className="desktop-categories-wrapper">
              <div className="desktop-categories-grid">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="category-card-home"
                    onClick={() => onSelectCategory?.(cat.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onSelectCategory?.(cat.id);
                    }}
                  >
                    <img
                      className="cat-card-img"
                      src={cat.imageUrl}
                      alt={cat.name}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <div className="cat-card-body">
                      <h3 className="cat-card-name">{cat.name}</h3>
                      <span className="cat-card-link">
                        Voir les arrivages
                        <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile horizontal rail */}
            <div className="mobile-categories-rail">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className="mobile-cat-chip"
                  onClick={() => onSelectCategory?.(cat.id)}
                >
                  <img
                    className="mobile-cat-thumb"
                    src={cat.imageUrl}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <span className="mobile-cat-name">{cat.name}</span>
                  <span className="mobile-cat-arrow">
                    <ArrowRight size={14} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. Produits Populaires */}
      <section className="home-popular-section">
        <div className="container">
          <div className="home-popular-header">
            <div>
              <h2 className="home-popular-title">Produits Populaires</h2>
              <p className="home-popular-sub">
                Les références les plus commandées par nos clients CHR cette semaine.
              </p>
            </div>
            <button
              onClick={() => onNavigate('catalog')}
              className="btn btn-outline btn-sm home-see-all-btn"
            >
              <span>Tout voir</span>
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="modern-products-grid">
            {popularProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Bande CTA finale */}
      <section className="home-cta-band">
        <div className="container">
          <div className="home-cta-card">
            <span className="home-cta-kicker">
              <MoonStar size={15} />
              Arrivages du lendemain — commande ce soir
            </span>
            <h2 className="home-cta-title">Prêt à approvisionner vos cuisines ?</h2>
            <p className="home-cta-sub">
              Rejoignez les cafés, restaurants et hôtels qui reçoivent leur maraîcher chaque
              matin — sans intermédiaire, sans mauvaise surprise.
            </p>
            <div className="home-cta-actions">
              <button
                type="button"
                className="btn btn-lg home-cta-btn-primary"
                onClick={() => onNavigate('auth')}
              >
                <ClipboardCheck size={18} />
                <span>Créer un compte gratuit</span>
              </button>
              <button
                type="button"
                className="btn btn-lg home-cta-btn-ghost"
                onClick={() => onNavigate('catalog')}
              >
                <Truck size={18} />
                <span>Voir le catalogue</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Bottom Cart Bar for Seamless Multi-Product Grouped Ordering */}
      {cart.length > 0 && (
        <div
          className="home-floating-cart-bar"
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
