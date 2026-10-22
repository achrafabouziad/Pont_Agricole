import React from 'react';
import { CheckCircle2, Package, MapPin, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Order } from '../types';

interface OrderSuccessModalProps {
  order: Order | null;
  onClose: () => void;
  onGoToDashboard: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onClose,
  onGoToDashboard,
}) => {
  if (!order) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', textAlign: 'center' }}>
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-100)',
            color: 'var(--primary-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}
        >
          <CheckCircle2 size={40} />
        </div>

        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary-900)', marginBottom: '0.4rem' }}>
          Commande Reçue avec Succès !
        </h2>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Merci pour votre confiance. Votre commande est transmise à notre centrale de préparation.
        </p>

        {/* Order Details Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-main)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            textAlign: 'left',
            marginBottom: '1.5rem',
            border: '1px solid var(--border-light)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>N° de Commande</span>
            <span style={{ fontWeight: 800, color: 'var(--primary-800)', fontSize: '0.95rem' }}>
              {order.orderNumber}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} /> Date de livraison :
            </span>
            <span style={{ fontWeight: 600 }}>{order.requestedDeliveryDate}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={14} /> Destination :
            </span>
            <span style={{ fontWeight: 600 }}>{order.deliveryCity}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Package size={14} /> Articles :
            </span>
            <span style={{ fontWeight: 600 }}>{order.items.length} produits frais</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '1.05rem', fontWeight: 800 }}>
            <span>Total Commande</span>
            <span style={{ color: 'var(--primary-800)' }}>{order.total.toFixed(2)} DH</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Continuer mes achats
          </button>
          <button onClick={onGoToDashboard} className="btn btn-primary">
            <span>Suivre dans mon espace</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
