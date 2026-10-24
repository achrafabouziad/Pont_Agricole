import React from 'react';
import { Phone, Mail, MapPin, MessageSquare, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onNavigate?: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
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
                <span className="footer-brand-title">Pont Agricole</span>
                <span className="footer-brand-tagline">Centrale d'Achat B2B</span>
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
                <span className="footer-static-item">Livraisons Matinales Dédiées</span>
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
              <li>
                <a href="tel:+212522457890" className="footer-contact-link">
                  <Phone size={14} />
                  <span>+212 5 22 45 78 90</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/212661987654?text=Bonjour%20Pont%20Agricole,%20je%20suis%20professionnel%20CHR%20et%20souhaite%20des%20informations"
                  target="_blank"
                  rel="noreferrer"
                  className="footer-contact-link highlight"
                >
                  <MessageSquare size={14} />
                  <span>WhatsApp Pro (+212 6 61 98 76 54)</span>
                </a>
              </li>
              <li>
                <a href="mailto:pro@pontagricole.ma" className="footer-contact-link">
                  <Mail size={14} />
                  <span>pro@pontagricole.ma</span>
                </a>
              </li>
              <li>
                <span className="footer-contact-item">
                  <MapPin size={14} />
                  <span>Halle aux Primeurs, Marché de Gros, Casablanca</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal & Administration Bar */}
        <div className="footer-bottom">
          <div className="footer-copy">
            © {new Date().getFullYear()} Pont Agricole SARL-AU. Tous droits réservés.
          </div>

          <div className="footer-legal-links">
            <span>CGV Professionnelles</span>
            <span className="footer-sep">•</span>
            <span>Confidentialité</span>
            <span className="footer-sep">•</span>
            <span>Facturation en MAD</span>
          </div>

          {onNavigate && (
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
