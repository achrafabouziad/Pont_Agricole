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
  Zap,
  RefreshCw,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  Lock,
  Phone,
  MessageCircle,
  Upload,
  Image as ImageIcon,
  Camera,
  User,
  ArrowRight,
  Mail,
  FileText,
  Printer,
} from 'lucide-react';
import { InvoiceModal } from '../components/InvoiceModal';

const QUICK_PHOTO_PRESETS = [
  { label: 'Tomates', url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80' },
  { label: 'Pommes de Terre', url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80' },
  { label: 'Oignons', url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80' },
  { label: 'Carottes', url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?auto=format&fit=crop&w=800&q=80' },
  { label: 'Courgettes', url: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=800&q=80' },
  { label: 'Bananes', url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Oranges', url: 'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Pommes', url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80' },
  { label: 'Citrons', url: 'https://images.unsplash.com/photo-1534706936160-d5ee67737249?auto=format&fit=crop&w=800&q=80' },
  { label: 'Menthe & Herbes', url: 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?auto=format&fit=crop&w=800&q=80' },
  { label: 'Fraises', url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80' },
  { label: 'Avocats', url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=800&q=80' },
];

interface AdminDashboardPageProps {
  onNavigate?: (page: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'daily-prices' | 'overview' | 'orders' | 'clients' | 'products' | 'settings'>('daily-prices');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  // Selected order for commercial invoice view & print
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Clients Tab search & filter state
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'approved' | 'pending' | 'suspended'>('all');
  const [isRefreshingClients, setIsRefreshingClients] = useState<boolean>(false);

  // Daily Mercuriale / Price edits state
  const [priceEdits, setPriceEdits] = useState<Record<string, { price: number; isAvailable: boolean }>>({});
  const [initialPrices, setInitialPrices] = useState<Record<string, number>>({});
  const [dailyCategoryFilter, setDailyCategoryFilter] = useState<string>('all');
  const [dailySearchQuery, setDailySearchQuery] = useState<string>('');
  const [dailySaveNotice, setDailySaveNotice] = useState<string | null>(null);
  const [savingDaily, setSavingDaily] = useState<boolean>(false);
  const [singleSavedId, setSingleSavedId] = useState<string | null>(null);

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

    // Initialize daily price state
    setPriceEdits((prev) => {
      const next = { ...prev };
      prods.forEach((p) => {
        if (!next[p.id]) {
          next[p.id] = { price: p.price, isAvailable: p.isAvailable };
        }
      });
      return next;
    });

    setInitialPrices((prev) => {
      const initials = { ...prev };
      prods.forEach((p) => {
        if (initials[p.id] === undefined) {
          initials[p.id] = p.price;
        }
      });
      return initials;
    });
  };

  const handleDailyPriceInput = (productId: string, val: number) => {
    setPriceEdits((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        price: Math.max(0, val),
      },
    }));
  };

  const handleDailyQuickStep = (productId: string, delta: number) => {
    setPriceEdits((prev) => {
      const cur = prev[productId]?.price || 0;
      const next = Math.max(0, Math.round((cur + delta) * 100) / 100);
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          price: next,
        },
      };
    });
  };

  const handleDailyStockToggle = (productId: string) => {
    setPriceEdits((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        isAvailable: !prev[productId]?.isAvailable,
      },
    }));
  };

  const handleBatchAdjustCategory = (delta: number) => {
    setPriceEdits((prev) => {
      const updated = { ...prev };
      const filtered = products.filter((p) => dailyCategoryFilter === 'all' || p.categoryId === dailyCategoryFilter);
      filtered.forEach((p) => {
        if (updated[p.id]) {
          const next = Math.max(0, Math.round((updated[p.id].price + delta) * 100) / 100);
          updated[p.id] = { ...updated[p.id], price: next };
        }
      });
      return updated;
    });
  };

  const handleSaveSinglePrice = async (productId: string) => {
    const edit = priceEdits[productId];
    if (!edit) return;
    await store.updateProductPrice(productId, edit.price, edit.isAvailable);
    setInitialPrices((prev) => ({ ...prev, [productId]: edit.price }));
    setSingleSavedId(productId);
    setTimeout(() => setSingleSavedId(null), 2000);
  };

  const handleSaveAllDailyPrices = async () => {
    setSavingDaily(true);
    const updates = Object.entries(priceEdits).map(([id, data]) => ({
      id,
      price: data.price,
      isAvailable: data.isAvailable,
    }));
    await store.updateDailyPrices(updates);

    const newInitials: Record<string, number> = {};
    updates.forEach((u) => {
      newInitials[u.id] = u.price;
    });
    setInitialPrices(newInitials);

    setSavingDaily(false);
    setDailySaveNotice(`${updates.length} prix de vente du jour enregistrés avec succès. Le catalogue B2B est actualisé.`);
    setTimeout(() => setDailySaveNotice(null), 4000);
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

  const handleDeleteClient = async (bizId: string, bizName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte client "${bizName}" ?`)) {
      await store.deleteBusiness(bizId);
      await loadData();
    }
  };

  const handleRefreshClients = async () => {
    setIsRefreshingClients(true);
    await loadData();
    setTimeout(() => setIsRefreshingClients(false), 500);
  };

  // Clients calculation & filtering
  const pendingBusinessesCount = businesses.filter((b) => b.approvalStatus === 'pending').length;
  const approvedBusinessesCount = businesses.filter((b) => b.approvalStatus === 'approved').length;
  const suspendedBusinessesCount = businesses.filter((b) => b.approvalStatus === 'suspended').length;

  const filteredBusinesses = businesses.filter((biz) => {
    if (clientStatusFilter !== 'all' && biz.approvalStatus !== clientStatusFilter) return false;
    if (clientSearchQuery.trim()) {
      const q = clientSearchQuery.toLowerCase().trim();
      const matchName = (biz.businessName || '').toLowerCase().includes(q);
      const matchContact = (biz.contactName || '').toLowerCase().includes(q);
      const matchPhone = (biz.phone || '').includes(q);
      const matchCity = (biz.city || '').toLowerCase().includes(q);
      const matchEmail = (biz.email || '').toLowerCase().includes(q);
      const matchUser = (biz.username || '').toLowerCase().includes(q);
      return matchName || matchContact || matchPhone || matchCity || matchEmail || matchUser;
    }
    return true;
  });

  // Image File Upload Handler (Base64 for immediate photo change)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("L'image sélectionnée dépasse 5 Mo. Veuillez choisir une photo plus légère.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProductForm((prev) => ({ ...prev, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Product CRUD (Strictly Admin only)
  const handleOpenAddProduct = () => {
    if (store.getCurrentUser()?.role !== 'admin') {
      alert("Accès réservé exclusivement à l'administrateur.");
      return;
    }
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
    if (store.getCurrentUser()?.role !== 'admin') {
      alert("Accès réservé exclusivement à l'administrateur.");
      return;
    }
    setEditingProduct(prod);
    setProductForm({ ...prod });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (store.getCurrentUser()?.role !== 'admin') {
      alert("Accès réservé exclusivement à l'administrateur.");
      return;
    }
    if (!productForm.name?.trim() || !productForm.price) return;

    const prodToSave: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      categoryId: productForm.categoryId || 'cat-legumes',
      name: productForm.name.trim(),
      description: productForm.description || '',
      imageUrl: productForm.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
      unit: (productForm.unit as ProductUnit) || 'caisse',
      price: Number(productForm.price),
      minimumQuantity: Number(productForm.minimumQuantity) || 1,
      isAvailable: Boolean(productForm.isAvailable),
      origin: productForm.origin || 'Maroc',
      badge: productForm.badge || undefined,
    };

    try {
      await store.saveProduct(prodToSave);
      setIsProductModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la sauvegarde du produit.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (store.getCurrentUser()?.role !== 'admin') {
      alert("Accès réservé exclusivement à l'administrateur.");
      return;
    }
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit du catalogue ?')) {
      try {
        await store.deleteProduct(id);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Erreur lors de la suppression.');
      }
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

  const currentUser = store.getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div style={{ padding: '5rem 1rem', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem', textAlign: 'center', backgroundColor: '#ffffff', boxShadow: 'var(--shadow-lg)', borderTop: '4px solid #dc2626' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: '#dc2626' }}>
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: '1.45rem', color: 'var(--primary-900)', marginBottom: '0.5rem' }}>
            Accès Réservé à la Direction
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            Ce tableau de bord et la gestion des cours de vente sont strictement réservés à l’administrateur de Pont Agricole. Les clients n’ont pas l’autorisation d’y accéder ni de modifier les prix.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => onNavigate?.('auth')}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Se connecter en tant qu'Administrateur
            </button>
            <button
              onClick={() => onNavigate?.('catalog')}
              className="btn btn-outline"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Consulter le catalogue produits
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          className="mobile-scroll-pills"
          style={{
            display: 'flex',
            gap: '0.45rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--border-light)',
          }}
        >
          <button
            onClick={() => setActiveTab('daily-prices')}
            className={`btn btn-sm ${activeTab === 'daily-prices' ? 'btn-primary' : 'btn-secondary'}`}
            style={activeTab === 'daily-prices' ? { backgroundColor: 'var(--amber-500)', borderColor: 'var(--amber-600)', color: '#082817', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' } : { borderColor: 'var(--amber-400)', color: 'var(--amber-800)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Zap size={14} />
            <span>Mercuriale Quotidienne</span>
          </button>
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
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Users size={14} />
            <span>Clients Inscrits ({businesses.length})</span>
            {pendingBusinessesCount > 0 && (
              <span className="badge badge-amber" style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>
                {pendingBusinessesCount} en attente
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`btn btn-sm ${activeTab === 'products' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Gestion des Produits ({products.length})
          </button>
        </div>

        {/* TAB 0: DAILY PRICES / MERCURIALE DU JOUR */}
        {activeTab === 'daily-prices' && (
          <div>
            {/* Success Notice */}
            {dailySaveNotice && (
              <div
                style={{
                  padding: '1rem 1.4rem',
                  backgroundColor: 'var(--emerald-50)',
                  border: '1.5px solid var(--primary-500)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--primary-800)',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                <CheckCircle size={22} color="var(--primary-600)" />
                <span>{dailySaveNotice}</span>
              </div>
            )}

            {/* Header Card */}
            <div
              className="card"
              style={{
                backgroundColor: '#ffffff',
                padding: '1.75rem',
                marginBottom: '1.75rem',
                borderLeft: '5px solid var(--amber-500)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1.25rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        backgroundColor: 'var(--amber-100)',
                        color: 'var(--amber-800)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Mercuriale Quotidienne B2B
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Arrivages Marché de Gros Maroc
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                    Ajustement Rapide des Prix du Jour
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '680px', lineHeight: 1.5 }}>
                    Modifiez vos prix de vente directement dans les cases ci-dessous chaque matin. Les nouveaux tarifs s’appliquent instantanément au catalogue de vos clients CHR.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleSaveAllDailyPrices}
                    disabled={savingDaily}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.4rem',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(29, 110, 66, 0.25)',
                    }}
                  >
                    <Save size={18} />
                    <span>{savingDaily ? 'Enregistrement...' : 'Enregistrer Tous les Prix du Jour'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Actions & Filters Bar */}
              <div
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-light)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                {/* Category Pills */}
                <div className="mobile-scroll-pills catalog-pills-bar" style={{ display: 'flex', gap: '0.4rem' }}>
                  {[
                    { id: 'all', label: `Tous les produits (${products.length})` },
                    { id: 'cat-legumes', label: `Légumes (${products.filter((p) => p.categoryId === 'cat-legumes').length})` },
                    { id: 'cat-fruits', label: `Fruits (${products.filter((p) => p.categoryId === 'cat-fruits').length})` },
                    { id: 'cat-herbes', label: `Herbes Aromatiques (${products.filter((p) => p.categoryId === 'cat-herbes').length})` },
                    { id: 'cat-saison', label: `Primeurs & Saison (${products.filter((p) => p.categoryId === 'cat-saison').length})` },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setDailyCategoryFilter(cat.id)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: dailyCategoryFilter === cat.id ? 'var(--primary-700)' : 'var(--border-light)',
                        backgroundColor: dailyCategoryFilter === cat.id ? 'var(--primary-700)' : '#ffffff',
                        color: dailyCategoryFilter === cat.id ? '#ffffff' : 'var(--text-main)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Batch Adjusters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Ajustement rapide :
                  </span>
                  <button
                    onClick={() => handleBatchAdjustCategory(1)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                    title="Ajouter 1 DH à tous les produits affichés"
                  >
                    +1.00 DH
                  </button>
                  <button
                    onClick={() => handleBatchAdjustCategory(2)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                    title="Ajouter 2 DH à tous les produits affichés"
                  >
                    +2.00 DH
                  </button>
                  <button
                    onClick={() => handleBatchAdjustCategory(-1)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                    title="Diminuer 1 DH à tous les produits affichés"
                  >
                    -1.00 DH
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ marginTop: '1rem', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Filtrer un produit par nom (ex: tomate, oignon, persil, banane...)"
                  value={dailySearchQuery}
                  onChange={(e) => setDailySearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.4rem', fontSize: '0.88rem' }}
                />
              </div>
            </div>

            {/* Produce Cards Grid for Daily Pricing */}
            <div
              className="daily-pricing-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              {products
                .filter((p) => {
                  if (dailyCategoryFilter !== 'all' && p.categoryId !== dailyCategoryFilter) return false;
                  if (dailySearchQuery.trim()) {
                    const q = dailySearchQuery.toLowerCase();
                    return p.name.toLowerCase().includes(q) || (p.origin && p.origin.toLowerCase().includes(q));
                  }
                  return true;
                })
                .map((product) => {
                  const currentEdit = priceEdits[product.id] || { price: product.price, isAvailable: product.isAvailable };
                  const initialPrice = initialPrices[product.id] ?? product.price;
                  const priceDiff = Math.round((currentEdit.price - initialPrice) * 100) / 100;
                  const isModified = priceDiff !== 0;
                  const isJustSaved = singleSavedId === product.id;

                  return (
                    <div
                      key={product.id}
                      className="card"
                      style={{
                        backgroundColor: '#ffffff',
                        padding: '1.15rem',
                        border: isModified ? '1.5px solid var(--amber-400)' : '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: isModified ? '0 4px 12px rgba(245, 158, 11, 0.12)' : 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.85rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Top Row: Photo + Name + Origin */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--primary-900)' }}>
                              {product.name}
                            </strong>
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(product)}
                              className="btn btn-secondary btn-sm"
                              style={{
                                padding: '0.2rem 0.5rem',
                                fontSize: '0.72rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: 'var(--primary-800)',
                                borderColor: 'var(--border-color)',
                              }}
                              title="Modifier le nom ou la photo de ce produit"
                            >
                              <Edit2 size={12} /> Nom & Photo
                            </button>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                              <MapPin size={11} color="var(--primary-600)" /> {product.origin || 'Maroc'}
                            </span>
                            <span>•</span>
                            <span style={{ fontWeight: 600, color: 'var(--primary-700)', textTransform: 'capitalize' }}>
                              Unité : {product.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle Row: Inline Daily Price Stepper */}
                      <div
                        style={{
                          backgroundColor: 'var(--bg-main)',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                            Prix de Vente du Jour
                          </span>
                          {isModified && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: priceDiff > 0 ? '#15803d' : '#b45309',
                                fontWeight: 700,
                              }}
                            >
                              {priceDiff > 0 ? `+${priceDiff.toFixed(2)} DH` : `${priceDiff.toFixed(2)} DH`} (Hier: {initialPrice.toFixed(2)} DH)
                            </span>
                          )}
                        </div>

                        {/* Stepper Inputs */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => handleDailyQuickStep(product.id, -1)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              width: '32px',
                              height: '34px',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '1rem',
                            }}
                            title="Diminuer de 1 DH"
                          >
                            -
                          </button>

                          <div style={{ position: 'relative', width: '84px' }}>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={currentEdit.price}
                              onChange={(e) => handleDailyPriceInput(product.id, parseFloat(e.target.value) || 0)}
                              className="form-input"
                              style={{
                                padding: '0.4rem 2rem 0.4rem 0.6rem',
                                fontWeight: 800,
                                fontSize: '1.05rem',
                                color: 'var(--primary-900)',
                                textAlign: 'right',
                                borderColor: isModified ? 'var(--amber-500)' : 'var(--border-light)',
                                backgroundColor: isModified ? '#fffbeb' : '#ffffff',
                              }}
                            />
                            <span
                              style={{
                                position: 'absolute',
                                right: '0.5rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                pointerEvents: 'none',
                              }}
                            >
                              DH
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDailyQuickStep(product.id, 1)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              width: '32px',
                              height: '34px',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '1rem',
                            }}
                            title="Augmenter de 1 DH"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row: Stock Switch + Instant Save button */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleDailyStockToggle(product.id)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '20px',
                            border: '1px solid',
                            borderColor: currentEdit.isAvailable ? '#86efac' : '#fca5a5',
                            backgroundColor: currentEdit.isAvailable ? '#f0fdf4' : '#fef2f2',
                            color: currentEdit.isAvailable ? '#166534' : '#991b1b',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: currentEdit.isAvailable ? '#22c55e' : '#ef4444',
                            }}
                          />
                          <span>{currentEdit.isAvailable ? 'En Stock' : 'Rupture'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveSinglePrice(product.id)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.78rem',
                            backgroundColor: isJustSaved ? 'var(--primary-700)' : undefined,
                            color: isJustSaved ? '#ffffff' : undefined,
                          }}
                          title="Enregistrer ce produit individuellement"
                        >
                          {isJustSaved ? <Check size={14} /> : <Save size={14} />}
                          <span>{isJustSaved ? 'Enregistré' : 'Enregistrer'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            {/* Quick Mercuriale Banner in Overview */}
            <div
              style={{
                backgroundColor: 'var(--amber-50)',
                border: '1.5px solid var(--amber-400)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.4rem',
                marginBottom: '1.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <Zap size={24} color="var(--amber-600)" />
                <div>
                  <strong style={{ color: '#92400e', fontSize: '1rem', display: 'block' }}>
                    Mercuriale & Cours du Jour Maroc :
                  </strong>
                  <span style={{ fontSize: '0.86rem', color: '#78350f' }}>
                    Ajustez chaque matin vos prix de vente selon les arrivages des marchés de gros (Casablanca, Souss, Saïss).
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('daily-prices')}
                className="btn btn-sm"
                style={{
                  backgroundColor: 'var(--amber-500)',
                  color: '#082817',
                  fontWeight: 800,
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <SlidersHorizontal size={14} />
                <span>Actualiser la Mercuriale</span>
              </button>
            </div>
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

              <div
                className="card"
                onClick={() => setActiveTab('clients')}
                style={{
                  padding: '1.5rem',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  border: pendingBusinessesCount > 0 ? '1.5px solid var(--amber-400)' : '1px solid var(--border-light)',
                }}
                title="Cliquer pour voir et gérer tous les clients inscrits"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Établissements CHR</span>
                  <div style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)' }}>
                    <Users size={18} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary-900)' }}>{totalClientsCount}</div>
                  {pendingBusinessesCount > 0 && (
                    <span className="badge badge-status-pending" style={{ fontSize: '0.72rem' }}>
                      {pendingBusinessesCount} en attente
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary-700)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                  <span>Gérer les clients inscrits</span>
                  <ArrowRight size={13} />
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <select
                              className="form-select"
                              value={ord.status}
                              onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                              style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem' }}
                            >
                              <option value="pending">En attente</option>
                              <option value="confirmed">Confirmer</option>
                              <option value="preparing">En préparation</option>
                              <option value="delivering">En livraison</option>
                              <option value="delivered">Livrée</option>
                              <option value="cancelled">Annuler</option>
                            </select>

                            <button
                              onClick={() => setSelectedInvoiceOrder(ord)}
                              className="btn btn-secondary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.78rem',
                                padding: '0.35rem 0.55rem',
                                backgroundColor: '#f0fdf4',
                                borderColor: '#bbf7d0',
                                color: '#166534',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                              title="Générer et imprimer la facture de cette commande"
                            >
                              <FileText size={13} />
                              <span>Facture</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Registered Clients Overview */}
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-900)', margin: 0 }}>
                    Derniers Clients Professionnels Inscrits
                  </h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Établissements CHR (Restaurants, Hôtels, Cafés) ayant créé un compte
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('clients')}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <span>Gérer tous les clients ({businesses.length})</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {businesses.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Users size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Aucun client inscrit pour le moment.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Client / Établissement</th>
                        <th>Responsable</th>
                        <th>Téléphone & WhatsApp</th>
                        <th>Ville & Adresse</th>
                        <th>Date Inscription</th>
                        <th>Statut</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {businesses.slice(0, 5).map((biz) => {
                        const cleanPhone = (biz.phone || '').replace(/[^0-9]/g, '');
                        const waPhone = cleanPhone.startsWith('0') ? `212${cleanPhone.slice(1)}` : cleanPhone.startsWith('212') ? cleanPhone : `212${cleanPhone}`;
                        return (
                          <tr key={biz.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--primary-900)' }}>{biz.businessName}</div>
                              <span className="badge badge-brand" style={{ fontSize: '0.7rem', textTransform: 'capitalize', marginTop: '0.2rem' }}>
                                {biz.businessType}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{biz.contactName || 'Responsable'}</div>
                              {biz.email && <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{biz.email}</div>}
                            </td>
                            <td>
                              {biz.phone ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <a
                                    href={`tel:${biz.phone}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.2rem',
                                      fontSize: '0.82rem',
                                      fontWeight: 700,
                                      color: 'var(--primary-800)',
                                      textDecoration: 'none',
                                    }}
                                  >
                                    <Phone size={12} /> {biz.phone}
                                  </a>
                                  {cleanPhone && (
                                    <a
                                      href={`https://wa.me/${waPhone}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.2rem',
                                        fontSize: '0.72rem',
                                        backgroundColor: '#25D366',
                                        color: '#ffffff',
                                        padding: '0.15rem 0.45rem',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        fontWeight: 700,
                                      }}
                                      title="Contacter sur WhatsApp"
                                    >
                                      <MessageCircle size={11} /> WhatsApp
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>-</span>
                              )}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{biz.city}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {biz.deliveryAddress}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                {new Date(biz.createdAt).toLocaleDateString('fr-FR')}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                {new Date(biz.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
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
                              {biz.approvalStatus === 'pending' ? (
                                <button
                                  onClick={() => handleUpdateBusinessStatus(biz.id, 'approved')}
                                  className="btn btn-primary btn-sm"
                                  style={{ backgroundColor: '#166534', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                                >
                                  Approuver
                                </button>
                              ) : (
                                <button
                                  onClick={() => setActiveTab('clients')}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                                >
                                  Détails
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary-700)', fontWeight: 600 }}>
                          (Livraison gratuite)
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-status-${ord.status}`}>{ord.status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <select
                            className="form-select"
                            value={ord.status}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                            style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem' }}
                          >
                            <option value="pending">En attente</option>
                            <option value="confirmed">Confirmer</option>
                            <option value="preparing">En préparation</option>
                            <option value="delivering">En livraison</option>
                            <option value="delivered">Livrée</option>
                            <option value="cancelled">Annuler</option>
                          </select>

                          <button
                            onClick={() => setSelectedInvoiceOrder(ord)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              fontSize: '0.78rem',
                              padding: '0.35rem 0.65rem',
                              backgroundColor: '#f0fdf4',
                              borderColor: '#bbf7d0',
                              color: '#166534',
                              fontWeight: 700,
                            }}
                            title="Générer et imprimer la facture de cette commande"
                          >
                            <FileText size={13} />
                            <span>Facture / BL</span>
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

        {/* TAB 3: CLIENTS / BUSINESSES MANAGEMENT */}
        {activeTab === 'clients' && (
          <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.5rem' }}>
            {/* Header & Refresh */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-900)', margin: 0, fontWeight: 700 }}>
                    Clients & Établissements Inscrits ({businesses.length})
                  </h3>
                  {pendingBusinessesCount > 0 && (
                    <span className="badge badge-status-pending" style={{ fontSize: '0.75rem' }}>
                      {pendingBusinessesCount} en attente de validation
                    </span>
                  )}
                </div>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Consultez, contactez en 1 clic (WhatsApp & Appel direct) et gérez l'ensemble des comptes clients de la plateforme.
                </p>
              </div>

              <button
                onClick={handleRefreshClients}
                disabled={isRefreshingClients}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem' }}
                title="Recharger la liste des clients"
              >
                <RefreshCw size={14} className={isRefreshingClients ? 'spin' : ''} />
                <span>{isRefreshingClients ? 'Actualisation...' : 'Actualiser la liste'}</span>
              </button>
            </div>

            {/* Quick Metrics & Filter Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem', alignItems: 'center' }}>
              <button
                onClick={() => setClientStatusFilter('all')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  border: clientStatusFilter === 'all' ? '2px solid var(--primary-700)' : '1px solid var(--border-light)',
                  backgroundColor: clientStatusFilter === 'all' ? 'var(--primary-50)' : '#ffffff',
                  color: clientStatusFilter === 'all' ? 'var(--primary-900)' : 'var(--text-main)',
                  fontWeight: clientStatusFilter === 'all' ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>Tous</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>({businesses.length})</span>
              </button>

              <button
                onClick={() => setClientStatusFilter('pending')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  border: clientStatusFilter === 'pending' ? '2px solid #d97706' : '1px solid var(--border-light)',
                  backgroundColor: clientStatusFilter === 'pending' ? '#fef3c7' : '#ffffff',
                  color: clientStatusFilter === 'pending' ? '#92400e' : 'var(--text-main)',
                  fontWeight: clientStatusFilter === 'pending' ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>En Attente</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '0.05rem 0.4rem',
                    fontWeight: 700,
                  }}
                >
                  {pendingBusinessesCount}
                </span>
              </button>

              <button
                onClick={() => setClientStatusFilter('approved')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  border: clientStatusFilter === 'approved' ? '2px solid #166534' : '1px solid var(--border-light)',
                  backgroundColor: clientStatusFilter === 'approved' ? '#dcfce7' : '#ffffff',
                  color: clientStatusFilter === 'approved' ? '#14532d' : 'var(--text-main)',
                  fontWeight: clientStatusFilter === 'approved' ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>Approuvés</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>({approvedBusinessesCount})</span>
              </button>

              <button
                onClick={() => setClientStatusFilter('suspended')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  border: clientStatusFilter === 'suspended' ? '2px solid #dc2626' : '1px solid var(--border-light)',
                  backgroundColor: clientStatusFilter === 'suspended' ? '#fee2e2' : '#ffffff',
                  color: clientStatusFilter === 'suspended' ? '#991b1b' : 'var(--text-main)',
                  fontWeight: clientStatusFilter === 'suspended' ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>Suspendus</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>({suspendedBusinessesCount})</span>
              </button>
            </div>

            {/* Search Input Bar */}
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Search size={16} />
              </div>
              <input
                type="text"
                className="form-input"
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                placeholder="Rechercher par nom de client, restaurant, téléphone, ville, email..."
                style={{
                  width: '100%',
                  paddingLeft: '2.5rem',
                  paddingRight: clientSearchQuery ? '2.5rem' : '1rem',
                  fontSize: '0.9rem',
                }}
              />
              {clientSearchQuery && (
                <button
                  onClick={() => setClientSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Effacer la recherche"
                >
                  <XCircle size={16} />
                </button>
              )}
            </div>

            {/* Sub-header Result Count */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
              }}
            >
              <span>
                Affichage de <strong>{filteredBusinesses.length}</strong> sur <strong>{businesses.length}</strong> client(s) inscrit(s)
              </span>
              {(clientSearchQuery || clientStatusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setClientSearchQuery('');
                    setClientStatusFilter('all');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-700)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    textDecoration: 'underline',
                  }}
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>

            {/* Empty State */}
            {filteredBusinesses.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1.5rem',
                  backgroundColor: 'var(--bg-main)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-light)',
                }}
              >
                <Users size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem', opacity: 0.5 }} />
                <h4 style={{ fontSize: '1.05rem', color: 'var(--primary-900)', margin: '0 0 0.35rem', fontWeight: 700 }}>
                  Aucun client trouvé
                </h4>
                <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                  {clientSearchQuery || clientStatusFilter !== 'all'
                    ? 'Aucun compte client ne correspond à votre recherche ou au filtre sélectionné.'
                    : "Aucun client n'est encore inscrit sur la plateforme."}
                </p>
                {(clientSearchQuery || clientStatusFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setClientSearchQuery('');
                      setClientStatusFilter('all');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Effacer la recherche et les filtres
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="clients-table-desktop table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Client / Établissement</th>
                        <th>Responsable & Contact</th>
                        <th>Téléphone & WhatsApp</th>
                        <th>Ville & Localisation</th>
                        <th>Date Inscription</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBusinesses.map((biz) => {
                        const cleanPhone = (biz.phone || '').replace(/[^0-9]/g, '');
                        const waPhone = cleanPhone.startsWith('0')
                          ? `212${cleanPhone.slice(1)}`
                          : cleanPhone.startsWith('212')
                          ? cleanPhone
                          : `212${cleanPhone}`;
                        const initials = (biz.businessName || 'C')
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase();

                        return (
                          <tr key={biz.id}>
                            {/* Établissement info */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div
                                  style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    backgroundColor: 'var(--primary-100)',
                                    color: 'var(--primary-800)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.85rem',
                                    flexShrink: 0,
                                  }}
                                >
                                  {initials}
                                </div>
                                <div>
                                  <strong style={{ fontSize: '0.95rem', color: 'var(--primary-900)', display: 'block' }}>
                                    {biz.businessName}
                                  </strong>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                    <span className="badge badge-brand" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>
                                      {biz.businessType || 'Professionnel CHR'}
                                    </span>
                                    {biz.username && (
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        @{biz.username}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Responsable & Email */}
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--primary-900)' }}>
                                {biz.contactName || 'Gérant / Contact'}
                              </div>
                              {biz.email ? (
                                <a
                                  href={`mailto:${biz.email}`}
                                  style={{
                                    fontSize: '0.78rem',
                                    color: 'var(--text-muted)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    textDecoration: 'none',
                                    marginTop: '0.15rem',
                                  }}
                                  title="Envoyer un email"
                                >
                                  <Mail size={12} /> {biz.email}
                                </a>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email non renseigné</span>
                              )}
                            </td>

                            {/* Téléphone & Direct WhatsApp */}
                            <td>
                              {biz.phone ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                  <a
                                    href={`tel:${biz.phone}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      fontSize: '0.85rem',
                                      color: 'var(--primary-800)',
                                      textDecoration: 'none',
                                      fontWeight: 700,
                                    }}
                                    title="Appeler directement"
                                  >
                                    <Phone size={13} style={{ color: 'var(--primary-600)' }} /> {biz.phone}
                                  </a>
                                  {cleanPhone && (
                                    <a
                                      href={`https://wa.me/${waPhone}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        fontSize: '0.76rem',
                                        backgroundColor: '#25D366',
                                        color: '#ffffff',
                                        padding: '0.22rem 0.55rem',
                                        borderRadius: '12px',
                                        textDecoration: 'none',
                                        fontWeight: 700,
                                        width: 'fit-content',
                                      }}
                                      title="Discuter directement sur WhatsApp"
                                    >
                                      <MessageCircle size={13} /> WhatsApp Direct
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Non renseigné</span>
                              )}
                            </td>

                            {/* Ville & Localisation */}
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--primary-900)' }}>{biz.city || 'Maroc'}</div>
                              <div
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--text-muted)',
                                  marginTop: '0.15rem',
                                  maxWidth: '220px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={biz.deliveryAddress}
                              >
                                {biz.deliveryAddress}
                              </div>
                              <a
                                href={
                                  biz.googleMapsUrl ||
                                  (biz.deliveryAddress.includes('google.com/maps')
                                    ? biz.deliveryAddress.match(/https:\/\/www\.google\.com\/maps[^\s)]+/)?.[0] || biz.deliveryAddress
                                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${biz.deliveryAddress}, ${biz.city}`)}`)
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.74rem',
                                  color: '#166534',
                                  fontWeight: 700,
                                  marginTop: '0.25rem',
                                  textDecoration: 'underline',
                                }}
                                title="Ouvrir l'adresse dans Google Maps"
                              >
                                <MapPin size={11} /> Itinéraire Maps
                              </a>
                            </td>

                            {/* Date & Heure Inscription */}
                            <td>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-900)' }}>
                                {new Date(biz.createdAt).toLocaleDateString('fr-FR')}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                {new Date(biz.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>

                            {/* Statut d'Approbation */}
                            <td>
                              {biz.approvalStatus === 'approved' ? (
                                <span className="badge badge-status-delivered" style={{ fontSize: '0.74rem' }}>
                                  Approuvé
                                </span>
                              ) : biz.approvalStatus === 'pending' ? (
                                <span className="badge badge-status-pending" style={{ fontSize: '0.74rem' }}>
                                  En Attente
                                </span>
                              ) : (
                                <span className="badge badge-status-cancelled" style={{ fontSize: '0.74rem' }}>
                                  {biz.approvalStatus}
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {biz.approvalStatus !== 'approved' && (
                                  <button
                                    onClick={() => handleUpdateBusinessStatus(biz.id, 'approved')}
                                    className="btn btn-primary btn-sm"
                                    style={{ backgroundColor: '#166534', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                                    title="Valider le compte client"
                                  >
                                    Approuver
                                  </button>
                                )}
                                {biz.approvalStatus !== 'suspended' && (
                                  <button
                                    onClick={() => handleUpdateBusinessStatus(biz.id, 'suspended')}
                                    className="btn btn-secondary btn-sm"
                                    style={{ color: '#b45309', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                                    title="Suspendre l'accès"
                                  >
                                    Suspendre
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteClient(biz.id, biz.businessName)}
                                  className="btn btn-secondary btn-sm"
                                  style={{
                                    color: '#dc2626',
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.5rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                  }}
                                  title="Supprimer définitivement ce compte client"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View (Optimisé pour Téléphone) */}
                <div className="clients-cards-mobile">
                  {filteredBusinesses.map((biz) => {
                    const cleanPhone = (biz.phone || '').replace(/[^0-9]/g, '');
                    const waPhone = cleanPhone.startsWith('0')
                      ? `212${cleanPhone.slice(1)}`
                      : cleanPhone.startsWith('212')
                      ? cleanPhone
                      : `212${cleanPhone}`;
                    const initials = (biz.businessName || 'C')
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <div key={biz.id} className="client-card-mobile">
                        {/* Top Header Card */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--primary-100)',
                                color: 'var(--primary-800)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <strong style={{ fontSize: '0.96rem', color: 'var(--primary-900)' }}>
                                {biz.businessName}
                              </strong>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                                <span className="badge badge-brand" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                                  {biz.businessType || 'Professionnel'}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {biz.city}
                                </span>
                              </div>
                            </div>
                          </div>

                          {biz.approvalStatus === 'approved' ? (
                            <span className="badge badge-status-delivered" style={{ fontSize: '0.7rem' }}>
                              Approuvé
                            </span>
                          ) : biz.approvalStatus === 'pending' ? (
                            <span className="badge badge-status-pending" style={{ fontSize: '0.7rem' }}>
                              En Attente
                            </span>
                          ) : (
                            <span className="badge badge-status-cancelled" style={{ fontSize: '0.7rem' }}>
                              {biz.approvalStatus}
                            </span>
                          )}
                        </div>

                        {/* Details Box */}
                        <div
                          style={{
                            backgroundColor: 'var(--bg-main)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.75rem',
                            fontSize: '0.82rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.45rem',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--primary-900)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <User size={13} color="var(--primary-700)" />
                            <span>{biz.contactName || 'Responsable CHR'}</span>
                            {biz.email && (
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                ({biz.email})
                              </span>
                            )}
                          </div>

                          {/* Quick Contact Buttons Row */}
                          {biz.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.2rem' }}>
                              <a
                                href={`tel:${biz.phone}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  fontSize: '0.82rem',
                                  color: 'var(--primary-800)',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid var(--border-light)',
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '6px',
                                }}
                              >
                                <Phone size={12} color="var(--primary-600)" /> {biz.phone}
                              </a>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${waPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    fontSize: '0.76rem',
                                    backgroundColor: '#25D366',
                                    color: '#ffffff',
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '12px',
                                    textDecoration: 'none',
                                    fontWeight: 700,
                                  }}
                                >
                                  <MessageCircle size={12} /> WhatsApp
                                </a>
                              )}
                            </div>
                          )}

                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MapPin size={13} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                            <span>{biz.deliveryAddress}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.35rem' }}>
                            <span>
                              Inscrit le {new Date(biz.createdAt).toLocaleDateString('fr-FR')} à {new Date(biz.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <a
                              href={
                                biz.googleMapsUrl ||
                                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${biz.deliveryAddress}, ${biz.city}`)}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#166534', fontWeight: 700, textDecoration: 'underline' }}
                            >
                              Maps
                            </a>
                          </div>
                        </div>

                        {/* Action Buttons Row */}
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '0.2rem' }}>
                          {biz.approvalStatus !== 'approved' && (
                            <button
                              onClick={() => handleUpdateBusinessStatus(biz.id, 'approved')}
                              className="btn btn-primary btn-sm"
                              style={{ backgroundColor: '#166534', fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                            >
                              Approuver
                            </button>
                          )}
                          {biz.approvalStatus !== 'suspended' && (
                            <button
                              onClick={() => handleUpdateBusinessStatus(biz.id, 'suspended')}
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#b45309', fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                            >
                              Suspendre
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClient(biz.id, biz.businessName)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#dc2626', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                            title="Supprimer ce compte client"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
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

            {/* Desktop Table View */}
            <div className="products-table-desktop table-responsive">
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

            {/* Mobile Structured Cards View */}
            <div className="products-cards-mobile">
              {products.map((p) => (
                <div
                  key={p.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--primary-900)' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
                        <span>{p.origin || 'Maroc'}</span>
                        <span>•</span>
                        <span style={{ textTransform: 'capitalize' }}>{p.categoryId.replace('cat-', '')}</span>
                      </div>
                    </div>
                    {p.isAvailable ? (
                      <span className="badge badge-status-delivered" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>En Stock</span>
                    ) : (
                      <span className="badge badge-status-cancelled" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>Rupture</span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--bg-main)',
                      padding: '0.45rem 0.75rem',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Prix Pro : </span>
                      <strong style={{ color: 'var(--primary-900)', fontSize: '0.95rem' }}>{p.price.toFixed(2)} DH</strong>
                      <span style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>/{p.unit}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Min: <strong>{p.minimumQuantity} {p.unit}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.2rem' }}>
                    <button
                      onClick={() => handleOpenEditProduct(p)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem', padding: '0.45rem' }}
                    >
                      <Edit2 size={13} /> Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#dc2626', borderColor: '#fecaca', backgroundColor: '#fef2f2', padding: '0.45rem 0.75rem' }}
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT PRODUCT */}
      {isProductModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProductModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--primary-100)', color: 'var(--primary-800)', borderRadius: '8px' }}>
                  <ImageIcon size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--primary-900)' }}>
                    {editingProduct ? 'Modifier Nom, Photo & Détails du Produit' : 'Ajouter un Nouveau Produit Frais'}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Contrôle réservé exclusivement à la Direction Pont Agricole.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProduct}>
              {/* NOM DU PRODUIT */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                  Nom du Produit (Affiché sur le catalogue CHR) *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Tomates Rondes Extra (Caisse), Bananes Marocaines, etc."
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  style={{ fontSize: '1rem', fontWeight: 600, padding: '0.75rem' }}
                  required
                />
              </div>

              {/* PHOTO DU PRODUIT AVEC PREVIEW ET UPLOAD */}
              <div
                className="form-group"
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-main)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '1.25rem',
                }}
              >
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Camera size={16} style={{ color: 'var(--primary-700)' }} />
                  Photo du Produit
                </label>

                {/* Preview Box & Upload Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.85rem' }}>
                  <div
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      backgroundColor: '#e2e8f0',
                      border: '2px solid var(--border-color)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {productForm.imageUrl ? (
                      <img
                        src={productForm.imageUrl}
                        alt="Aperçu"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon size={32} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label
                      className="btn btn-primary btn-sm"
                      style={{
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        padding: '0.6rem 1rem',
                        fontSize: '0.85rem',
                        width: 'fit-content',
                      }}
                    >
                      <Camera size={15} />
                      <span>Téléverser une photo (mobile / PC)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Prenez une photo en direct ou choisissez depuis votre galerie (PNG, JPG, max 5 Mo).
                    </span>
                  </div>
                </div>

                {/* Direct Image URL input */}
                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Ou saisir un lien d’image internet (URL) :
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://images.unsplash.com/..."
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>

                {/* Quick Presets for Fresh Produce */}
                <div style={{ marginTop: '0.85rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={13} color="var(--primary-600)" />
                    <span>Suggestions photographiques calibrées :</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {QUICK_PHOTO_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setProductForm({ ...productForm, imageUrl: preset.url })}
                        style={{
                          fontSize: '0.74rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '14px',
                          border: productForm.imageUrl === preset.url ? '1.5px solid var(--primary-600)' : '1px solid var(--border-color)',
                          backgroundColor: productForm.imageUrl === preset.url ? 'var(--primary-100)' : '#ffffff',
                          color: productForm.imageUrl === preset.url ? 'var(--primary-900)' : 'var(--text-main)',
                          cursor: 'pointer',
                          fontWeight: productForm.imageUrl === preset.url ? 700 : 500,
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CATEGORIE & UNITE */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
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

              {/* PRIX & QUANTITE MIN */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Prix de Vente B2B (DH)</label>
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

              {/* ORIGINE & BADGE */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
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
                  <label className="form-label">Badge Promo / Spécial</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Primeur, Spécial CHR, Top Vente"
                    value={productForm.badge || ''}
                    onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Description pour les Chefs</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Calibre, texture, utilisation recommandée..."
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
                  <span style={{ fontWeight: 600 }}>Produit disponible en stock pour commande</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
                  {editingProduct ? 'Enregistrer Nom & Photo' : 'Créer le Produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B2B Commercial Invoice / Delivery Slip Modal */}
      {selectedInvoiceOrder && (
        <InvoiceModal
          order={selectedInvoiceOrder}
          onClose={() => setSelectedInvoiceOrder(null)}
          settings={settings}
        />
      )}
    </div>
  );
};
