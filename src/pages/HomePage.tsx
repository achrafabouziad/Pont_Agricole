import React, { useState, useEffect } from 'react';
import { Hero } from '../components/Hero';
import { ProductCard } from '../components/ProductCard';
import { store } from '../services/store';
import { Category, Product } from '../types';
import {
  ArrowRight,
  Sprout,
  Truck,
  BadgePercent,
  Headset,
  ClipboardCheck,
  MoonStar,
  Sunrise,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string) => void;
  onSelectCategory?: (categoryId: string) => void;
  onOpenCart: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectCategory, onOpenCart }) => {
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

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
    });
    return unsub;
  }, []);

  const handleAddToCart = (product: Product, quantity: number) => {
    store.addToCart(product, quantity);
    onOpenCart();
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
                      <p className="cat-card-desc">{cat.description}</p>
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

      {/* 4. Engagements — USP bar */}
      <section className="home-advantages-section">
        <div className="container">
          <div className="home-section-header">
            <h2 className="home-section-title">Pourquoi les Chefs nous font confiance</h2>
            <p className="home-section-subtitle">
              Un approvisionnement pensé pour les cuisines professionnelles du Maroc.
            </p>
          </div>
          <div className="home-advantages-grid">
            <div className="advantage-card">
              <div className="advantage-icon-wrap primary">
                <Sprout size={22} />
              </div>
              <div>
                <h3 className="advantage-title">Fraîcheur du carreau</h3>
                <p className="advantage-desc">
                  Sélectionné chaque nuit au Marché de Gros de Casablanca, au pic de maturité.
                </p>
              </div>
            </div>
            <div className="advantage-card">
              <div className="advantage-icon-wrap amber">
                <Sunrise size={22} />
              </div>
              <div>
                <h3 className="advantage-title">Livraison dès l'aube</h3>
                <p className="advantage-desc">
                  Vos commandes arrivent avant le service, prêtes à entrer en cuisine.
                </p>
              </div>
            </div>
            <div className="advantage-card">
              <div className="advantage-icon-wrap primary">
                <BadgePercent size={22} />
              </div>
              <div>
                <h3 className="advantage-title">Prix de gros en MAD</h3>
                <p className="advantage-desc">
                  Mercuriale mise à jour quotidiennement, facturation claire en dirham.
                </p>
              </div>
            </div>
            <div className="advantage-card">
              <div className="advantage-icon-wrap amber">
                <Headset size={22} />
              </div>
              <div>
                <h3 className="advantage-title">Service CHR dédié</h3>
                <p className="advantage-desc">
                  Une équipe qui connaît les exigences des cafés, restaurants et hôtels.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Comment ça marche — 3 étapes */}
      <section className="home-steps-section">
        <div className="container">
          <div className="home-section-header">
            <h2 className="home-section-title">Commander en 3 étapes</h2>
            <p className="home-section-subtitle">
              Simple, rapide, et calé sur le rythme de votre cuisine.
            </p>
          </div>
          <div className="home-steps-grid">
            <div className="step-card">
              <div className="step-num">01</div>
              <div>
                <h3 className="step-title">Créez votre compte pro</h3>
                <p className="step-desc">
                  Inscription gratuite pour les professionnels — accès immédiat au catalogue.
                </p>
              </div>
            </div>
            <div className="step-card">
              <div className="step-num">02</div>
              <div>
                <h3 className="step-title">Commandez avant minuit</h3>
                <p className="step-desc">
                  Chaque soir, la mercuriale du jour est mise à jour — composez votre panier.
                </p>
              </div>
            </div>
            <div className="step-card">
              <div className="step-num">03</div>
              <div>
                <h3 className="step-title">Livré à l'aube</h3>
                <p className="step-desc">
                  Réception fraîche dès les premières heures, facture et BL dans votre espace.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Bande CTA finale */}
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
    </div>
  );
};
