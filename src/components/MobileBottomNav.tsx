import React, { useState, useEffect } from 'react';
import { Home, LayoutGrid, ShoppingBag, Heart, User } from 'lucide-react';
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
  const [cartCount, setCartCount] = useState<number>(
    store.getCart().reduce((sum, i) => sum + i.quantity, 0)
  );
  const [favCount, setFavCount] = useState<number>(store.getFavorites().length);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setUser(store.getCurrentUser());
      setCartCount(store.getCart().reduce((sum, i) => sum + i.quantity, 0));
      setFavCount(store.getFavorites().length);
    });
    return unsub;
  }, []);

  return (
    <nav className="mobile-bottom-bar-wrapper" aria-label="Navigation principale mobile">
      <div className="mobile-bottom-bar-pill">
        {/* 1. Accueil */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`bottom-pill-item ${currentPage === 'home' ? 'active' : ''}`}
          aria-label="Accueil"
        >
          <div className="bottom-pill-icon-wrap">
            <Home size={22} strokeWidth={currentPage === 'home' ? 2.4 : 1.8} />
          </div>
          <span className="bottom-pill-label">Accueil</span>
        </button>

        {/* 2. Catégories */}
        <button
          type="button"
          onClick={() => onNavigate('categories')}
          className={`bottom-pill-item ${currentPage === 'categories' ? 'active' : ''}`}
          aria-label="Catégories"
        >
          <div className="bottom-pill-icon-wrap">
            <LayoutGrid size={22} strokeWidth={currentPage === 'categories' ? 2.4 : 1.8} />
          </div>
          <span className="bottom-pill-label">Catégories</span>
        </button>

        {/* 3. Panier */}
        <button
          type="button"
          onClick={onOpenCart}
          className="bottom-pill-item cart-pill-item"
          aria-label="Panier"
        >
          <div className="bottom-pill-icon-wrap">
            <ShoppingBag size={22} strokeWidth={cartCount > 0 ? 2.4 : 1.8} />
            {cartCount > 0 && (
              <span className="bottom-pill-badge">{cartCount}</span>
            )}
          </div>
          <span className="bottom-pill-label">Panier</span>
        </button>

        {/* 4. Favoris */}
        <button
          type="button"
          onClick={() => onNavigate('favorites')}
          className={`bottom-pill-item ${currentPage === 'favorites' ? 'active' : ''}`}
          aria-label="Favoris"
        >
          <div className="bottom-pill-icon-wrap">
            <Heart
              size={22}
              strokeWidth={currentPage === 'favorites' ? 2.4 : 1.8}
              fill={currentPage === 'favorites' ? 'currentColor' : 'none'}
            />
            {favCount > 0 && (
              <span className="bottom-pill-fav-dot" />
            )}
          </div>
          <span className="bottom-pill-label">Favoris</span>
        </button>

        {/* 5. Profil / Espace Pro */}
        <button
          type="button"
          onClick={() => {
            if (user?.role === 'admin') {
              onNavigate('admin');
            } else if (user) {
              onNavigate('client-dashboard');
            } else {
              onNavigate('auth');
            }
          }}
          className={`bottom-pill-item ${
            currentPage === 'client-dashboard' || currentPage === 'auth' || currentPage === 'admin'
              ? 'active'
              : ''
          }`}
          aria-label="Profil"
        >
          <div className="bottom-pill-icon-wrap">
            <User
              size={22}
              strokeWidth={
                currentPage === 'client-dashboard' || currentPage === 'auth' || currentPage === 'admin'
                  ? 2.4
                  : 1.8
              }
            />
          </div>
          <span className="bottom-pill-label">Profil</span>
        </button>
      </div>
    </nav>
  );
};
