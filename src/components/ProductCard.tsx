import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check, Heart } from 'lucide-react';
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

  return (
    <div className="modern-product-card">
      {/* Product Image Frame with Floating Actions (Matches Reference Image 1) */}
      <div className="modern-img-wrap">
        {!product.isAvailable && (
          <span className="modern-badge-pill out-of-stock">
            Rupture
          </span>
        )}

        <button
          type="button"
          onClick={handleToggleFav}
          className={`modern-fav-btn ${isFav ? 'active' : ''}`}
          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart
            size={16}
            fill={isFav ? '#ef4444' : 'none'}
            color={isFav ? '#ef4444' : '#64748b'}
            strokeWidth={isFav ? 2.5 : 2}
          />
        </button>

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
