import React, { useState, useEffect } from 'react';
import { store } from '../services/store';
import { Order, UserProfile, Business, OrderStatus } from '../types';
import {
  Package,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  ShoppingBag,
  ExternalLink,
  Building,
  User,
  Truck,
  Eye,
} from 'lucide-react';

interface ClientDashboardPageProps {
  onNavigate: (page: string) => void;
  onOpenCart: () => void;
}

export const ClientDashboardPage: React.FC<ClientDashboardPageProps> = ({ onNavigate, onOpenCart }) => {
  const [user, setUser] = useState<UserProfile | null>(store.getCurrentUser());
  const [business, setBusiness] = useState<Business | null>(store.getCurrentBusiness());
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);

  useEffect(() => {
    store.getOrders().then(setOrders);
    const unsub = store.subscribe(() => {
      setUser(store.getCurrentUser());
      setBusiness(store.getCurrentBusiness());
      store.getOrders().then(setOrders);
    });
    return unsub;
  }, []);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-status-pending">En attente de confirmation</span>;
      case 'confirmed':
        return <span className="badge badge-status-confirmed">Confirmée</span>;
      case 'preparing':
        return <span className="badge badge-status-preparing">En préparation</span>;
      case 'delivering':
        return <span className="badge badge-status-delivering">En cours de livraison</span>;
      case 'delivered':
        return <span className="badge badge-status-delivered">Livrée</span>;
      case 'cancelled':
        return <span className="badge badge-status-cancelled">Annulée</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const handleReorder = async (order: Order) => {
    const products = await store.getProducts();
    let addedCount = 0;

    order.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && prod.isAvailable) {
        store.addToCart(prod, item.quantity);
        addedCount++;
      }
    });

    setReorderNotice(`${addedCount} produit(s) ajoutés à votre panier.`);
    setTimeout(() => {
      setReorderNotice(null);
      onOpenCart();
    }, 800);
  };

  return (
    <div style={{ padding: '3rem 0 5rem' }}>
      <div className="container">
        {/* Account Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem',
            marginBottom: '2.5rem',
            padding: '1.75rem',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <h1 style={{ fontSize: '1.65rem', color: 'var(--primary-900)' }}>
                {business?.businessName || 'Mon Établissement'}
              </h1>
              {business?.approvalStatus === 'approved' ? (
                <span className="badge badge-status-delivered">Compte Validé CHR</span>
              ) : (
                <span className="badge badge-status-pending">En attente de validation</span>
              )}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <span>👤 {user?.fullName}</span>
              <span>📞 {user?.phone}</span>
              <span>📍 {business?.deliveryAddress}, {business?.city}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => onNavigate('catalog')} className="btn btn-secondary btn-sm">
              <ShoppingBag size={16} />
              <span>Commander</span>
            </button>
            <button onClick={onOpenCart} className="btn btn-primary btn-sm">
              <Package size={16} />
              <span>Voir Panier</span>
            </button>
          </div>
        </div>

        {/* Approval Alert if Pending */}
        {business?.approvalStatus === 'pending' && (
          <div
            style={{
              padding: '1.15rem 1.4rem',
              backgroundColor: 'var(--amber-50)',
              border: '1.5px solid var(--amber-400)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--amber-600)',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
            }}
          >
            <AlertTriangle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                Votre compte professionnel est en cours d’examen
              </strong>
              <p style={{ fontSize: '0.88rem', color: '#78350f', lineHeight: 1.5 }}>
                Notre centrale commerciale valide actuellement votre inscription pour rattacher votre établissement à la grille tarifaire de gros et définir votre créneau de livraison matinale. Vous pouvez explorer le catalogue ; dès validation, vous pourrez envoyer vos commandes définitives.
              </p>
            </div>
          </div>
        )}

        {/* Reorder feedback notice */}
        {reorderNotice && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#dcfce7',
              color: '#166534',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <CheckCircle size={18} />
            <span>{reorderNotice}</span>
          </div>
        )}

        {/* Orders History Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.35rem', color: 'var(--primary-900)' }}>
              Historique des Commandes ({orders.length})
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Suivi en temps réel des livraisons
            </span>
          </div>

          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
              <Package size={48} color="var(--primary-400)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-900)', marginBottom: '0.5rem' }}>
                Aucune commande enregistrée
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Passez votre première commande pour approvisionner vos cuisines.
              </p>
              <button onClick={() => onNavigate('catalog')} className="btn btn-primary">
                Consulter les produits frais
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="card"
                  style={{
                    padding: '1.4rem',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  {/* Top Bar of Order Card */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary-800)' }}>
                        {order.orderNumber}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Passée le {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {getStatusBadge(order.status)}
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-900)' }}>
                        {order.total.toFixed(2)} DH
                      </div>
                    </div>
                  </div>

                  {/* Order info details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date de livraison prévue</span>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                        <Calendar size={14} color="var(--primary-600)" /> {order.requestedDeliveryDate}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Destination</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                        <MapPin size={14} color="var(--primary-600)" /> {order.deliveryCity}
                      </span>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Volume</span>
                      <span style={{ marginTop: '0.2rem', display: 'block' }}>
                        {order.items.length} références ({order.items.reduce((s, i) => s + i.quantity, 0)} unités)
                      </span>
                    </div>
                  </div>

                  {/* Items snapshot summary */}
                  <div style={{ backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', fontSize: '0.82rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>Articles commandés :</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                      {order.items.map((item, idx) => (
                        <span key={idx} style={{ backgroundColor: '#ffffff', padding: '0.25rem 0.55rem', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                          <strong>{item.quantity}x</strong> {item.productNameSnapshot} ({item.unitPriceSnapshot.toFixed(2)} DH/{item.unitSnapshot})
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions: View Details / Reorder */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.35rem' }}>
                    <button
                      onClick={() => handleReorder(order)}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <RotateCcw size={14} />
                      <span>Recommander ces produits</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
