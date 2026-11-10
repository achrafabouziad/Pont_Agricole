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
  Trash2,
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
  const [isGlobalInvoiceOpen, setIsGlobalInvoiceOpen] = useState<boolean>(false);
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);

  useEffect(() => {
    store.validateSession();
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
        return <span className="badge badge-status-delivering">Prête</span>;
      case 'delivered':
        return <span className="badge badge-status-delivered">Finalisée / Clôturée</span>;
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
      const prod = products.find(
        (p) => p.id === item.productId || (item.productNameSnapshot && p.name.toLowerCase() === item.productNameSnapshot.toLowerCase())
      );
      if (prod && prod.isAvailable) {
        store.addToCart(prod, item.quantity);
        addedCount++;
      } else if (item.productNameSnapshot) {
        const fallbackProd: Product = {
          id: item.productId || `prod-${Date.now()}`,
          name: item.productNameSnapshot,
          unit: (item.unitSnapshot || 'caisse') as any,
          price: item.unitPriceSnapshot || 0,
          categoryId: 'cat-legumes',
          isAvailable: true,
          minimumQuantity: 1,
          imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
          origin: 'Maroc',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        store.addToCart(fallbackProd, item.quantity);
        addedCount++;
      }
    });

    setReorderNotice(`${addedCount} produit(s) ajoutés à votre panier.`);
    setTimeout(() => {
      setReorderNotice(null);
      onOpenCart();
    }, 600);
  };

  const handleDeleteOrder = async (orderId: string, orderRef: string) => {
    if (window.confirm(`Voulez-vous vraiment supprimer la commande ${orderRef} ?`)) {
      await store.deleteOrder(orderId);
      store.getOrders().then(setOrders);
    }
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
              Suivi en temps réel de vos commandes
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
            <>
              {/* Facture Globale Multi-Commandes Banner */}
              <div
                className="card"
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1.5rem',
                  borderRadius: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  boxShadow: '0 4px 15px rgba(22, 101, 52, 0.07)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: '#166534',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#14532d', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>Facture Globale Récapitulative</span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '10px',
                          fontWeight: 800,
                          border: '1px solid #bbf7d0',
                        }}
                      >
                        {orders.length} commande{orders.length > 1 ? 's' : ''} regroupée{orders.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#166534' }}>
                      Toutes vos commandes réunies sur une seule facture commerciale avec total cumulé.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Total Général TTC</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#14532d' }}>
                      {orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0).toFixed(2)} DH
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceOrder(null);
                      setIsGlobalInvoiceOpen(true);
                    }}
                    className="btn btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      backgroundColor: '#166534',
                      borderColor: '#166534',
                      fontWeight: 800,
                      padding: '0.65rem 1.15rem',
                      borderRadius: '10px',
                    }}
                  >
                    <FileText size={16} />
                    <span>Ouvrir la Facture Globale</span>
                  </button>
                </div>
              </div>

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
                      <span className="client-meta-label">Date souhaitée</span>
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

                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(order.id, order.referenceNumber)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: '#dc2626',
                        backgroundColor: '#fef2f2',
                        borderColor: '#fecaca',
                        fontWeight: 700,
                      }}
                      title="Supprimer cette commande"
                    >
                      <Trash2 size={14} />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      </div>

      {/* Invoice Modal for Client */}
      {(invoiceOrder || isGlobalInvoiceOpen) && orders.length > 0 && (
        <InvoiceModal
          orders={orders}
          order={invoiceOrder || orders[0]}
          clientBusiness={business}
          initialMode={isGlobalInvoiceOpen ? 'global' : 'single'}
          onClose={() => {
            setInvoiceOrder(null);
            setIsGlobalInvoiceOpen(false);
          }}
        />
      )}
    </div>
  );
};
