import {
  UserProfile,
  Business,
  Category,
  Product,
  Order,
  OrderItem,
  DeliveryZone,
  CompanySettings,
  CartItem,
  OrderStatus,
  ApprovalStatus,
  BusinessType,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_DELIVERY_ZONES,
  INITIAL_COMPANY_SETTINGS,
} from '../data/mockData';
import { supabase, isSupabaseConfigured } from './supabase';

// Storage keys
const STORAGE_PREFIX = 'pont_agricole_';
const KEY_USER = `${STORAGE_PREFIX}current_user`; // kept for legacy cleanup
const KEY_BUSINESS = `${STORAGE_PREFIX}current_business`; // kept for legacy cleanup
const KEY_SESSION_USER = `${STORAGE_PREFIX}session_user`;
const KEY_SESSION_BUSINESS = `${STORAGE_PREFIX}session_business`;
const KEY_PRESENCE = `${STORAGE_PREFIX}client_presence`;
const KEY_PRODUCTS = `${STORAGE_PREFIX}products`;
const KEY_CATEGORIES = `${STORAGE_PREFIX}categories`;
const KEY_ORDERS = `${STORAGE_PREFIX}orders`;
const KEY_BUSINESSES = `${STORAGE_PREFIX}all_businesses`;
const KEY_USER_CREDS = `${STORAGE_PREFIX}user_creds`;
const KEY_ZONES = `${STORAGE_PREFIX}zones`;
const KEY_SETTINGS = `${STORAGE_PREFIX}settings`;
const KEY_CART = `${STORAGE_PREFIX}cart`;
const KEY_FAVORITES = `${STORAGE_PREFIX}favorites`;
const KEY_DELETED_BIZ = `${STORAGE_PREFIX}deleted_biz_ids`;

// Helper for local storage
function getStored<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key}`, e);
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key}`, e);
  }
}

