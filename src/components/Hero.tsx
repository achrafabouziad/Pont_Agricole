import React from 'react';
import { ArrowRight } from 'lucide-react';

interface HeroProps {
  onExploreCatalog: () => void;
  onCreateAccount: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreCatalog }) => {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-content-wrap">
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
        </div>
      </div>
    </section>
  );
};
