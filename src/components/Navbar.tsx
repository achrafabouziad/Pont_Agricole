import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, ShieldCheck, Menu, X, LogOut, ChevronDown, CheckCircle, Clock } from 'lucide-react';
import { store } from '../services/store';
import { UserProfile, Business } from '../types';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, onOpenCart }) => {
  const [user, setUser] = useState<UserProfile | null>(store.getCurrentUser());
  const [business, setBusiness] = useState<Business | null>(store.getCurrentBusiness());
  const [cartCount, setCartCount] = useState<number>(store.getCart().reduce((sum, i) => sum + i.quantity, 0));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [demoBarCollapsed, setDemoBarCollapsed] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setUser(store.getCurrentUser());
      setBusiness(store.getCurrentBusiness());
      setCartCount(store.getCart().reduce((sum, i) => sum + i.quantity, 0));
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await store.logout();
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    onNavigate('home');
  };

  const handleRoleSwitch = (role: 'approved_client' | 'pending_client' | 'visitor') => {
    store.switchRole(role);
    setMobileMenuOpen(false);
    if (role === 'visitor') onNavigate('home');
    else onNavigate('catalog');
  };

  const isDemoEnabled = typeof window !== 'undefined' && (
    window.location.search.includes('demo=true') || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  );

  return (
    <header className="site-header">
      {/* Demo Switcher bar visible only in dev or with ?demo=true */}
      {isDemoEnabled && (
        <div className={`demo-bar ${demoBarCollapsed ? 'collapsed' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="demo-label">Rôle démo :</span>
            <span style={{ fontWeight: 700, color: 'var(--amber-400)', fontSize: '0.78rem' }}>
              {user ? (user.role === 'admin' ? 'Admin (Directeur)' : 'Client Pro') : 'Visiteur'}
            </span>
          </div>
          <div className="demo-actions">
            <button
              className={user?.role === 'customer' ? 'active' : ''}
              onClick={() => handleRoleSwitch('approved_client')}
            >
              Client Pro
            </button>
            <button
              className={!user ? 'active' : ''}
              onClick={() => handleRoleSwitch('visitor')}
            >
              Visiteur
            </button>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <div className="container nav-container">
        {/* Logo and Brand */}
        <div
          onClick={() => {
            onNavigate('home');
            setMobileMenuOpen(false);
          }}
          className="brand-logo"
        >
          <img
            src="/logo.png"
            alt="Pont Agricole Logo"
            className="brand-img"
          />
          <div className="brand-text">
            <div className="brand-title">
              Pont Agricole
            </div>
            <div className="brand-subtitle">
              LE LIEN ENTRE LA TERRE ET L’AVENIR
            </div>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="desktop-nav">
          <button
            onClick={() => onNavigate('home')}
            className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
          >
            Accueil
          </button>
          <button
            onClick={() => onNavigate('catalog')}
            className={`nav-link ${currentPage === 'catalog' ? 'active' : ''}`}
          >
            Catalogue Produits
          </button>
          <button
            onClick={() => {
              if (currentPage !== 'home') onNavigate('home');
              setTimeout(() => {
                document.getElementById('advantages')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="nav-link"
          >
            Offre CHR
          </button>
          <button
            onClick={() => {
              if (currentPage !== 'home') onNavigate('home');
              setTimeout(() => {
                document.getElementById('contact-info')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="nav-link"
          >
            Contact
          </button>

          {user?.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className={currentPage === 'admin' ? 'badge badge-amber admin-nav-badge active' : 'badge badge-amber admin-nav-badge'}
              style={{ cursor: 'pointer', border: 'none' }}
              title="Accéder au tableau de bord administrateur"
            >
              <ShieldCheck size={14} />
              Admin
            </button>
          )}
        </nav>

        {/* Action Buttons */}
        <div className="nav-actions">
          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            className="btn btn-secondary btn-sm cart-btn"
            title="Consulter le panier"
          >
            <ShoppingCart size={18} />
            <span className="cart-text">Panier</span>
            {cartCount > 0 && (
              <span className="cart-count-badge">
                {cartCount}
              </span>
            )}
          </button>

          {/* User Account / Login */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="btn btn-outline btn-sm user-btn"
              >
                <User size={16} />
                <span className="user-btn-name">
                  {user.fullName.split(' ')[0]}
                </span>
                <ChevronDown size={14} />
              </button>

              {userDropdownOpen && (
                <div className="user-dropdown-menu">
                  <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.6rem', marginBottom: '0.6rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-900)' }}>
                      {user.fullName}
                    </div>
                    {business && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {business.businessName} ({business.city})
                      </div>
                    )}
                    <div style={{ marginTop: '0.35rem' }}>
                      {user.role === 'admin' ? (
                        <span className="badge badge-amber">Administrateur</span>
                      ) : (
                        <span className="badge badge-status-delivered" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <CheckCircle size={12} /> Compte Professionnel Actif
                        </span>
                      )}
                    </div>
                  </div>

                  {user.role === 'customer' && (
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('client-dashboard');
                      }}
                      className="dropdown-item"
                    >
                      Mon Espace & Commandes
                    </button>
                  )}

                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('admin');
                      }}
                      className="dropdown-item"
                      style={{ fontWeight: 700, color: 'var(--primary-700)' }}
                    >
                      Tableau de bord Admin
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="dropdown-item"
                    style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem' }}
                  >
                    <LogOut size={14} /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-desktop-buttons">
              <button
                onClick={() => onNavigate('auth')}
                className="btn btn-outline btn-sm"
              >
                Connexion
              </button>
              <button
                onClick={() => onNavigate('auth')}
                className="btn btn-primary btn-sm"
              >
                Créer Compte Pro
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-toggle"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className={`mobile-menu-link ${currentPage === 'home' ? 'active' : ''}`}
            >
              🌱 Accueil
            </button>
            <button
              onClick={() => {
                onNavigate('catalog');
                setMobileMenuOpen(false);
              }}
              className={`mobile-menu-link ${currentPage === 'catalog' ? 'active' : ''}`}
            >
              📦 Catalogue Produits Frais
            </button>
            {user?.role === 'customer' && (
              <button
                onClick={() => {
                  onNavigate('client-dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`mobile-menu-link ${currentPage === 'client-dashboard' ? 'active' : ''}`}
              >
                👤 Mon Espace Pro & Commandes
              </button>
            )}
            {user?.role === 'admin' && (
              <button
                onClick={() => {
                  onNavigate('admin');
                  setMobileMenuOpen(false);
                }}
                className="mobile-menu-link"
                style={{ fontWeight: 800, color: 'var(--amber-600)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <ShieldCheck size={18} /> Tableau de Bord Administrateur
              </button>
            )}
            {!user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    onNavigate('auth');
                    setMobileMenuOpen(false);
                  }}
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Connexion Client Pro
                </button>
                <button
                  onClick={() => {
                    onNavigate('auth');
                    setMobileMenuOpen(false);
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Créer Compte Établissement CHR
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', color: '#b91c1c', marginTop: '0.5rem' }}
              >
                <LogOut size={16} /> Déconnexion
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