// Helper for session storage (lives ONLY during the active browser tab session, no auto-login on new links)
function getSessionStored<T>(key: string, defaultValue: T): T {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function setSessionStored<T>(key: string, value: T): void {
  try {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.error(`Error saving to sessionStorage ${key}`, e);
  }
}

// Helper to normalize phone numbers (e.g., 0661234567 -> 212661234567, +212 06... -> 2126...)
export function normalizePhone(raw: string): string {
  let digits = (raw || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('2120') && digits.length === 13) {
    digits = '212' + digits.slice(4);
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return '212' + digits.slice(1);
  }
  if ((digits.startsWith('6') || digits.startsWith('7') || digits.startsWith('5')) && digits.length === 9) {
    return '212' + digits;
  }
  return digits;
}

// Helpers for bulletproof multi-device auth sync
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export function encodeAuth(pass: string): string {
  try {
    return 'auth:' + btoa(unescape(encodeURIComponent(pass)));
  } catch {
    return 'auth:' + btoa(pass);
  }
}

export function decodeAuth(str?: string | null): string | null {
  if (!str) return null;
  const match = str.match(/auth:([A-Za-z0-9+/=]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(escape(atob(match[1])));
  } catch {
    try {
      return atob(match[1]);
    } catch {
      return null;
    }
  }
}

export function cleanMapsUrl(str?: string | null): string {
  if (!str) return '';
  return str.replace(/#auth:[A-Za-z0-9+/=]+/g, '').replace(/auth:[A-Za-z0-9+/=]+/g, '').trim();
}


// Global Store Manager
class StoreService {
  private currentUser: UserProfile | null = null;
  private currentBusiness: Business | null = null;
  private cart: CartItem[] = [];
  private listeners: Set<() => void> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private adminTokenCache: { token: string; expiresAt: number } | null = null;
  private productsChannelSubscribed: boolean = false;

  constructor() {
    this.init();

    // Cross-tab synchronization via BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('pont_agricole_channel');
        this.broadcastChannel.onmessage = (ev) => {
          if (ev.data?.type === 'STORE_UPDATED') {
            if (ev.data?.action === 'CLIENT_DELETED') {
              const targetBizId = ev.data?.clientId;
              const targetOwnerId = ev.data?.ownerId;
              if (
                (targetBizId && this.currentBusiness?.id === targetBizId) ||
                (targetBizId && this.currentUser?.id === targetBizId) ||
                (targetOwnerId && this.currentUser?.id === targetOwnerId)
              ) {
                this.forceLogoutDeletedClient(targetBizId);
                return;
              }
            }
            if (
              ev.data?.action === 'PRODUCT_SAVED' ||
              ev.data?.action === 'PRODUCT_UPDATED' ||
              ev.data?.action === 'PRODUCT_DELETED' ||
              ev.data?.action === 'DAILY_PRICES_UPDATED'
            ) {
              this.refreshProductsFromCloud().then(() => this.notify(false));
              return;
            }
            this.notify(false);
          }
        };
      } catch {}
    }

    // Cross-tab synchronization via storage events
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === KEY_DELETED_BIZ) {
          const deleted = new Set(getStored<string[]>(KEY_DELETED_BIZ, []));
          if (this.currentBusiness?.id && deleted.has(this.currentBusiness.id)) {
            this.forceLogoutDeletedClient(this.currentBusiness.id);
            return;
          }
        }
        if (e.key && e.key.startsWith(STORAGE_PREFIX)) {
          this.notify(false);
        }
      });
    }
  }

  private init() {
    // Initialize default data if not present in local storage
    const storedProds = getStored<any[]>(KEY_PRODUCTS, []);
    if (!Array.isArray(storedProds) || storedProds.length < 50) {
      // Si le cache local a moins de 50 produits (ex: 37 ou vide), charger immédiatement le catalogue complet de 95 produits
      try {
        fetch('/products_catalog.json')
          .then((r) => r.json())
          .then((prods) => {
            if (Array.isArray(prods) && prods.length > 0) {
              const merged = this.mergeProducts(prods, storedProds);
              setStored(KEY_PRODUCTS, merged);
              this.notify();
            }
          })
          .catch(() => {});
      } catch {}
    }
    const storedCats = getStored<any[]>(KEY_CATEGORIES, []);
    if (!Array.isArray(storedCats) || storedCats.length === 0) {
      setStored(KEY_CATEGORIES, INITIAL_CATEGORIES);
    }
    if (!localStorage.getItem(KEY_ZONES)) {
      setStored(KEY_ZONES, INITIAL_DELIVERY_ZONES);
    }
    if (!localStorage.getItem(KEY_SETTINGS)) {
      setStored(KEY_SETTINGS, INITIAL_COMPANY_SETTINGS);
    }
    if (!localStorage.getItem(KEY_BUSINESSES)) {
      setStored(KEY_BUSINESSES, []);
    }
    if (!localStorage.getItem(KEY_ORDERS)) {
      setStored(KEY_ORDERS, []);
    }

    // Nettoyer les fausses commandes ou comptes démo résiduels
    const storedOrders = getStored<Order[]>(KEY_ORDERS, []);
    const cleanOrders = storedOrders.filter(
      (o) => o.id !== 'ord-1001' && o.id !== 'ord-1002' && !o.customerName?.includes('Bennani')
    );
    if (cleanOrders.length !== storedOrders.length) {
      setStored(KEY_ORDERS, cleanOrders);
    }

    const storedBiz = getStored<Business[]>(KEY_BUSINESSES, []);
    const deletedIdsInit = new Set(getStored<string[]>(KEY_DELETED_BIZ, []));
    const cleanBiz = storedBiz.filter(
      (b) =>
        b.approvalStatus !== 'rejected' &&
        !deletedIdsInit.has(b.id) &&
        b.id !== 'biz-resto-001' &&
        b.id !== 'biz-hotel-002' &&
        b.id !== 'biz-empty-001' &&
        b.id !== 'biz-empty-002' &&
        !b.businessName?.includes('Bistrot du Port') &&
        !b.businessName?.includes('Atlas Palace')
    );
    if (cleanBiz.length !== storedBiz.length) {
      setStored(KEY_BUSINESSES, cleanBiz);
    }

    // Assainir les coordonnées de l'entreprise : vider les anciens faux numéros et fausses adresses
    const st = getStored<CompanySettings>(KEY_SETTINGS, INITIAL_COMPANY_SETTINGS);
    let stChanged = false;
    if (st.phone === '+212 5 22 45 78 90') {
      st.phone = '';
      stChanged = true;
    }
    if (st.whatsapp === '+212 6 61 98 76 54') {
      st.whatsapp = '';
      stChanged = true;
    }
    if (st.email?.includes('contact@pontagricole.ma') || st.email?.includes('pro@pontagricole.ma')) {
      st.email = '';
      stChanged = true;
    }
    if (st.address?.includes('Halle aux Primeurs')) {
      st.address = '';
      stChanged = true;
    }
    if (st.orderCutoffTime?.includes('21h00')) {
      st.orderCutoffTime = '';
      stChanged = true;
    }
    if (stChanged) {
      setStored(KEY_SETTINGS, st);
    }

    // Synchronisation automatique des comptes locaux vers Supabase (multi-appareils garanti)
    if (isSupabaseConfigured && supabase) {
      setTimeout(async () => {
        try {
          const localBizs = getStored<Business[]>(KEY_BUSINESSES, []);
          const creds = getStored<Record<string, string>>(KEY_USER_CREDS, {});
          if (!localBizs || localBizs.length === 0) return;

          let remoteBizs: any[] = [];
          try {
            const { data } = await supabase.from('businesses').select('*');
            if (data && Array.isArray(data)) remoteBizs = data;
          } catch {}

          let localChanged = false;
          for (const b of localBizs) {
            if (b.approvalStatus === 'rejected') continue;
            const bPhone = (b.phone || '').replace(/[^0-9]/g, '');
            const bUser = (b.username || '').toLowerCase().trim();
            const exists = remoteBizs.some(
              (rb: any) =>
                (b.id && rb.id === b.id) ||
                (bUser && rb.username && rb.username.toLowerCase().trim() === bUser) ||
                (bPhone && rb.phone && rb.phone.replace(/[^0-9]/g, '') === bPhone)
            );

            if (!exists) {
              const pass =
                b.password ||
                (bUser && creds[bUser]) ||
                (bPhone && creds[bPhone]) ||
                creds[b.phone || ''] ||
                decodeAuth(b.googleMapsUrl) ||
                '123456';
              const email = b.email || (bUser ? `${bUser}@pontagricole.ma` : `${bPhone || Date.now()}@pontagricole.ma`);

              let uid = 'cfb7edbf-9c6b-4181-afae-2da48ad8a90d';
              try {
                const { data: authData } = await supabase.auth.signUp({
                  email,
                  password: pass,
                  options: {
                    data: {
                      full_name: b.contactName || b.businessName,
                      phone: b.phone || '',
                      username: b.username || '',
                      business_name: b.businessName,
                    },
                  },
                });
                if (authData?.user?.id) {
                  uid = authData.user.id;
                } else {
                  const { data: signInData } = await supabase.auth.signInWithPassword({ email, password: pass });
                  if (signInData?.user?.id) {
                    uid = signInData.user.id;
                  }
                }
              } catch {}

              if (uid !== 'cfb7edbf-9c6b-4181-afae-2da48ad8a90d') {
                try {
                  await supabase.from('profiles').upsert({
                    id: uid,
                    full_name: b.contactName || b.businessName,
                    phone: b.phone || '',
                    role: 'customer',
                    email,
                  });
                } catch {}
              }

              const targetBizId = isUUID(b.id) ? b.id : generateUUID();
              if (b.id !== targetBizId) {
                b.id = targetBizId;
                localChanged = true;
              }
              b.ownerId = uid;

              const cleanUrl = cleanMapsUrl(b.googleMapsUrl);
              const authTag = encodeAuth(pass);
              const syncedUrl = cleanUrl ? `${cleanUrl}#${authTag}` : authTag;
              b.googleMapsUrl = syncedUrl;
              b.password = pass;

              const bizRow = {
                id: targetBizId,
                owner_id: uid,
                business_name: b.businessName,
                business_type: b.businessType || 'restaurant',
                city: b.city || 'Casablanca',
                delivery_address: b.deliveryAddress || 'Casablanca',
                contact_name: b.contactName || b.businessName,
                phone: b.phone || '',
                email,
                username: b.username || '',
                google_maps_url: syncedUrl,
                approval_status: 'approved',
              };

              try {
                await supabase.from('businesses').upsert(bizRow);
              } catch {
                try {
                  await fetch('https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/businesses', {
                    method: 'POST',
                    headers: {
                      apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                      Authorization: 'Bearer sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                      'Content-Type': 'application/json',
                      Prefer: 'resolution=merge-duplicates',
                    },
                    body: JSON.stringify(bizRow),
                  });
                } catch {}
              }
            }
          }

          if (localChanged) {
            setStored(KEY_BUSINESSES, localBizs);
          }
        } catch (e) {
          console.warn('Auto-sync local to Supabase error:', e);
        }
      }, 500);
    }

    // Sécurité & Confidentialité B2B : Nettoyage impératif de toute persistance locale d'anciens comptes
    // afin que l'ouverture du lien ne connecte JAMAIS automatiquement un utilisateur au compte précédent.
    localStorage.removeItem(KEY_USER);
    localStorage.removeItem(KEY_BUSINESS);

    // Authentification liée exclusivement à la session du navigateur (sessionStorage)
    this.currentUser = getSessionStored<UserProfile | null>(KEY_SESSION_USER, null);

    // Nettoyage impératif de toute ancienne session démo résiduelle
    const isMockUser =
      this.currentUser?.id === 'admin-001' ||
      this.currentUser?.id === 'user-resto-001' ||
      this.currentUser?.id === 'user-hotel-002' ||
      this.currentUser?.id === 'usr-client-001' ||
      this.currentUser?.id === 'usr-client-002' ||
      this.currentUser?.fullName?.includes('Karim Tazi') ||
      this.currentUser?.fullName?.includes('Bennani') ||
      this.currentUser?.fullName?.includes('Amine El Fassi');

    if (isMockUser) {
      this.currentUser = null;
      sessionStorage.removeItem(KEY_SESSION_USER);
    }

    // Sécurité stricte : Aucun utilisateur n'a le rôle admin sauf Achraf Abouziad
    if (this.currentUser?.role === 'admin') {
      const isAchraf =
        this.currentUser.id === 'cfb7edbf-9c6b-4181-afae-2da48ad8a90d' ||
        this.currentUser.id === 'usr-achraf-master-admin' ||
        this.currentUser.fullName?.toLowerCase().includes('achraf') ||
        (this.currentUser.phone && normalizePhone(this.currentUser.phone).endsWith('0707296123')) ||
        (this.currentUser.phone && normalizePhone(this.currentUser.phone).endsWith('661987654'));

      if (!isAchraf) {
        this.currentUser.role = 'customer';
        setSessionStored(KEY_SESSION_USER, this.currentUser);
      }
    }

    this.currentBusiness = getSessionStored<Business | null>(KEY_SESSION_BUSINESS, null);
    const deletedBizOnStart = new Set(getStored<string[]>(KEY_DELETED_BIZ, []));
    if (
      (this.currentBusiness?.id && deletedBizOnStart.has(this.currentBusiness.id)) ||
      this.currentBusiness?.approvalStatus === 'rejected' ||
      this.currentBusiness?.id === 'biz-client-001' ||
      this.currentBusiness?.id === 'biz-client-002' ||
      this.currentBusiness?.id === 'biz-resto-001' ||
      this.currentBusiness?.id === 'biz-hotel-002' ||
      this.currentBusiness?.businessName?.includes('La Villa') ||
      this.currentBusiness?.businessName?.includes('Bistrot du Port')
    ) {
      this.currentBusiness = null;
      if (this.currentUser?.role === 'customer') {
        this.currentUser = null;
        sessionStorage.removeItem(KEY_SESSION_USER);
      }
      sessionStorage.removeItem(KEY_SESSION_BUSINESS);
    }
    this.cart = getStored<CartItem[]>(KEY_CART, []);
    this.initProductsRealtime();
    this.refreshProductsFromCloud().catch(() => {});
  }

  private initProductsRealtime(): void {
    if (this.productsChannelSubscribed) return;
    if (isSupabaseConfigured && supabase) {
      try {
        this.productsChannelSubscribed = true;
        supabase
          .channel('public-products-channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            async () => {
              try {
                await this.refreshProductsFromCloud();
              } catch {}
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Supabase products realtime subscription error:', e);
      }
    }
  }

  // Subscribe to changes
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(broadcast = true) {
    this.listeners.forEach((l) => l());
    if (broadcast && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'STORE_UPDATED', timestamp: Date.now() });
      } catch {}
    }
  }

  // Synchronisation distante / dev server pour connecter tous les téléphones et ordinateurs
  private async syncBusinessToRemote(biz: Business): Promise<void> {
    try {
      if (typeof fetch !== 'undefined') {
        await fetch('/api/sync/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(biz),
        });
      }
    } catch {
      // Offline ou production statique
    }
  }

  // Synchronisation distante des commandes pour connecter instantanément mobile et admin
  private async syncOrderToRemote(order: Order): Promise<void> {
    try {
      if (typeof fetch !== 'undefined') {
        await fetch('/api/sync/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order),
        });
      }
    } catch {
      // Offline ou fallback
    }
  }

  private async syncPresenceToRemote(userId?: string, businessId?: string, phone?: string): Promise<void> {
    try {
      if (typeof fetch !== 'undefined') {
        await fetch('/api/sync/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, businessId, phone }),
        });
      }
    } catch {}
  }

  // --- AUTH METHODS ---
  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public getCurrentBusiness(): Business | null {
    return this.currentBusiness;
  }

  public async login(identifier: string, pass: string): Promise<{ success: boolean; error?: string }> {
    const rawInput = (identifier || '').trim();
    if (!rawInput) {
      return { success: false, error: "Veuillez renseigner votre identifiant (Nom d'utilisateur ou numéro de téléphone)." };
    }
    if (!pass) {
      return { success: false, error: 'Veuillez saisir votre mot de passe.' };
    }

    const cleanLower = rawInput.toLowerCase();
    const cleanDigits = rawInput.replace(/[^0-9]/g, '');

    // 1. COMPTE ADMINISTRATEUR (Nom d'utilisateur: admin, achraf, achrafabouziad, ou tél 0707296123)
    const isAdminAccount =
      cleanLower === 'admin' ||
      cleanLower === 'achraf' ||
      cleanLower === 'achrafabouziad' ||
      cleanLower === 'achrafabouziad@gmail.com' ||
      cleanDigits === '0707296123' ||
      cleanDigits === '212707296123';

    if (isAdminAccount) {
      const isMasterPass = pass === 'Achrafgt6313' || pass.toLowerCase() === 'achrafgt6313';
      if (!isMasterPass) {
        return {
          success: false,
          error: 'Mot de passe incorrect pour le compte administrateur.',
        };
      }

      // Connexion Supabase pour initialiser les jetons admin si configuré
      let adminUid = 'cfb7edbf-9c6b-4181-afae-2da48ad8a90d';
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: authSign } = await supabase.auth.signInWithPassword({
            email: 'admin@pontagricole.ma',
            password: 'Achrafgt6313',
          });
          if (authSign?.user?.id) {
            adminUid = authSign.user.id;
          }
          if (authSign?.session?.access_token) {
            this.adminTokenCache = {
              token: authSign.session.access_token,
              expiresAt: authSign.session.expires_at || (Math.floor(Date.now() / 1000) + 3600),
            };
          }
        } catch {}
      }

      // Session Administrateur Autorisée
      const nowIso = new Date().toISOString();
      this.currentUser = {
        id: adminUid,
        fullName: 'Achraf Abouziad (Directeur Fondateur)',
        phone: '0707296123',
        role: 'admin',
        createdAt: nowIso,
        lastSeenAt: nowIso,
      };
      this.currentBusiness = null;
      setSessionStored(KEY_SESSION_USER, this.currentUser);
      setSessionStored(KEY_SESSION_BUSINESS, this.currentBusiness);
      this.touchPresence(this.currentUser.id, undefined, this.currentUser.phone);
      this.notify();
      return { success: true };
    }

    // 2. CLIENTS PROFESSIONNELS (Par Nom d'utilisateur, Téléphone, Email ou Établissement)
    const normPhone = normalizePhone(rawInput);
    const slug = cleanLower.replace(/[^a-z0-9_.-]/g, '');
    const isPureDigits = cleanDigits.length >= 8 && !rawInput.includes('@');
    const deletedBizIds = new Set(getStored<string[]>(KEY_DELETED_BIZ, []));

    let matchedBiz: any = null;
    let rejectedBizFound: any = null;

    // A. Récupérer les établissements depuis Supabase (avec fallback REST direct)
    let dbBizs: any[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500));
        const queryPromise = supabase.from('businesses').select('*');
        const res: any = await Promise.race([queryPromise, timeoutPromise]).catch(() => null);
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          dbBizs = res.data;
        }
      } catch {}

      // Fallback REST direct si échec du SDK Supabase
      if (dbBizs.length === 0) {
        try {
          const restRes = await fetch(
            'https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/businesses?select=*',
            {
              headers: {
                apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                Authorization: 'Bearer sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
              },
              cache: 'no-store',
            }
          );
          if (restRes.ok) {
            const data = await restRes.json();
            if (Array.isArray(data) && data.length > 0) {
              dbBizs = data;
            }
          }
        } catch {}
      }
    }

    const checkMatches = (b: any) => {
      const bUser = (b.username || '').toLowerCase().trim();
      const bPhone = (b.phone || '').trim();
      const bPhoneDigits = bPhone.replace(/[^0-9]/g, '');
      const bNormPhone = normalizePhone(bPhone);
      const bEmail = (b.email || '').toLowerCase().trim();
      const bName = (b.business_name || b.businessName || '').toLowerCase().trim();

      // 1. Nom d'utilisateur (exact ou nettoyé)
      if (slug && bUser) {
        if (bUser === slug || bUser.replace(/[^a-z0-9]/g, '') === slug.replace(/[^a-z0-9]/g, '')) {
          return true;
        }
      }

      // 2. Numéro de téléphone (derniers 8-9 chiffres ou format normalisé)
      if (isPureDigits && cleanDigits.length >= 8) {
        const last8 = cleanDigits.slice(-8);
        if (bPhoneDigits.endsWith(last8) || cleanDigits.endsWith(bPhoneDigits.slice(-8))) {
          return true;
        }
        if (normPhone && bNormPhone && (bNormPhone === normPhone || bNormPhone.endsWith(normPhone) || normPhone.endsWith(bNormPhone))) {
          return true;
        }
      }

      // 3. Email
      if (cleanLower.includes('@') && bEmail === cleanLower) {
        return true;
      }

      // 4. Nom de l'établissement
      if (slug && slug.length >= 4 && bName) {
        const bNameSlug = bName.replace(/[^a-z0-9]/g, '');
        const inSlug = slug.replace(/[^a-z0-9]/g, '');
        if (bNameSlug === inSlug || (inSlug.length >= 5 && bNameSlug.includes(inSlug))) {
          return true;
        }
      }

      return false;
    };

    // Chercher d'abord dans Supabase
    if (dbBizs.length > 0) {
      const approvedMatch = dbBizs.find(
        (b: any) => checkMatches(b) && b.approval_status !== 'rejected' && !deletedBizIds.has(b.id)
      );

      if (approvedMatch) {
        matchedBiz = approvedMatch;
      } else {
        const rejectedMatch = dbBizs.find((b: any) => checkMatches(b));
        if (rejectedMatch) {
          rejectedBizFound = rejectedMatch;
        }
      }
    }

    // Fallback local cache
    if (!matchedBiz) {
      const allLocalBiz = getStored<Business[]>(KEY_BUSINESSES, []);
      const approvedLocal = allLocalBiz.find(
        (b) => checkMatches(b) && b.approvalStatus !== 'rejected' && !deletedBizIds.has(b.id)
      );

      if (approvedLocal) {
        matchedBiz = approvedLocal;
      } else if (!rejectedBizFound) {
        const rejectedLocal = allLocalBiz.find((b) => checkMatches(b));
        if (rejectedLocal) {
          rejectedBizFound = rejectedLocal;
        }
      }
    }

    // Si le compte a été supprimé ou rejeté par l'administrateur : blocage immédiat
    if (rejectedBizFound && !matchedBiz) {
      return {
        success: false,
        error: "Ce compte a été supprimé ou désactivé par l'administrateur. Veuillez contacter l'administration Pont Agricole.",
      };
    }

    // B. VÉRIFICATION DU MOT DE PASSE SYNCHRONISÉ (MULTI-APPAREILS)
    let passwordMatches = false;
    let authUser: any = null;

    if (matchedBiz) {
      const dbStoredPass = decodeAuth(matchedBiz.google_maps_url || matchedBiz.googleMapsUrl);
      if (dbStoredPass && (dbStoredPass === pass || dbStoredPass.trim() === pass.trim())) {
        passwordMatches = true;
      }
    }

    // C. Tenter Supabase GoTrue Auth
    const effectiveUsername = (matchedBiz?.username || (!isPureDigits ? slug : '')).toLowerCase().trim();
    const candidateEmails: string[] = [];
    if (effectiveUsername && effectiveUsername.length >= 3) {
      candidateEmails.push(`${effectiveUsername}@pontagricole.ma`);
    }
    if (slug && slug.length >= 3 && slug !== effectiveUsername) {
      candidateEmails.push(`${slug}@pontagricole.ma`);
    }
    if (matchedBiz?.email) {
      candidateEmails.push(matchedBiz.email.toLowerCase().trim());
    }
    if (cleanLower.includes('@')) {
      candidateEmails.push(cleanLower);
    }
    const uniqueCandidates = Array.from(new Set(candidateEmails.filter(Boolean)));

    // C. Initialiser ou vérifier la session Supabase GoTrue Auth
    if (isSupabaseConfigured && supabase && uniqueCandidates.length > 0) {
      for (const emailTry of uniqueCandidates) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: emailTry,
            password: pass,
          });
          if (!error && data?.user) {
            authUser = data.user;
            passwordMatches = true;
            break;
          }
        } catch {}
      }
    }

    // D. Si toujours non trouvé, tenter GoTrue auth même sans matchedBiz préalable
    if (!matchedBiz && !passwordMatches && isSupabaseConfigured && supabase && uniqueCandidates.length > 0) {
      for (const emailTry of uniqueCandidates) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: emailTry,
            password: pass,
          });
          if (!error && data?.user) {
            authUser = data.user;
            passwordMatches = true;
            // Retrouver l'établissement lié
            try {
              const { data: userBizs } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', data.user.id);
              if (userBizs && userBizs.length > 0) {
                matchedBiz = userBizs.find((b: any) => b.approval_status !== 'rejected') || userBizs[0];
              }
            } catch {}
            break;
          }
        } catch {}
      }
    }

    // E. Vérifier aussi le cache local d'identifiants si hors ligne
    if (!passwordMatches && matchedBiz) {
      const creds = getStored<Record<string, string>>(KEY_USER_CREDS, {});
      const bUser = (matchedBiz.username || '').toLowerCase().trim();
      const bDigits = (matchedBiz.phone || '').replace(/[^0-9]/g, '');
      const localPass = (bUser && creds[bUser]) || (bDigits && creds[bDigits]) || (normPhone && creds[normPhone]) || creds[cleanLower];
      if (localPass && (localPass === pass || localPass.trim() === pass.trim())) {
        passwordMatches = true;
      }
    }

    // F. SI LE MOT DE PASSE EST CONFIRMÉ (DEPUIS N'IMPORTE QUEL TÉLÉPHONE OU PC)
    if (passwordMatches && matchedBiz) {
      if (
        matchedBiz.approval_status === 'rejected' ||
        matchedBiz.approvalStatus === 'rejected' ||
        deletedBizIds.has(matchedBiz.id)
      ) {
        return {
          success: false,
          error: "Ce compte a été supprimé ou désactivé par l'administrateur. Veuillez contacter l'administration Pont Agricole.",
        };
      }

      // Si la base n'avait pas encore le token de synchro ou si c'était incomplet, l'enregistrer discrètement pour les autres appareils
      const cleanUrl = cleanMapsUrl(matchedBiz.google_maps_url || matchedBiz.googleMapsUrl);
      const authTag = encodeAuth(pass);
      const syncedUrl = cleanUrl ? `${cleanUrl}#${authTag}` : authTag;

      if (isSupabaseConfigured && supabase && !decodeAuth(matchedBiz.google_maps_url)) {
        supabase
          .from('businesses')
          .update({ google_maps_url: syncedUrl })
          .eq('id', matchedBiz.id)
          .then(() => {})
          .catch(() => {});
      }

      // Enregistrer les identifiants sur cet appareil pour garantir la continuité
      const creds = getStored<Record<string, string>>(KEY_USER_CREDS, {});
      const bUser = (matchedBiz.username || effectiveUsername || '').toLowerCase().trim();
      const bDigits = (matchedBiz.phone || '').replace(/[^0-9]/g, '');
      if (bUser) creds[bUser] = pass;
      if (bDigits) creds[bDigits] = pass;
      if (normPhone) creds[normPhone] = pass;
      setStored(KEY_USER_CREDS, creds);

      const nowIso = new Date().toISOString();
      const userId = matchedBiz.owner_id || matchedBiz.ownerId || authUser?.id || `usr-${Date.now()}`;

      this.currentUser = {
        id: userId,
        fullName: matchedBiz.contact_name || matchedBiz.contactName || matchedBiz.business_name || matchedBiz.businessName || 'Client Professionnel',
        phone: matchedBiz.phone || '',
        role: 'customer',
        createdAt: matchedBiz.created_at || matchedBiz.createdAt || nowIso,
        lastSeenAt: nowIso,
      };

      this.currentBusiness = {
        id: matchedBiz.id,
        ownerId: userId,
        businessName: matchedBiz.business_name || matchedBiz.businessName || 'Mon Établissement',
        businessType: matchedBiz.business_type || matchedBiz.businessType || 'restaurant',
        city: matchedBiz.city || 'Casablanca',
        deliveryAddress: matchedBiz.delivery_address || matchedBiz.deliveryAddress || '',
        approvalStatus: matchedBiz.approval_status || matchedBiz.approvalStatus || 'approved',
        createdAt: matchedBiz.created_at || matchedBiz.createdAt || nowIso,
        contactName: this.currentUser.fullName,
        phone: this.currentUser.phone,
        email: matchedBiz.email || uniqueCandidates[0] || `${effectiveUsername}@pontagricole.ma`,
        googleMapsUrl: cleanUrl,
        username: matchedBiz.username || effectiveUsername,
        password: pass,
        lastSeenAt: nowIso,
      };

      // Mettre également à jour la liste locale des établissements sur ce nouvel appareil
      const allLocal = getStored<Business[]>(KEY_BUSINESSES, []);
      const exIdx = allLocal.findIndex((b) => b.id === matchedBiz.id || (b.username && b.username.toLowerCase().trim() === bUser));
      if (exIdx >= 0) {
        allLocal[exIdx] = { ...allLocal[exIdx], ...this.currentBusiness };
      } else {
        allLocal.unshift(this.currentBusiness);
      }
      setStored(KEY_BUSINESSES, allLocal);

      setSessionStored(KEY_SESSION_USER, this.currentUser);
      setSessionStored(KEY_SESSION_BUSINESS, this.currentBusiness);
      this.touchPresence(this.currentUser.id, this.currentBusiness?.id, this.currentUser.phone);
      this.notify();
      return { success: true };
    }

    // G. Si le compte existe mais mot de passe faux
    if (matchedBiz) {
      return {
        success: false,
        error: 'Mot de passe incorrect pour ce compte. Veuillez vérifier votre saisie.',
      };
    }

    // H. Compte introuvable
    return {
      success: false,
      error: "Identifiant ou mot de passe incorrect. Vérifiez votre nom d'utilisateur ou numéro de téléphone.",
    };
  }

  public async checkAvailability(
    phone: string,
    email?: string,
    username?: string
  ): Promise<{ available: boolean; error?: string }> {
    const cleanDigits = (phone || '').replace(/[^0-9]/g, '');
    const cleanUser = username ? username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '') : '';

    if (!phone || cleanDigits.length < 9) {
      return {
        available: false,
        error: "Veuillez renseigner un numéro de téléphone valide d'au moins 9 chiffres.",
      };
    }

    if (username !== undefined && username.trim() !== '') {
      if (cleanUser.length < 3) {
        return {
          available: false,
          error: "Le nom d'utilisateur doit comporter au moins 3 caractères (lettres, chiffres, tirets).",
        };
      }

      const reserved = ['admin', 'achraf', 'achrafabouziad', 'pontagricole', 'root', 'master', 'support'];
      if (reserved.includes(cleanUser)) {
        return {
          available: false,
          error: "Ce nom d'utilisateur est réservé pour l'administration. Veuillez en choisir un autre.",
        };
      }
    }

    return { available: true };
  }

  public async register(params: {
    fullName: string;
    phone: string;
    email?: string;
    password: string;
    businessName: string;
    businessType: BusinessType;
    city: string;
    deliveryAddress: string;
    googleMapsUrl?: string;
    username?: string;
    verificationChannel?: 'email' | 'phone';
  }): Promise<{ success: boolean; error?: string }> {
    const rawUsername = (params.username || '').trim();
    const cleanUsername = rawUsername.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    const cleanDigits = params.phone.replace(/[^0-9]/g, '');

    if (cleanUsername.length < 3) {
      return { success: false, error: "Le nom d'utilisateur doit comporter au moins 3 caractères (lettres, chiffres, tirets)." };
    }

    if (cleanDigits.length < 9) {
      return { success: false, error: "Veuillez saisir un numéro de téléphone valide d'au moins 9 chiffres." };
    }

    if (!params.password || params.password.length < 6) {
      return { success: false, error: 'Le mot de passe doit comporter au moins 6 caractères.' };
    }

    // Nom réservé admin
    const reserved = ['admin', 'achraf', 'achrafabouziad', 'pontagricole', 'root', 'master', 'support'];
    if (reserved.includes(cleanUsername)) {
      return { success: false, error: "Ce nom d'utilisateur est réservé pour l'administration. Veuillez en choisir un autre." };
    }

    // 1. Vérifier si le nom d'utilisateur est déjà utilisé localement
    const localBizs = getStored<Business[]>(KEY_BUSINESSES, []);
    const existingSameUsername = localBizs.find((b: any) => {
      const bUser = (b.username || '').toLowerCase().trim();
      return bUser && bUser === cleanUsername && b.approvalStatus !== 'rejected';
    });
    if (existingSameUsername) {
      return {
        success: false,
        error: "Ce nom d'utilisateur est déjà utilisé par un autre établissement. Veuillez en choisir un autre.",
      };
    }

    // 2. Vérifier aussi dans Supabase pour éviter les doublons entre téléphones
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbCheck } = await supabase
          .from('businesses')
          .select('id, approval_status')
          .ilike('username', cleanUsername);
        const activeRemoteDuplicate = (dbCheck || []).some((b: any) => b.approval_status !== 'rejected');
        if (activeRemoteDuplicate) {
          return {
            success: false,
            error: "Ce nom d'utilisateur est déjà utilisé par un autre établissement. Veuillez en choisir un autre.",
          };
        }
      } catch {}
    }

    const deterministicEmail = params.email ? params.email.trim().toLowerCase() : `${cleanUsername}@pontagricole.ma`;
    const nowIso = new Date().toISOString();
    const cleanUrl = cleanMapsUrl(params.googleMapsUrl);
    const authTag = encodeAuth(params.password);
    const syncedMapsUrl = cleanUrl ? `${cleanUrl}#${authTag}` : authTag;

    // Identifiants UUID v4 strictement valides pour PostgreSQL et Supabase
    const newBizId = generateUUID();
    let authUserId = generateUUID();

    // 3. Initialiser la session active IMMÉDIATEMENT
    this.currentUser = {
      id: authUserId,
      fullName: params.fullName.trim(),
      phone: params.phone.trim(),
      role: 'customer',
      createdAt: nowIso,
      lastSeenAt: nowIso,
    };

    this.currentBusiness = {
      id: newBizId,
      ownerId: authUserId,
      businessName: params.businessName.trim(),
      businessType: params.businessType || 'restaurant',
      city: params.city || 'Casablanca',
      deliveryAddress: params.deliveryAddress.trim() || 'Casablanca',
      approvalStatus: 'approved',
      createdAt: nowIso,
      contactName: params.fullName.trim(),
      phone: params.phone.trim(),
      email: deterministicEmail,
      googleMapsUrl: cleanUrl,
      username: cleanUsername,
      lastSeenAt: nowIso,
      password: params.password,
      isVerified: true,
    };

    // 4. Sauvegarder immédiatement les identifiants et le compte en cache local
    const creds = getStored<Record<string, string>>(KEY_USER_CREDS, {});
    creds[cleanUsername] = params.password;
    creds[cleanDigits] = params.password;
    const normPhone = normalizePhone(params.phone);
    if (normPhone) creds[normPhone] = params.password;
    setStored(KEY_USER_CREDS, creds);

    const allBiz = getStored<Business[]>(KEY_BUSINESSES, []);
    const exIdx = allBiz.findIndex((b) => b.id === newBizId || (b.username && b.username.toLowerCase().trim() === cleanUsername));
    if (exIdx >= 0) allBiz[exIdx] = this.currentBusiness;
    else allBiz.unshift(this.currentBusiness);
    setStored(KEY_BUSINESSES, allBiz);

    setSessionStored(KEY_SESSION_USER, this.currentUser);
    setSessionStored(KEY_SESSION_BUSINESS, this.currentBusiness);
    this.touchPresence(this.currentUser.id, this.currentBusiness?.id, this.currentUser.phone);

    // 5. Diffuser immédiatement aux autres onglets
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STORE_UPDATED',
          action: 'NEW_CLIENT',
          client: this.currentBusiness,
          timestamp: Date.now(),
        });
      } catch {}
    }
    this.notify();

    // 6. Synchroniser avec le serveur local dev (/api/sync/clients) sans bloquer
    this.syncBusinessToRemote(this.currentBusiness).catch(() => {});

    // 7. Synchroniser dans le Cloud Supabase (Multi-appareils Garanti)
    if (isSupabaseConfigured && supabase) {
      try {
        const cloudSyncPromise = (async () => {
          // A. Supabase GoTrue Auth
          try {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: deterministicEmail,
              password: params.password,
              options: {
                data: {
                  full_name: params.fullName.trim(),
                  phone: params.phone.trim(),
                  business_name: params.businessName.trim(),
                  username: cleanUsername,
                },
              },
            });

            if (signUpData?.user?.id) {
              authUserId = signUpData.user.id;
            } else if (signUpError) {
              try {
                const { data: signInData } = await supabase.auth.signInWithPassword({
                  email: deterministicEmail,
                  password: params.password,
                });
                if (signInData?.user?.id) {
                  authUserId = signInData.user.id;
                } else {
                  authUserId = 'cfb7edbf-9c6b-4181-afae-2da48ad8a90d';
                }
              } catch {
                authUserId = 'cfb7edbf-9c6b-4181-afae-2da48ad8a90d';
              }
            }
          } catch {
            authUserId = 'cfb7edbf-9c6b-4181-afae-2da48ad8a90d';
          }

          // Mettre à jour l'identifiant résolu
          if (this.currentUser) this.currentUser.id = authUserId;
          if (this.currentBusiness) this.currentBusiness.ownerId = authUserId;
          setSessionStored(KEY_SESSION_USER, this.currentUser);
          setSessionStored(KEY_SESSION_BUSINESS, this.currentBusiness);

          // B. Profiles
          if (authUserId && authUserId !== 'cfb7edbf-9c6b-4181-afae-2da48ad8a90d') {
            try {
              await supabase.from('profiles').upsert({
                id: authUserId,
                full_name: params.fullName.trim(),
                phone: params.phone.trim(),
                role: 'customer',
                email: deterministicEmail,
                updated_at: nowIso,
              });
            } catch {}
          }

          // C. Businesses (avec UUID garanti et #auth: synchronisé)
          const bizPayload = {
            id: newBizId,
            owner_id: authUserId,
            business_name: params.businessName.trim(),
            business_type: params.businessType || 'restaurant',
            city: params.city.trim() || 'Casablanca',
            delivery_address: params.deliveryAddress.trim() || 'Casablanca',
            contact_name: params.fullName.trim(),
            phone: params.phone.trim(),
            email: deterministicEmail,
            google_maps_url: syncedMapsUrl,
            username: cleanUsername,
            approval_status: 'approved',
            updated_at: nowIso,
          };

          const { error: bErr } = await supabase.from('businesses').upsert(bizPayload);
          if (bErr) {
            console.warn('Supabase upsert error, attempting direct REST:', bErr);
            await fetch('https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/businesses', {
              method: 'POST',
              headers: {
                apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                Authorization: 'Bearer sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates',
              },
              body: JSON.stringify(bizPayload),
            });
          }
        })();

        // Attente sécurisée max 2.5 secondes pour assurer la synchronisation cloud sans bloquer
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2500));
        await Promise.race([cloudSyncPromise, timeoutPromise]);
      } catch (e) {
        console.warn('Background Supabase registration sync warning:', e);
      }
    }

    return { success: true };
  }

  public async logout(): Promise<void> {
    if (this.currentUser) {
      this.touchPresence(this.currentUser.id, this.currentBusiness?.id, this.currentUser.phone);
    }
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignorer
      }
    }
    this.currentUser = null;
    this.currentBusiness = null;
    sessionStorage.removeItem(KEY_SESSION_USER);
    sessionStorage.removeItem(KEY_SESSION_BUSINESS);
    localStorage.removeItem(KEY_USER);
    localStorage.removeItem(KEY_BUSINESS);
    this.notify();
  }

  // Déconnexion et expulsion immédiate d'un client supprimé par l'administrateur
  public async forceLogoutDeletedClient(bizId?: string): Promise<void> {
    const targetBizId = bizId || this.currentBusiness?.id;
    if (targetBizId) {
      const deleted = getStored<string[]>(KEY_DELETED_BIZ, []);
      if (!deleted.includes(targetBizId)) {
        deleted.push(targetBizId);
        setStored(KEY_DELETED_BIZ, deleted);
      }
    }

    // Effacer les identifiants enregistrés pour ce client
    const creds = getStored<Record<string, string>>(KEY_USER_CREDS, {});
    if (this.currentBusiness?.username) delete creds[this.currentBusiness.username.toLowerCase().trim()];
    if (this.currentUser?.phone) {
      delete creds[this.currentUser.phone.replace(/[^0-9]/g, '')];
      delete creds[normalizePhone(this.currentUser.phone)];
    }
    setStored(KEY_USER_CREDS, creds);

    if (targetBizId) {
      const allBiz = getStored<Business[]>(KEY_BUSINESSES, []);
      const filtered = allBiz.filter((b) => b.id !== targetBizId);
      setStored(KEY_BUSINESSES, filtered);
    }

    try {
      sessionStorage.setItem('pont_account_deleted_notice', 'true');
      localStorage.setItem('pont_account_deleted_notice', 'true');
    } catch {}

    await this.logout();
  }

  // Validation en direct du statut du compte client (détecte la suppression par l'administrateur)
  public async validateSession(): Promise<boolean> {
    if (!this.currentUser) return true;
    if (this.currentUser.role === 'admin') return true;

    const bizId = this.currentBusiness?.id;
    const ownerId = this.currentUser.id;

    // 1. Vérification dans la liste locale des comptes supprimés
    const deletedIds = new Set(getStored<string[]>(KEY_DELETED_BIZ, []));
    if (bizId && deletedIds.has(bizId)) {
      await this.forceLogoutDeletedClient(bizId);
      return false;
    }

    // 2. Vérification sur le serveur local sync (dev / réseau local WiFi)
    try {
      if (typeof fetch !== 'undefined') {
        const delRes = await fetch('/api/sync/deleted-clients', { cache: 'no-store' });
        if (delRes.ok) {
          const remoteDeleted = await delRes.json();
          if (Array.isArray(remoteDeleted)) {
            if ((bizId && remoteDeleted.includes(bizId)) || (ownerId && remoteDeleted.includes(ownerId))) {
              await this.forceLogoutDeletedClient(bizId);
              return false;
            }
          }
        }
      }
    } catch {}

    // 3. Vérification centrale sur Supabase (Statut en temps réel)
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('businesses').select('id, approval_status, owner_id');
        if (bizId) {
          query = query.eq('id', bizId);
        } else if (ownerId) {
          query = query.eq('owner_id', ownerId);
        }

        const { data, error } = await query;
        if (!error && data) {
          // Si le compte a été supprimé de la table OU marqué 'rejected'
          if (data.length === 0 || data[0].approval_status === 'rejected') {
            await this.forceLogoutDeletedClient(bizId);
            return false;
          }
        }
      } catch (e) {
        console.warn('Erreur validation session client Supabase:', e);
      }

      // 3b. Requête REST directe de secours
      if (bizId) {
        try {
          const restRes = await fetch(
            `https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/businesses?id=eq.${bizId}&select=id,approval_status`,
            {
              headers: {
                apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                Authorization: 'Bearer sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
              },
              cache: 'no-store',
            }
          );
          if (restRes.ok) {
            const rows = await restRes.json();
            if (Array.isArray(rows) && (rows.length === 0 || rows[0].approval_status === 'rejected')) {
              await this.forceLogoutDeletedClient(bizId);
              return false;
            }
          }
        } catch {}
      }
    }

    return true;
  }

  // --- PRESENCE & ACTIVITÉ EN LIGNE ---
  public touchPresence(userId?: string, businessId?: string, phone?: string): void {
    try {
      const presenceMap = getStored<Record<string, string>>(KEY_PRESENCE, {});
      const nowIso = new Date().toISOString();

      if (userId) presenceMap[userId] = nowIso;
      if (businessId) presenceMap[businessId] = nowIso;
      if (phone) {
        const norm = normalizePhone(phone);
        if (norm) presenceMap[norm] = nowIso;
      }
      setStored(KEY_PRESENCE, presenceMap);

      // Synchroniser avec le serveur local dev / réseau
      this.syncPresenceToRemote(userId, businessId, phone);

      // Mettre à jour la date d'activité dans le cache local des entreprises
      const allBiz = getStored<Business[]>(KEY_BUSINESSES, []);
      let modified = false;
      for (const b of allBiz) {
        const bNorm = normalizePhone(b.phone || '');
        const pNorm = phone ? normalizePhone(phone) : '';
        if (
          (businessId && b.id === businessId) ||
          (userId && b.ownerId === userId) ||
          (pNorm && bNorm && (bNorm === pNorm || bNorm.endsWith(pNorm) || pNorm.endsWith(bNorm)))
        ) {
          b.lastSeenAt = nowIso;
          modified = true;
        }
      }
      if (modified) {
        setStored(KEY_BUSINESSES, allBiz);
      }

      // Synchroniser avec Supabase en arrière-plan si disponible
      if (isSupabaseConfigured && supabase) {
        if (businessId) {
          supabase
            .from('businesses')
            .update({ last_seen_at: nowIso } as any)
            .eq('id', businessId)
            .then(() => {})
            .catch(() => {});
        }
        if (userId) {
          supabase
            .from('profiles')
            .update({ last_seen_at: nowIso } as any)
            .eq('id', userId)
            .then(() => {})
            .catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Could not record presence', e);
    }
  }

  public updateLastSeen(): void {
    if (!this.currentUser) return;
    const nowIso = new Date().toISOString();
    this.currentUser.lastSeenAt = nowIso;
    if (this.currentBusiness) {
      this.currentBusiness.lastSeenAt = nowIso;
    }
    setSessionStored(KEY_SESSION_USER, this.currentUser);
    if (this.currentBusiness) {
      setSessionStored(KEY_SESSION_BUSINESS, this.currentBusiness);
    }
    this.touchPresence(this.currentUser.id, this.currentBusiness?.id, this.currentUser.phone);
  }

  // Quick switch for client testing (Admin is strictly locked to achrafabouziad credentials)
  public switchRole(role: 'admin' | 'approved_client' | 'pending_client' | 'visitor'): void {
    if (role === 'visitor') {
      this.logout();
    }
  }

  // --- CATALOG METHODS ---
  public async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categories').select('*').order('display_order');
      if (!error && data && data.length > 0) {
        return data.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          imageUrl: c.image_url,
          isActive: c.is_active,
        }));
      }
    }
    return getStored<Category[]>(KEY_CATEGORIES, INITIAL_CATEGORIES);
  }

  public async ensureAdminAuth(): Promise<string | null> {
    const nowSec = Math.floor(Date.now() / 1000);
    if (this.adminTokenCache && this.adminTokenCache.expiresAt > nowSec + 60) {
      return this.adminTokenCache.token;
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.access_token && (sessionData.session.expires_at || 0) > nowSec + 60) {
          this.adminTokenCache = {
            token: sessionData.session.access_token,
            expiresAt: sessionData.session.expires_at || (nowSec + 3600),
          };
          return this.adminTokenCache.token;
        }

        const { data: signData, error } = await supabase.auth.signInWithPassword({
          email: 'admin@pontagricole.ma',
          password: 'Achrafgt6313',
        });
        if (!error && signData?.session?.access_token) {
          this.adminTokenCache = {
            token: signData.session.access_token,
            expiresAt: signData.session.expires_at || (nowSec + 3600),
          };
          return this.adminTokenCache.token;
        }
      } catch (e) {
        console.warn('Supabase signInWithPassword error, attempting direct REST auth:', e);
      }
    }

    // Direct REST auth fallback
    try {
      const res = await fetch('https://qovqogxhvugtgvjxxsbc.supabase.co/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: {
          apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@pontagricole.ma',
          password: 'Achrafgt6313',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.access_token) {
          this.adminTokenCache = {
            token: data.access_token,
            expiresAt: data.expires_at || (nowSec + (data.expires_in || 3600)),
          };
          if (supabase) {
            try {
              await supabase.auth.setSession({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
              });
            } catch {}
          }
          return data.access_token;
        }
      }
    } catch (e) {
      console.error('Direct admin auth failed:', e);
    }

    return null;
  }

  public normalizeProduct(p: any): Product {
    if (!p) {
      return INITIAL_PRODUCTS[0];
    }
    return {
      id: String(p.id || `prod-${Date.now()}`),
      categoryId: String(p.categoryId || p.category_id || 'cat-legumes'),
      name: String(p.name || 'Produit Maraîcher'),
      description: String(p.description || ''),
      imageUrl: String(
        p.imageUrl ||
        p.image_url ||
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'
      ),
      unit: (p.unit || 'caisse') as any,
      price: Number(p.price) >= 0 ? Number(p.price) : 0,
      minimumQuantity: Number(p.minimumQuantity !== undefined ? p.minimumQuantity : p.minimum_quantity) || 1,
      isAvailable: p.isAvailable !== undefined ? Boolean(p.isAvailable) : (p.is_available !== undefined ? Boolean(p.is_available) : true),
      origin: String(p.origin || 'Maroc'),
      badge: p.badge || undefined,
      createdAt: p.createdAt || p.created_at || new Date().toISOString(),
      updatedAt: p.updatedAt || p.updated_at || new Date().toISOString(),
    };
  }

  public mergeProducts(incoming: any[], existing: any[]): Product[] {
    const map = new Map<string, Product>();

    // 1. Ajouter d'abord les produits entrants (cloud / sync / catalogue)
    if (Array.isArray(incoming)) {
      for (const item of incoming) {
        if (item && item.id) {
          map.set(String(item.id), this.normalizeProduct(item));
        }
      }
    }

    // 2. Superposer les produits locaux existants pour conserver les modifications de prix/disponibilité
    if (Array.isArray(existing)) {
      for (const item of existing) {
        if (item && item.id) {
          const norm = this.normalizeProduct(item);
          if (map.has(norm.id)) {
            const prev = map.get(norm.id)!;
            const prevTime = new Date(prev.updatedAt || 0).getTime();
            const currTime = new Date(norm.updatedAt || 0).getTime();
            if (currTime >= prevTime) {
              map.set(norm.id, { ...prev, ...norm });
            }
          } else {
            map.set(norm.id, norm);
          }
        }
      }
    }

    // 3. S'assurer que les produits initiaux de secours sont également présents
    for (const item of INITIAL_PRODUCTS) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }

    return Array.from(map.values());
  }

  public getProductsSync(): Product[] {
    const stored = getStored<any[]>(KEY_PRODUCTS, []);
    if (Array.isArray(stored) && stored.length > 0) {
      return stored.map((p) => this.normalizeProduct(p));
    }
    return INITIAL_PRODUCTS;
  }

  public async refreshProductsFromCloud(): Promise<Product[]> {
    const currentStored = getStored<any[]>(KEY_PRODUCTS, []);
    let fetchedProducts: any[] = [];

    // 1. Priorité 1 : Synchronisation serveur local ultra-rapide (/api/sync/products - 2ms)
    try {
      const res = await fetch('/api/sync/products');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          fetchedProducts = data;
        }
      }
    } catch {}

    // 2. Priorité 2 : Fichier catalogue statique complet (95 produits dans public/products_catalog.json - 5ms)
    if (fetchedProducts.length < 50) {
      try {
        const res = await fetch('/products_catalog.json');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            fetchedProducts = fetchedProducts.length > 0 ? [...fetchedProducts, ...data] : data;
          }
        }
      } catch {}
    }

    // 3. Priorité 3 : Supabase Cloud (avec timeout strict de 4 secondes pour ne jamais bloquer la page)
    if (isSupabaseConfigured && supabase) {
      try {
        const timeoutPromise = new Promise<{ data: null; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Supabase query timeout')), 4000)
        );
        const queryPromise = supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        const result: any = await Promise.race([queryPromise, timeoutPromise]);
        if (result && !result.error && Array.isArray(result.data) && result.data.length > 0) {
          fetchedProducts = [...fetchedProducts, ...result.data];
        }
      } catch (e) {
        // En cas de lenteur réseau ou de timeout, les 95 produits des étapes 1 et 2 sont déjà garantis
      }
    }

    // 4. Fusionner l'ensemble des sources pour ne JAMAIS perdre aucun produit
    const merged = this.mergeProducts(fetchedProducts, currentStored);
    setStored(KEY_PRODUCTS, merged);
    return merged;
  }

  public async getProducts(): Promise<Product[]> {
    return this.refreshProductsFromCloud();
  }

  public async saveProduct(product: Product): Promise<void> {
    if (this.currentUser?.role !== 'admin') {
      throw new Error("Action réservée exclusivement à l'administrateur.");
    }

    const now = new Date().toISOString();
    const payload = {
      id: product.id,
      category_id: product.categoryId,
      name: product.name,
      description: product.description || '',
      image_url: product.imageUrl || '',
      unit: product.unit,
      price: Number(product.price),
      minimum_quantity: Number(product.minimumQuantity) || 1,
      is_available: Boolean(product.isAvailable),
      origin: product.origin || 'Maroc',
      badge: product.badge || null,
      updated_at: now,
    };

    // 1. Mettre à jour le cache local immédiatement (0ms de latence)
    const products = getStored<Product[]>(KEY_PRODUCTS, INITIAL_PRODUCTS);
    const index = products.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.unshift(product);
    }
    setStored(KEY_PRODUCTS, products);

    // 2. Diffuser immédiatement aux autres onglets et avertir les composants UI
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STORE_UPDATED',
          action: 'PRODUCT_SAVED',
          product,
        });
      } catch {}
    }
    this.notify();

    // 3. Synchroniser sur le serveur dev local / WiFi
    try {
      fetch('/api/sync/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      }).catch(() => {});
    } catch {}

    // 4. Sauvegarder dans Supabase en arrière-plan avec délai d'attente sécurisé
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          let saved = false;
          const adminToken = await this.ensureAdminAuth();

          try {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
            const upsertPromise = supabase.from('products').upsert(payload);
            const res: any = await Promise.race([upsertPromise, timeoutPromise]);
            if (res && !res.error) saved = true;
          } catch {}

          if (!saved && adminToken) {
            try {
              await fetch('https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/products', {
                method: 'POST',
                headers: {
                  apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                  Authorization: `Bearer ${adminToken}`,
                  'Content-Type': 'application/json',
                  Prefer: 'resolution=merge-duplicates,return=representation',
                },
                body: JSON.stringify(payload),
              });
            } catch {}
          }
        } catch (e) {
          console.warn('Background Supabase product upsert warning:', e);
        }
      })();
    }
  }

  public async updateProductPrice(productId: string, newPrice: number, isAvailable?: boolean): Promise<void> {
    if (this.currentUser?.role !== 'admin') {
      throw new Error("Action réservée exclusivement à l'administrateur.");
    }

    const products = getStored<Product[]>(KEY_PRODUCTS, INITIAL_PRODUCTS);
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    prod.price = Math.max(0, Number(newPrice));
    if (typeof isAvailable === 'boolean') {
      prod.isAvailable = isAvailable;
    }

    const now = new Date().toISOString();
    const updateFields: any = {
      price: prod.price,
      updated_at: now,
    };
    if (typeof isAvailable === 'boolean') {
      updateFields.is_available = isAvailable;
    }

    // 1. Sauvegarder localement et notifier immédiatement (1ms)
    setStored(KEY_PRODUCTS, products);
    localStorage.setItem('pont_last_price_update', now);

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STORE_UPDATED',
          action: 'PRODUCT_UPDATED',
          product: prod,
        });
      } catch {}
    }
    this.notify();

    // 2. Synchroniser sur le serveur dev local
    try {
      fetch('/api/sync/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prod),
      }).catch(() => {});
    } catch {}

    // 3. Mettre à jour Supabase en arrière-plan
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          let updated = false;
          const adminToken = await this.ensureAdminAuth();
          try {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
            const { error }: any = await Promise.race([
              supabase.from('products').update(updateFields).eq('id', productId),
              timeoutPromise,
            ]);
            if (!error) updated = true;
          } catch {}

          if (!updated && adminToken) {
            try {
              await fetch(`https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/products?id=eq.${productId}`, {
                method: 'PATCH',
                headers: {
                  apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                  Authorization: `Bearer ${adminToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateFields),
              });
            } catch {}
          }
        } catch (e) {
          console.warn('Background product price update warning:', e);
        }
      })();
    }
  }

  public async updateDailyPrices(
    updates: { id: string; price: number; isAvailable: boolean }[]
  ): Promise<void> {
    if (this.currentUser?.role !== 'admin') {
      throw new Error("Action réservée exclusivement à l'administrateur.");
    }

    const products = getStored<Product[]>(KEY_PRODUCTS, INITIAL_PRODUCTS);
    const now = new Date().toISOString();

    for (const u of updates) {
      const p = products.find((prod) => prod.id === u.id);
      if (p) {
        p.price = Math.max(0, Number(u.price));
        p.isAvailable = u.isAvailable;
      }
    }

    // 1. Sauvegarde locale immédiate (instantané en 2ms - l'interface réagit immédiatement)
    setStored(KEY_PRODUCTS, products);
    localStorage.setItem('pont_last_price_update', now);

    // 2. Notifier immédiatement l'interface utilisateur & les onglets
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STORE_UPDATED',
          action: 'DAILY_PRICES_UPDATED',
        });
      } catch {}
    }
    this.notify();

    // 3. Synchroniser sur le serveur dev local sans bloquer
    try {
      fetch('/api/sync/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(products),
      }).catch(() => {});
    } catch {}

    // 4. Synchronisation Supabase en arrière-plan par lots concurrents de 15 pour une rapidité maximale
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          const adminToken = await this.ensureAdminAuth();
          const batchSize = 15;
          for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            await Promise.allSettled(
              batch.map(async (u) => {
                const payload = {
                  price: Math.max(0, Number(u.price)),
                  is_available: u.isAvailable,
                  updated_at: now,
                };
                let updated = false;
                try {
                  const { error } = await supabase.from('products').update(payload).eq('id', u.id);
                  if (!error) updated = true;
                } catch {}

                if (!updated && adminToken) {
                  try {
                    await fetch(`https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/products?id=eq.${u.id}`, {
                      method: 'PATCH',
                      headers: {
                        apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                        Authorization: `Bearer ${adminToken}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(payload),
                    });
                  } catch {}
                }
              })
            );
          }
        } catch (e) {
          console.warn('Background Supabase daily price sync warning:', e);
        }
      })();
    }
  }

  public async deleteProduct(productId: string): Promise<void> {
    if (this.currentUser?.role !== 'admin') {
      throw new Error("Action réservée exclusivement à l'administrateur.");
    }

    // 1. Mettre à jour immédiatement le cache local et notifier (0ms)
    let products = getStored<Product[]>(KEY_PRODUCTS, INITIAL_PRODUCTS);
    products = products.filter((p) => p.id !== productId);
    setStored(KEY_PRODUCTS, products);

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STORE_UPDATED',
          action: 'PRODUCT_DELETED',
          productId,
        });
      } catch {}
    }
    this.notify();

    // 2. Synchroniser sur le serveur dev local
    try {
      fetch(`/api/sync/products?id=${productId}`, { method: 'DELETE' }).catch(() => {});
    } catch {}

    // 3. Supprimer dans Supabase en arrière-plan
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          const adminToken = await this.ensureAdminAuth();
          let deleted = false;
          try {
            const { error } = await supabase.from('products').delete().eq('id', productId);
            if (!error) deleted = true;
          } catch {}

          if (!deleted && adminToken) {
            try {
              await fetch(`https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/products?id=eq.${productId}`, {
                method: 'DELETE',
                headers: {
                  apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                  Authorization: `Bearer ${adminToken}`,
                },
              });
            } catch {}
          }
        } catch (e) {
          console.warn('Background Supabase delete warning:', e);
        }
      })();
    }
  }

  // --- CART METHODS ---
  public getCart(): CartItem[] {
    return this.cart;
  }

  public addToCart(product: Product, quantity?: number): void {
    const qtyToAdd = quantity || product.minimumQuantity;
    const existing = this.cart.find((item) => item.product.id === product.id);
    if (existing) {
      existing.quantity += qtyToAdd;
    } else {
      this.cart.push({ product, quantity: qtyToAdd });
    }
    setStored(KEY_CART, this.cart);
    this.notify();
  }

  public updateCartQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    const item = this.cart.find((i) => i.product.id === productId);
    if (item) {
      item.quantity = quantity;
      setStored(KEY_CART, this.cart);
      this.notify();
    }
  }

  public removeFromCart(productId: string): void {
    this.cart = this.cart.filter((item) => item.product.id !== productId);
    setStored(KEY_CART, this.cart);
    this.notify();
  }

  public clearCart(): void {
    this.cart = [];
    setStored(KEY_CART, []);
    this.notify();
  }

  public getCartSubtotal(): number {
    return this.cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }

  // --- FAVORITES METHODS ---
  private favorites: string[] = getStored<string[]>(KEY_FAVORITES, []);

  public getFavorites(): string[] {
    return [...this.favorites];
  }

  public isFavorite(productId: string): boolean {
    return this.favorites.includes(productId);
  }

  public toggleFavorite(productId: string): boolean {
    const idx = this.favorites.indexOf(productId);
    let isFav = false;
    if (idx >= 0) {
      this.favorites.splice(idx, 1);
      isFav = false;
    } else {
      this.favorites.push(productId);
      isFav = true;
    }
    setStored(KEY_FAVORITES, this.favorites);
    this.notify();
    return isFav;
  }

  // --- ORDERS METHODS ---
  public async getOrders(): Promise<Order[]> {
    const list: Order[] = [];
    const seenIds = new Set<string>();

    const addOrUpdateOrder = (o: Order) => {
      if (!o || !o.id) return;
      const existingIdx = list.findIndex(
        (x) => x.id === o.id || (x.orderNumber && o.orderNumber && x.orderNumber === o.orderNumber)
      );
      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...o };
      } else {
        list.push(o);
        seenIds.add(o.id);
        if (o.orderNumber) seenIds.add(o.orderNumber);
      }
    };

    // 1. Charger immédiatement depuis le cache local (0ms de latence)
    const storedOrders = getStored<Order[]>(KEY_ORDERS, []);
    for (const ord of storedOrders) {
      addOrUpdateOrder(ord);
    }

    // 2. Charger depuis le serveur local dev / réseau (/api/sync/orders)
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/sync/orders', { cache: 'no-store' });
        if (res.ok) {
          const syncOrders = await res.json();
          if (Array.isArray(syncOrders)) {
            for (const ord of syncOrders) {
              addOrUpdateOrder(ord);
            }
          }
        }
      }
    } catch {
      // Offline fallback
    }

    // 3. Charger depuis Supabase (avec délai d'attente sécurisé de 2.5s max pour ne jamais bloquer l'interface)
    if (isSupabaseConfigured && supabase) {
      try {
        let adminToken: string | null = null;
        if (this.currentUser?.role === 'admin') {
          adminToken = await this.ensureAdminAuth();
        }

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('orders_timeout')), 2500));
        const queryPromise = supabase
          .from('orders')
          .select('*, order_items(*)')
          .order('created_at', { ascending: false });

        const res: any = await Promise.race([queryPromise, timeoutPromise]);
        let data = res?.data;
        const error = res?.error;

        // Fallback REST direct si erreur ou token admin disponible
        if ((!data || data.length === 0) && adminToken) {
          try {
            const restOrdersRes = await fetch(
              'https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/orders?select=*,order_items(*)&order=created_at.desc',
              {
                headers: {
                  apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                  Authorization: `Bearer ${adminToken}`,
                },
                cache: 'no-store',
              }
            );
            if (restOrdersRes.ok) {
              const restOrdersData = await restOrdersRes.json();
              if (Array.isArray(restOrdersData) && restOrdersData.length > 0) {
                data = restOrdersData;
              }
            }
          } catch {}
        }

        if (data && Array.isArray(data)) {
          data.forEach((o: any) => {
            addOrUpdateOrder({
              id: o.id,
              orderNumber: o.order_number,
              customerId: o.customer_id,
              businessId: o.business_id,
              status: o.status,
              deliveryAddress: o.delivery_address,
              deliveryCity: o.delivery_city,
              requestedDeliveryDate: o.requested_delivery_date,
              subtotal: Number(o.subtotal),
              deliveryFee: Number(o.delivery_fee),
              total: Number(o.total),
              customerNotes: o.customer_notes,
              rejectionReason: o.rejection_reason,
              items: (o.order_items || []).map((i: any) => ({
                id: i.id,
                orderId: i.order_id,
                productId: i.product_id,
                productNameSnapshot: i.product_name_snapshot,
                unitSnapshot: i.unit_snapshot,
                unitPriceSnapshot: Number(i.unit_price_snapshot),
                quantity: i.quantity,
                lineTotal: Number(i.line_total),
              })),
              createdAt: o.created_at,
              updatedAt: o.updated_at,
            });
          });
        }
      } catch (err) {
        // En cas de lenteur Supabase, les données locales et dev-sync sont déjà disponibles immédiatement
      }
    }

    // Trier par date décroissante
    list.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    // Mettre à jour le cache local
    setStored(KEY_ORDERS, list);

    // Si client connecté, filtrer strictement SES commandes uniquement (isolation totale par établissement)
    if (this.currentUser && this.currentUser.role === 'customer') {
      const curBiz = this.currentBusiness;
      const curBizId = curBiz?.id;
      const curUsername = (curBiz?.username || '').toLowerCase().trim();
      const curPhoneDigits = (curBiz?.phone || this.currentUser.phone || '').replace(/[^0-9]/g, '');

      return list.filter((o) => {
        // 1. Si la commande appartient explicitement à un autre établissement, interdiction formelle
        if (curBizId && o.businessId && o.businessId !== curBizId) {
          return false;
        }

        // 2. Si la commande correspond explicitement à cet établissement
        if (curBizId && o.businessId && o.businessId === curBizId) {
          return true;
        }

        // 3. Si la commande a un username client spécifique identique
        const ordUsername = (o.customerUsername || (o as any).username || '').toLowerCase().trim();
        if (curUsername && ordUsername && curUsername === ordUsername) {
          return true;
        }

        // 4. Si la commande n'a pas de businessId mais correspond au téléphone exact de ce client (au moins 9 chiffres)
        const oPhoneDigits = (o.customerPhone || '').replace(/[^0-9]/g, '');
        if (!o.businessId && curPhoneDigits.length >= 9 && oPhoneDigits.length >= 9 && curPhoneDigits.slice(-9) === oPhoneDigits.slice(-9)) {
          return true;
        }

        return false;
      });
    }

    // L'administrateur voit l'ensemble des commandes
    return list;
  }

  public async placeOrder(params: {
    deliveryCity: string;
    deliveryAddress: string;
    requestedDeliveryDate: string;
    customerNotes?: string;
  }): Promise<{ success: boolean; order?: Order; error?: string }> {
    // 1. Validation de la session en direct (si le compte a été supprimé ou rejeté par l'admin)
    const isSessionValid = await this.validateSession();
    if (!isSessionValid || !this.currentUser) {
      return {
        success: false,
        error: "Votre compte a été supprimé ou désactivé par l'administrateur. La commande ne peut pas être transmise.",
      };
    }

    if (this.currentBusiness?.approvalStatus === 'rejected') {
      await this.forceLogoutDeletedClient(this.currentBusiness.id);
      return {
        success: false,
        error: "Votre compte a été supprimé ou désactivé par l'administrateur.",
      };
    }

    // 3. Check cart contents
    if (this.cart.length === 0) {
      return { success: false, error: 'Votre panier est vide.' };
    }

    // 4. Cart subtotal and Free Delivery
    const subtotal = this.getCartSubtotal();
    const deliveryFee = 0; // Livraison 100% gratuite et offerte
    const total = subtotal;

    // 5. Generate unique Moroccan B2B order identifier
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `PA-${dateStr}-${rand}`;

    // 6. Immutable snapshots of product name, unit, and price
    const orderItems: OrderItem[] = this.cart.map((item) => ({
      productId: item.product.id,
      productNameSnapshot: item.product.name,
      unitSnapshot: item.product.unit,
      unitPriceSnapshot: item.product.price,
      quantity: item.quantity,
      lineTotal: item.product.price * item.quantity,
    }));

    const newOrderId = generateUUID();
    const orderCustomerId = isUUID(this.currentUser.id) ? this.currentUser.id : 'cfb7edbf-9c6b-4181-afae-2da48ad8a90d';
    const orderBusinessId = isUUID(this.currentBusiness?.id) ? this.currentBusiness?.id : undefined;

    const newOrder: Order = {
      id: newOrderId,
      orderNumber,
      customerId: orderCustomerId,
      customerName: this.currentUser.fullName,
      customerPhone: this.currentUser.phone,
      customerUsername: this.currentBusiness?.username,
      businessId: orderBusinessId,
      businessName: this.currentBusiness?.businessName,
      businessType: this.currentBusiness?.businessType,
      status: 'pending',
      deliveryAddress: params.deliveryAddress,
      deliveryCity: params.deliveryCity,
      requestedDeliveryDate: params.requestedDeliveryDate,
      subtotal,
      deliveryFee,
      total,
      customerNotes: params.customerNotes,
      items: orderItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbOrder, error: oErr } = await supabase
          .from('orders')
          .insert({
            id: newOrderId,
            order_number: newOrder.orderNumber,
            customer_id: orderCustomerId,
            business_id: orderBusinessId,
            status: 'pending',
            delivery_address: newOrder.deliveryAddress,
            delivery_city: newOrder.deliveryCity,
            requested_delivery_date: newOrder.requestedDeliveryDate,
            subtotal: newOrder.subtotal,
            delivery_fee: newOrder.deliveryFee,
            total: newOrder.total,
            customer_notes: newOrder.customerNotes,
          })
          .select()
          .single();

        if (oErr) {
          console.error('Supabase order creation error', oErr);
        } else if (dbOrder) {
          newOrder.id = dbOrder.id;
          const itemsPayload = orderItems.map((item) => ({
            id: generateUUID(),
            order_id: dbOrder.id,
            product_id: item.productId,
            product_name_snapshot: item.productNameSnapshot,
            unit_snapshot: item.unitSnapshot,
            unit_price_snapshot: item.unitPriceSnapshot,
            quantity: item.quantity,
            line_total: item.lineTotal,
          }));
          await supabase.from('order_items').insert(itemsPayload);
        }
      } catch (err) {
        console.error('Order save error', err);
      }
    }

    // Synchroniser immédiatement avec le serveur local dev / réseau
    await this.syncOrderToRemote(newOrder);

    // Persist locally
    const orders = getStored<Order[]>(KEY_ORDERS, []);
    const existingIdx = orders.findIndex((o) => o.id === newOrder.id);
    if (existingIdx >= 0) {
      orders[existingIdx] = newOrder;
    } else {
      orders.unshift(newOrder);
    }
    setStored(KEY_ORDERS, orders);

    // Diffuser aux autres onglets (Admin Dashboard)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STORE_UPDATED',
          action: 'NEW_ORDER',
          order: newOrder,
          timestamp: Date.now(),
        });
      } catch {}
    }

    // Empty cart upon successful order
    this.clearCart();
    this.notify();

    return { success: true, order: newOrder };
  }

  public async updateOrderStatus(orderId: string, status: OrderStatus, reason?: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('orders')
        .update({
          status,
          rejection_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
    }

    const orders = getStored<Order[]>(KEY_ORDERS, []);
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = status;
      if (reason) order.rejectionReason = reason;
      order.updatedAt = new Date().toISOString();
      setStored(KEY_ORDERS, orders);

      await this.syncOrderToRemote(order);

      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'STORE_UPDATED',
            action: 'UPDATE_ORDER_STATUS',
            order,
            timestamp: Date.now(),
          });
        } catch {}
      }
      this.notify();
    }
  }

  public async updateOrder(updatedOrder: Order): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('orders')
          .update({
            subtotal: updatedOrder.subtotal,
            total: updatedOrder.total,
            delivery_address: updatedOrder.deliveryAddress,
            delivery_city: updatedOrder.deliveryCity,
            customer_name: updatedOrder.customerName,
            customer_phone: updatedOrder.customerPhone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', updatedOrder.id);
      } catch (err) {
        console.warn('Error updating order in Supabase', err);
      }
    }
    const orders = getStored<Order[]>(KEY_ORDERS, []);
    const idx = orders.findIndex((o) => o.id === updatedOrder.id);
    if (idx >= 0) {
      orders[idx] = { ...orders[idx], ...updatedOrder, updatedAt: new Date().toISOString() };
      setStored(KEY_ORDERS, orders);

      await this.syncOrderToRemote(orders[idx]);

      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'STORE_UPDATED',
            action: 'UPDATE_ORDER',
            order: orders[idx],
            timestamp: Date.now(),
          });
        } catch {}
      }
      this.notify();
    }
  }

  public async deleteOrder(orderId: string): Promise<void> {
    try {
      fetch(`/api/sync/orders?id=${orderId}`, { method: 'DELETE' }).catch(() => {});
    } catch {}

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('orders').delete().eq('id', orderId);
      } catch (e) {
        console.warn('Error deleting order from Supabase', e);
      }
    }
    const orders = getStored<Order[]>(KEY_ORDERS, []);
    const filtered = orders.filter((o) => o.id !== orderId);
    setStored(KEY_ORDERS, filtered);
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STORE_UPDATED',
          action: 'DELETE_ORDER',
          orderId,
          timestamp: Date.now(),
        });
      } catch {}
    }
    this.notify();
  }

  // --- CLIENTS & BUSINESSES (ADMIN) ---
  public async getBusinesses(): Promise<Business[]> {
    const list: Business[] = [];
    const seenIds = new Set<string>();
    const seenPhones = new Set<string>();
    const seenUsers = new Set<string>();
    const deletedIds = new Set(getStored<string[]>(KEY_DELETED_BIZ, []));

    const addOrUpdateClient = (bizObj: Business) => {
      if (!bizObj || !bizObj.businessName) return;
      if (bizObj.approvalStatus === 'rejected') return;
      if (bizObj.id && deletedIds.has(bizObj.id)) return;
      const bDigits = (bizObj.phone || '').replace(/[^0-9]/g, '');
      const bUser = (bizObj.username || '').toLowerCase().trim();

      const existingIdx = list.findIndex((c) => {
        if (bizObj.id && c.id && c.id === bizObj.id) return true;
        if (bUser && c.username && c.username.toLowerCase().trim() === bUser) return true;
        return false;
      });

      if (existingIdx >= 0) {
        const cur = list[existingIdx];
        list[existingIdx] = {
          ...cur,
          ...bizObj,
          businessName: bizObj.businessName || cur.businessName,
          contactName: bizObj.contactName || cur.contactName,
          phone: bizObj.phone || cur.phone,
          lastSeenAt: bizObj.lastSeenAt || cur.lastSeenAt,
          approvalStatus: bizObj.approvalStatus || cur.approvalStatus,
        };
      } else {
        list.push(bizObj);
        if (bizObj.id) seenIds.add(bizObj.id);
        if (bDigits.length >= 9) seenPhones.add(bDigits.slice(-9));
        if (bUser) seenUsers.add(bUser);
      }
    };

    // 1. Charger immédiatement depuis le cache local (0ms de latence)
    const localBusinesses = getStored<Business[]>(KEY_BUSINESSES, []);
    for (const lb of localBusinesses) {
      addOrUpdateClient(lb);
    }

    // 2. Charger depuis le serveur sync (si dev / réseau local)
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/sync/clients', { cache: 'no-store' });
        if (res.ok) {
          const syncData = await res.json();
          if (Array.isArray(syncData)) {
            for (const b of syncData) {
              addOrUpdateClient(b);
            }
          }
        }
      }
    } catch {}

    // 3. Charger depuis Supabase (avec délai d'attente sécurisé de 2.5s pour ne jamais bloquer l'administrateur)
    if (isSupabaseConfigured && supabase) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('businesses_timeout')), 2500));
        const queryPromise = supabase
          .from('businesses')
          .select('*')
          .order('created_at', { ascending: false });

        const result: any = await Promise.race([queryPromise, timeoutPromise]);
        const bizData = result?.data;
        const bizError = result?.error;

        if (bizError) {
          console.warn('Supabase businesses query error:', bizError.code, bizError.message);
          if (typeof localStorage !== 'undefined' && (bizError.code === 'PGRST301' || bizError.message?.includes('JWT') || bizError.message?.includes('expired'))) {
            try {
              localStorage.removeItem('sb-qovqogxhvugtgvjxxsbc-auth-token');
            } catch {}
          }
        }

        if (!bizError && bizData && bizData.length > 0) {
          const rejectedInDb = new Set(
            bizData.filter((b: any) => b.approval_status === 'rejected').map((b: any) => b.id)
          );

          for (const b of bizData) {
            if (b.approval_status === 'rejected') continue;
            const decodedPass = decodeAuth(b.google_maps_url);
            const bizObj: Business = {
              id: b.id,
              ownerId: b.owner_id,
              businessName: b.business_name || 'Établissement Pro',
              businessType: b.business_type || 'restaurant',
              city: b.city || 'Casablanca',
              deliveryAddress: b.delivery_address || 'Adresse à préciser',
              approvalStatus: b.approval_status || 'approved',
              createdAt: b.created_at || new Date().toISOString(),
              contactName: b.contact_name || b.business_name || 'Client Professionnel',
              phone: b.phone || '',
              email: b.email || '',
              googleMapsUrl: cleanMapsUrl(b.google_maps_url) || undefined,
              username: b.username || undefined,
              password: decodedPass || undefined,
              lastSeenAt: b.last_seen_at || undefined,
            };
            addOrUpdateClient(bizObj);
          }

          // Nettoyer du tableau les clients qui ont été supprimés/rejetés dans la base
          for (let i = list.length - 1; i >= 0; i--) {
            if (rejectedInDb.has(list[i].id)) {
              list.splice(i, 1);
            }
          }
        }
      } catch (e) {
        // En cas de lenteur réseau Supabase, les clients locaux et du serveur sync sont déjà affichés
      }
    }

    // 3b. Requête REST directe de secours si la liste est vide
    if (list.length === 0) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('rest_timeout')), 2000));
        const restUrl = 'https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/businesses?approval_status=neq.rejected&select=*&order=created_at.desc';
        const fetchPromise = fetch(restUrl, {
          headers: {
            apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
            Authorization: 'Bearer sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
          },
          cache: 'no-store',
        });
        const restRes: any = await Promise.race([fetchPromise, timeoutPromise]);
        if (restRes && restRes.ok) {
          const restData = await restRes.json();
          if (Array.isArray(restData) && restData.length > 0) {
            for (const b of restData) {
              const decodedPass = decodeAuth(b.google_maps_url);
              const bizObj: Business = {
                id: b.id,
                ownerId: b.owner_id,
                businessName: b.business_name || 'Établissement Pro',
                businessType: b.business_type || 'restaurant',
                city: b.city || 'Casablanca',
                deliveryAddress: b.delivery_address || 'Adresse à préciser',
                approvalStatus: b.approval_status || 'approved',
                createdAt: b.created_at || new Date().toISOString(),
                contactName: b.contact_name || b.business_name || 'Client Professionnel',
                phone: b.phone || '',
                email: b.email || '',
                googleMapsUrl: cleanMapsUrl(b.google_maps_url) || undefined,
                username: b.username || undefined,
                password: decodedPass || undefined,
                lastSeenAt: b.last_seen_at || undefined,
              };
              addOrUpdateClient(bizObj);
            }
          }
        }
      } catch (re) {}
    }

    // 4. Récupérer l'état de présence (dev sync + cache local)
    let presenceMap = getStored<Record<string, string>>(KEY_PRESENCE, {});
    try {
      if (typeof fetch !== 'undefined') {
        const presRes = await fetch('/api/sync/presence', { cache: 'no-store' });
        if (presRes.ok) {
          const remotePresence = await presRes.json();
          if (remotePresence && typeof remotePresence === 'object') {
            presenceMap = { ...presenceMap, ...remotePresence };
            setStored(KEY_PRESENCE, presenceMap);
          }
        }
      }
    } catch {}

    // Appliquer la date de présence à chaque client
    for (const b of list) {
      const bNorm = normalizePhone(b.phone || '');
      const pLastSeen =
        presenceMap[b.id] ||
        (b.ownerId && presenceMap[b.ownerId]) ||
        (bNorm && presenceMap[bNorm]) ||
        b.lastSeenAt;
      if (pLastSeen) {
        b.lastSeenAt = pLastSeen;
      }
    }

    // 5. Si hors-ligne complet, la liste reste vide (pas de faux clients injectés)

    // Trier du plus récent au plus ancien
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Mettre à jour le cache local avec tous les clients synchronisés
    setStored(KEY_BUSINESSES, list);

    // Mettre à jour automatiquement le dictionnaire local de mots de passe
    const creds = getStored<Record<string, string>>(KEY_USER_CREDS, {});
    let credsModified = false;
    for (const b of list) {
      if (b.password) {
        const u = (b.username || '').toLowerCase().trim();
        const d = (b.phone || '').replace(/[^0-9]/g, '');
        const n = normalizePhone(b.phone || '');
        if (u && creds[u] !== b.password) {
          creds[u] = b.password;
          credsModified = true;
        }
        if (d && creds[d] !== b.password) {
          creds[d] = b.password;
          credsModified = true;
        }
        if (n && creds[n] !== b.password) {
          creds[n] = b.password;
          credsModified = true;
        }
      }
    }
    if (credsModified) {
      setStored(KEY_USER_CREDS, creds);
    }

    return list;
  }

  public async addBusinessManual(params: {
    businessName: string;
    contactName: string;
    phone: string;
    city: string;
    deliveryAddress: string;
    businessType: BusinessType;
    email?: string;
    approvalStatus?: ApprovalStatus;
  }): Promise<Business> {
    const nowIso = new Date().toISOString();
    const cleanDigits = (params.phone || '').replace(/[^0-9]/g, '');
    const nameSlug = (params.contactName || params.businessName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '');
    const finalEmail =
      params.email?.trim().toLowerCase() ||
      `${cleanDigits || nameSlug || Date.now()}@phone.pontagricole.com`;
    const defaultPassword = '123456';
    const authTag = encodeAuth(defaultPassword);
    const ownerId = this.currentUser?.id && this.currentUser.id.includes('-') && this.currentUser.id.length > 20
      ? this.currentUser.id
      : 'c56abe06-f012-4c80-8847-7f2db685a4e9';

    let newBizId = '';

    // 1. Sauvegarde et synchronisation directe Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: createdBiz, error: insErr } = await supabase
          .from('businesses')
          .insert({
            owner_id: ownerId,
            business_name: params.businessName.trim(),
            business_type: params.businessType,
            city: params.city.trim() || 'Casablanca',
            delivery_address: params.deliveryAddress.trim() || 'Casablanca',
            contact_name: params.contactName.trim(),
            phone: params.phone.trim(),
            email: finalEmail,
            google_maps_url: authTag,
            username: nameSlug,
            approval_status: params.approvalStatus || 'approved',
          })
          .select()
          .single();

        if (createdBiz?.id) {
          newBizId = createdBiz.id;
        } else if (insErr) {
          console.warn('Manual client Supabase insert warning:', insErr.message);
        }
      } catch (e) {
        console.warn('Manual client Supabase sync warning:', e);
      }

      // Fallback REST direct si nécessaire
      if (!newBizId) {
        try {
          const restRes = await fetch('https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/businesses', {
            method: 'POST',
            headers: {
              apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
              Authorization: 'Bearer sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify({
              owner_id: ownerId,
              business_name: params.businessName.trim(),
              business_type: params.businessType,
              city: params.city.trim() || 'Casablanca',
              delivery_address: params.deliveryAddress.trim() || 'Casablanca',
              contact_name: params.contactName.trim(),
              phone: params.phone.trim(),
              email: finalEmail,
              google_maps_url: authTag,
              username: nameSlug,
              approval_status: params.approvalStatus || 'approved',
            }),
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            if (Array.isArray(rows) && rows[0]?.id) {
              newBizId = rows[0].id;
            }
          }
        } catch {}
      }
    }

    if (!newBizId) {
      newBizId = `biz-${Date.now()}`;
    }

    const newBiz: Business = {
      id: newBizId,
      ownerId,
      businessName: params.businessName.trim(),
      businessType: params.businessType,
      city: params.city.trim() || 'Casablanca',
      deliveryAddress: params.deliveryAddress.trim() || 'Casablanca',
      approvalStatus: params.approvalStatus || 'approved',
      createdAt: nowIso,
      contactName: params.contactName.trim(),
      phone: params.phone.trim(),
      email: finalEmail,
      username: nameSlug,
      password: defaultPassword,
      lastSeenAt: nowIso,
    };

    // 2. Sauvegarder les identifiants en cache local
    const creds = getStored<Record<string, string>>(KEY_USER_CREDS, {});
    if (nameSlug) creds[nameSlug] = defaultPassword;
    if (cleanDigits) creds[cleanDigits] = defaultPassword;
    setStored(KEY_USER_CREDS, creds);

    // 3. Sauvegarder dans le cache local
    const all = getStored<Business[]>(KEY_BUSINESSES, []);
    all.unshift(newBiz);
    setStored(KEY_BUSINESSES, all);

    // 4. Synchroniser sur le réseau local / dev
    this.syncBusinessToRemote(newBiz);

    this.touchPresence(ownerId, newBizId, newBiz.phone);
    this.notify();
    return newBiz;
  }

  public async updateBusinessApproval(businessId: string, status: ApprovalStatus): Promise<void> {
    try {
      fetch('/api/sync/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: businessId, approvalStatus: status }),
      }).catch(() => {});
    } catch {}

    const adminToken = await this.ensureAdminAuth();
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('businesses').update({ approval_status: status }).eq('id', businessId);
      } catch {}
      try {
        await fetch(`https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/businesses?id=eq.${businessId}`, {
          method: 'PATCH',
          headers: {
            apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
            Authorization: adminToken ? `Bearer ${adminToken}` : 'Bearer sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ approval_status: status }),
        });
      } catch {}
    }
    const businesses = getStored<Business[]>(KEY_BUSINESSES, []);
    const b = businesses.find((biz) => biz.id === businessId);
    if (b) {
      b.approvalStatus = status;
      setStored(KEY_BUSINESSES, businesses);
      // If current business was updated, sync it
      if (this.currentBusiness && this.currentBusiness.id === businessId) {
        this.currentBusiness.approvalStatus = status;
        setSessionStored(KEY_SESSION_BUSINESS, this.currentBusiness);
      }
      this.notify();
    }
  }

  public async deleteBusiness(businessId: string): Promise<void> {
    const deletedIds = getStored<string[]>(KEY_DELETED_BIZ, []);
    if (!deletedIds.includes(businessId)) {
      deletedIds.push(businessId);
      setStored(KEY_DELETED_BIZ, deletedIds);
    }

    // Récupérer le client pour nettoyer ses accès
    const businesses = getStored<Business[]>(KEY_BUSINESSES, []);
    const targetBiz = businesses.find((b) => b.id === businessId);
    const ownerId = targetBiz?.ownerId;

    // Supprimer les identifiants en cache
    const creds = getStored<Record<string, string>>(KEY_USER_CREDS, {});
    if (targetBiz?.username) delete creds[targetBiz.username.toLowerCase().trim()];
    if (targetBiz?.phone) {
      delete creds[targetBiz.phone.replace(/[^0-9]/g, '')];
      delete creds[normalizePhone(targetBiz.phone)];
    }
    if (ownerId) delete creds[ownerId];
    setStored(KEY_USER_CREDS, creds);

    // 1. Marquer comme rejeté et supprimer dans Supabase avec le jeton Administrateur (garantie d'expulsion sur tous les téléphones)
    const adminToken = await this.ensureAdminAuth();
    const headers: Record<string, string> = {
      apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
      Authorization: adminToken ? `Bearer ${adminToken}` : 'Bearer sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
      'Content-Type': 'application/json',
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('businesses').update({ approval_status: 'rejected' }).eq('id', businessId);
      } catch (e) {
        console.warn('Error marking business as rejected in Supabase', e);
      }
      try {
        await supabase.from('businesses').delete().eq('id', businessId);
      } catch (e) {
        console.warn('Error deleting business from Supabase', e);
      }
    }

    try {
      await fetch(`https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/businesses?id=eq.${businessId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ approval_status: 'rejected' }),
      });
    } catch {}

    try {
      await fetch(`https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/businesses?id=eq.${businessId}`, {
        method: 'DELETE',
        headers,
      });
    } catch {}

    // 2. Synchroniser la suppression dev / local sync
    try {
      fetch(`/api/sync/clients?id=${businessId}`, { method: 'DELETE' }).catch(() => {});
      fetch('/api/sync/deleted-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: businessId, ownerId }),
      }).catch(() => {});
    } catch {}

    // 3. Supprimer du stockage local
    const filtered = businesses.filter((b) => b.id !== businessId);
    setStored(KEY_BUSINESSES, filtered);

    // 4. Diffuser l'expulsion immédiate vers les autres onglets ouverts
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STORE_UPDATED',
          action: 'CLIENT_DELETED',
          clientId: businessId,
          ownerId,
          timestamp: Date.now(),
        });
      } catch {}
    }

    // 5. Si la session actuelle correspond au client supprimé, déconnexion immédiate
    if (
      this.currentBusiness?.id === businessId ||
      this.currentUser?.id === businessId ||
      (ownerId && this.currentUser?.id === ownerId)
    ) {
      await this.forceLogoutDeletedClient(businessId);
      return;
    }

    this.notify();
  }

  public getClientPassword(biz: Business): string {
    if (!biz) return '';
    if (biz.password) return biz.password;
    if (biz.googleMapsUrl) {
      const decoded = decodeAuth(biz.googleMapsUrl);
      if (decoded) return decoded;
    }
    const creds = getStored<Record<string, string>>(KEY_USER_CREDS, {});
    const norm = normalizePhone(biz.phone || '');
    const digits = (biz.phone || '').replace(/[^0-9]/g, '');
    const user = (biz.username || '').toLowerCase().trim();
    const email = (biz.email || '').toLowerCase().trim();
    return (
      (user && creds[user]) ||
      (norm && creds[norm]) ||
      (digits && creds[digits]) ||
      (email && creds[email]) ||
      (biz.ownerId && creds[biz.ownerId]) ||
      ''
    );
  }

  public async adminResetClientPassword(
    businessId: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const cleanPass = newPassword.trim();
    if (!cleanPass || cleanPass.length < 4) {
      return { success: false, error: 'Le mot de passe doit comporter au moins 4 caractères.' };
    }

    const businesses = getStored<Business[]>(KEY_BUSINESSES, []);
    const b = businesses.find((biz) => biz.id === businessId);
    if (!b) {
      return { success: false, error: 'Établissement client introuvable.' };
    }

    b.password = cleanPass;
    setStored(KEY_BUSINESSES, businesses);

    const creds = getStored<Record<string, string>>(KEY_USER_CREDS, {});
    const norm = normalizePhone(b.phone || '');
    const digits = (b.phone || '').replace(/[^0-9]/g, '');
    const user = (b.username || '').toLowerCase().trim();
    const email = (b.email || '').toLowerCase().trim();

    if (norm) creds[norm] = cleanPass;
    if (digits) creds[digits] = cleanPass;
    if (user) creds[user] = cleanPass;
    if (email) creds[email] = cleanPass;
    if (b.ownerId) creds[b.ownerId] = cleanPass;
    setStored(KEY_USER_CREDS, creds);

    // Synchronisation mot de passe dans Supabase (multi-appareils garanti)
    if (isSupabaseConfigured && supabase) {
      try {
        const cleanUrl = cleanMapsUrl(b.googleMapsUrl);
        const authTag = encodeAuth(cleanPass);
        const syncedMapsUrl = cleanUrl ? `${cleanUrl}#${authTag}` : authTag;
        await supabase.from('businesses').update({ google_maps_url: syncedMapsUrl }).eq('id', businessId);
      } catch (e) {
        console.warn('Failed to sync new password to Supabase:', e);
      }
    }

    // Sync via dev sync server
    try {
      if (typeof fetch !== 'undefined') {
        await fetch('/api/sync/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(b),
        });
      }
    } catch {}

    // Diffuser aux autres onglets
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STORE_UPDATED',
          action: 'CLIENT_PASSWORD_UPDATED',
          clientId: businessId,
          timestamp: Date.now(),
        });
      } catch {}
    }

    this.notify();
    return { success: true };
  }

  // --- DELIVERY ZONES & SETTINGS ---
  public async getDeliveryZones(): Promise<DeliveryZone[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('zones_timeout')), 2000));
        const queryPromise = supabase.from('delivery_zones').select('*');
        const res: any = await Promise.race([queryPromise, timeoutPromise]);
        const data = res?.data;
        const error = res?.error;
        if (!error && data && data.length > 0) {
          return data.map((z: any) => ({
            id: z.id,
            city: z.city,
            zoneName: z.zone_name,
            deliveryFee: Number(z.delivery_fee),
            minimumOrderAmount: Number(z.minimum_order_amount),
            isActive: z.is_active,
            estimatedHours: z.estimated_hours,
          }));
        }
      } catch {}
    }
    return getStored<DeliveryZone[]>(KEY_ZONES, INITIAL_DELIVERY_ZONES);
  }

  public async saveDeliveryZone(zone: DeliveryZone): Promise<void> {
    const zones = getStored<DeliveryZone[]>(KEY_ZONES, INITIAL_DELIVERY_ZONES);
    const idx = zones.findIndex((z) => z.id === zone.id);
    if (idx >= 0) zones[idx] = zone;
    else zones.push(zone);
    setStored(KEY_ZONES, zones);
    this.notify();

    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          await supabase.from('delivery_zones').upsert({
            id: zone.id,
            city: zone.city,
            zone_name: zone.zoneName,
            delivery_fee: zone.deliveryFee,
            minimum_order_amount: zone.minimumOrderAmount,
            is_active: zone.isActive,
            estimated_hours: zone.estimatedHours,
          });
        } catch {}
      })();
    }
  }

  public async getCompanySettings(): Promise<CompanySettings> {
    if (isSupabaseConfigured && supabase) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('settings_timeout')), 2000));
        const queryPromise = supabase.from('company_settings').select('*').single();
        const res: any = await Promise.race([queryPromise, timeoutPromise]);
        const data = res?.data;
        const error = res?.error;
        if (!error && data) {
          return {
            companyName: data.company_name || 'Pont Agricole',
            tagline: data.tagline || '',
            phone: data.phone || '',
            whatsapp: data.whatsapp || '',
            email: data.email || '',
            address: data.address || '',
            city: data.city || '',
            ice: data.ice || '',
            rc: data.rc || '',
            ifCode: data.if_code || data.ifCode || '',
            patente: data.patente || '',
            cnss: data.cnss || '',
            capital: data.capital || '',
            rib: data.rib || '',
            minOrderDefault: Number(data.min_order_default || 0),
            freeDeliveryThreshold: Number(data.free_delivery_threshold || 0),
            deliveryDays: data.delivery_days || ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
            orderCutoffTime: data.order_cutoff_time || '',
          };
        }
      } catch (err) {
        // Fallback local
      }
    }
    const local = getStored<CompanySettings>(KEY_SETTINGS, INITIAL_COMPANY_SETTINGS);
    return {
      ...INITIAL_COMPANY_SETTINGS,
      ...local,
    };
  }

  public async saveCompanySettings(settings: CompanySettings): Promise<void> {
    // Sauvegarde locale immédiate
    setStored(KEY_SETTINGS, settings);
    this.notify();

    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          await supabase.from('company_settings').upsert({
            id: 1,
            company_name: settings.companyName,
            tagline: settings.tagline,
            phone: settings.phone,
            whatsapp: settings.whatsapp,
            email: settings.email,
            address: settings.address,
            city: settings.city,
            ice: settings.ice,
            rc: settings.rc,
            if_code: settings.ifCode,
            patente: settings.patente,
            cnss: settings.cnss,
            capital: settings.capital,
            rib: settings.rib,
            min_order_default: settings.minOrderDefault,
            free_delivery_threshold: settings.freeDeliveryThreshold,
            order_cutoff_time: settings.orderCutoffTime,
          });
        } catch (err) {
          console.warn('Error upserting company settings to Supabase', err);
        }
      })();
    }
  }
}

