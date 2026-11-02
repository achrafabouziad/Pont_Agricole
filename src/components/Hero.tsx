import React from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Truck } from 'lucide-react';

interface HeroProps {
  onExploreCatalog: () => void;
  onCreateAccount: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreCatalog }) => {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-content-wrap">
          <div className="hero-badge">
            <ShieldCheck size={13} color="var(--primary-600)" />
            <span>Centrale B2B CHR • Casablanca • Rabat • Marrakech • Tanger</span>
          </div>

          <h1 className="hero-title">
            Fruits, Légumes & Herbes Fraîches{' '}
            <span style={{ color: 'var(--primary-700)', position: 'relative', display: 'inline-block' }}>
              pour les Professionnels
            </span>
          </h1>

          <p className="hero-desc">
            Approvisionnement direct et mercuriale du jour pour Cafés, Restaurants et Hôtels au Maroc.
          </p>

          <div className="hero-actions">
            <button onClick={onExploreCatalog} className="btn btn-primary hero-cta-btn">
              <span>Consulter le Catalogue & Prix du Jour</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="hero-trust-chips">
            <span className="hero-trust-chip">
              <CheckCircle2 size={13} className="hero-trust-chip-icon" />
              <span>Facturation MAD</span>
            </span>
            <span className="hero-trust-chip">
              <Truck size={13} className="hero-trust-chip-icon" />
              <span>Livraison Dédiée CHR</span>
            </span>
            <span className="hero-trust-chip">
              <ShieldCheck size={13} className="hero-trust-chip-icon" />
              <span>Calibrage Garanti</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
