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
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Product Image Frame */}
      <div style={{ position: 'relative', height: '190px', width: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-surface-secondary)' }}>
        <img
          src={product.imageUrl}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
          onError={(e) => {
            // Fallback placeholder if unsplash fails
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Top Badges */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {product.badge && (
            <span className="badge badge-amber" style={{ boxShadow: 'var(--shadow-sm)' }}>
              {product.badge}
            </span>
          )}
          {!product.isAvailable && (
            <span className="badge badge-status-cancelled">
              Rupture
            </span>
          )}
        </div>

        {product.origin && (
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              backgroundColor: 'rgba(8, 40, 23, 0.75)',
              color: '#ffffff',
              backdropFilter: 'blur(4px)',
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <MapPin size={11} color="var(--amber-400)" />
            <span>{product.origin}</span>
          </div>
        )}
      </div>

      {/* Product Content Body */}
      <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <h3
          style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--primary-900)',
            marginBottom: '0.35rem',
            lineHeight: 1.3,
          }}
        >
          {product.name}
        </h3>

        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            lineHeight: 1.45,
            marginBottom: '1rem',
            flexGrow: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.description}
        </p>

        {/* Unit & Min Order Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span>Unité : <strong>{product.unit.toUpperCase()}</strong></span>
          {product.minimumQuantity > 1 && (
            <span style={{ color: 'var(--primary-700)', fontWeight: 600, backgroundColor: 'var(--primary-50)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
              Min : {product.minimumQuantity} {product.unit}s
            </span>
          )}
        </div>

        {/* Price Tag in MAD */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '1.1rem' }}>
          <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary-800)', letterSpacing: '-0.02em' }}>
            {product.price.toFixed(2)}
          </span>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary-600)' }}>
            DH
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
            / {getUnitLabel(product.unit)}
          </span>
        </div>

        {/* Quantity Controls & Add to Cart */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: '1.5px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              backgroundColor: 'var(--bg-main)',
            }}
          >
            <button
              onClick={handleDecrement}
              disabled={!product.isAvailable || quantity <= product.minimumQuantity}
              style={{ padding: '0.5rem 0.65rem', color: 'var(--text-main)', opacity: quantity <= product.minimumQuantity ? 0.4 : 1 }}
              title="Diminuer"
            >
              <Minus size={14} />
            </button>
            <span style={{ padding: '0 0.5rem', fontWeight: 700, fontSize: '0.9rem', minWidth: '28px', textAlign: 'center' }}>
              {quantity}
            </span>
            <button
              onClick={handleIncrement}
              disabled={!product.isAvailable}
              style={{ padding: '0.5rem 0.65rem', color: 'var(--text-main)' }}
              title="Augmenter"
            >
              <Plus size={14} />
            </button>
          </div>

          <button
            onClick={handleAdd}
            disabled={!product.isAvailable}
            className={`btn ${added ? 'btn-secondary' : 'btn-primary'}`}
            style={{
              flex: 1,
              padding: '0.65rem',
              fontSize: '0.88rem',
              opacity: product.isAvailable ? 1 : 0.5,
              cursor: product.isAvailable ? 'pointer' : 'not-allowed',
            }}
          >
            {added ? (
              <>
                <Check size={16} color="var(--primary-600)" />
                <span>Ajouté !</span>
              </>
            ) : product.isAvailable ? (
              <>
                <ShoppingCart size={16} />
                <span>Ajouter</span>
              </>
            ) : (
              <>
                <AlertCircle size={16} />
                <span>Indisponible</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
