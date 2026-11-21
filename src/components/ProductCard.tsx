import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check, Heart, Plus, Minus, X } from 'lucide-react';
import { Product } from '../types';
import { store } from '../services/store';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const [isFav, setIsFav] = useState<boolean>(store.isFavorite(product.id));
  const [added, setAdded] = useState<boolean>(false);
  const [cartQty, setCartQty] = useState<number>(() => {
    const item = store.getCart().find((i) => i.product.id === product.id);
    return item ? item.quantity : 0;
  });

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setIsFav(store.isFavorite(product.id));
      const item = store.getCart().find((i) => i.product.id === product.id);
      setCartQty(item ? item.quantity : 0);
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
    const qty = Math.max(1, Number(product.minimumQuantity) || 1);
    onAddToCart(product, qty);
    setCartQty(qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.isAvailable) return;
    const newQty = cartQty + 1;
    setCartQty(newQty);
    store.updateCartQuantity(product.id, newQty);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newQty = Math.max(0, cartQty - 1);
    setCartQty(newQty);
    store.updateCartQuantity(product.id, newQty);
  };

  const handleRemoveFromCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCartQty(0);
    store.removeFromCart(product.id);
  };

  return (
    <div
      className={`modern-product-card ${cartQty > 0 ? 'is-in-cart' : ''}`}
      onClick={cartQty === 0 && product.isAvailable ? handleQuickAdd : undefined}
      style={{ cursor: cartQty === 0 && product.isAvailable ? 'pointer' : 'default' }}
    >
      {/* Product Image Frame with Floating Actions */}
      <div className="modern-img-wrap">
        {!product.isAvailable && (
          <span className="modern-badge-pill out-of-stock">
            Rupture
          </span>
        )}

        {/* Floating Red Kerwa / Supprimer Badge when in cart */}
        {cartQty > 0 && (
          <button
            type="button"
            onClick={handleRemoveFromCart}
            className="modern-card-cart-pill"
            title="Supprimer ce produit du panier"
          >
            <X size={12} strokeWidth={3} />
            <span>Supprimer</span>
          </button>
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

        {/* Bottom Price & Circular Cart Button / Stepper */}
        <div className="modern-card-bottom">
          <div className="modern-price-block">
            <span className="modern-current-price">
              {product.price.toFixed(2)} <span className="modern-currency">DH</span>
            </span>
            {product.unit && (
              <span className="modern-unit-label">/{product.unit}</span>
            )}
          </div>

          {cartQty > 0 ? (
            <div
              className="modern-stepper-cluster"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modern-cart-stepper">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="modern-stepper-btn minus"
                  title="Diminuer la quantité"
                  aria-label="Diminuer la quantité"
                >
                  <Minus size={13} strokeWidth={3} />
                </button>

                <span className="modern-stepper-qty">
                  {cartQty}
                </span>

                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={!product.isAvailable}
                  className="modern-stepper-btn plus"
                  title="Augmenter la quantité"
                  aria-label="Augmenter la quantité"
                >
                  <Plus size={13} strokeWidth={3} />
                </button>
              </div>

              {/* Red Kerwa / Supprimer Button */}
              <button
                type="button"
                onClick={handleRemoveFromCart}
                className="modern-stepper-delete-btn"
                title="Supprimer ce produit du panier"
                aria-label={`Supprimer ${product.name} du panier`}
              >
                <X size={15} strokeWidth={2.8} />
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};
