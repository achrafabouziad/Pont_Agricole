import React, { useState, useEffect } from 'react';
import { Hero } from '../components/Hero';
import { ProductCard } from '../components/ProductCard';
import { store } from '../services/store';
import { Product } from '../types';
import { ArrowRight } from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string) => void;
  onSelectCategory?: (categoryId: string) => void;
  onOpenCart: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onOpenCart }) => {
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);

  useEffect(() => {
    store.getProducts().then((prods) => {
      // Pick popular / badge products
      setPopularProducts(prods.slice(0, 8));
    });

    const unsub = store.subscribe(() => {
      store.getProducts().then((prods) => {
        setPopularProducts(prods.slice(0, 8));
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

      {/* 2. Popular Fresh Produce Selection */}
      <section className="home-popular-section">
        <div className="container">
          <div className="home-popular-header">
            <div>
              <h2 className="home-section-title">
                Produits Populaires
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
    </div>
  );
};
