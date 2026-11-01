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
  Phone,
  FileText,
} from 'lucide-react';
import { InvoiceModal } from '../components/InvoiceModal';

interface ClientDashboardPageProps {
  onNavigate: (page: string) => void;
  onOpenCart: () => void;
}

export const ClientDashboardPage: React.FC<ClientDashboardPageProps> = ({ onNavigate, onOpenCart }) => {
  const [user, setUser] = useState<UserProfile | null>(store.getCurrentUser());
  const [business, setBusiness] = useState<Business | null>(store.getCurrentBusiness());
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
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
    <div className="client-dashboard-wrapper">
      <div className="container">
        {/* Account Header */}
        <div className="card client-account-header">
          <div>
            <div className="client-account-title-row">
              <h1 className="client-business-name">
                {business?.businessName || 'Mon Établissement'}
              </h1>
              <span className="badge badge-status-delivered">Compte Professionnel Actif</span>
            </div>
            <div className="client-account-meta-row">
              <span className="client-meta-item">
                <User size={14} color="var(--primary-600)" /> {user?.fullName}
              </span>
              <span className="client-meta-item">
                <Phone size={14} color="var(--primary-600)" /> {user?.phone}
              </span>
              <span className="client-meta-item">
                <MapPin size={14} color="var(--primary-600)" /> {business?.deliveryAddress}, {business?.city}
              </span>
            </div>
          </div>

          <div className="client-header-actions">
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
          <div className="client-history-header">
            <h2 className="client-history-title">
              Historique des Commandes ({orders.length})
            </h2>
            <span className="client-history-sub">
              Suivi en temps réel des livraisons
            </span>
          </div>

          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
              <Package size={44} color="var(--primary-400)" style={{ margin: '0 auto 1rem' }} />
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
            <div className="client-orders-list">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="card client-order-card"
                >
                  {/* Top Bar of Order Card */}
                  <div className="client-order-header">
                    <div>
                      <div className="client-order-num">
                        {order.orderNumber}
                      </div>
                      <div className="client-order-date">
                        Passée le {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                    </div>

                    <div className="client-order-status-price">
                      {getStatusBadge(order.status)}
                      <div className="client-order-total">
                        {order.total.toFixed(2)} DH
                      </div>
                    </div>
                  </div>

                  {/* Order info details */}
                  <div className="client-order-meta-grid">
                    <div>
                      <span className="client-meta-label">Date de livraison prévue</span>
                      <strong className="client-meta-val">
                        <Calendar size={14} color="var(--primary-600)" /> {order.requestedDeliveryDate}
                      </strong>
                    </div>

                    <div>
                      <span className="client-meta-label">Destination</span>
                      <span className="client-meta-val">
                        <MapPin size={14} color="var(--primary-600)" /> {order.deliveryCity}
                      </span>
                    </div>

                    <div>
                      <span className="client-meta-label">Volume</span>
                      <span className="client-meta-val">
                        {order.items.length} références ({order.items.reduce((s, i) => s + i.quantity, 0)} unités)
                      </span>
                    </div>
                  </div>

                  {/* Items snapshot summary */}
                  <div className="client-order-items-box">
                    <div style={{ fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem', fontSize: '0.78rem' }}>Articles commandés :</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                      {order.items.map((item, idx) => (
                        <span key={idx} className="client-order-item-pill">
                          <strong>{item.quantity}x</strong> {item.productNameSnapshot} ({item.unitPriceSnapshot.toFixed(2)} DH/{item.unitSnapshot})
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions: View Details / Reorder / Invoice */}
                  <div className="client-order-actions">
                    <button
                      onClick={() => setInvoiceOrder(order)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: '#f0fdf4',
                        borderColor: '#bbf7d0',
                        color: '#166534',
                        fontWeight: 700,
                      }}
                      title="Télécharger ou imprimer la facture de cette commande"
                    >
                      <FileText size={14} />
                      <span>Facture / BL</span>
                    </button>

                    <button
                      onClick={() => handleReorder(order)}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <RotateCcw size={14} />
                      <span>Recommander</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invoice Modal for Client */}
      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
        />
      )}
    </div>
  );
};