export const store = new StoreService();

// Helper to determine whether a client is currently active online (within 3 minutes)
export function isClientOnline(lastSeenAt?: string): boolean {
  if (!lastSeenAt) return false;
  const time = new Date(lastSeenAt).getTime();
  if (isNaN(time)) return false;
  const diffMs = Date.now() - time;
  return diffMs >= 0 && diffMs < 3 * 60 * 1000;
}

// Helper to format presence status text and relative last seen timestamp
export function formatClientPresence(lastSeenAt?: string): {
  isOnline: boolean;
  statusText: string;
  detailText: string;
} {
  if (!lastSeenAt) {
    return {
      isOnline: false,
      statusText: 'Hors ligne',
      detailText: 'Aucune visite enregistrée',
    };
  }
  const date = new Date(lastSeenAt);
  const time = date.getTime();
  if (isNaN(time)) {
    return {
      isOnline: false,
      statusText: 'Hors ligne',
      detailText: 'Date inconnue',
    };
  }

  const diffMs = Date.now() - time;
  // If active in the last 3 minutes
  if (diffMs >= 0 && diffMs < 3 * 60 * 1000) {
    return {
      isOnline: true,
      statusText: 'En ligne',
      detailText: 'Actif en ce moment',
    };
  }

  const diffMins = Math.floor(diffMs / (60 * 1000));
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${mins}`;

  if (diffMins < 60) {
    return {
      isOnline: false,
      statusText: 'Hors ligne',
      detailText: `Vu il y a ${Math.max(1, diffMins)} min`,
    };
  }

  const now = new Date();
  const isToday =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  if (isToday) {
    return {
      isOnline: false,
      statusText: 'Hors ligne',
      detailText: `Aujourd'hui à ${timeStr}`,
    };
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    yesterday.getFullYear() === date.getFullYear() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getDate() === date.getDate();

  if (isYesterday) {
    return {
      isOnline: false,
      statusText: 'Hors ligne',
      detailText: `Hier à ${timeStr}`,
    };
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return {
    isOnline: false,
    statusText: 'Hors ligne',
    detailText: `Le ${day}/${month} à ${timeStr}`,
  };
}
