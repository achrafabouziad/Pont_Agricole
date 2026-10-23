import React, { useState, useEffect } from 'react';
import { Home, Store, ShoppingCart, User, ShieldCheck } from 'lucide-react';
import { store } from '../services/store';
import { UserProfile } from '../types';

interface MobileBottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenCart: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentPage,
  onNavigate,
  onOpenCart,
}) => {
  const [user, setUser] = useState<UserProfile | null>(store.getCurrentUser());
  const [cartCount, setCartCount] = useState<number>(store.getCart().reduce((sum, i) => sum + i.quantity, 0));

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setUser(store.getCurrentUser());
      setCartCount(store.getCart().reduce((sum, i) => sum + i.quantity, 0));
    });
    return unsub;
  }, []);

  return (
    <nav className="mobile-bottom-bar">
      <button
        onClick={() => onNavigate('home')}
        className={`bottom-nav-item ${currentPage === 'home' ? 'active' : ''}`}
      >
        <Home size={20} />
        <span>Accueil</span>
      </button>

      <button
        onClick={() => onNavigate('catalog')}
        className={`bottom-nav-item ${currentPage === 'catalog' ? 'active' : ''}`}
      >
        <Store size={20} />
        <span>Catalogue</span>
      </button>

      <button
        onClick={onOpenCart}
        className="bottom-nav-item cart-bottom-item"
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <ShoppingCart size={20} />
          {cartCount > 0 && (
            <span className="bottom-cart-badge">{cartCount}</span>
          )}
        </div>
        <span>Panier</span>
      </button>

      {user ? (
        <button
          onClick={() => onNavigate('client-dashboard')}
          className={`bottom-nav-item ${currentPage === 'client-dashboard' ? 'active' : ''}`}
        >
          <User size={20} />
          <span>Espace Pro</span>
        </button>
      ) : (
        <button
          onClick={() => onNavigate('auth')}
          className={`bottom-nav-item ${currentPage === 'auth' ? 'active' : ''}`}
        >
          <User size={20} />
          <span>Connexion</span>
        </button>
      )}

      <button
        onClick={() => {
          store.setAdminMode();
          onNavigate('admin');
        }}
        className={`bottom-nav-item ${currentPage === 'admin' ? 'active' : ''}`}
      >
        <ShieldCheck size={20} color={currentPage === 'admin' ? 'var(--amber-500)' : 'var(--amber-600)'} />
        <span style={{ color: currentPage === 'admin' ? 'var(--amber-600)' : undefined }}>Admin</span>
      </button>
    </nav>
  );
};
