import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check, Heart, MapPin } from 'lucide-react';
import { Product } from '../types';
import { store } from '../services/store';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const [isFav, setIsFav] = useState<boolean>(store.isFavorite(product.id));
  const [added, setAdded] = useState<boolean>(false);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setIsFav(store.isFavorite(product.id));
    });
    return unsub;
  }, [product.id]);

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = store.toggleFavorite(product.id);
    setIsFav(updated);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.isAvailable) return;
    onAddToCart(product, product.minimumQuantity || 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  // Fake reference price for discount badge preview if product has badge
  const hasDiscount = Boolean(product.badge && (product.badge.includes('%') || product.badge.toLowerCase().includes('promo')));
  const referencePrice = hasDiscount ? (product.price * 1.2).toFixed(2) : null;

  return (
    <div className="modern-product-card">
      {/* Top Header Row: Badge (Discount/Rupture only) & Favorite Heart */}
      <div className="modern-card-topbar">
        <div className="modern-card-badge-wrap">
          {product.badge ? (
            <span className="modern-badge-pill discount">
              {product.badge}
            </span>
          ) : !product.isAvailable ? (
            <span className="modern-badge-pill out-of-stock">
              Rupture
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleToggleFav}
          className={`modern-fav-btn ${isFav ? 'active' : ''}`}
          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart
            size={16}
            fill={isFav ? '#ef4444' : 'none'}
            color={isFav ? '#ef4444' : '#94a3b8'}
            strokeWidth={isFav ? 2.5 : 2}
          />
        </button>
      </div>

      {/* Centered Product Image */}
      <div className="modern-img-wrap">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="modern-product-img"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
          }}
        />
      </div>

      {/* Product Information */}
      <div className="modern-product-info">
        <h3 className="modern-product-title" title={product.name}>
          {product.name}
        </h3>

        {/* Bottom Price & Circular Cart Button */}
        <div className="modern-card-bottom">
          <div className="modern-price-block">
            <span className="modern-current-price">
              {product.price.toFixed(2)} <span className="modern-currency">DH</span>
            </span>
            {referencePrice && (
              <span className="modern-old-price">
                {referencePrice} DH
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={!product.isAvailable}
            className={`modern-add-circle-btn ${added ? 'added' : ''}`}
            title="Ajouter au panier"
            aria-label={`Ajouter ${product.name} au panier`}
          >
            {added ? (
              <Check size={17} strokeWidth={2.5} />
            ) : (
              <ShoppingCart size={16} strokeWidth={2.2} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
