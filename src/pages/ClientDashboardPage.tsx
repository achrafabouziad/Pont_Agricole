import React, { useState, useEffect } from 'react';
import { store } from '../services/store';
import { Order, UserProfile, Business, OrderStatus, Product } from '../types';
import {
  Package,
  Calendar,
  MapPin,
  CheckCircle,
  RotateCcw,
  ShoppingBag,
  User,
  Phone,
  FileText,
  XCircle,
  LogOut,
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
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [isGlobalInvoiceOpen, setIsGlobalInvoiceOpen] = useState<boolean>(false);
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);

  const handleLogout = async () => {
    await store.logout();
    onNavigate('auth');
  };

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

  const displayTitle = business?.businessName || user?.fullName || 'Mon Établissement';
  const avatarInitials = displayTitle.trim().slice(0, 2).toUpperCase();
  const formattedAddress = [business?.deliveryAddress, business?.city].filter(Boolean).join(', ');
  const totalCumulative = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return (
    <div className="client-dashboard-wrapper">
      <div className="container">
        {/* Account Header Card */}
        <div className="card client-account-header">
          <div className="client-account-top-bar">
            <div className="client-account-identity">
              <div className="client-avatar-badge" aria-hidden="true">
                {avatarInitials}
              </div>
              <div className="client-identity-text">
                <div className="client-account-title-row">
                  <h1 className="client-business-name">{displayTitle}</h1>
                  <span className="client-active-pill">
                    <span className="client-active-dot" />
                    Compte Actif
                  </span>
                </div>
                <div className="client-account-meta-row">
                  {user?.fullName && (
                    <span className="client-meta-item">
                      <User size={14} color="#166534" /> {user.fullName}
                    </span>
                  )}
                  {user?.phone && (
                    <span className="client-meta-item">
                      <Phone size={14} color="#166534" /> {user.phone}
                    </span>
                  )}
                  {formattedAddress && (
                    <span className="client-meta-item">
                      <MapPin size={14} color="#166534" /> {formattedAddress}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="client-logout-mini-btn"
              title="Se déconnecter"
            >
              <LogOut size={14} />
              <span>Déconnexion</span>
            </button>
          </div>

          <div className="client-stats-strip">
            <div className="client-stat-box">
              <span className="client-stat-label">Commandes</span>
              <strong className="client-stat-val">{orders.length}</strong>
            </div>
            <div className="client-stat-divider" />
            <div className="client-stat-box">
              <span className="client-stat-label">Total Cumulé</span>
              <strong className="client-stat-val client-stat-price">{totalCumulative.toFixed(2)} DH</strong>
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
          <div className="client-reorder-notice">
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
            <div className="catalog-empty-box">
              <div className="catalog-empty-icon-wrap">
                <Package size={30} strokeWidth={2.2} />
              </div>
              <h3 className="catalog-empty-title">Aucune commande enregistrée</h3>
              <p className="catalog-empty-desc">
                Passez votre première commande pour approvisionner vos cuisines.
              </p>
              <button onClick={() => onNavigate('catalog')} className="catalog-empty-btn">
                <ShoppingBag size={17} />
                <span>Consulter les produits frais</span>
              </button>
            </div>
          ) : (
            <>
              {/* Compact Facture Globale Récapitulative Banner */}
              <div className="client-global-invoice-card">
                <div className="client-global-invoice-info">
                  <div className="client-global-invoice-icon">
                    <FileText size={19} />
                  </div>
                  <div className="client-global-invoice-text">
                    <div className="client-global-invoice-title-row">
                      <span>Facture Globale</span>
                      <span className="client-global-invoice-count">
                        {orders.length} cmd{orders.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="client-global-invoice-sub">
                      Récapitulatif cumulé : <strong>{totalCumulative.toFixed(2)} DH</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInvoiceOrder(null);
                    setIsGlobalInvoiceOpen(true);
                  }}
                  className="client-global-invoice-btn"
                >
                  <FileText size={15} />
                  <span>Ouvrir la Facture Globale</span>
                </button>
              </div>

              <div className="client-orders-list">
                {orders.map((order) => {
                  const totalUnits = order.items.reduce((s, i) => s + i.quantity, 0);
                  return (
                    <div key={order.id} className="card client-order-card">
                      {/* Clean 2-row Order Header */}
                      <div className="client-order-header">
                        <div className="client-order-row-top">
                          <div className="client-order-num">{order.orderNumber}</div>
                          <div className="client-order-total">{order.total.toFixed(2)} DH</div>
                        </div>
                        <div className="client-order-row-sub">
                          <span className="client-order-date">
                            Passée le{' '}
                            {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>

                      {/* Order info details (2 balanced columns) */}
                      <div className="client-order-meta-grid">
                        <div>
                          <span className="client-meta-label">Date souhaitée</span>
                          <strong className="client-meta-val">
                            <Calendar size={14} color="#166534" /> {order.requestedDeliveryDate}
                          </strong>
                        </div>

                        <div>
                          <span className="client-meta-label">Ville</span>
                          <span className="client-meta-val">
                            <MapPin size={14} color="#166534" /> {order.deliveryCity}
                          </span>
                        </div>
                      </div>

                      {/* Items snapshot summary */}
                      <div className="client-order-items-box">
                        <div className="client-order-items-head">
                          <span>Articles commandés ({order.items.length})</span>
                          {totalUnits > 0 && (
                            <span className="client-order-units-count">{totalUnits} unités</span>
                          )}
                        </div>
                        <div className="client-order-items-pills">
                          {order.items.length > 0 ? (
                            order.items.map((item, idx) => (
                              <span key={idx} className="client-order-item-pill">
                                <strong>{item.quantity}x</strong> {item.productNameSnapshot} (
                                {item.unitPriceSnapshot.toFixed(2)} DH/{item.unitSnapshot})
                              </span>
                            ))
                          ) : (
                            <span className="client-order-item-pill">
                              Articles & Produits frais ({order.total.toFixed(2)} DH)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Clean Action Bar */}
                      <div className="client-order-actions">
                        <button
                          type="button"
                          onClick={() => setInvoiceOrder(order)}
                          className="btn btn-sm client-order-invoice-btn"
                          title="Télécharger ou imprimer la facture de cette commande"
                        >
                          <FileText size={14} />
                          <span>Facture / BL</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReorder(order)}
                          className="btn btn-secondary btn-sm client-order-reorder-btn"
                        >
                          <RotateCcw size={14} />
                          <span>Recommander</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                          className="client-order-delete-btn"
                          title="Supprimer cette commande"
                          aria-label={`Supprimer la commande ${order.orderNumber}`}
                        >
                          <XCircle size={17} />
                        </button>
                      </div>
                    </div>
                  );
                })}
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
