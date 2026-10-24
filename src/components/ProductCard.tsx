import React, { useState } from 'react';
import { Plus, Minus, ShoppingCart, Check, AlertCircle, MapPin } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const [quantity, setQuantity] = useState<number>(product.minimumQuantity || 1);
  const [added, setAdded] = useState(false);

  const handleIncrement = () => setQuantity((prev) => prev + 1);
  const handleDecrement = () => setQuantity((prev) => Math.max(product.minimumQuantity || 1, prev - 1));

  const handleAdd = () => {
    if (!product.isAvailable) return;
    onAddToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const getUnitLabel = (unit: string) => {
    switch (unit) {
      case 'kg':
        return 'le kg';
      case 'caisse':
        return 'la caisse';
      case 'carton':
        return 'le carton';
      case 'botte':
        return 'la botte';
      case 'piece':
        return 'l’unité';
      default:
        return unit;
    }
  };

  return (
    <div className="card product-card">
      {/* Product Image Frame */}
      <div className="product-img-wrap">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="product-img"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Top Badges */}
        <div className="product-badges">
          {product.badge && (
            <span className="badge badge-amber product-top-badge">
              {product.badge}
            </span>
          )}
          {!product.isAvailable && (
            <span className="badge badge-status-cancelled product-top-badge">
              Rupture
            </span>
          )}
        </div>

        {product.origin && (
          <div className="product-origin-tag">
            <MapPin size={10} color="var(--amber-400)" />
            <span>{product.origin}</span>
          </div>
        )}
      </div>

      {/* Product Content Body */}
      <div className="product-body">
        <h3 className="product-title" title={product.name}>
          {product.name}
        </h3>

        <p className="product-desc">
          {product.description}
        </p>

        {/* Unit & Min Order Info */}
        <div className="product-unit-info">
          <span className="product-unit-chip">
            Au {product.unit}
          </span>
          {product.minimumQuantity > 1 ? (
            <span className="product-min-badge">
              Min: {product.minimumQuantity}
            </span>
          ) : (
            <span className="product-stock-dot">
              <span className="dot-green" /> Disponible
            </span>
          )}
        </div>

        {/* Bottom Section Pinned to Bottom */}
        <div className="product-card-footer">
          {/* Price Tag in MAD */}
          <div className="product-price-wrap">
            <span className="product-price-num">
              {product.price.toFixed(2)}
            </span>
            <span className="product-currency">
              DH
            </span>
            <span className="product-unit-label">
              /{product.unit}
            </span>
          </div>

          {/* Quantity Controls & Add to Cart in Single Cohesive Row */}
          <div className="product-actions">
            <div className="product-qty-stepper">
              <button
                onClick={handleDecrement}
                disabled={!product.isAvailable || quantity <= product.minimumQuantity}
                className="qty-btn"
                title="Diminuer"
                type="button"
              >
                <Minus size={12} />
              </button>
              <span className="qty-number">
                {quantity}
              </span>
              <button
                onClick={handleIncrement}
                disabled={!product.isAvailable}
                className="qty-btn"
                title="Augmenter"
                type="button"
              >
                <Plus size={12} />
              </button>
            </div>

            <button
              onClick={handleAdd}
              disabled={!product.isAvailable}
              className={`btn product-add-btn ${added ? 'btn-secondary' : 'btn-primary'}`}
              type="button"
            >
              {added ? (
                <>
                  <Check size={14} color="var(--primary-600)" />
                  <span className="btn-text">Ajouté</span>
                </>
              ) : product.isAvailable ? (
                <>
                  <ShoppingCart size={14} />
                  <span className="btn-text">Ajouter</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} />
                  <span className="btn-text">Rupture</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
