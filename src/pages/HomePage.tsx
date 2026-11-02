import React, { useState, useEffect } from 'react';
import { Hero } from '../components/Hero';
import { ProductCard } from '../components/ProductCard';
import { store } from '../services/store';
import { Category, Product } from '../types';
import { Utensils, Coffee, Hotel, ArrowRight } from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onOpenCart: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectCategory, onOpenCart }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);

  useEffect(() => {
    store.getCategories().then(setCategories);
    store.getProducts().then((prods) => {
      // Pick popular / badge products
      setPopularProducts(prods.slice(0, 8));
    });
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

      {/* 2. Categories Showcase */}
      <section className="home-categories-section">
        <div className="container">
          <div className="home-section-header">
            <span className="badge badge-brand">
              Nos Filières Maraîchères
            </span>
            <h2 className="home-section-title">
              Une gamme complète pour votre établissement
            </h2>
            <p className="home-section-subtitle">
              Des produits calibrés, cueillis à point et livrés en direct de nos producteurs partenaires.
            </p>
          </div>

          {/* Quick Mobile Category Rail (Smooth Horizontal Swipe) */}
          <div className="mobile-categories-rail">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onSelectCategory(cat.id);
                  onNavigate('catalog');
                }}
                className="mobile-cat-chip"
              >
                <img src={cat.imageUrl} alt={cat.name} className="mobile-cat-thumb" />
                <span className="mobile-cat-name">{cat.name}</span>
                <span className="mobile-cat-arrow">
                  <ArrowRight size={12} />
                </span>
              </button>
            ))}
          </div>

          {/* Desktop Categories Grid (Hidden on Mobile) */}
          <div className="desktop-categories-grid desktop-categories-wrapper">
            {categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  onNavigate('catalog');
                }}
                className="card category-card-home"
              >
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="cat-card-img"
                />
                <div className="cat-card-overlay" />
                <div className="cat-card-content">
                  <h3 className="home-cat-title">{cat.name}</h3>
                  <p className="home-cat-desc">{cat.description}</p>
                  <span className="home-cat-link">
                    <span>Explorer la gamme</span>
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Popular Fresh Produce Selection */}
      <section className="home-popular-section">
        <div className="container">
          <div className="home-popular-header">
            <div>
              <span className="badge badge-amber" style={{ marginBottom: '0.4rem' }}>
                Sélection du Jour
              </span>
              <h2 className="home-section-title">
                Produits Populaires chez les Chefs
              </h2>
            </div>
            <button
              onClick={() => onNavigate('catalog')}
              className="btn btn-outline btn-sm home-see-all-btn"
            >
              <span>Tout voir</span>
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="catalog-grid">
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

      {/* 4. Destiné aux CHR */}
      <section id="solutions" className="home-solutions-section">
        <div className="container">
          <div className="home-solutions-grid">
            <div className="home-solutions-content">
              <span className="badge badge-brand" style={{ marginBottom: '0.5rem' }}>
                Solutions CHR
              </span>
              <h2 className="home-section-title">
                Cafés, Restaurants, Hôtels & Traiteurs
              </h2>
              <p className="home-section-subtitle" style={{ marginBottom: '1.25rem' }}>
                Pont Agricole adapte ses volumes et ses fréquences de livraison à votre rythme quotidien.
              </p>

              <div className="home-solutions-list">
                <div className="solution-item">
                  <div className="solution-icon">
                    <Utensils size={17} />
                  </div>
                  <div>
                    <strong className="solution-name">Restaurants & Brasseries</strong>
                    <span className="solution-sub">Herbes fraîches cueillies le matin, primeurs calibrés au millimètre.</span>
                  </div>
                </div>

                <div className="solution-item">
                  <div className="solution-icon">
                    <Hotel size={17} />
                  </div>
                  <div>
                    <strong className="solution-name">Hôtels & Resorts</strong>
                    <span className="solution-sub">Volumes réguliers pour buffets et petits-déjeuners d'hôtels.</span>
                  </div>
                </div>

                <div className="solution-item">
                  <div className="solution-icon">
                    <Coffee size={17} />
                  </div>
                  <div>
                    <strong className="solution-name">Cafés & Salons de Thé</strong>
                    <span className="solution-sub">Menthe fraîche marocaine, citrons et agrumes pour jus pressés minute.</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('catalog')}
                className="btn btn-primary"
                style={{ marginTop: '1.25rem' }}
              >
                <span>Commander sur le Catalogue</span>
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="home-solutions-img-wrap">
              <img
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80"
                alt="Cuisine professionnelle"
                className="home-solutions-img"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

