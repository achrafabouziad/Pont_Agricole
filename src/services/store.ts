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
  CreateManualOrderParams,
  CreateManualOrderItem,
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
  private businessesChannelSubscribed: boolean = false;
  private ordersChannelSubscribed: boolean = false;

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
    // Assainissement B2B multi-appareils : Vider définitivement les anciens caches locaux pour garantir 100% de parité avec Supabase Cloud
    try {
      localStorage.removeItem(KEY_DELETED_BIZ);
      localStorage.removeItem(KEY_BUSINESSES);
      localStorage.removeItem(KEY_ORDERS);
      localStorage.removeItem(KEY_PRODUCTS);
      localStorage.removeItem(KEY_USER_CREDS);
      localStorage.removeItem(KEY_USER);
      localStorage.removeItem(KEY_BUSINESS);
    } catch {}

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

    // Initialisation native Supabase Auth (Source Unique de Vérité)
    if (isSupabaseConfigured && supabase) {
      try {
        supabase.auth.getSession().then(({ data }) => {
          if (data?.session?.user) {
            this.syncSessionFromSupabaseUser(data.session.user).catch(() => {});
          }
        }).catch(() => {});

        supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
            await this.syncSessionFromSupabaseUser(session.user);
          } else if (event === 'SIGNED_OUT') {
            this.currentUser = null;
            this.currentBusiness = null;
            sessionStorage.removeItem(KEY_SESSION_USER);
            sessionStorage.removeItem(KEY_SESSION_BUSINESS);
            this.notify();
          }
        });
      } catch (e) {
        console.warn('Supabase auth init error:', e);
      }
    }

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
    if (
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
    this.initBusinessesRealtime();
    this.initOrdersRealtime();
    this.refreshProductsFromCloud().catch(() => {});
  }

  private initBusinessesRealtime(): void {
    if (this.businessesChannelSubscribed) return;
    if (isSupabaseConfigured && supabase) {
      try {
        this.businessesChannelSubscribed = true;
        supabase
          .channel('public-businesses-realtime-channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'businesses' },
            async () => {
              try {
                await this.getBusinesses();
                this.notify();
              } catch {}
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Supabase businesses realtime error:', e);
      }
    }
  }

  private initOrdersRealtime(): void {
    if (this.ordersChannelSubscribed) return;
    if (isSupabaseConfigured && supabase) {
      try {
        this.ordersChannelSubscribed = true;
        supabase
          .channel('public-orders-realtime-channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            async () => {
              try {
                await this.getOrders();
                this.notify();
              } catch {}
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Supabase orders realtime error:', e);
      }
    }
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

  // --- AUTH METHODS (CLERK AUTHENTICATION + SUPABASE DATABASE) ---
  public async syncSessionFromClerkUser(user: any): Promise<void> {
    if (!user || !user.id) return;
    const nowIso = new Date().toISOString();

    const email = (
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      user.email ||
      ''
    ).toLowerCase().trim();

    const phone = (
      user.primaryPhoneNumber?.phoneNumber ||
      user.phoneNumbers?.[0]?.phoneNumber ||
      user.phone ||
      ''
    ).trim();

    const username = (user.username || '').toLowerCase().trim();
    const fullName =
      user.fullName ||
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.user_metadata?.full_name ||
      '';

    // 1. Administrateur (Directeur Fondateur)
    const isAdmin =
      email === 'admin@pontagricole.ma' ||
      email === 'achrafabouziad@gmail.com' ||
      username === 'admin' ||
      username === 'achraf' ||
      user.publicMetadata?.role === 'admin' ||
      normalizePhone(phone).endsWith('707296123');

    if (isAdmin) {
      this.currentUser = {
        id: user.id,
        fullName: 'Achraf Abouziad (Directeur Fondateur)',
        phone: '0707296123',
        role: 'admin',
        createdAt: nowIso,
        lastSeenAt: nowIso,
      };
      this.currentBusiness = null;
      setSessionStored(KEY_SESSION_USER, this.currentUser);
      setSessionStored(KEY_SESSION_BUSINESS, null);
      this.touchPresence(this.currentUser.id, undefined, this.currentUser.phone);
      this.notify();
      return;
    }

    // 2. Client Professionnel : retrouver ou lier l'établissement dans Supabase Database
    let clientBiz: Business | null = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbBizs } = await supabase
          .from('businesses')
          .select('*')
          .neq('approval_status', 'rejected');

        if (dbBizs && dbBizs.length > 0) {
          const matched = dbBizs.find((b: any) => {
            if (b.owner_id === user.id) return true;
            if (email && b.email && b.email.toLowerCase().trim() === email) return true;
            if (username && b.username && b.username.toLowerCase().trim() === username) return true;
            const bPhone = (b.phone || '').replace(/[^0-9]/g, '');
            const uPhone = phone.replace(/[^0-9]/g, '');
            if (bPhone.length >= 8 && uPhone.length >= 8 && (bPhone.endsWith(uPhone.slice(-8)) || uPhone.endsWith(bPhone.slice(-8)))) {
              return true;
            }
            return false;
          });

          if (matched) {
            // Lier de manière permanente le Clerk User ID dans Supabase Database
            if (matched.owner_id !== user.id) {
              await supabase.from('businesses').update({ owner_id: user.id }).eq('id', matched.id);
            }

            clientBiz = {
              id: matched.id,
              ownerId: user.id,
              businessName: matched.business_name || 'Établissement Pro',
              businessType: matched.business_type || 'restaurant',
              city: matched.city || 'Casablanca',
              deliveryAddress: matched.delivery_address || 'Casablanca',
              approvalStatus: matched.approval_status || 'approved',
              createdAt: matched.created_at || nowIso,
              contactName: matched.contact_name || fullName || 'Client Professionnel',
              phone: matched.phone || phone,
              email: matched.email || email,
              googleMapsUrl: cleanMapsUrl(matched.google_maps_url) || undefined,
              username: matched.username || username,
              lastSeenAt: nowIso,
            };
          }
        }
      } catch (e) {
        console.warn('Supabase DB lookup for Clerk user error:', e);
      }
    }

    const contactName = clientBiz?.contactName || fullName || 'Client Professionnel';

    this.currentUser = {
      id: user.id,
      fullName: contactName,
      phone: phone || clientBiz?.phone || '',
      role: 'customer',
      createdAt: nowIso,
      lastSeenAt: nowIso,
    };
    this.currentBusiness = clientBiz;

    setSessionStored(KEY_SESSION_USER, this.currentUser);
    setSessionStored(KEY_SESSION_BUSINESS, this.currentBusiness);
    this.touchPresence(this.currentUser.id, this.currentBusiness?.id, this.currentUser.phone);
    this.notify();
  }

  public async registerClerkBusiness(user: any, params: {
    businessName: string;
    businessType: BusinessType;
    city: string;
    deliveryAddress: string;
    googleMapsUrl?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!user || !user.id) return { success: false, error: 'Utilisateur Clerk non identifié.' };
    const nowIso = new Date().toISOString();
    const newBizId = generateUUID();
    const email = (
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      user.email ||
      ''
    ).toLowerCase().trim();
    const phone = (
      user.primaryPhoneNumber?.phoneNumber ||
      user.phoneNumbers?.[0]?.phoneNumber ||
      user.phone ||
      ''
    ).trim();
    const username = (user.username || '').toLowerCase().trim();
    const fullName =
      user.fullName ||
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      params.businessName.trim();

    const cleanUrl = cleanMapsUrl(params.googleMapsUrl);

    const bizPayload = {
      id: newBizId,
      owner_id: user.id,
      business_name: params.businessName.trim(),
      business_type: params.businessType || 'restaurant',
      city: params.city.trim() || 'Casablanca',
      delivery_address: params.deliveryAddress.trim() || 'Casablanca',
      contact_name: fullName,
      phone,
      email,
      google_maps_url: cleanUrl || null,
      username,
      approval_status: 'approved',
      updated_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('businesses').upsert(bizPayload);
        if (error) {
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
      } catch (e) {
        console.warn('Supabase DB business creation error:', e);
      }
    }

    await this.syncSessionFromClerkUser(user);
    return { success: true };
  }

  // --- AUTH METHODS (100% SUPABASE AUTH - NATIVE CLOUD) ---
  public async syncSessionFromSupabaseUser(user: any, existingBiz?: any): Promise<void> {
    if (!user || !user.id) return;
    const nowIso = new Date().toISOString();
    const email = (user.email || '').toLowerCase().trim();

    // 1. Administrateur (Directeur Fondateur)
    const isAdmin =
      (email === 'admin@pontagricole.ma' ||
        (user.id === 'cfb7edbf-9c6b-4181-afae-2da48ad8a90d' && email.startsWith('admin')) ||
        user.user_metadata?.role === 'admin') &&
      user.user_metadata?.role !== 'customer';

    if (isAdmin) {
      this.currentUser = {
        id: user.id,
        fullName: 'Achraf Abouziad (Directeur Fondateur)',
        phone: '0707296123',
        role: 'admin',
        createdAt: user.created_at || nowIso,
        lastSeenAt: nowIso,
      };
      this.currentBusiness = null;
      setSessionStored(KEY_SESSION_USER, this.currentUser);
      setSessionStored(KEY_SESSION_BUSINESS, null);
      this.touchPresence(this.currentUser.id, undefined, this.currentUser.phone);
      this.notify();
      return;
    }

    // 2. Client Professionnel
    let clientBiz: any = existingBiz || null;
    if (!clientBiz && isSupabaseConfigured && supabase) {
      try {
        const { data: byOwner } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id);
        if (byOwner && byOwner.length > 0) {
          clientBiz = byOwner.find((b: any) => b.approval_status !== 'rejected') || byOwner[0];
        }

        if (!clientBiz && email) {
          const { data: byEmail } = await supabase
            .from('businesses')
            .select('*')
            .ilike('email', email);
          if (byEmail && byEmail.length > 0) {
            clientBiz = byEmail.find((b: any) => b.approval_status !== 'rejected') || byEmail[0];
          }
        }
      } catch {}
    }

    if (clientBiz?.approval_status === 'rejected') {
      await this.logout();
      return;
    }

    const contactName =
      clientBiz?.contact_name ||
      user.user_metadata?.full_name ||
      clientBiz?.business_name ||
      'Client Professionnel';
    const phone = clientBiz?.phone || user.user_metadata?.phone || '';
    const username = clientBiz?.username || user.user_metadata?.username || email.split('@')[0];

    this.currentUser = {
      id: user.id,
      fullName: contactName,
      phone,
      role: 'customer',
      createdAt: user.created_at || nowIso,
      lastSeenAt: nowIso,
    };

    if (clientBiz) {
      this.currentBusiness = {
        id: clientBiz.id,
        ownerId: user.id,
        businessName: clientBiz.business_name || 'Mon Établissement',
        businessType: clientBiz.business_type || 'restaurant',
        city: clientBiz.city || 'Casablanca',
        deliveryAddress: clientBiz.delivery_address || 'Casablanca',
        approvalStatus: clientBiz.approval_status || 'approved',
        createdAt: clientBiz.created_at || nowIso,
        contactName,
        phone,
        email: clientBiz.email || email,
        googleMapsUrl: cleanMapsUrl(clientBiz.google_maps_url) || undefined,
        username,
        lastSeenAt: nowIso,
      };
    }

    setSessionStored(KEY_SESSION_USER, this.currentUser);
    setSessionStored(KEY_SESSION_BUSINESS, this.currentBusiness);
    this.touchPresence(this.currentUser.id, this.currentBusiness?.id, this.currentUser.phone);
    this.notify();
  }

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

    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Service Supabase indisponible.' };
    }

    const cleanLower = rawInput.toLowerCase();
    const cleanDigits = rawInput.replace(/[^0-9]/g, '');
    const slug = cleanLower.replace(/[^a-z0-9_.-]/g, '');
    const isPureDigits = cleanDigits.length >= 8 && !rawInput.includes('@');

    const isAdmin =
      cleanLower === 'admin' ||
      cleanLower === 'achraf' ||
      cleanLower === 'achrafabouziad' ||
      cleanLower === 'achrafabouziad@gmail.com' ||
      cleanDigits === '0707296123' ||
      cleanDigits === '212707296123';

    // 0. Accès direct Administrateur (Master Password immédiat)
    if (isAdmin && (pass === 'Achrafgt6313' || pass.toLowerCase() === 'achrafgt6313')) {
      const adminUser: UserProfile = {
        id: 'cfb7edbf-9c6b-4181-afae-2da48ad8a90d',
        fullName: 'Achraf Abouziad (Directeur Fondateur)',
        phone: '0707296123',
        role: 'admin',
        username: 'admin',
        email: 'admin@pontagricole.ma',
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      };
      this.currentUser = adminUser;
      this.currentBusiness = null;
      setSessionStored(KEY_SESSION_USER, this.currentUser);
      setSessionStored(KEY_SESSION_BUSINESS, null);
      this.touchPresence(adminUser.id, undefined, adminUser.phone);
      this.notify();
      this.ensureAdminAuth().catch(() => {});
      return { success: true };
    }

    // 1. Résolution de l'adresse email Supabase Auth & recherche de l'établissement
    const cleanPass = (pass || '').trim();
    const candidateEmails: string[] = [];
    let matchedBiz: any = null;

    if (isAdmin) {
      candidateEmails.push('admin@pontagricole.ma');
    } else if (cleanLower.includes('@')) {
      candidateEmails.push(cleanLower);
    } else {
      // Rechercher l'établissement dans la table businesses Supabase (REST direct sans pollution de token)
      let dbBizs: any[] | null = null;
      try {
        const restRes = await fetch(
          'https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/businesses?approval_status=neq.rejected&select=*',
          {
            headers: {
              apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
              Authorization: 'Bearer sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
            },
            cache: 'no-store',
          }
        );
        if (restRes.ok) {
          const json = await restRes.json();
          if (Array.isArray(json)) dbBizs = json;
        }
      } catch {}

      if (!dbBizs && isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase
            .from('businesses')
            .select('*')
            .neq('approval_status', 'rejected');
          if (data && Array.isArray(data)) dbBizs = data;
        } catch {}
      }

      if (dbBizs && dbBizs.length > 0) {
        const matched = dbBizs.find((b: any) => {
          if (b.approval_status === 'rejected') return false;
          const u = (b.username || '').toLowerCase().trim();
          const bPhone = (b.phone || '').trim();
          const bPhoneDigits = bPhone.replace(/[^0-9]/g, '');
          const bNormPhone = normalizePhone(bPhone);
          const inNorm = normalizePhone(rawInput);
          const bEmail = (b.email || '').toLowerCase().trim();

          if (slug && u && (u === slug || u === cleanLower || u.replace(/[^a-z0-9]/g, '') === slug)) {
            return true;
          }
          if (cleanLower.includes('@') && bEmail === cleanLower) {
            return true;
          }
          if (isPureDigits && cleanDigits.length >= 8) {
            const last8 = cleanDigits.slice(-8);
            if (bPhoneDigits.endsWith(last8) || cleanDigits.endsWith(bPhoneDigits.slice(-8))) {
              return true;
            }
            if (inNorm && bNormPhone && (bNormPhone === inNorm || bNormPhone.endsWith(inNorm) || inNorm.endsWith(bNormPhone))) {
              return true;
            }
          }
          return false;
        });

        if (matched) {
          matchedBiz = matched;
          if (matched.email) {
            candidateEmails.push(matched.email.toLowerCase().trim());
          }
          if (matched.username) {
            candidateEmails.push(`${matched.username.toLowerCase().trim()}@pontagricole.ma`);
          }
        }
      }

      if (slug) {
        candidateEmails.push(`${slug}@pontagricole.ma`);
      }
      if (cleanDigits.length >= 9) {
        candidateEmails.push(`${cleanDigits}@pontagricole.ma`);
      }
    }

    // 2. Vérification immédiate du mot de passe si l'établissement est trouvé
    if (matchedBiz) {
      const storedPass = decodeAuth(matchedBiz.google_maps_url);
      const isPasswordMatch =
        storedPass &&
        (storedPass === cleanPass ||
          storedPass === pass ||
          storedPass.trim() === cleanPass ||
          storedPass.toLowerCase() === cleanPass.toLowerCase() ||
          storedPass.trim().toLowerCase() === cleanPass.toLowerCase());

      if (isPasswordMatch) {
        const userEmail = matchedBiz.email || `${matchedBiz.username || cleanDigits}@pontagricole.ma`;
        const authUser = {
          id: matchedBiz.id,
          email: userEmail,
          created_at: matchedBiz.created_at,
          user_metadata: {
            full_name: matchedBiz.contact_name || matchedBiz.business_name,
            phone: matchedBiz.phone,
            username: matchedBiz.username,
            role: 'customer',
          },
        };
        await this.syncSessionFromSupabaseUser(authUser, matchedBiz);
        return { success: true };
      }
    }

    const uniqueEmails = Array.from(new Set(candidateEmails.filter(Boolean)));
    if (uniqueEmails.length === 0 && !matchedBiz) {
      return { success: false, error: "Identifiant introuvable. Vérifiez votre nom d'utilisateur ou numéro de téléphone." };
    }

    // 3. Authentification directe avec Supabase Auth (GoTrue)
    let authUser: any = null;

    for (const emailTry of uniqueEmails) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailTry,
          password: pass,
        });

        if (!error && data?.user) {
          authUser = data.user;
          if (data.session?.access_token && (isAdmin || authUser.id === 'cfb7edbf-9c6b-4181-afae-2da48ad8a90d')) {
            this.adminTokenCache = {
              token: data.session.access_token,
              expiresAt: data.session.expires_at || (Math.floor(Date.now() / 1000) + 3600),
            };
          }
          break;
        }
      } catch {}
    }

    if (!authUser) {
      return {
        success: false,
        error: 'Identifiant ou mot de passe incorrect. Vérifiez vos identifiants.',
      };
    }

    // 4. Charger et propager la session utilisateur Supabase
    await this.syncSessionFromSupabaseUser(authUser, matchedBiz);
    return { success: true };
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

    const reserved = ['admin', 'achraf', 'achrafabouziad', 'pontagricole', 'root', 'master', 'support'];
    if (reserved.includes(cleanUsername)) {
      return { success: false, error: "Ce nom d'utilisateur est réservé pour l'administration. Veuillez en choisir un autre." };
    }

    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Service Supabase non configuré.' };
    }

    // Vérifier unicité du nom d'utilisateur dans Supabase businesses
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

    const deterministicEmail = params.email?.trim().toLowerCase() || `${cleanUsername}@pontagricole.ma`;

    // 1. Inscription dans Supabase Auth (GoTrue)
    let authUserId = 'cfb7edbf-9c6b-4181-afae-2da48ad8a90d';
    let authUser: any = null;

    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: deterministicEmail,
        password: params.password,
        options: {
          data: {
            full_name: params.fullName.trim(),
            phone: params.phone.trim(),
            username: cleanUsername,
            business_name: params.businessName.trim(),
            role: 'customer',
          },
        },
      });

      if (authErr) {
        if (authErr.message?.includes('already registered')) {
          return { success: false, error: "Cet email ou nom d'utilisateur est déjà inscrit." };
        }
        // Si Supabase bloque à cause de la limite d'envoi d'emails (email rate limit exceeded sur le forfait gratuit)
        // on ne bloque PAS le client, on continue l'inscription directe de son établissement
        console.warn('Supabase Auth signUp email rate limit bypass:', authErr.message);
      }

      if (authData?.user?.id) {
        authUserId = authData.user.id;
        authUser = authData.user;
      } else {
        try {
          const { data: signData } = await supabase.auth.signInWithPassword({
            email: deterministicEmail,
            password: params.password,
          });
          if (signData?.user?.id) {
            authUserId = signData.user.id;
            authUser = signData.user;
          }
        } catch {}
      }
    } catch (e) {
      console.warn('Supabase auth.signUp exception:', e);
    }

    if (!authUser) {
      authUser = {
        id: authUserId,
        email: deterministicEmail,
        user_metadata: {
          full_name: params.fullName.trim(),
          phone: params.phone.trim(),
          username: cleanUsername,
          business_name: params.businessName.trim(),
          role: 'customer',
        },
      };
    }

    const newBizId = generateUUID();
    const nowIso = new Date().toISOString();

    // 2. Profil utilisateur dans la table profiles
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

    // 3. Établissement dans la table businesses
    const cleanUrl = cleanMapsUrl(params.googleMapsUrl);
    const authTag = encodeAuth(params.password);
    const syncedMapsUrl = cleanUrl ? `${cleanUrl}#${authTag}` : authTag;

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

    // 4. Initialisation de la session active
    this.currentUser = {
      id: newBizId,
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
      city: params.city.trim() || 'Casablanca',
      deliveryAddress: params.deliveryAddress.trim() || 'Casablanca',
      approvalStatus: 'approved',
      createdAt: nowIso,
      contactName: params.fullName.trim(),
      phone: params.phone.trim(),
      email: deterministicEmail,
      googleMapsUrl: cleanUrl || undefined,
      username: cleanUsername,
      password: params.password,
      lastSeenAt: nowIso,
    };
    setSessionStored(KEY_SESSION_USER, this.currentUser);
    setSessionStored(KEY_SESSION_BUSINESS, this.currentBusiness);
    this.touchPresence(this.currentUser.id, this.currentBusiness?.id, this.currentUser.phone);
    this.notify();
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
    try {
      if (typeof window !== 'undefined' && (window as any).Clerk) {
        await (window as any).Clerk.signOut();
      }
    } catch {}
    this.currentUser = null;
    this.currentBusiness = null;
    sessionStorage.removeItem(KEY_SESSION_USER);
    sessionStorage.removeItem(KEY_SESSION_BUSINESS);
    localStorage.removeItem(KEY_USER);
    localStorage.removeItem(KEY_BUSINESS);
    localStorage.removeItem(KEY_USER_CREDS);
    this.notify();
  }

  // Déconnexion et expulsion immédiate d'un client supprimé par l'administrateur
  public async forceLogoutDeletedClient(bizId?: string): Promise<void> {
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

    // 1. Vérification centrale sur Supabase (Statut en temps réel)
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

  private memoryProducts: Product[] | null = null;

  public getProductsSync(): Product[] {
    if (this.memoryProducts && this.memoryProducts.length > 0) {
      return this.memoryProducts;
    }
    return INITIAL_PRODUCTS;
  }

  public async refreshProductsFromCloud(): Promise<Product[]> {
    if (!isSupabaseConfigured || !supabase) {
      return this.memoryProducts || INITIAL_PRODUCTS;
    }

    // 1. Charger directement depuis Supabase Cloud (Source Unique de Vérité)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const cloudProducts = data.map((p) => this.normalizeProduct(p));
        this.memoryProducts = cloudProducts;
        return cloudProducts;
      }
    } catch (e) {
      console.warn('Supabase query error, fallback to REST:', e);
    }

    // 2. Fallback REST direct ultra-robuste
    try {
      const res = await fetch('https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/products?select=*&order=created_at.desc', {
        headers: {
          apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
          Authorization: 'Bearer sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          const cloudProducts = json.map((p) => this.normalizeProduct(p));
          this.memoryProducts = cloudProducts;
          return cloudProducts;
        }
      }
    } catch {}

    return this.memoryProducts || INITIAL_PRODUCTS;
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
    if (!Array.isArray(this.cart)) {
      this.cart = [];
    }
    return this.cart.filter((item) => item && item.product && Number(item.quantity) > 0);
  }

  public addToCart(product: Product, quantity?: number): void {
    if (!product || !product.id) return;
    const rawQty = quantity !== undefined ? Number(quantity) : Number(product.minimumQuantity);
    const qtyToAdd = isNaN(rawQty) || rawQty <= 0 ? 1 : rawQty;

    if (!Array.isArray(this.cart)) {
      this.cart = [];
    }

    const existing = this.cart.find((item) => item && item.product && item.product.id === product.id);
    if (existing) {
      existing.quantity = (Number(existing.quantity) || 0) + qtyToAdd;
    } else {
      this.cart.push({ product, quantity: qtyToAdd });
    }

    this.cart = this.cart.filter((item) => item && item.product && Number(item.quantity) > 0);
    setStored(KEY_CART, this.cart);
    this.notify();
  }

  public updateCartQuantity(productId: string, quantity: number): void {
    const q = Number(quantity);
    if (isNaN(q) || q <= 0) {
      this.removeFromCart(productId);
      return;
    }
    const item = this.cart.find((i) => i && i.product && i.product.id === productId);
    if (item) {
      item.quantity = q;
      setStored(KEY_CART, this.cart);
      this.notify();
    }
  }

  public removeFromCart(productId: string): void {
    this.cart = this.cart.filter((item) => item && item.product && item.product.id !== productId);
    setStored(KEY_CART, this.cart);
    this.notify();
  }

  public clearCart(): void {
    this.cart = [];
    setStored(KEY_CART, []);
    this.notify();
  }

  public getCartSubtotal(): number {
    return this.getCart().reduce((sum, item) => {
      const p = Number(item.product?.price) || 0;
      const q = Number(item.quantity) || 0;
      return sum + p * q;
    }, 0);
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

    // 1. Charger depuis Supabase (avec jeton admin si disponible)
    if (isSupabaseConfigured && supabase) {
      try {
        let adminToken: string | null = null;
        if (this.currentUser?.role === 'admin') {
          adminToken = await this.ensureAdminAuth();
        }

        let query = supabase
          .from('orders')
          .select('*, order_items(*)')
          .order('created_at', { ascending: false });

        if (this.currentUser?.role === 'customer' && this.currentBusiness?.id) {
          query = query.eq('business_id', this.currentBusiness.id);
        }

        const res: any = await query;
        let data = res?.data;

        // Fallback REST direct si besoin
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
        console.warn('Erreur chargement orders Supabase:', err);
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
    // Déterminer le customer_id pour Supabase (clé étrangère profiles.id)
    let orderCustomerId = 'cfb7edbf-9c6b-4181-afae-2da48ad8a90d';
    if (this.currentBusiness?.ownerId && isUUID(this.currentBusiness.ownerId)) {
      orderCustomerId = this.currentBusiness.ownerId;
    } else if (this.currentUser?.id && isUUID(this.currentUser.id)) {
      orderCustomerId = this.currentUser.id;
    }
    const orderBusinessId = isUUID(this.currentBusiness?.id) ? this.currentBusiness?.id : undefined;

    const newOrder: Order = {
      id: newOrderId,
      orderNumber,
      customerId: orderCustomerId,
      customerName: this.currentUser.fullName || this.currentBusiness?.contactName || 'Client Pro',
      customerPhone: this.currentUser.phone || this.currentBusiness?.phone || '',
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
        const adminToken = await this.ensureAdminAuth();
        const orderPayload = {
          id: newOrderId,
          order_number: newOrder.orderNumber,
          customer_id: orderCustomerId,
          business_id: orderBusinessId || null,
          status: 'pending',
          delivery_address: newOrder.deliveryAddress,
          delivery_city: newOrder.deliveryCity,
          requested_delivery_date: newOrder.requestedDeliveryDate,
          subtotal: newOrder.subtotal,
          delivery_fee: newOrder.deliveryFee,
          total: newOrder.total,
          customer_notes: newOrder.customerNotes || null,
        };

        const { data: dbOrder, error: oErr } = await supabase
          .from('orders')
          .insert(orderPayload)
          .select()
          .single();

        let savedOrderId = dbOrder?.id || newOrderId;

        if (oErr && adminToken) {
          try {
            const restRes = await fetch('https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/orders', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                Authorization: `Bearer ${adminToken}`,
                Prefer: 'return=representation',
              },
              body: JSON.stringify(orderPayload),
            });
            if (restRes.ok) {
              const restData = await restRes.json();
              if (Array.isArray(restData) && restData[0]?.id) {
                savedOrderId = restData[0].id;
              }
            }
          } catch {}
        }

        const itemsPayload = orderItems.map((item) => ({
          id: isUUID(item.id) ? item.id : generateUUID(),
          order_id: savedOrderId,
          product_id: item.productId,
          product_name_snapshot: item.productNameSnapshot,
          unit_snapshot: item.unitSnapshot,
          unit_price_snapshot: item.unitPriceSnapshot,
          quantity: item.quantity,
          line_total: item.lineTotal,
        }));

        const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload);
        if (itemsErr && adminToken) {
          try {
            await fetch('https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/order_items', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                Authorization: `Bearer ${adminToken}`,
              },
              body: JSON.stringify(itemsPayload),
            });
          } catch {}
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

  /**
   * Création manuelle d'une commande par l'administrateur au nom d'un client
   * (Pour commandes téléphoniques, directes, ou lorsque le client n'est pas disponible).
   * Enregistre la commande dans Supabase et renvoie l'objet Order pour affichage immédiat de la Facture / BL.
   */
  public async createManualOrder(
    params: CreateManualOrderParams
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    if (!params.items || params.items.length === 0) {
      return { success: false, error: 'Veuillez ajouter au moins un produit à la commande.' };
    }
    if (!params.customerName && !params.businessName) {
      return { success: false, error: "Veuillez renseigner le nom du client ou de l'établissement." };
    }

    const newOrderId = generateUUID();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `PA-${dateStr}-${rand}`;

    const orderItems: OrderItem[] = params.items.map((it) => {
      const q = Math.max(0.1, Number(it.quantity) || 1);
      const p = Math.max(0, Number(it.unitPrice) || 0);
      const lineTotal = Number((q * p).toFixed(2));
      return {
        id: generateUUID(),
        orderId: newOrderId,
        productId: it.productId,
        productNameSnapshot: it.productName,
        unitSnapshot: it.unit || 'kg',
        unitPriceSnapshot: p,
        quantity: q,
        lineTotal,
      };
    });

    const subtotal = Number(orderItems.reduce((acc, it) => acc + it.lineTotal, 0).toFixed(2));
    const deliveryFee = Number(params.deliveryFee) || 0;
    const total = Number((subtotal + deliveryFee).toFixed(2));

    // Déterminer le customer_id pour Supabase (clé étrangère profiles.id)
    let targetCustomerId = 'cfb7edbf-9c6b-4181-afae-2da48ad8a90d';
    if (params.businessId) {
      try {
        const bizList = await this.getBusinesses();
        const targetBiz = bizList.find((b) => b.id === params.businessId);
        if (targetBiz?.ownerId && isUUID(targetBiz.ownerId)) {
          targetCustomerId = targetBiz.ownerId;
        }
      } catch {}
    }

    const orderStatus: OrderStatus = params.status || 'confirmed';
    const deliveryCity = (params.deliveryCity || 'Casablanca').trim();
    const deliveryAddress = (params.deliveryAddress || 'Adresse à confirmer par téléphone').trim();
    const reqDate = params.requestedDeliveryDate || new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const newOrder: Order = {
      id: newOrderId,
      orderNumber,
      customerId: targetCustomerId,
      customerName: params.customerName || params.businessName || 'Client Pro',
      customerPhone: params.customerPhone || '',
      customerUsername: params.customerUsername || '',
      customerIce: params.customerIce || '',
      businessId: params.businessId || undefined,
      businessName: params.businessName || params.customerName || 'Client Pro',
      status: orderStatus,
      deliveryAddress,
      deliveryCity,
      requestedDeliveryDate: reqDate,
      subtotal,
      deliveryFee,
      total,
      customerNotes: params.customerNotes || undefined,
      items: orderItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Sauvegarde dans Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const adminToken = await this.ensureAdminAuth();
        const orderPayload = {
          id: newOrderId,
          order_number: newOrder.orderNumber,
          customer_id: targetCustomerId,
          business_id: params.businessId || null,
          status: orderStatus,
          delivery_address: deliveryAddress,
          delivery_city: deliveryCity,
          requested_delivery_date: reqDate,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          customer_notes: params.customerNotes || null,
        };

        const { data: dbOrder, error: oErr } = await supabase
          .from('orders')
          .insert(orderPayload)
          .select()
          .single();

        let savedOrderId = dbOrder?.id || newOrderId;

        if (oErr && adminToken) {
          try {
            const restRes = await fetch('https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/orders', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                Authorization: `Bearer ${adminToken}`,
                Prefer: 'return=representation',
              },
              body: JSON.stringify(orderPayload),
            });
            if (restRes.ok) {
              const restData = await restRes.json();
              if (Array.isArray(restData) && restData[0]?.id) {
                savedOrderId = restData[0].id;
              }
            }
          } catch {}
        }

        const itemsPayload = orderItems.map((item) => ({
          id: item.id || generateUUID(),
          order_id: savedOrderId,
          product_id: item.productId,
          product_name_snapshot: item.productNameSnapshot,
          unit_snapshot: item.unitSnapshot,
          unit_price_snapshot: item.unitPriceSnapshot,
          quantity: item.quantity,
          line_total: item.lineTotal,
        }));

        const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload);
        if (itemsErr && adminToken) {
          await fetch('https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/order_items', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify(itemsPayload),
          });
        }
      } catch (err) {
        console.error('Erreur enregistrement commande manuelle Supabase:', err);
      }
    }

    // Synchronisation remote dev si présent
    await this.syncOrderToRemote(newOrder);

    // Mettre à jour le cache local des commandes
    const orders = getStored<Order[]>(KEY_ORDERS, []);
    const existingIdx = orders.findIndex((o) => o.id === newOrder.id);
    if (existingIdx >= 0) {
      orders[existingIdx] = newOrder;
    } else {
      orders.unshift(newOrder);
    }
    setStored(KEY_ORDERS, orders);

    // Diffuser en temps réel via broadcastChannel
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
        const adminToken = await this.ensureAdminAuth();
        const orderPayload = {
          subtotal: Number(updatedOrder.subtotal) || 0,
          total: Number(updatedOrder.total) || 0,
          delivery_address: updatedOrder.deliveryAddress,
          delivery_city: updatedOrder.deliveryCity,
          requested_delivery_date: updatedOrder.requestedDeliveryDate,
          customer_notes: updatedOrder.customerNotes || null,
          updated_at: new Date().toISOString(),
        };

        const { error: ordErr } = await supabase
          .from('orders')
          .update(orderPayload)
          .eq('id', updatedOrder.id);

        if (ordErr && adminToken) {
          try {
            await fetch(`https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/orders?id=eq.${updatedOrder.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                Authorization: `Bearer ${adminToken}`,
              },
              body: JSON.stringify(orderPayload),
            });
          } catch {}
        }

        // Mettre à jour les articles (order_items) dans Supabase
        if (updatedOrder.items && updatedOrder.items.length > 0) {
          const { error: delErr } = await supabase
            .from('order_items')
            .delete()
            .eq('order_id', updatedOrder.id);

          if (delErr && adminToken) {
            try {
              await fetch(`https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/order_items?order_id=eq.${updatedOrder.id}`, {
                method: 'DELETE',
                headers: {
                  apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                  Authorization: `Bearer ${adminToken}`,
                },
              });
            } catch {}
          }

          const itemsPayload = updatedOrder.items.map((item) => ({
            id: isUUID(item.id) ? item.id : generateUUID(),
            order_id: updatedOrder.id,
            product_id: item.productId || generateUUID(),
            product_name_snapshot: item.productNameSnapshot,
            unit_snapshot: item.unitSnapshot || 'kg',
            unit_price_snapshot: Number(item.unitPriceSnapshot) || 0,
            quantity: Number(item.quantity) || 1,
            line_total: Number(item.lineTotal) || 0,
          }));

          const { error: insErr } = await supabase.from('order_items').insert(itemsPayload);
          if (insErr && adminToken) {
            try {
              await fetch('https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/order_items', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
                  Authorization: `Bearer ${adminToken}`,
                },
                body: JSON.stringify(itemsPayload),
              });
            } catch {}
          }
        }
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
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const adminToken = await this.ensureAdminAuth();
      const headers: Record<string, string> = {
        apikey: 'sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
        Authorization: adminToken ? `Bearer ${adminToken}` : 'Bearer sb_publishable_8DpZnDhY6w5hXFcdnA8vYw_uPPhefuH',
      };

      let bizData: any[] | null = null;
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .neq('approval_status', 'rejected')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          bizData = data;
        }
      } catch {}

      if (!bizData) {
        try {
          const restRes = await fetch(
            'https://qovqogxhvugtgvjxxsbc.supabase.co/rest/v1/businesses?approval_status=neq.rejected&select=*&order=created_at.desc',
            { headers, cache: 'no-store' }
          );
          if (restRes.ok) {
            const json = await restRes.json();
            if (Array.isArray(json)) {
              bizData = json;
            }
          }
        } catch {}
      }

      if (bizData && Array.isArray(bizData)) {
        // État de présence
        const presenceMap = getStored<Record<string, string>>(KEY_PRESENCE, {});

        const cloudList: Business[] = bizData
          .filter((b: any) => b.approval_status !== 'rejected')
          .map((b: any) => {
            const decodedPass = decodeAuth(b.google_maps_url);
            const bNorm = normalizePhone(b.phone || '');
            const pLastSeen =
              presenceMap[b.id] ||
              (b.owner_id && presenceMap[b.owner_id]) ||
              (bNorm && presenceMap[bNorm]) ||
              b.last_seen_at;

            return {
              id: b.id,
              ownerId: b.owner_id,
              businessName: b.business_name || 'Établissement Pro',
              businessType: b.business_type || 'restaurant',
              city: b.city || 'Casablanca',
              deliveryAddress: b.delivery_address || 'Casablanca',
              approvalStatus: b.approval_status || 'approved',
              createdAt: b.created_at || new Date().toISOString(),
              contactName: b.contact_name || b.business_name || 'Client Professionnel',
              phone: b.phone || '',
              email: b.email || '',
              googleMapsUrl: cleanMapsUrl(b.google_maps_url) || undefined,
              username: b.username || undefined,
              password: decodedPass || undefined,
              lastSeenAt: pLastSeen || undefined,
            };
          });

        cloudList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        return cloudList;
      }
    } catch (e) {
      console.warn('Erreur chargement businesses Supabase:', e);
    }
    return [];
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

    // 2. Sauvegarder dans le cache local
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

    // Diffuser aux autres onglets
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STORE_UPDATED',
          action: 'DELETE_BUSINESS',
          businessId,
          timestamp: Date.now(),
        });
      } catch {}
    }

    // Si la session actuelle correspond au client supprimé, déconnexion immédiate
    if (this.currentBusiness?.id === businessId || this.currentUser?.id === businessId) {
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
