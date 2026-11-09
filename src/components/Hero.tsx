import React from 'react';
import { ArrowRight } from 'lucide-react';

interface HeroProps {
  onExploreCatalog: () => void;
  onCreateAccount: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreCatalog }) => {
  return (
    <section className="hero-banner-section">
      <div className="container">
        <div className="hero-banner-card">
          {/* Authentic Produce Photography Layer */}
          <div className="hero-banner-bg" />
          <div className="hero-banner-overlay" />

          <div className="hero-banner-content">
            {/* Live Wholesale Badge */}
            <div className="hero-live-badge">
              <span className="hero-pulse-dot" />
              <span>Arrivages du jour • Marché de Gros Casablanca</span>
            </div>

            {/* Editorial Main Title */}
            <h1 className="hero-banner-title">
              Fruits, Légumes & Herbes Fraîches pour la Restauration
            </h1>

            {/* Authentic B2B Subtitle */}
            <p className="hero-banner-sub">
              Approvisionnement direct de la Halle aux Primeurs pour Cafés, Restaurants et Hôtels au Maroc.
              Sélectionné chaque nuit au carreau pour la fraîcheur de vos cuisines.
            </p>

            {/* Human Crafted Action Button */}
            <div className="hero-banner-cta-wrap">
              <button
                type="button"
                onClick={onExploreCatalog}
                className="hero-banner-btn"
              >
                <span>Consulter le Catalogue & Prix du Jour</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
