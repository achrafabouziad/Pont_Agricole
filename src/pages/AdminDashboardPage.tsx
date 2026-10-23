import React, { useState, useEffect } from 'react';
import { store } from '../services/store';
import {
  Order,
  Product,
  Business,
  DeliveryZone,
  CompanySettings,
  OrderStatus,
  ApprovalStatus,
  ProductUnit,
} from '../types';
import {
  ShieldCheck,
  Package,
  Users,
  ShoppingCart,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  Save,
  MapPin,
  Calendar,
  AlertCircle,
  DollarSign,
  Search,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'clients' | 'products' | 'zones' | 'settings'>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  // Modals & Form State for Product Add/Edit
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    categoryId: 'cat-legumes',
    description: '',
    imageUrl: '',
    unit: 'caisse',
    price: 50,
    minimumQuantity: 1,
    isAvailable: true,
    origin: 'Maroc',
    badge: '',
  });

  // Cancel order modal
  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const loadData = async () => {
    const [ords, prods, bizs, zns, stgs] = await Promise.all([
      store.getOrders(),
      store.getProducts(),
      store.getBusinesses(),
      store.getDeliveryZones(),
      store.getCompanySettings(),
    ]);
    setOrders(ords);
    setProducts(prods);
    setBusinesses(bizs);
    setZones(zns);
    setSettings(stgs);
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(() => {
      loadData();
    });
    return unsub;
  }, []);

  // Stats calculation
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;
  const totalClientsCount = businesses.length;
  const activeProductsCount = products.filter((p) => p.isAvailable).length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  // Status Handlers
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus, reason?: string) => {
    await store.updateOrderStatus(orderId, status, reason);
    await loadData();
  };

  const handleUpdateBusinessStatus = async (businessId: string, status: ApprovalStatus) => {
    await store.updateBusinessApproval(businessId, status);
    await loadData();
  };

  // Product CRUD
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      categoryId: 'cat-legumes',
      description: '',
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
      unit: 'caisse',
      price: 60,
      minimumQuantity: 1,
      isAvailable: true,
      origin: 'Maroc',
      badge: '',
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProductForm({ ...prod });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) return;

    const prodToSave: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      categoryId: productForm.categoryId || 'cat-legumes',
      name: productForm.name,
      description: productForm.description || '',
      imageUrl: productForm.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
      unit: productForm.unit as ProductUnit,
      price: Number(productForm.price),
      minimumQuantity: Number(productForm.minimumQuantity) || 1,
      isAvailable: Boolean(productForm.isAvailable),
      origin: productForm.origin || 'Maroc',
      badge: productForm.badge || undefined,
    };

    await store.saveProduct(prodToSave);
    setIsProductModalOpen(false);
    await loadData();
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit du catalogue ?')) {
      await store.deleteProduct(id);
      await loadData();
    }
  };

  // Delivery zone update
  const handleUpdateZoneFee = async (zone: DeliveryZone, newFee: number, newMin: number) => {
    await store.saveDeliveryZone({
      ...zone,
      deliveryFee: newFee,
      minimumOrderAmount: newMin,
    });
    await loadData();
  };

  return (
    <div style={{ padding: '2.5rem 0 6rem', backgroundColor: 'var(--bg-main)', minHeight: '85vh' }}>
      <div className="container">
        {/* Admin Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <ShieldCheck size={14} /> Espace Direction & Logistique
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Pont Agricole Maroc</span>
            </div>
            <h1 style={{ fontSize: '1.85rem', color: 'var(--primary-900)' }}>Tableau de Bord Administrateur</h1>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleOpenAddProduct}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Plus size={16} />
              <span>Nouveau Produit</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
            marginBottom: '2rem',
            borderBottom: '1px solid var(--border-light)',
          }}
        >
          <button
            onClick={() => setActiveTab('overview')}
            className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`btn btn-sm ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Commandes ({pendingOrdersCount > 0 ? `${pendingOrdersCount} en attente` : orders.length})
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`btn btn-sm ${activeTab === 'clients' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Comptes Clients CHR ({businesses.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`btn btn-sm ${activeTab === 'products' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Gestion des Produits ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('zones')}
            className={`btn btn-sm ${activeTab === 'zones' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Zones & Frais de Livraison
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            {/* KPI Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2.5rem',
              }}
            >
              <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Commandes Totales</span>
                  <div style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)' }}>
                    <ShoppingCart size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary-900)' }}>{totalOrdersCount}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary-600)', marginTop: '0.35rem' }}>
                  {pendingOrdersCount} en attente de validation
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Commandes en Attente</span>
                  <div style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: 'var(--amber-100)', color: 'var(--amber-600)' }}>
                    <Clock size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--amber-600)' }}>{pendingOrdersCount}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Nécessitent confirmation
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Établissements CHR</span>
                  <div style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)' }}>
                    <Users size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary-900)' }}>{totalClientsCount}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Restaurants, Hôtels & Cafés
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Chiffre d'Affaires</span>
                  <div style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: 'var(--amber-100)', color: 'var(--amber-600)' }}>
                    <TrendingUp size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary-900)' }}>
                  {totalRevenue.toFixed(0)} <span style={{ fontSize: '1rem' }}>DH</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Volume total enregistré
                </div>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-900)' }}>Commandes Récentes</h3>
                <button onClick={() => setActiveTab('orders')} className="btn btn-secondary btn-sm">
                  Voir toutes les commandes
                </button>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>N° Commande</th>
                      <th>Établissement / Contact</th>
                      <th>Ville</th>
                      <th>Date Livraison</th>
                      <th>Total</th>
                      <th>Statut Actuel</th>
                      <th>Actions Rapides</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((ord) => (
                      <tr key={ord.id}>
                        <td>
                          <strong>{ord.orderNumber}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(ord.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{ord.businessName || ord.customerName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{ord.customerPhone}</div>
                        </td>
                        <td>{ord.deliveryCity}</td>
                        <td>{ord.requestedDeliveryDate}</td>
                        <td>
                          <strong>{ord.total.toFixed(2)} DH</strong>
                        </td>
                        <td>
                          <span className={`badge badge-status-${ord.status}`}>{ord.status}</span>
                        </td>
                        <td>
                          <select
                            className="form-select"
                            value={ord.status}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                            style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}
                          >
                            <option value="pending">En attente</option>
                            <option value="confirmed">Confirmer</option>
                            <option value="preparing">En préparation</option>
                            <option value="delivering">En livraison</option>
                            <option value="delivered">Livrée</option>
                            <option value="cancelled">Annuler</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-900)', marginBottom: '1.25rem' }}>
              Gestion des Commandes B2B ({orders.length})
            </h3>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N° Commande</th>
                    <th>Établissement</th>
                    <th>Articles & Snapshots</th>
                    <th>Livraison & Date</th>
                    <th>Total MAD</th>
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((ord) => (
                    <tr key={ord.id}>
                      <td>
                        <strong>{ord.orderNumber}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(ord.createdAt).toLocaleString('fr-FR')}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{ord.businessName || 'Client Pro'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ord.customerName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary-700)' }}>{ord.customerPhone}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', maxWidth: '320px' }}>
                          {ord.items.map((item, idx) => (
                            <div key={idx} style={{ marginBottom: '0.2rem' }}>
                              • <strong>{item.quantity}x</strong> {item.productNameSnapshot} ({item.unitPriceSnapshot} DH/{item.unitSnapshot}) = {item.lineTotal.toFixed(2)} DH
                            </div>
                          ))}
                          {ord.customerNotes && (
                            <div style={{ marginTop: '0.4rem', color: 'var(--amber-600)', fontStyle: 'italic', fontSize: '0.78rem' }}>
                              Note : "{ord.customerNotes}"
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{ord.requestedDeliveryDate}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ord.deliveryCity}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{ord.deliveryAddress}</div>
                      </td>
                      <td>
                        <strong style={{ fontSize: '1rem', color: 'var(--primary-900)' }}>
                          {ord.total.toFixed(2)} DH
                        </strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          (Livraison: {ord.deliveryFee} DH)
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-status-${ord.status}`}>{ord.status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <select
                            className="form-select"
                            value={ord.status}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                            style={{ fontSize: '0.82rem', padding: '0.35rem' }}
                          >
                            <option value="pending">En attente</option>
                            <option value="confirmed">Confirmer</option>
                            <option value="preparing">En préparation</option>
                            <option value="delivering">En livraison</option>
                            <option value="delivered">Livrée</option>
                            <option value="cancelled">Annuler</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CLIENTS / BUSINESSES MANAGEMENT */}
        {activeTab === 'clients' && (
          <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-900)', marginBottom: '1.25rem' }}>
              Validation des Comptes Professionnels CHR ({businesses.length})
            </h3>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Établissement</th>
                    <th>Type</th>
                    <th>Ville & Adresse</th>
                    <th>Statut d'Approbation</th>
                    <th>Action Commerciale</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.map((biz) => (
                    <tr key={biz.id}>
                      <td>
                        <strong style={{ fontSize: '0.95rem' }}>{biz.businessName}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Inscrit le {new Date(biz.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-brand" style={{ textTransform: 'capitalize' }}>
                          {biz.businessType}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{biz.city}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{biz.deliveryAddress}</div>
                      </td>
                      <td>
                        {biz.approvalStatus === 'approved' ? (
                          <span className="badge badge-status-delivered">Approuvé</span>
                        ) : biz.approvalStatus === 'pending' ? (
                          <span className="badge badge-status-pending">En Attente</span>
                        ) : (
                          <span className="badge badge-status-cancelled">{biz.approvalStatus}</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {biz.approvalStatus !== 'approved' && (
                            <button
                              onClick={() => handleUpdateBusinessStatus(biz.id, 'approved')}
                              className="btn btn-primary btn-sm"
                              style={{ backgroundColor: '#166534', fontSize: '0.78rem' }}
                            >
                              Approuver
                            </button>
                          )}
                          {biz.approvalStatus !== 'suspended' && (
                            <button
                              onClick={() => handleUpdateBusinessStatus(biz.id, 'suspended')}
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#b45309', fontSize: '0.78rem' }}
                            >
                              Suspendre
                            </button>
                          )}
                          {biz.approvalStatus !== 'rejected' && (
                            <button
                              onClick={() => handleUpdateBusinessStatus(biz.id, 'rejected')}
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#991b1b', fontSize: '0.78rem' }}
                            >
                              Refuser
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PRODUCTS MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-900)' }}>
                Catalogue Produits Frais ({products.length})
              </h3>
              <button onClick={handleOpenAddProduct} className="btn btn-primary btn-sm">
                <Plus size={16} /> Ajouter un Produit
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Catégorie</th>
                    <th>Prix Pro (DH)</th>
                    <th>Unité</th>
                    <th>Min. Commande</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover' }}
                        />
                        <div>
                          <strong>{p.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.origin}</div>
                        </div>
                      </td>
                      <td>{p.categoryId.replace('cat-', '')}</td>
                      <td>
                        <strong>{p.price.toFixed(2)} DH</strong>
                      </td>
                      <td>{p.unit}</td>
                      <td>{p.minimumQuantity}</td>
                      <td>
                        {p.isAvailable ? (
                          <span className="badge badge-status-delivered">En Stock</span>
                        ) : (
                          <span className="badge badge-status-cancelled">Rupture</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            className="btn btn-secondary btn-sm"
                            title="Modifier"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#dc2626' }}
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: DELIVERY ZONES */}
        {activeTab === 'zones' && (
          <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-900)', marginBottom: '1.25rem' }}>
              Villes & Zones de Desserte Quotidienne ({zones.length})
            </h3>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ville</th>
                    <th>Quartiers & Zones Couvertes</th>
                    <th>Frais de Livraison (DH)</th>
                    <th>Minimum de Commande (DH)</th>
                    <th>Horaires Estimés</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z) => (
                    <tr key={z.id}>
                      <td>
                        <strong>{z.city}</strong>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{z.zoneName}</td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: '80px', padding: '0.35rem' }}
                          defaultValue={z.deliveryFee}
                          id={`fee-${z.id}`}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: '90px', padding: '0.35rem' }}
                          defaultValue={z.minimumOrderAmount}
                          id={`min-${z.id}`}
                        />
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{z.estimatedHours}</td>
                      <td>
                        <button
                          onClick={() => {
                            const feeVal = Number((document.getElementById(`fee-${z.id}`) as HTMLInputElement).value);
                            const minVal = Number((document.getElementById(`min-${z.id}`) as HTMLInputElement).value);
                            handleUpdateZoneFee(z, feeVal, minVal);
                          }}
                          className="btn btn-primary btn-sm"
                        >
                          <Save size={14} /> Enregistrer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT PRODUCT */}
      {isProductModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProductModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '1rem', color: 'var(--primary-900)' }}>
              {editingProduct ? 'Modifier le Produit' : 'Ajouter un Produit Frais'}
            </h2>

            <form onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label className="form-label">Nom du Produit</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Tomates Cerises Grappe"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Catégorie</label>
                  <select
                    className="form-select"
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                  >
                    <option value="cat-legumes">Légumes Frais</option>
                    <option value="cat-fruits">Fruits de Saison</option>
                    <option value="cat-herbes">Herbes Aromatiques</option>
                    <option value="cat-saison">Produits Saisonniers & Rares</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Unité de Vente</label>
                  <select
                    className="form-select"
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value as ProductUnit })}
                  >
                    <option value="caisse">Caisse</option>
                    <option value="carton">Carton</option>
                    <option value="kg">Au Kilogramme (kg)</option>
                    <option value="botte">Botte (Herbes)</option>
                    <option value="piece">Pièce / Plateau</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Prix B2B (DH / MAD)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-input"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Quantité Minimale</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={productForm.minimumQuantity}
                    onChange={(e) => setProductForm({ ...productForm, minimumQuantity: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Origine / Terroir</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Région Souss-Massa, Plaines du Saïss"
                  value={productForm.origin}
                  onChange={(e) => setProductForm({ ...productForm, origin: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">URL de l'image</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description pour les Chefs</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={productForm.isAvailable}
                    onChange={(e) => setProductForm({ ...productForm, isAvailable: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)' }}
                  />
                  <span>Produit disponible en stock</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Enregistrer Modifications' : 'Créer le Produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
