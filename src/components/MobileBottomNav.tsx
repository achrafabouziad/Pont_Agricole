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
    <nav className="mobile-bottom-bar" aria-label="Navigation principale mobile">
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className={`bottom-nav-item ${currentPage === 'home' ? 'active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <Home size={20} strokeWidth={currentPage === 'home' ? 2.5 : 1.8} />
        </div>
        <span className="bottom-nav-label">Accueil</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('catalog')}
        className={`bottom-nav-item ${currentPage === 'catalog' ? 'active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <Store size={20} strokeWidth={currentPage === 'catalog' ? 2.5 : 1.8} />
        </div>
        <span className="bottom-nav-label">Catalogue</span>
      </button>

      <button
        type="button"
        onClick={onOpenCart}
        className="bottom-nav-item cart-bottom-item"
      >
        <div className="bottom-nav-icon-wrap cart-icon-wrap">
          <ShoppingCart size={20} strokeWidth={cartCount > 0 ? 2.5 : 1.8} />
          {cartCount > 0 && (
            <span className="bottom-cart-badge">{cartCount}</span>
          )}
        </div>
        <span className="bottom-nav-label">Panier</span>
      </button>

      {user ? (
        <button
          type="button"
          onClick={() => onNavigate('client-dashboard')}
          className={`bottom-nav-item ${currentPage === 'client-dashboard' ? 'active' : ''}`}
        >
          <div className="bottom-nav-icon-wrap">
            <User size={20} strokeWidth={currentPage === 'client-dashboard' ? 2.5 : 1.8} />
          </div>
          <span className="bottom-nav-label">Espace Pro</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onNavigate('auth')}
          className={`bottom-nav-item ${currentPage === 'auth' ? 'active' : ''}`}
        >
          <div className="bottom-nav-icon-wrap">
            <User size={20} strokeWidth={currentPage === 'auth' ? 2.5 : 1.8} />
          </div>
          <span className="bottom-nav-label">Connexion</span>
        </button>
      )}

      {user?.role === 'admin' && (
        <button
          type="button"
          onClick={() => onNavigate('admin')}
          className={`bottom-nav-item admin-bottom-item ${currentPage === 'admin' ? 'active' : ''}`}
        >
          <div className="bottom-nav-icon-wrap">
            <ShieldCheck size={20} strokeWidth={currentPage === 'admin' ? 2.5 : 1.8} />
          </div>
          <span className="bottom-nav-label">Admin</span>
        </button>
      )}
    </nav>
  );
};
