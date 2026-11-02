import React, { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, MessageSquare, ShieldCheck } from 'lucide-react';

import { store } from '../services/store';
import { CompanySettings } from '../types';

interface FooterProps {
  onNavigate?: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [currentUser, setCurrentUser] = useState(store.getCurrentUser());
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    let isMounted = true;
    store.getCompanySettings().then((st) => {
      if (isMounted) setSettings(st);
    });
    const unsubscribe = store.subscribe(() => {
      if (isMounted) {
        setCurrentUser(store.getCurrentUser());
        store.getCompanySettings().then((st) => {
          if (isMounted) setSettings(st);
        });
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const hasCustomContact =
    Boolean(settings?.phone?.trim()) ||
    Boolean(settings?.whatsapp?.trim()) ||
    Boolean(settings?.email?.trim()) ||
    Boolean(settings?.address?.trim());

  return (
    <footer className="site-footer">
      <div className="container">
        {/* Main Footer Content */}
        <div className="footer-grid">
          {/* Brand & Mission */}
          <div className="footer-brand-col">
            <div className="footer-brand-header">
              <img
                src="/logo.png"
                alt="Pont Agricole"
                className="footer-logo"
              />
              <div>
                <span className="footer-brand-title">{settings?.companyName || 'Pont Agricole'}</span>
                <span className="footer-brand-tagline">{settings?.tagline || 'Centrale d\'Achat B2B'}</span>
              </div>
            </div>
            <p className="footer-desc">
              Approvisionnement direct en fruits, légumes et herbes aromatiques pour les professionnels de la restauration et de l'hôtellerie au Maroc.
            </p>
            <div className="footer-status-pill">
              <span className="footer-status-dot" />
              <span>Service B2B • Maroc</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="footer-col">
            <h4 className="footer-col-title">Plateforme</h4>
            <ul className="footer-links">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('home')}
                  className="footer-link-btn"
                >
                  Accueil
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('catalog')}
                  className="footer-link-btn"
                >
                  Catalogue Produits Frais
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('client-dashboard')}
                  className="footer-link-btn"
                >
                  Espace Professionnel
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('auth')}
                  className="footer-link-btn"
                >
                  Créer un Compte B2B
                </button>
              </li>
            </ul>
          </div>

          {/* Categories / Services */}
          <div className="footer-col">
            <h4 className="footer-col-title">Engagements CHR</h4>
            <ul className="footer-links">
              <li>
                <span className="footer-static-item">Approvisionnement Terroirs Marocains</span>
              </li>
              <li>
                <span className="footer-static-item">Calibrage & Tri Conforme Cuisines</span>
              </li>
              <li>
                <span className="footer-static-item">Livraisons Dédiées CHR</span>
              </li>
              <li>
                <span className="footer-static-item">Tarifs de Gros Stables en MAD</span>
              </li>
              <li>
                <span className="footer-static-item">Facturation avec Relevés Détaillés</span>
              </li>
            </ul>
          </div>

          {/* Contact & Orders */}
          <div className="footer-col">
            <h4 className="footer-col-title">Contact & Commandes</h4>
            <ul className="footer-links">
              {settings?.phone?.trim() && (
                <li>
                  <a href={`tel:${settings.phone.replace(/\s+/g, '')}`} className="footer-contact-link">
                    <Phone size={14} />
                    <span>{settings.phone}</span>
                  </a>
                </li>
              )}
              {settings?.whatsapp?.trim() && (
                <li>
                  <a
                    href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=Bonjour%20${encodeURIComponent(settings.companyName || 'Pont Agricole')},%20je%20souhaite%20des%20informations`}
                    target="_blank"
                    rel="noreferrer"
                    className="footer-contact-link highlight"
                  >
                    <MessageSquare size={14} />
                    <span>WhatsApp Pro ({settings.whatsapp})</span>
                  </a>
                </li>
              )}
              {settings?.email?.trim() && (
                <li>
                  <a href={`mailto:${settings.email}`} className="footer-contact-link">
                    <Mail size={14} />
                    <span>{settings.email}</span>
                  </a>
                </li>
              )}
              {settings?.address?.trim() && (
                <li>
                  <span className="footer-contact-item">
                    <MapPin size={14} />
                    <span>{settings.address}{settings.city ? `, ${settings.city}` : ''}</span>
                  </span>
                </li>
              )}
              {!hasCustomContact && (
                <>
                  <li>
                    <span className="footer-contact-item">
                      <ShieldCheck size={14} />
                      <span>Centrale d'Achat Maraîchère B2B</span>
                    </span>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate && onNavigate('auth')}
                      className="footer-link-btn"
                      style={{ textAlign: 'left', color: 'var(--primary-300)' }}
                    >
                      Demander une Ouverture de Compte
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Legal & Administration Bar */}
        <div className="footer-bottom">
          <div className="footer-copy">
            © {new Date().getFullYear()} {settings?.companyName || 'Pont Agricole'}. Tous droits réservés.
          </div>

          <div className="footer-legal-links">
            <span>CGV Professionnelles</span>
            <span className="footer-sep">•</span>
            <span>Confidentialité</span>
            <span className="footer-sep">•</span>
            <span>Facturation en MAD</span>
          </div>

          {onNavigate && currentUser?.role === 'admin' && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="footer-admin-btn"
              title="Accès Administration"
            >
              <ShieldCheck size={13} />
              <span>Espace Admin</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
