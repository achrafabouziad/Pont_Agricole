import React, { useState, useEffect } from 'react';
import { store, isClientOnline, formatClientPresence, normalizePhone } from '../services/store';
import {
  Order,
  Product,
  Business,
  DeliveryZone,
  CompanySettings,
  OrderStatus,
  ApprovalStatus,
  ProductUnit,
  BusinessType,
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
  UserPlus,
  ArrowRight,
  Mail,
  FileText,
  BarChart3,
  ShoppingBag,
  Printer,
  KeyRound,
  Eye,
  EyeOff,
  X,
  Sparkles,
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
  const [activeTab, setActiveTab] = useState<'daily-prices' | 'overview' | 'orders' | 'clients' | 'products' | 'settings'>('clients');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<CompanySettings>({
    companyName: 'Pont Agricole',
    tagline: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: '',
    ice: '',
    rc: '',
    ifCode: '',
    patente: '',
    cnss: '',
    capital: '',
    rib: '',
    minOrderDefault: 0,
    freeDeliveryThreshold: 0,
    deliveryDays: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    orderCutoffTime: '',
  });
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsSaveNotice, setSettingsSaveNotice] = useState<string | null>(null);

  // Selected order & client for consolidated commercial invoice
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [selectedInvoiceOrders, setSelectedInvoiceOrders] = useState<Order[] | null>(null);
  const [selectedInvoiceClient, setSelectedInvoiceClient] = useState<Business | null>(null);

  const handleOpenGlobalInvoiceForClient = (biz: Business) => {
    const bizPhoneNorm = normalizePhone(biz.phone || '');
    const clientOrders = orders.filter((o) => {
      if (o.businessId && o.businessId === biz.id) return true;
      if (o.customerId && o.customerId === biz.ownerId) return true;
      const oPhoneNorm = normalizePhone(o.customerPhone || '');
      if (bizPhoneNorm && oPhoneNorm && bizPhoneNorm === oPhoneNorm) return true;
      return false;
    });

    if (clientOrders.length === 0) {
      alert(`Aucune commande enregistrée pour ${biz.businessName}.`);
      return;
    }

    setSelectedInvoiceOrder(clientOrders[0]);
    setSelectedInvoiceOrders(clientOrders);
    setSelectedInvoiceClient(biz);
  };

  const handleOpenInvoiceForOrder = (ord: Order) => {
    const oPhoneNorm = normalizePhone(ord.customerPhone || '');
    const clientOrders = orders.filter((o) => {
      if (ord.businessId && o.businessId === ord.businessId) return true;
      if (ord.customerId && o.customerId === ord.customerId) return true;
      const phoneNorm = normalizePhone(o.customerPhone || '');
      if (oPhoneNorm && phoneNorm && oPhoneNorm === phoneNorm) return true;
      return false;
    });

    const matchBiz = businesses.find((b) => {
      if (ord.businessId && b.id === ord.businessId) return true;
      if (ord.customerId && b.ownerId === ord.customerId) return true;
      const bPhoneNorm = normalizePhone(b.phone || '');
      if (oPhoneNorm && bPhoneNorm && oPhoneNorm === bPhoneNorm) return true;
      return false;
    });

    setSelectedInvoiceOrder(ord);
    setSelectedInvoiceOrders(clientOrders.length > 0 ? clientOrders : [ord]);
    setSelectedInvoiceClient(matchBiz || null);
  };

  // Clients Tab search & filter state
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'approved' | 'pending' | 'suspended' | 'online' | 'offline'>('all');
  const [isRefreshingClients, setIsRefreshingClients] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<{ message: string; count: number; time: string } | null>(null);

  // Manual Add Client Modal State
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState<boolean>(false);
  const [newClientForm, setNewClientForm] = useState({
    businessName: '',
    contactName: '',
    phone: '',
    city: 'Casablanca',
    deliveryAddress: '',
    businessType: 'restaurant' as BusinessType,
    email: '',
  });
  const [addingClient, setAddingClient] = useState<boolean>(false);
  const [addClientError, setAddClientError] = useState<string | null>(null);

  // Password Reset Modal State
  const [passwordResetClient, setPasswordResetClient] = useState<Business | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [savingNewPassword, setSavingNewPassword] = useState<boolean>(false);
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);

  const handleOpenPasswordModal = (biz: Business) => {
    setPasswordResetClient(biz);
    const existingPass = store.getClientPassword(biz);
    setNewPasswordInput(existingPass || '');
    setPasswordNotice(null);
    setShowPasswordText(false);
  };

  const handleSaveClientPassword = async () => {
    if (!passwordResetClient) return;
    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 4) {
      setPasswordNotice({ type: 'error', message: 'Le mot de passe doit comporter au moins 4 caractères.' });
      return;
    }
    setSavingNewPassword(true);
    setPasswordNotice(null);
    try {
      const res = await store.adminResetClientPassword(passwordResetClient.id, newPasswordInput.trim());
      if (res.success) {
        setPasswordNotice({ type: 'success', message: 'Mot de passe mis à jour avec succès !' });
        setBusinesses((prev) =>
          prev.map((b) => (b.id === passwordResetClient.id ? { ...b, password: newPasswordInput.trim() } : b))
        );
      } else {
        setPasswordNotice({ type: 'error', message: res.error || 'Erreur lors de la mise à jour.' });
      }
    } catch (e: any) {
      setPasswordNotice({ type: 'error', message: e.message || 'Erreur inconnue.' });
    } finally {
      setSavingNewPassword(false);
    }
  };

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
    try {
      const [ordsRes, prodsRes, bizsRes, znsRes, stgsRes] = await Promise.allSettled([
        store.getOrders(),
        store.getProducts(),
        store.getBusinesses(),
        store.getDeliveryZones(),
        store.getCompanySettings(),
      ]);

      if (ordsRes.status === 'fulfilled') setOrders(ordsRes.value);
      if (prodsRes.status === 'fulfilled') {
        const prods = prodsRes.value;
        setProducts(prods);
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
      }
      if (bizsRes.status === 'fulfilled') setBusinesses(bizsRes.value);
      if (znsRes.status === 'fulfilled') setZones(znsRes.value);
      if (stgsRes.status === 'fulfilled') {
        setSettings(stgsRes.value);
        setSettingsForm(stgsRes.value);
      }
    } catch (e) {
      console.error('loadData error', e);
    }
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

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await store.saveCompanySettings(settingsForm);
      setSettings(settingsForm);
      setSettingsSaveNotice('Informations & coordonnées officielles de l\'entreprise enregistrées avec succès !');
      setTimeout(() => setSettingsSaveNotice(null), 4000);
    } catch (err) {
      console.error('Error saving company settings', err);
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(() => {
      loadData();
    });

    // Écouter les diffusions inter-onglets et inter-fenêtres (BroadcastChannel)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('pont_agricole_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'STORE_UPDATED' || event.data?.type === 'PRESENCE_PING') {
            loadData();
          }
        };
      }
    } catch {}

    // Détecter les modifications directes dans le stockage local d'autres fenêtres
    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes('pont_agricole_')) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Recharger immédiatement lorsque l'administrateur revient sur l'onglet
    const handleFocus = () => {
      loadData();
    };
    window.addEventListener('focus', handleFocus);

    // Polling régulier toutes les 4s pour détecter tout nouvel utilisateur ou commande
    const pollInterval = setInterval(() => {
      loadData();
    }, 4000);

    return () => {
      unsub();
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollInterval);
    };
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
    setSyncNotice(null);
    try {
      const refreshedBizs = await store.getBusinesses();
      setBusinesses(refreshedBizs);
      const nowTime = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setSyncNotice({
        message: `${refreshedBizs.length} client(s) répertorié(s)`,
        count: refreshedBizs.length,
        time: nowTime,
      });
      setTimeout(() => setSyncNotice(null), 4000);
    } catch (err) {
      console.error('Erreur actualisation clients', err);
    } finally {
      setIsRefreshingClients(false);
    }
  };

  const handleManualAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientForm.businessName.trim() || !newClientForm.contactName.trim() || !newClientForm.phone.trim()) {
      setAddClientError('Veuillez renseigner au moins le nom du responsable, l\'établissement et le téléphone.');
      return;
    }
    setAddingClient(true);
    setAddClientError(null);
    try {
      await store.addBusinessManual(newClientForm);
      await loadData();
      setIsAddClientModalOpen(false);
      const addedName = newClientForm.businessName;
      setNewClientForm({
        businessName: '',
        contactName: '',
        phone: '',
        city: 'Casablanca',
        deliveryAddress: '',
        businessType: 'restaurant',
        email: '',
      });
      const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSyncNotice({
        message: `Client "${addedName}" ajouté et enregistré !`,
        count: businesses.length + 1,
        time: nowTime,
      });
      setTimeout(() => setSyncNotice(null), 4000);
    } catch (err: any) {
      setAddClientError(err.message || 'Erreur lors de la création du client.');
    } finally {
      setAddingClient(false);
    }
  };

  // Détecter si un client a été inscrit récemment (moins de 2 heures)
  const isClientNew = (createdAt?: string) => {
    if (!createdAt) return false;
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return diffMs >= 0 && diffMs < 2 * 60 * 60 * 1000;
  };

  // Clients calculation & filtering (avec détection de présence en ligne)
  const pendingBusinessesCount = businesses.filter((b) => b.approvalStatus === 'pending').length;
  const approvedBusinessesCount = businesses.filter((b) => b.approvalStatus === 'approved').length;
  const suspendedBusinessesCount = businesses.filter((b) => b.approvalStatus === 'suspended').length;
  const onlineBusinessesCount = businesses.filter((b) => isClientOnline(b.lastSeenAt)).length;
  const offlineBusinessesCount = businesses.length - onlineBusinessesCount;

  const filteredBusinesses = businesses.filter((biz) => {
    if (clientStatusFilter === 'online' && !isClientOnline(biz.lastSeenAt)) return false;
    if (clientStatusFilter === 'offline' && isClientOnline(biz.lastSeenAt)) return false;
    if (
      clientStatusFilter !== 'all' &&
      clientStatusFilter !== 'online' &&
      clientStatusFilter !== 'offline' &&
      biz.approvalStatus !== clientStatusFilter
    )
      return false;
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
        <div className="admin-header-row">
          <div>
            <div className="admin-badge-line">
              <span className="admin-status-badge">
                <span className="admin-status-dot" /> Direction & Logistique B2B
              </span>
              <span className="admin-brand-tag">Pont Agricole Maroc</span>
            </div>
            <h1 className="admin-page-title">Tableau de Bord Administrateur</h1>
          </div>

          <button
            onClick={handleOpenAddProduct}
            className="btn btn-primary btn-sm admin-header-btn"
          >
            <Plus size={15} />
            <span>Nouveau Produit</span>
          </button>
        </div>

        {/* Quick KPI Overview Bar for instant mobile and desktop visibility */}
        <div className="admin-quick-summary-bar">
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`admin-quick-stat-card ${activeTab === 'clients' ? 'active' : ''}`}
          >
            <div className="admin-quick-stat-icon clients">
              <Users size={20} />
            </div>
            <div className="admin-quick-stat-info">
              <span className="admin-quick-stat-num">{businesses.length}</span>
              <span className="admin-quick-stat-label">Clients Inscrits</span>
            </div>
            {pendingBusinessesCount > 0 ? (
              <span className="admin-quick-stat-badge alert">{pendingBusinessesCount} en attente</span>
            ) : (
              <span className="admin-quick-stat-badge">Actifs</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`admin-quick-stat-card ${activeTab === 'orders' ? 'active' : ''}`}
          >
            <div className="admin-quick-stat-icon orders">
              <ShoppingBag size={20} />
            </div>
            <div className="admin-quick-stat-info">
              <span className="admin-quick-stat-num">{orders.length}</span>
              <span className="admin-quick-stat-label">Commandes</span>
            </div>
            {pendingOrdersCount > 0 ? (
              <span className="admin-quick-stat-badge alert">{pendingOrdersCount} en attente</span>
            ) : (
              <span className="admin-quick-stat-badge">Total</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('daily-prices')}
            className={`admin-quick-stat-card ${activeTab === 'daily-prices' ? 'active' : ''}`}
          >
            <div className="admin-quick-stat-icon prices">
              <Calendar size={20} />
            </div>
            <div className="admin-quick-stat-info">
              <span className="admin-quick-stat-num">{products.length}</span>
              <span className="admin-quick-stat-label">Mercuriale & Prix</span>
            </div>
            <span className="admin-quick-stat-badge">Cours du jour</span>
          </button>
        </div>

        {/* Modern Segmented Navigation Tabs */}
        <div className="admin-segmented-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`admin-tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
          >
            <Users size={14} />
            <span>Clients Inscrits</span>
            <span className={`admin-tab-count ${pendingBusinessesCount > 0 ? 'alert' : ''}`}>
              {pendingBusinessesCount > 0 ? `${pendingBusinessesCount} en attente` : businesses.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          >
            <ShoppingBag size={14} />
            <span>Commandes</span>
            <span className={`admin-tab-count ${pendingOrdersCount > 0 ? 'alert' : ''}`}>
              {pendingOrdersCount > 0 ? `${pendingOrdersCount} en attente` : orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('daily-prices')}
            className={`admin-tab-btn ${activeTab === 'daily-prices' ? 'active' : ''}`}
          >
            <Calendar size={14} />
            <span>Mercuriale Quotidienne</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <BarChart3 size={14} />
            <span>Vue d'ensemble</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          >
            <Package size={14} />
            <span>Gestion des Produits</span>
            <span className="admin-tab-count">
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <SlidersHorizontal size={14} />
            <span>Infos Entreprise & Paramètres</span>
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
            <div className="mercuriale-card">
              <div className="mercuriale-header-top">
                <div>
                  <span className="mercuriale-pill">
                    <Clock size={12} />
                    <span>Arrivages Marché de Gros</span>
                  </span>
                  <h2 className="mercuriale-heading">
                    Ajustement Rapide des Prix du Jour
                  </h2>
                  <p className="mercuriale-sub">
                    Modifiez vos prix de vente directement dans les cases ci-dessous chaque matin. Les nouveaux tarifs s’appliquent instantanément au catalogue de vos clients CHR.
                  </p>
                </div>

                <button
                  onClick={handleSaveAllDailyPrices}
                  disabled={savingDaily}
                  className="btn btn-primary mercuriale-save-btn"
                >
                  <Save size={16} />
                  <span>{savingDaily ? 'Enregistrement...' : 'Enregistrer Tous les Prix'}</span>
                </button>
              </div>

              {/* Quick Actions & Filters Bar */}
              <div className="mercuriale-toolbar">
                {/* Category Pills */}
                <div className="mercuriale-categories">
                  {[
                    { id: 'all', label: `Tous les produits (${products.length})` },
                    { id: 'cat-legumes', label: `Légumes (${products.filter((p) => p.categoryId === 'cat-legumes').length})` },
                    { id: 'cat-fruits', label: `Fruits (${products.filter((p) => p.categoryId === 'cat-fruits').length})` },
                    { id: 'cat-herbes', label: `Herbes Aromatiques (${products.filter((p) => p.categoryId === 'cat-herbes').length})` },
                    { id: 'cat-saison', label: `Primeurs & Saison (${products.filter((p) => p.categoryId === 'cat-saison').length})` },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setDailyCategoryFilter(cat.id)}
                      className={`mercuriale-cat-pill ${dailyCategoryFilter === cat.id ? 'active' : ''}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Controls Row: Search + Batch Adjusters */}
                <div className="mercuriale-controls-row">
                  {/* Search Bar */}
                  <div className="mercuriale-search-wrap">
                    <Search
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '0.85rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Filtrer un produit par nom (ex: tomate, oignon, persil, banane...)"
                      value={dailySearchQuery}
                      onChange={(e) => setDailySearchQuery(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '2.3rem', fontSize: '0.88rem', height: '40px' }}
                    />
                  </div>

                  {/* Batch Adjusters */}
                  <div className="mercuriale-batch-wrap">
                    <span className="mercuriale-batch-label">
                      Ajustement global :
                    </span>
                    <div className="mercuriale-batch-group">
                      <button
                        type="button"
                        onClick={() => handleBatchAdjustCategory(-1)}
                        className="batch-btn minus"
                        title="Diminuer 1 DH à tous les produits affichés"
                      >
                        -1.00 DH
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchAdjustCategory(1)}
                        className="batch-btn plus"
                        title="Ajouter 1 DH à tous les produits affichés"
                      >
                        +1.00 DH
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchAdjustCategory(2)}
                        className="batch-btn plus"
                        title="Ajouter 2 DH à tous les produits affichés"
                      >
                        +2.00 DH
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Produce Cards Grid for Daily Pricing */}
            <div className="daily-pricing-grid">
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
                              onClick={() => handleOpenInvoiceForOrder(ord)}
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

            {/* Quick Global Invoice Selector by Client */}
            {businesses.length > 0 && orders.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  padding: '0.85rem 1.15rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <FileText size={18} style={{ color: '#166534' }} />
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#14532d' }}>
                      Facture Globale par Client (Multi-Commandes)
                    </strong>
                    <div style={{ fontSize: '0.76rem', color: '#166534' }}>
                      Regroupe toutes les commandes d'un client dans une seule facture officielle
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <select
                    onChange={(e) => {
                      const bizId = e.target.value;
                      if (!bizId) return;
                      const targetBiz = businesses.find((b) => b.id === bizId);
                      if (targetBiz) handleOpenGlobalInvoiceForClient(targetBiz);
                      e.target.value = '';
                    }}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      border: '1.5px solid #86efac',
                      backgroundColor: '#ffffff',
                      color: '#166534',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Sélectionner un client pour générer sa facture globale...</option>
                    {businesses.map((biz) => {
                      const cOrders = orders.filter((o) => {
                        if (o.businessId && o.businessId === biz.id) return true;
                        if (o.customerId && o.customerId === biz.ownerId) return true;
                        const bPhone = normalizePhone(biz.phone || '');
                        const oPhone = normalizePhone(o.customerPhone || '');
                        return Boolean(bPhone && oPhone && bPhone === oPhone);
                      });
                      if (cOrders.length === 0) return null;
                      return (
                        <option key={biz.id} value={biz.id}>
                          {biz.businessName} ({cOrders.length} commande{cOrders.length > 1 ? 's' : ''} • {cOrders.reduce((s, o) => s + (Number(o.total) || 0), 0).toFixed(0)} DH)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}

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
                            onClick={() => handleOpenInvoiceForOrder(ord)}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-900)', margin: 0, fontWeight: 700 }}>
                    Clients & Établissements Inscrits ({businesses.length})
                  </h3>
                  {pendingBusinessesCount > 0 && (
                    <span className="badge badge-status-pending" style={{ fontSize: '0.75rem' }}>
                      {pendingBusinessesCount} en attente de validation
                    </span>
                  )}
                  {syncNotice && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        color: '#15803d',
                        backgroundColor: '#dcfce7',
                        border: '1px solid #bbf7d0',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle size={13} />
                      <span>{syncNotice.message} ({syncNotice.time})</span>
                    </span>
                  )}
                </div>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Consultez, contactez en 1 clic (WhatsApp & Appel direct) et gérez l'ensemble des comptes clients de la plateforme.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setIsAddClientModalOpen(true)}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem' }}
                >
                  <UserPlus size={15} />
                  <span>+ Nouveau Client Pro</span>
                </button>

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

              {/* Filtre En Ligne (avec point vert pulsant) */}
              <button
                onClick={() => setClientStatusFilter('online')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  border: clientStatusFilter === 'online' ? '2px solid #16a34a' : '1px solid var(--border-light)',
                  backgroundColor: clientStatusFilter === 'online' ? '#ecfdf5' : '#ffffff',
                  color: clientStatusFilter === 'online' ? '#15803d' : 'var(--text-main)',
                  fontWeight: clientStatusFilter === 'online' ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <span className="presence-dot online" />
                <span>En Ligne</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    backgroundColor: clientStatusFilter === 'online' ? '#16a34a' : '#dcfce7',
                    color: clientStatusFilter === 'online' ? '#ffffff' : '#166534',
                    borderRadius: '10px',
                    padding: '0.05rem 0.45rem',
                    fontWeight: 700,
                  }}
                >
                  {onlineBusinessesCount}
                </span>
              </button>

              {/* Filtre Hors Ligne */}
              <button
                onClick={() => setClientStatusFilter('offline')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  border: clientStatusFilter === 'offline' ? '2px solid #64748b' : '1px solid var(--border-light)',
                  backgroundColor: clientStatusFilter === 'offline' ? '#f1f5f9' : '#ffffff',
                  color: clientStatusFilter === 'offline' ? '#334155' : 'var(--text-main)',
                  fontWeight: clientStatusFilter === 'offline' ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <span className="presence-dot offline" />
                <span>Hors Ligne</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    backgroundColor: clientStatusFilter === 'offline' ? '#64748b' : '#f1f5f9',
                    color: clientStatusFilter === 'offline' ? '#ffffff' : '#475569',
                    borderRadius: '10px',
                    padding: '0.05rem 0.45rem',
                    fontWeight: 700,
                  }}
                >
                  {offlineBusinessesCount}
                </span>
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
                        <th>Présence / Dernière visite</th>
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
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                    <strong style={{ fontSize: '0.95rem', color: 'var(--primary-900)' }}>
                                      {biz.businessName}
                                    </strong>
                                    {isClientNew(biz.createdAt) && (
                                      <span
                                        style={{
                                          fontSize: '0.62rem',
                                          backgroundColor: '#16a34a',
                                          color: '#ffffff',
                                          fontWeight: 800,
                                          padding: '0.1rem 0.45rem',
                                          borderRadius: '4px',
                                          letterSpacing: '0.04em',
                                          display: 'inline-block',
                                        }}
                                      >
                                        NOUVEAU
                                      </span>
                                    )}
                                  </div>
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

                            {/* Présence & Dernière visite en ligne */}
                            <td>
                              {(() => {
                                const presence = formatClientPresence(biz.lastSeenAt);
                                return (
                                  <div>
                                    <div
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.45rem',
                                        padding: '0.22rem 0.65rem',
                                        borderRadius: '12px',
                                        backgroundColor: presence.isOnline ? '#ecfdf5' : '#f8fafc',
                                        border: `1px solid ${presence.isOnline ? '#a7f3d0' : '#e2e8f0'}`,
                                      }}
                                    >
                                      <span className={`presence-dot ${presence.isOnline ? 'online' : 'offline'}`} />
                                      <span
                                        style={{
                                          fontSize: '0.76rem',
                                          fontWeight: 700,
                                          color: presence.isOnline ? '#065f46' : '#475569',
                                        }}
                                      >
                                        {presence.statusText}
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '0.72rem',
                                        color: presence.isOnline ? '#047857' : '#64748b',
                                        marginTop: '0.25rem',
                                        fontWeight: presence.isOnline ? 600 : 400,
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {presence.detailText}
                                    </div>
                                  </div>
                                );
                              })()}
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
                                  onClick={() => handleOpenGlobalInvoiceForClient(biz)}
                                  className="btn btn-secondary btn-sm"
                                  style={{
                                    color: '#166534',
                                    borderColor: '#bbf7d0',
                                    backgroundColor: '#f0fdf4',
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.6rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    fontWeight: 700,
                                  }}
                                  title="Générer la facture globale regroupant toutes les commandes de ce client"
                                >
                                  <FileText size={12} /> Facture Globale
                                </button>
                                <button
                                  onClick={() => handleOpenPasswordModal(biz)}
                                  className="btn btn-secondary btn-sm"
                                  style={{
                                    color: '#0369a1',
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.55rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                  }}
                                  title="Consulter ou modifier le mot de passe"
                                >
                                  <KeyRound size={12} /> Mot de passe
                                </button>
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '0.96rem', color: 'var(--primary-900)' }}>
                                  {biz.businessName}
                                </strong>
                                {isClientNew(biz.createdAt) && (
                                  <span
                                    style={{
                                      fontSize: '0.62rem',
                                      backgroundColor: '#16a34a',
                                      color: '#ffffff',
                                      fontWeight: 800,
                                      padding: '0.08rem 0.4rem',
                                      borderRadius: '4px',
                                      letterSpacing: '0.04em',
                                      display: 'inline-block',
                                    }}
                                  >
                                    NOUVEAU
                                  </span>
                                )}
                              </div>
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

                        {/* Mobile Presence Status Banner (En Ligne / Hors Ligne) */}
                        {(() => {
                          const presence = formatClientPresence(biz.lastSeenAt);
                          return (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.42rem 0.7rem',
                                backgroundColor: presence.isOnline ? '#f0fdf4' : '#f8fafc',
                                border: `1px solid ${presence.isOnline ? '#bbf7d0' : '#e2e8f0'}`,
                                borderRadius: '8px',
                                margin: '0.6rem 0',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <span className={`presence-dot ${presence.isOnline ? 'online' : 'offline'}`} />
                                <span
                                  style={{
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    color: presence.isOnline ? '#15803d' : '#475569',
                                  }}
                                >
                                  {presence.statusText}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.73rem',
                                  color: presence.isOnline ? '#166534' : '#64748b',
                                  fontWeight: presence.isOnline ? 700 : 500,
                                }}
                              >
                                {presence.detailText}
                              </span>
                            </div>
                          );
                        })()}

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
                            onClick={() => handleOpenGlobalInvoiceForClient(biz)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              color: '#166534',
                              borderColor: '#bbf7d0',
                              backgroundColor: '#f0fdf4',
                              fontSize: '0.75rem',
                              padding: '0.3rem 0.65rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontWeight: 700,
                            }}
                            title="Facture globale du client"
                          >
                            <FileText size={12} /> Facture Globale
                          </button>
                          <button
                            onClick={() => handleOpenPasswordModal(biz)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              color: '#0369a1',
                              fontSize: '0.75rem',
                              padding: '0.3rem 0.65rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                            title="Consulter ou modifier le mot de passe"
                          >
                            <KeyRound size={12} /> Mot de passe
                          </button>
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

        {/* TAB 5: COMPANY SETTINGS & OFFICIAL CONTACTS (ADMIN ONLY) */}
        {activeTab === 'settings' && (
          <div className="admin-settings-tab">
            {/* Header info */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--primary-100)',
                      color: 'var(--primary-800)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SlidersHorizontal size={17} />
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-900)', margin: 0 }}>
                    Coordonnées Officielles & Paramètres de l'Entreprise
                  </h2>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0, maxWidth: '780px' }}>
                  Espace réservé exclusivement à l'administrateur. Renseignez ici les véritables coordonnées de Pont Agricole (numéros de contact, WhatsApp direct, adresse du dépôt, heure limite de commande et mentions fiscales marocaines pour les factures). Les visiteurs ne voient aucune donnée fictive.
                </p>
              </div>
            </div>

            {settingsSaveNotice && (
              <div
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--emerald-50)',
                  border: '1px solid var(--emerald-200)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.5rem',
                  color: 'var(--emerald-900)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <CheckCircle size={18} color="var(--emerald-600)" />
                <span>{settingsSaveNotice}</span>
              </div>
            )}

            <form onSubmit={handleSaveCompanySettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Section 1: Contact & Coordonnées Publiques */}
              <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
                  <Phone size={17} color="var(--primary-700)" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--primary-900)' }}>
                    Canaux de Contact & Coordonnées Publiques
                  </h3>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Ces informations s'affichent dynamiquement dans le pied de page du site et les boutons de contact direct.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      Nom Commercial
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={settingsForm.companyName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, companyName: e.target.value })}
                      placeholder="Pont Agricole"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      Slogan / Activité
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={settingsForm.tagline}
                      onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                      placeholder="Centrale d'Achat & Approvisionnement Maraîcher B2B"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      Téléphone Standard Fixe ou Mobile
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={settingsForm.phone}
                      onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                      placeholder="ex: +212 5 22 XX XX XX"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      Numéro WhatsApp Pro (Commandes directes)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={settingsForm.whatsapp}
                      onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                      placeholder="ex: +212 6 XX XX XX XX"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      Email Professionnel
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      value={settingsForm.email}
                      onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                      placeholder="ex: contact@votre-domaine.ma"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      Ville du Siège / Dépôt Principal
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={settingsForm.city || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, city: e.target.value })}
                      placeholder="ex: Casablanca"
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      Adresse Physique / Dépôt
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={settingsForm.address}
                      onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                      placeholder="ex: Zone Industrielle, Quartier..."
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Horaires de Commande & Logistique */}
              <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
                  <Clock size={17} color="var(--primary-700)" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--primary-900)' }}>
                    Paramètres de Commandes & Seuils de Livraison
                  </h3>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Ajustez l'heure de clôture quotidienne et les montants minimaux exigés aux clients.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      Heure Limite de Commande Quotidienne
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={settingsForm.orderCutoffTime || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, orderCutoffTime: e.target.value })}
                      placeholder="ex: 21h00 (laisser vide si pas de limite fixe)"
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                      Affiché sur l'en-tête du site si renseigné.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      Montant Minimum de Commande par Défaut (MAD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={settingsForm.minOrderDefault || 0}
                      onChange={(e) => setSettingsForm({ ...settingsForm, minOrderDefault: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      Seuil de Livraison Gratuite (MAD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={settingsForm.freeDeliveryThreshold || 0}
                      onChange={(e) => setSettingsForm({ ...settingsForm, freeDeliveryThreshold: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Mentions Fiscales & Légales Marocaines */}
              <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
                  <FileText size={17} color="var(--primary-700)" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--primary-900)' }}>
                    Mentions Fiscales & Légales Marocaines (Facturation B2B)
                  </h3>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Ces identifiants officiels sont imprimés sur les factures commerciales générées depuis l'onglet Commandes.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      ICE (Identifiant Commun de l’Entreprise - 15 chiffres)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={settingsForm.ice || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, ice: e.target.value })}
                      placeholder="ex: 00XXXXXXXXXXXXX"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      Registre du Commerce (RC)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={settingsForm.rc || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, rc: e.target.value })}
                      placeholder="ex: 123456 Casablanca"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      Identifiant Fiscal (IF)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={settingsForm.ifCode || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, ifCode: e.target.value })}
                      placeholder="ex: 12345678"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      N° de Patente
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={settingsForm.patente || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, patente: e.target.value })}
                      placeholder="ex: 37492018"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      N° d'Affiliation CNSS
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={settingsForm.cnss || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, cnss: e.target.value })}
                      placeholder="ex: 4829105"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      Capital Social (en DH)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={settingsForm.capital || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, capital: e.target.value })}
                      placeholder="ex: 100.000"
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      RIB Bancaire (pour virements professionnels des clients)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={settingsForm.rib || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, rib: e.target.value })}
                      placeholder="ex: Nom de Banque - 007 780 0001234567890123 45"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="btn btn-primary btn-lg"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minWidth: '220px',
                    justifyContent: 'center',
                  }}
                >
                  {savingSettings ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Enregistrement en cours...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Enregistrer les Informations</span>
                    </>
                  )}
                </button>
              </div>
            </form>
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
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
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

      {/* MODAL: AJOUTER UN NOUVEAU CLIENT MANUELLEMENT */}
      {isAddClientModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddClientModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--primary-100)', color: 'var(--primary-800)', borderRadius: '8px' }}>
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--primary-900)' }}>
                    Ajouter un Nouveau Client Pro
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Création manuelle d'un compte établissement validé (commande par téléphone ou WhatsApp).
                  </p>
                </div>
              </div>
            </div>

            {addClientError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{addClientError}</span>
              </div>
            )}

            <form onSubmit={handleManualAddClient}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    Nom de l'établissement *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Restaurant Le Marrakech"
                    value={newClientForm.businessName}
                    onChange={(e) => setNewClientForm({ ...newClientForm, businessName: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    Nom du Responsable / Contact *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Karim Benali"
                    value={newClientForm.contactName}
                    onChange={(e) => setNewClientForm({ ...newClientForm, contactName: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    Type d'établissement *
                  </label>
                  <select
                    value={newClientForm.businessType}
                    onChange={(e) => setNewClientForm({ ...newClientForm, businessType: e.target.value as BusinessType })}
                    className="form-input"
                  >
                    <option value="restaurant">Restaurant / Brasserie</option>
                    <option value="hotel">Hôtel / Palace</option>
                    <option value="cafe">Café / Salon de Thé</option>
                    <option value="caterer">Traiteur / Événementiel</option>
                    <option value="supermarket">Supermarché / Épicerie</option>
                    <option value="other">Autre Professionnel CHR</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    N° Téléphone (Appels & WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 06 61 23 45 67"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    Ville *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Casablanca"
                    value={newClientForm.city}
                    onChange={(e) => setNewClientForm({ ...newClientForm, city: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    Adresse de livraison précise *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 24 Rue de Normandie, Quartier Gauthier"
                    value={newClientForm.deliveryAddress}
                    onChange={(e) => setNewClientForm({ ...newClientForm, deliveryAddress: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Adresse Email (optionnelle)
                </label>
                <input
                  type="email"
                  placeholder="contact@restaurant.ma"
                  value={newClientForm.email}
                  onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={addingClient}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem' }}
                  disabled={addingClient}
                >
                  <UserPlus size={16} />
                  <span>{addingClient ? 'Création en cours...' : 'Enregistrer le Client Pro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Réinitialisation / Consultation Mot de Passe Client */}
      {passwordResetClient && (
        <div className="modal-backdrop" onClick={() => setPasswordResetClient(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '440px', borderRadius: '16px', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-900)', margin: 0 }}>
                  Gestion Mot de Passe
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', margin: 0 }}>
                  {passwordResetClient.businessName} ({passwordResetClient.contactName || 'Responsable'})
                </p>
              </div>
              <button
                onClick={() => setPasswordResetClient(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem' }}>
              {/* Infos Client */}
              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.82rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#64748b' }}>Téléphone :</span>
                  <strong style={{ color: '#0f172a' }}>{passwordResetClient.phone || 'Non renseigné'}</strong>
                </div>
                {passwordResetClient.username && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#64748b' }}>Nom d'utilisateur :</span>
                    <strong style={{ color: '#166534' }}>@{passwordResetClient.username}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Ville :</span>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>{passwordResetClient.city}</span>
                </div>
              </div>

              {/* Champ Mot de Passe */}
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Nouveau Mot de Passe *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Ex: pass1234"
                    className="form-input"
                    style={{ paddingRight: '40px', fontSize: '0.9rem', height: '42px', fontWeight: 600, width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      padding: '4px',
                    }}
                    title={showPasswordText ? 'Masquer' : 'Afficher'}
                  >
                    {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                  Minimum 4 caractères. Le client pourra immédiatement se connecter avec ce mot de passe.
                </div>
              </div>

              {passwordNotice && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    marginBottom: '1rem',
                    backgroundColor: passwordNotice.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: passwordNotice.type === 'success' ? '#166534' : '#991b1b',
                    fontWeight: 600,
                  }}
                >
                  {passwordNotice.message}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={handleSaveClientPassword}
                  disabled={savingNewPassword || !newPasswordInput.trim()}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', backgroundColor: '#166534', height: '40px', fontWeight: 700 }}
                >
                  {savingNewPassword ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
                </button>

                {/* Envoi direct sur WhatsApp */}
                {(() => {
                  const cleanPhone = (passwordResetClient.phone || '').replace(/[^0-9]/g, '');
                  const waPhone = cleanPhone.startsWith('0')
                    ? `212${cleanPhone.slice(1)}`
                    : cleanPhone.startsWith('212')
                    ? cleanPhone
                    : `212${cleanPhone}`;
                  const waMsg = encodeURIComponent(
                    `Bonjour ${passwordResetClient.contactName || ''},\nVotre mot de passe pour accéder à la plateforme Pont Agricole (${passwordResetClient.businessName}) a été mis à jour.\n\nIdentifiant : ${passwordResetClient.username ? `@${passwordResetClient.username}` : passwordResetClient.phone}\nMot de passe : ${newPasswordInput.trim()}\n\nVous pouvez vous connecter dès maintenant sur notre site.`
                  );

                  return cleanPhone && newPasswordInput.trim() ? (
                    <a
                      href={`https://wa.me/${waPhone}?text=${waMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        backgroundColor: '#25D366',
                        color: '#ffffff',
                        fontWeight: 700,
                        textDecoration: 'none',
                        border: 'none',
                        height: '40px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <MessageCircle size={15} /> Envoyer sur WhatsApp en 1 clic
                    </a>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B2B Commercial Invoice / Delivery Slip Modal */}
      {(selectedInvoiceOrder || selectedInvoiceOrders) && (
        <InvoiceModal
          order={selectedInvoiceOrder}
          orders={selectedInvoiceOrders}
          clientBusiness={selectedInvoiceClient}
          onClose={() => {
            setSelectedInvoiceOrder(null);
            setSelectedInvoiceOrders(null);
            setSelectedInvoiceClient(null);
          }}
          settings={settings}
        />
      )}
    </div>
  );
};
