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
  DEMO_ADMIN_PROFILE,
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

  constructor() {
    this.init();

    // Cross-tab synchronization via BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('pont_agricole_channel');
        this.broadcastChannel.onmessage = (ev) => {
          if (ev.data?.type === 'STORE_UPDATED') {
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
    if (!localStorage.getItem(KEY_PRODUCTS)) {
      setStored(KEY_PRODUCTS, INITIAL_PRODUCTS);
    }
    if (!localStorage.getItem(KEY_CATEGORIES)) {
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
    const cleanBiz = storedBiz.filter(
      (b) =>
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

    // Synchronisation automatique des comptes locaux vers Supabase
    if (isSupabaseConfigured && supabase) {
      setTimeout(async () => {
        try {
          const localBizs = getStored<Business[]>(KEY_BUSINESSES, []);
          const creds = getStored<Record<string, string>>(KEY_USER_CREDS, {});
          if (!localBizs || localBizs.length === 0) return;

          const { data: remoteBizs } = await supabase.from('businesses').select('*');
          for (const b of localBizs) {
            const bPhone = (b.phone || '').replace(/[^0-9]/g, '');
            const bUser = (b.username || '').toLowerCase().trim();
            const exists = (remoteBizs || []).some(
              (rb: any) =>
                (bUser && rb.username && rb.username.toLowerCase().trim() === bUser) ||
                (bPhone && rb.phone && rb.phone.replace(/[^0-9]/g, '') === bPhone)
            );

            if (!exists) {
              const pass =
                b.password ||
                (bUser && creds[bUser]) ||
                (bPhone && creds[bPhone]) ||
                creds[b.phone || ''] ||
                '123456';
              const email = b.email || `${bPhone || bUser || Date.now()}@phone.pontagricole.com`;

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

              const uid = authData?.user?.id || b.ownerId || `usr-${Date.now()}`;

              await supabase.from('profiles').upsert({
                id: uid,
                full_name: b.contactName || b.businessName,
                phone: b.phone || '',
                role: 'customer',
                email,
              });

              await supabase.from('businesses').insert({
                owner_id: uid,
                business_name: b.businessName,
                business_type: b.businessType || 'restaurant',
                city: b.city || 'Casablanca',
                delivery_address: b.deliveryAddress || '',
                contact_name: b.contactName || '',
                phone: b.phone || '',
                email,
                username: b.username || '',
                approval_status: 'approved',
              });
            }
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
        this.currentUser.id === 'usr-achraf-master-admin' ||
        this.currentUser.fullName?.toLowerCase().includes('achraf') ||
        (this.currentUser.phone && normalizePhone(this.currentUser.phone).endsWith('661987654'));

      if (!isAchraf) {
        this.currentUser.role = 'customer';
        setSessionStored(KEY_SESSION_USER, this.currentUser);
      }
    }

    this.currentBusiness = getSessionStored<Business | null>(KEY_SESSION_BUSINESS, null);
    if (
      this.currentBusiness?.id === 'biz-client-001' ||
      this.currentBusiness?.id === 'biz-client-002' ||
      this.currentBusiness?.id === 'biz-resto-001' ||
      this.currentBusiness?.id === 'biz-hotel-002' ||
      this.currentBusiness?.businessName?.includes('La Villa') ||
      this.currentBusiness?.businessName?.includes('Bistrot du Port')
    ) {
      this.currentBusiness = null;
      sessionStorage.removeItem(KEY_SESSION_BUSINESS);
    }
    this.cart = getStored<CartItem[]>(KEY_CART, []);
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

      // Connexion Supabase en tâche de fond pour initialiser les jetons admin si configuré
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.auth.signInWithPassword({
            email: 'admin@pontagricole.ma',
            password: 'Achrafgt6313',
          });
        } catch {}
      }

      // Session Administrateur Autorisée
      const nowIso = new Date().toISOString();
      this.currentUser = {
        id: 'usr-achraf-master-admin',
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

    // 2. CLIENTS PROFESSIONNELS (Par Nom d'utilisateur ou N° de Téléphone)
    const normPhone = normalizePhone(rawInput);
    const slug = cleanLower.replace(/[^a-z0-9_.-]/g, '');
    const isPureDigits = cleanDigits.length >= 8 && !rawInput.includes('@');

    let matchedBiz: any = null;

    // A. Rechercher l'établissement dans la base Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbBizs } = await supabase.from('businesses').select('*');
        if (dbBizs && dbBizs.length > 0) {
          matchedBiz = dbBizs.find((b: any) => {
            const bUser = (b.username || '').toLowerCase().trim();
            const bPhone = (b.phone || '').trim();
            const bPhoneDigits = bPhone.replace(/[^0-9]/g, '');
            const bNormPhone = normalizePhone(bPhone);
            const bEmail = (b.email || '').toLowerCase().trim();

            if (slug && bUser && (bUser === slug || bUser.replace(/[^a-z0-9]/g, '') === slug.replace(/[^a-z0-9]/g, ''))) {
              return true;
            }

            if (isPureDigits && cleanDigits.length >= 8) {
              const last8 = cleanDigits.slice(-8);
              if (bPhoneDigits.endsWith(last8) || cleanDigits.endsWith(bPhoneDigits.slice(-8))) {
                return true;
              }
              if (normPhone && bNormPhone && (bNormPhone === normPhone || bNormPhone.endsWith(normPhone) || normPhone.endsWith(bNormPhone))) {
                return true;
              }
            }

            if (cleanLower.includes('@') && bEmail === cleanLower) {
              return true;
            }

            return false;
          });
        }
      } catch (e) {
        console.warn('Erreur recherche client Supabase:', e);
      }
    }

    // B. Fallback local / cache businesses
    if (!matchedBiz) {
      const allLocalBiz = getStored<Business[]>(KEY_BUSINESSES, []);
      matchedBiz = allLocalBiz.find((b) => {
        const bUser = (b.username || '').toLowerCase().trim();
        const bPhoneDigits = (b.phone || '').replace(/[^0-9]/g, '');
        if (slug && bUser && bUser === slug) return true;
        if (isPureDigits && cleanDigits.length >= 8 && bPhoneDigits.endsWith(cleanDigits.slice(-8))) return true;
        if (cleanLower.includes('@') && b.email && b.email.toLowerCase().trim() === cleanLower) return true;
        return false;
      });
    }

    // C. VÉRIFICATION DU MOT DE PASSE SYNCHRONISÉ (MULTI-APPAREILS)
    let passwordMatches = false;

    if (matchedBiz) {
      const dbStoredPass = decodeAuth(matchedBiz.google_maps_url);
      if (dbStoredPass && dbStoredPass === pass) {
        passwordMatches = true;
      }
    }

    // D. Tenter également Supabase GoTrue Auth
    const effectiveUsername = (matchedBiz?.username || (!isPureDigits ? slug : '')).toLowerCase().trim();
    const candidateEmails: string[] = [];
    if (effectiveUsername && effectiveUsername.length >= 3) {
      candidateEmails.push(`${effectiveUsername}@pontagricole.ma`);
    }
    if (matchedBiz?.email) {
      candidateEmails.push(matchedBiz.email.toLowerCase().trim());
    }
    if (cleanLower.includes('@')) {
      candidateEmails.push(cleanLower);
    }
    const uniqueCandidates = Array.from(new Set(candidateEmails.filter(Boolean)));

    let authUser: any = null;
    if (!passwordMatches && isSupabaseConfigured && supabase && uniqueCandidates.length > 0) {
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

    // E. Vérifier aussi le cache local si hors ligne
    if (!passwordMatches && matchedBiz) {
      const creds = getStored<Record<string, string>>(KEY_USER_CREDS, {});
      const bUser = (matchedBiz.username || '').toLowerCase().trim();
      const bDigits = (matchedBiz.phone || '').replace(/[^0-9]/g, '');
      const localPass = (bUser && creds[bUser]) || (bDigits && creds[bDigits]) || (normPhone && creds[normPhone]) || creds[cleanLower];
      if (localPass && localPass === pass) {
        passwordMatches = true;
      }
    }

    // F. SI LE MOT DE PASSE EST CONFIRMÉ (DEPUIS N'IMPORTE QUEL TÉLÉPHONE OU PC)
    if (passwordMatches && matchedBiz) {
      // Si la base n'avait pas encore le token de synchro, l'enregistrer discrètement pour les autres appareils
      if (isSupabaseConfigured && supabase && !decodeAuth(matchedBiz.google_maps_url)) {
        try {
          const cleanUrl = cleanMapsUrl(matchedBiz.google_maps_url);
          const syncedUrl = cleanUrl ? `${cleanUrl}#${encodeAuth(pass)}` : encodeAuth(pass);
          await supabase.from('businesses').update({ google_maps_url: syncedUrl }).eq('id', matchedBiz.id);
        } catch {}
      }

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
        googleMapsUrl: cleanMapsUrl(matchedBiz.google_maps_url || matchedBiz.googleMapsUrl),
        username: matchedBiz.username || effectiveUsername,
        lastSeenAt: nowIso,
      };

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

    const deterministicEmail = `${cleanUsername}@pontagricole.ma`;
    const nowIso = new Date().toISOString();
    const cleanUrl = cleanMapsUrl(params.googleMapsUrl);
    const authTag = encodeAuth(params.password);
    const syncedMapsUrl = cleanUrl ? `${cleanUrl}#${authTag}` : authTag;

    if (isSupabaseConfigured && supabase) {
      // Vérifier si un compte avec ce nom d'utilisateur ou téléphone existe déjà
      let existingBiz: any = null;
      try {
        const { data: dbBizs } = await supabase.from('businesses').select('*');
        if (dbBizs && dbBizs.length > 0) {
          existingBiz = dbBizs.find((b: any) => {
            const bUser = (b.username || '').toLowerCase().trim();
            const bDigits = (b.phone || '').replace(/[^0-9]/g, '');
            if (bUser === cleanUsername) return true;
            if (bDigits.length >= 9 && cleanDigits.length >= 9 && (bDigits.endsWith(cleanDigits.slice(-9)) || cleanDigits.endsWith(bDigits.slice(-9)))) return true;
            return false;
          });
        }
      } catch {}

      // Tenter l'inscription dans Supabase GoTrue Auth (en mode tolérant aux rate limits)
      let userId: string = existingBiz?.owner_id || 'c56abe06-f012-4c80-8847-7f2db685a4e9';
      try {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
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

        if (authData?.user?.id) {
          userId = authData.user.id;
        } else if (authErr) {
          console.warn('Supabase auth warning, bascule sur sauvegarde directe garantie:', authErr.message);
        }
      } catch (e) {
        console.warn('Supabase auth exception, bascule sur sauvegarde directe:', e);
      }

      // Upsert dans profiles
      try {
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: params.fullName.trim(),
          phone: params.phone.trim(),
          role: 'customer',
          email: deterministicEmail,
          updated_at: nowIso,
        });
      } catch {}

      // Insérer ou Mettre à jour dans businesses avec le mot de passe synchronisé
      let newBizId = existingBiz?.id || `biz-${Date.now()}`;
      try {
        if (existingBiz?.id) {
          // Mise à jour de l'établissement existant (permet au client de réinitialiser / débloquer son compte)
          await supabase.from('businesses').update({
            business_name: params.businessName.trim(),
            business_type: params.businessType,
            city: params.city,
            delivery_address: params.deliveryAddress.trim(),
            contact_name: params.fullName.trim(),
            phone: params.phone.trim(),
            email: deterministicEmail,
            google_maps_url: syncedMapsUrl,
            username: cleanUsername,
            approval_status: 'approved',
            updated_at: nowIso,
          }).eq('id', existingBiz.id);
        } else {
          // Nouvel établissement
          const { data: createdBiz } = await supabase.from('businesses').insert({
            owner_id: userId,
            business_name: params.businessName.trim(),
            business_type: params.businessType,
            city: params.city,
            delivery_address: params.deliveryAddress.trim(),
            contact_name: params.fullName.trim(),
            phone: params.phone.trim(),
            email: deterministicEmail,
            google_maps_url: syncedMapsUrl,
            username: cleanUsername,
            approval_status: 'approved',
          }).select().single();

          if (createdBiz?.id) {
            newBizId = createdBiz.id;
          }
        }
      } catch (be) {
        console.warn('Business direct save warning:', be);
      }

      // Initialiser la session active
      this.currentUser = {
        id: userId,
        fullName: params.fullName.trim(),
        phone: params.phone.trim(),
        role: 'customer',
        createdAt: nowIso,
        lastSeenAt: nowIso,
      };

      this.currentBusiness = {
        id: newBizId,
        ownerId: userId,
        businessName: params.businessName.trim(),
        businessType: params.businessType,
        city: params.city,
        deliveryAddress: params.deliveryAddress.trim(),
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

      // Sauvegarder identifiants en cache local
      const creds = getStored<Record<string, string>>(KEY_USER_CREDS, {});
      creds[cleanUsername] = params.password;
      creds[cleanDigits] = params.password;
      setStored(KEY_USER_CREDS, creds);

      const allBiz = getStored<Business[]>(KEY_BUSINESSES, []);
      const exIdx = allBiz.findIndex((b) => b.id === newBizId || b.username === cleanUsername);
      if (exIdx >= 0) allBiz[exIdx] = this.currentBusiness;
      else allBiz.unshift(this.currentBusiness);
      setStored(KEY_BUSINESSES, allBiz);

      setSessionStored(KEY_SESSION_USER, this.currentUser);
      setSessionStored(KEY_SESSION_BUSINESS, this.currentBusiness);
      this.touchPresence(this.currentUser.id, this.currentBusiness?.id, this.currentUser.phone);
      await this.syncBusinessToRemote(this.currentBusiness);

      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({ type: 'STORE_UPDATED', action: 'NEW_CLIENT', client: this.currentBusiness, timestamp: Date.now() });
        } catch {}
      }

      this.notify();
      return { success: true };
    }

    return { success: false, error: 'Connexion au serveur de base de données impossible.' };
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

  public async getProducts(): Promise<Product[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('products').select('*');
      if (!error && data && data.length > 0) {
        return data.map((p) => ({
          id: p.id,
          categoryId: p.category_id,
          name: p.name,
          description: p.description,
          imageUrl: p.image_url,
          unit: p.unit,
          price: Number(p.price),
          minimumQuantity: p.minimum_quantity,
          isAvailable: p.is_available,
          origin: p.origin,
          badge: p.badge,
        }));
      }
    }
    return getStored<Product[]>(KEY_PRODUCTS, INITIAL_PRODUCTS);
  }

  public async saveProduct(product: Product): Promise<void> {
    if (this.currentUser?.role !== 'admin') {
      throw new Error("Action réservée exclusivement à l'administrateur.");
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('products').upsert({
        id: product.id,
        category_id: product.categoryId,
        name: product.name,
        description: product.description,
        image_url: product.imageUrl,
        unit: product.unit,
        price: product.price,
        minimum_quantity: product.minimumQuantity,
        is_available: product.isAvailable,
        origin: product.origin,
        badge: product.badge,
        updated_at: new Date().toISOString(),
      });
    }

    const products = getStored<Product[]>(KEY_PRODUCTS, INITIAL_PRODUCTS);
    const index = products.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.push(product);
    }
    setStored(KEY_PRODUCTS, products);
    this.notify();
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

    if (isSupabaseConfigured && supabase) {
      await supabase.from('products').update({
        price: prod.price,
        is_available: prod.isAvailable,
        updated_at: new Date().toISOString(),
      }).eq('id', productId);
    }

    setStored(KEY_PRODUCTS, products);
    localStorage.setItem('pont_last_price_update', new Date().toISOString());
    this.notify();
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
      if (isSupabaseConfigured && supabase) {
        await supabase.from('products').update({
          price: Math.max(0, Number(u.price)),
          is_available: u.isAvailable,
          updated_at: now,
        }).eq('id', u.id);
      }
    }

    setStored(KEY_PRODUCTS, products);
    localStorage.setItem('pont_last_price_update', now);
    this.notify();
  }

  public async deleteProduct(productId: string): Promise<void> {
    if (this.currentUser?.role !== 'admin') {
      throw new Error("Action réservée exclusivement à l'administrateur.");
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('products').delete().eq('id', productId);
    }
    let products = getStored<Product[]>(KEY_PRODUCTS, INITIAL_PRODUCTS);
    products = products.filter((p) => p.id !== productId);
    setStored(KEY_PRODUCTS, products);
    this.notify();
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

    // 1. Charger depuis le serveur local dev / réseau (/api/sync/orders)
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

    // 2. Charger depuis Supabase (si configuré)
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .order('created_at', { ascending: false });

        if (!error && data) {
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
        console.warn('Erreur lecture Supabase orders', err);
      }
    }

    // 3. Charger depuis le stockage local (cache)
    const storedOrders = getStored<Order[]>(KEY_ORDERS, []);
    for (const ord of storedOrders) {
      addOrUpdateOrder(ord);
    }

    // Trier par date décroissante
    list.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    // Mettre à jour le cache local
    setStored(KEY_ORDERS, list);

    // Si client connecté, filtrer ses commandes
    if (this.currentUser && this.currentUser.role === 'customer') {
      const userPhoneNorm = normalizePhone(this.currentUser.phone || '');
      return list.filter(
        (o) =>
          o.customerId === this.currentUser?.id ||
          (this.currentBusiness && o.businessId === this.currentBusiness.id) ||
          (userPhoneNorm && o.customerPhone && normalizePhone(o.customerPhone) === userPhoneNorm)
      );
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
    // 1. Check user login
    if (!this.currentUser) {
      return { success: false, error: 'Veuillez vous connecter pour envoyer une commande.' };
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

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerId: this.currentUser.id,
      customerName: this.currentUser.fullName,
      customerPhone: this.currentUser.phone,
      businessId: this.currentBusiness?.id,
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
            order_number: newOrder.orderNumber,
            customer_id: newOrder.customerId,
            business_id: newOrder.businessId,
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

    const addOrUpdateClient = (bizObj: Business) => {
      if (!bizObj || !bizObj.businessName) return;
      const bNormPhone = normalizePhone(bizObj.phone || '');
      const bNormEmail = (bizObj.email || '').trim().toLowerCase();
      const existingIdx = list.findIndex((c) => {
        if (bizObj.id && c.id && c.id === bizObj.id) return true;
        if (bizObj.ownerId && c.ownerId && c.ownerId === bizObj.ownerId) return true;
        const cNormPhone = normalizePhone(c.phone || '');
        if (bNormPhone && cNormPhone && bNormPhone.length >= 9 && cNormPhone.length >= 9 && bNormPhone === cNormPhone) {
          return true;
        }
        const cNormEmail = (c.email || '').trim().toLowerCase();
        if (bNormEmail && cNormEmail && bNormEmail === cNormEmail) {
          return true;
        }
        return false;
      });

      if (existingIdx >= 0) {
        const cur = list[existingIdx];
        list[existingIdx] = {
          ...cur,
          ...bizObj,
          lastSeenAt: bizObj.lastSeenAt || cur.lastSeenAt,
          approvalStatus: bizObj.approvalStatus || cur.approvalStatus,
        };
      } else {
        list.push(bizObj);
        if (bizObj.id) seenIds.add(bizObj.id);
        if (bizObj.ownerId) seenIds.add(bizObj.ownerId);
        if (bNormPhone) seenPhones.add(bNormPhone);
      }
    };

    // 1. Charger depuis le serveur local dev / réseau (/api/sync/clients)
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
    } catch {
      // Dev sync endpoint non disponible en hébergement statique
    }

    // 2. Charger depuis Supabase (si configuré)
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: bizData, error: bizError } = await supabase
          .from('businesses')
          .select('*')
          .order('created_at', { ascending: false });

        const { data: profData } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        let profMap = new Map<string, any>();
        if (profData) {
          profMap = new Map(profData.map((p: any) => [p.id, p]));
        }

        if (!bizError && bizData && bizData.length > 0) {
          for (const b of bizData) {
            const prof = profMap.get(b.owner_id);
            const bPhone = b.phone || prof?.phone || '';
            const bizObj: Business = {
              id: b.id,
              ownerId: b.owner_id,
              businessName: b.business_name || prof?.business_name || 'Établissement Pro',
              businessType: b.business_type || 'restaurant',
              city: b.city || 'Casablanca',
              deliveryAddress: b.delivery_address || 'Adresse à préciser',
              approvalStatus: b.approval_status || 'approved',
              createdAt: b.created_at || new Date().toISOString(),
              contactName: b.contact_name || prof?.full_name || 'Client Professionnel',
              phone: bPhone,
              email: b.email || prof?.email || '',
              googleMapsUrl: cleanMapsUrl(b.google_maps_url) || undefined,
              username: b.username || undefined,
              lastSeenAt: b.last_seen_at || prof?.last_seen_at || undefined,
            };
            addOrUpdateClient(bizObj);
          }
        }

        if (profData && profData.length > 0) {
          for (const prof of profData) {
            if (prof.role !== 'admin') {
              const pPhone = prof.phone || '';
              const syntheticBiz: Business = {
                id: `biz-${prof.id}`,
                ownerId: prof.id,
                businessName: prof.business_name || prof.full_name || 'Client Inscrit',
                businessType: prof.business_type || 'restaurant',
                city: prof.city || 'Maroc',
                deliveryAddress: prof.delivery_address || 'Adresse non renseignée',
                approvalStatus: 'approved',
                createdAt: prof.created_at || new Date().toISOString(),
                contactName: prof.full_name,
                phone: pPhone,
                email: prof.email || '',
                lastSeenAt: prof.last_seen_at || undefined,
              };
              addOrUpdateClient(syntheticBiz);
            }
          }
        }
      } catch (e) {
        console.warn('Error fetching businesses from Supabase', e);
      }
    }

    // 3. Fusionner avec le cache local de l'appareil
    const localBusinesses = getStored<Business[]>(KEY_BUSINESSES, []);
    for (const lb of localBusinesses) {
      addOrUpdateClient(lb);
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

    // Trier du plus récent au plus ancien
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Mettre à jour le cache local avec tous les clients synchronisés
    setStored(KEY_BUSINESSES, list);
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
    const newBizId = `biz-${Date.now()}`;
    const newUserId = `usr-${Date.now()}`;
    const cleanDigits = (params.phone || '').replace(/[^0-9]/g, '');
    const nameSlug = params.contactName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const finalEmail = params.email?.trim().toLowerCase() || `${cleanDigits || Date.now()}@phone.pontagricole.com`;

    const newBiz: Business = {
      id: newBizId,
      ownerId: newUserId,
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
      lastSeenAt: nowIso,
    };

    // 1. Sauvegarder dans le cache local
    const all = getStored<Business[]>(KEY_BUSINESSES, []);
    all.unshift(newBiz);
    setStored(KEY_BUSINESSES, all);

    // 2. Synchroniser sur le réseau local / dev
    this.syncBusinessToRemote(newBiz);

    // 3. Synchroniser avec Supabase si configuré
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('businesses').insert({
          id: newBizId,
          owner_id: newUserId,
          business_name: newBiz.businessName,
          business_type: newBiz.businessType,
          city: newBiz.city,
          delivery_address: newBiz.deliveryAddress,
          contact_name: newBiz.contactName,
          phone: newBiz.phone,
          email: finalEmail,
          approval_status: newBiz.approvalStatus,
        });
      } catch (e) {
        console.warn('Manual client Supabase sync warning', e);
      }
    }

    this.touchPresence(newUserId, newBizId, newBiz.phone);
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

    if (isSupabaseConfigured && supabase) {
      await supabase.from('businesses').update({ approval_status: status }).eq('id', businessId);
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
    try {
      fetch(`/api/sync/clients?id=${businessId}`, { method: 'DELETE' }).catch(() => {});
    } catch {}

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('businesses').delete().eq('id', businessId);
      } catch (e) {
        console.warn('Error deleting business from Supabase', e);
      }
    }
    const businesses = getStored<Business[]>(KEY_BUSINESSES, []);
    const filtered = businesses.filter((b) => b.id !== businessId);
    setStored(KEY_BUSINESSES, filtered);
    this.notify();
  }

  public getClientPassword(biz: Business): string {
    if (!biz) return '';
    if (biz.password) return biz.password;
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
      const { data, error } = await supabase.from('delivery_zones').select('*');
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
    }
    return getStored<DeliveryZone[]>(KEY_ZONES, INITIAL_DELIVERY_ZONES);
  }

  public async saveDeliveryZone(zone: DeliveryZone): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('delivery_zones').upsert({
        id: zone.id,
        city: zone.city,
        zone_name: zone.zoneName,
        delivery_fee: zone.deliveryFee,
        minimum_order_amount: zone.minimumOrderAmount,
        is_active: zone.isActive,
        estimated_hours: zone.estimatedHours,
      });
    }
    const zones = getStored<DeliveryZone[]>(KEY_ZONES, INITIAL_DELIVERY_ZONES);
    const idx = zones.findIndex((z) => z.id === zone.id);
    if (idx >= 0) zones[idx] = zone;
    else zones.push(zone);
    setStored(KEY_ZONES, zones);
    this.notify();
  }

  public async getCompanySettings(): Promise<CompanySettings> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('company_settings').select('*').single();
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
        console.warn('Error reading company settings from Supabase', err);
      }
    }
    const local = getStored<CompanySettings>(KEY_SETTINGS, INITIAL_COMPANY_SETTINGS);
    return {
      ...INITIAL_COMPANY_SETTINGS,
      ...local,
    };
  }

  public async saveCompanySettings(settings: CompanySettings): Promise<void> {
    if (isSupabaseConfigured && supabase) {
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
    }
    setStored(KEY_SETTINGS, settings);
    this.notify();
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
