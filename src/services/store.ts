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
  DEMO_CLIENT_PROFILE,
  DEMO_CLIENT_BUSINESS,
  DEMO_PENDING_CLIENT_PROFILE,
  DEMO_PENDING_BUSINESS,
  DEMO_INITIAL_ORDERS,
} from '../data/mockData';
import { supabase, isSupabaseConfigured } from './supabase';

// Local storage keys
const STORAGE_PREFIX = 'pont_agricole_';
const KEY_USER = `${STORAGE_PREFIX}current_user`;
const KEY_BUSINESS = `${STORAGE_PREFIX}current_business`;
const KEY_PRODUCTS = `${STORAGE_PREFIX}products`;
const KEY_CATEGORIES = `${STORAGE_PREFIX}categories`;
const KEY_ORDERS = `${STORAGE_PREFIX}orders`;
const KEY_BUSINESSES = `${STORAGE_PREFIX}all_businesses`;
const KEY_ZONES = `${STORAGE_PREFIX}zones`;
const KEY_SETTINGS = `${STORAGE_PREFIX}settings`;
const KEY_CART = `${STORAGE_PREFIX}cart`;

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

// Helper to normalize phone numbers (e.g., 0661234567 -> 212661234567)
export function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 10) {
    return '212' + digits.slice(1);
  }
  if ((digits.startsWith('6') || digits.startsWith('7') || digits.startsWith('5')) && digits.length === 9) {
    return '212' + digits;
  }
  return digits;
}

// Global Store Manager
class StoreService {
  private currentUser: UserProfile | null = null;
  private currentBusiness: Business | null = null;
  private cart: CartItem[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
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
      setStored(KEY_BUSINESSES, [DEMO_CLIENT_BUSINESS, DEMO_PENDING_BUSINESS]);
    }
    if (!localStorage.getItem(KEY_ORDERS)) {
      setStored(KEY_ORDERS, DEMO_INITIAL_ORDERS);
    }

    // Default to approved client for frictionless first preview
    this.currentUser = getStored<UserProfile | null>(KEY_USER, DEMO_CLIENT_PROFILE);
    this.currentBusiness = getStored<Business | null>(KEY_BUSINESS, DEMO_CLIENT_BUSINESS);
    this.cart = getStored<CartItem[]>(KEY_CART, []);
  }

  // Subscribe to changes
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // --- AUTH METHODS ---
  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public getCurrentBusiness(): Business | null {
    return this.currentBusiness;
  }

  public async login(identifier: string, pass: string): Promise<{ success: boolean; error?: string }> {
    const rawInput = identifier.trim();
    const cleanLower = rawInput.toLowerCase();

    // 1. COMPTE ADMINISTRATEUR STRICT (achrafabouziad@gmail.com, achrafabouziad, achraf)
    const isAdminAccount =
      cleanLower === 'achrafabouziad@gmail.com' ||
      cleanLower === 'achrafabouziad' ||
      cleanLower === 'achraf';

    if (isAdminAccount) {
      if (pass !== 'Achrafgt6313') {
        return {
          success: false,
          error: 'Mot de passe incorrect pour le compte administrateur.',
        };
      }

      // Mot de passe correct ! Tenter de lier la session Supabase si disponible
      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase.auth.signInWithPassword({
            email: 'achrafabouziad@gmail.com',
            password: pass,
          });
          if (data?.user) {
            this.currentUser = {
              id: data.user.id,
              fullName: 'Achraf Abouziad (Directeur Fondateur)',
              phone: '+212 6 61 98 76 54',
              role: 'admin',
              createdAt: data.user.created_at,
            };
            this.currentBusiness = null;
            setStored(KEY_USER, this.currentUser);
            setStored(KEY_BUSINESS, this.currentBusiness);
            this.notify();
            return { success: true };
          }
        } catch {
          // Continuer sur la session admin garantie ci-dessous
        }
      }

      // Session Administrateur Autorisée
      this.currentUser = {
        id: 'usr-achraf-master-admin',
        fullName: 'Achraf Abouziad (Directeur Fondateur)',
        phone: '+212 6 61 98 76 54',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      this.currentBusiness = null;
      setStored(KEY_USER, this.currentUser);
      setStored(KEY_BUSINESS, this.currentBusiness);
      this.notify();
      return { success: true };
    }

    // 2. TOUS LES CLIENTS PROFESSIONNELS (N° de Téléphone mondial, Email ou Nom / Identifiant)
    const normPhone = normalizePhone(rawInput);
    const digits = rawInput.replace(/[^0-9]/g, '');
    const slug = cleanLower.replace(/[^a-z0-9]/g, '');

    let matchedBiz: any = null;
    let matchedProfile: any = null;

    // A. Chercher en priorité dans la base de données Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbBizs } = await supabase.from('businesses').select('*');
        if (dbBizs && dbBizs.length > 0) {
          matchedBiz = dbBizs.find((b: any) => {
            const bNormPhone = normalizePhone(b.phone || '');
            const bDigits = (b.phone || '').replace(/[^0-9]/g, '');
            const bContact = (b.contact_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const bBiz = (b.business_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const bUser = (b.username || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const bEmail = (b.email || '').toLowerCase().trim();

            if (cleanLower.includes('@') && bEmail === cleanLower) return true;
            if (normPhone && bNormPhone && (bNormPhone === normPhone || bNormPhone.endsWith(normPhone) || normPhone.endsWith(bNormPhone))) return true;
            if (digits.length >= 7 && bDigits.length >= 7 && (bDigits.endsWith(digits) || digits.endsWith(bDigits))) return true;
            if (slug.length >= 3 && (bUser === slug || bContact.includes(slug) || slug.includes(bContact) || bBiz.includes(slug))) return true;
            return false;
          });
        }

        if (!matchedBiz) {
          const { data: dbProfs } = await supabase.from('profiles').select('*');
          if (dbProfs && dbProfs.length > 0) {
            matchedProfile = dbProfs.find((p: any) => {
              const pNormPhone = normalizePhone(p.phone || '');
              const pDigits = (p.phone || '').replace(/[^0-9]/g, '');
              const pName = (p.full_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const pEmail = (p.email || '').toLowerCase().trim();

              if (cleanLower.includes('@') && pEmail === cleanLower) return true;
              if (normPhone && pNormPhone && (pNormPhone === normPhone || pNormPhone.endsWith(normPhone) || normPhone.endsWith(pNormPhone))) return true;
              if (digits.length >= 7 && pDigits.length >= 7 && (pDigits.endsWith(digits) || digits.endsWith(pDigits))) return true;
              if (slug.length >= 3 && (pName.includes(slug) || slug.includes(pName))) return true;
              return false;
            });
          }
        }
      } catch (e) {
        console.warn('Erreur recherche client Supabase', e);
      }
    }

    // B. Chercher aussi dans le stockage local (fallback offline)
    if (!matchedBiz) {
      const allBusinesses = getStored<Business[]>(KEY_BUSINESSES, []);
      matchedBiz = allBusinesses.find((b) => {
        const bNormPhone = normalizePhone(b.phone || '');
        const bDigits = (b.phone || '').replace(/[^0-9]/g, '');
        const bContact = (b.contactName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const bBiz = (b.businessName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const bUser = (b.username || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const bEmail = (b.email || '').toLowerCase().trim();

        if (cleanLower.includes('@') && bEmail === cleanLower) return true;
        if (normPhone && bNormPhone && (bNormPhone === normPhone || bNormPhone.endsWith(normPhone) || normPhone.endsWith(bNormPhone))) return true;
        if (digits.length >= 7 && bDigits.length >= 7 && (bDigits.endsWith(digits) || digits.endsWith(bDigits))) return true;
        if (slug.length >= 3 && (bUser === slug || bContact.includes(slug) || slug.includes(bContact) || bBiz.includes(slug))) return true;
        return false;
      });
    }

    // C. Préparer les variantes d'emails candidats pour Supabase Auth
    const candidateEmails: string[] = [];
    if (cleanLower.includes('@')) {
      candidateEmails.push(cleanLower);
    }
    if (matchedBiz?.email) {
      candidateEmails.push(matchedBiz.email.toLowerCase().trim());
    }
    if (matchedProfile?.email) {
      candidateEmails.push(matchedProfile.email.toLowerCase().trim());
    }
    if (normPhone) {
      candidateEmails.push(`${normPhone}@pontagricole.client`);
    }
    if (digits.length >= 7) {
      candidateEmails.push(`${digits}@pontagricole.client`);
    }
    if (slug.length >= 3) {
      candidateEmails.push(`${slug}@pontagricole.client`);
    }

    const uniqueCandidates = Array.from(new Set(candidateEmails.filter(Boolean)));

    // D. Tenter l'authentification Supabase avec les emails candidats
    let emailNotConfirmed = false;
    if (isSupabaseConfigured && supabase) {
      for (const emailTry of uniqueCandidates) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: emailTry,
            password: pass,
          });

          if (!error && data?.user) {
            const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
            const { data: biz } = await supabase.from('businesses').select('*').eq('owner_id', data.user.id).maybeSingle();

            this.currentUser = {
              id: data.user.id,
              fullName: prof?.full_name || data.user.user_metadata?.full_name || matchedBiz?.contact_name || matchedBiz?.contactName || 'Client Professionnel',
              phone: prof?.phone || data.user.user_metadata?.phone || matchedBiz?.phone || '',
              role: 'customer',
              createdAt: data.user.created_at,
            };

            this.currentBusiness = {
              id: biz?.id || matchedBiz?.id || `biz-${data.user.id}`,
              ownerId: data.user.id,
              businessName: biz?.business_name || data.user.user_metadata?.business_name || matchedBiz?.business_name || matchedBiz?.businessName || 'Mon Établissement',
              businessType: biz?.business_type || data.user.user_metadata?.business_type || matchedBiz?.business_type || matchedBiz?.businessType || 'restaurant',
              city: biz?.city || data.user.user_metadata?.city || matchedBiz?.city || 'Casablanca',
              deliveryAddress: biz?.delivery_address || data.user.user_metadata?.delivery_address || matchedBiz?.delivery_address || matchedBiz?.deliveryAddress || '',
              approvalStatus: biz?.approval_status || matchedBiz?.approval_status || 'approved',
              createdAt: biz?.created_at || data.user.created_at,
              contactName: this.currentUser.fullName,
              phone: this.currentUser.phone,
              email: emailTry,
              googleMapsUrl: biz?.google_maps_url || data.user.user_metadata?.google_maps_url || matchedBiz?.google_maps_url || matchedBiz?.googleMapsUrl,
              username: biz?.username || data.user.user_metadata?.username || matchedBiz?.username,
            };

            setStored(KEY_USER, this.currentUser);
            setStored(KEY_BUSINESS, this.currentBusiness);
            this.notify();
            return { success: true };
          }

          if (error && error.message.toLowerCase().includes('email not confirmed')) {
            emailNotConfirmed = true;
          }
        } catch {
          // Continuer d'essayer le candidat suivant
        }
      }
    }

    if (emailNotConfirmed) {
      return {
        success: false,
        error: "Votre compte est créé mais attend la validation. Exécutez le script d'auto-confirmation dans Supabase ou désactivez 'Confirm email' dans Supabase Auth.",
      };
    }

    // E. Fallback local pour utilisateurs enregistrés localement
    if (matchedBiz) {
      this.currentUser = {
        id: matchedBiz.ownerId || matchedBiz.owner_id || `usr-${Date.now()}`,
        fullName: matchedBiz.contactName || matchedBiz.contact_name || matchedBiz.businessName || matchedBiz.business_name,
        phone: matchedBiz.phone || '+212 6 00 00 00 00',
        role: 'customer',
        createdAt: matchedBiz.createdAt || matchedBiz.created_at || new Date().toISOString(),
      };
      this.currentBusiness = {
        id: matchedBiz.id,
        ownerId: this.currentUser.id,
        businessName: matchedBiz.businessName || matchedBiz.business_name,
        businessType: matchedBiz.businessType || matchedBiz.business_type,
        city: matchedBiz.city,
        deliveryAddress: matchedBiz.deliveryAddress || matchedBiz.delivery_address,
        approvalStatus: matchedBiz.approvalStatus || matchedBiz.approval_status || 'approved',
        createdAt: matchedBiz.createdAt || matchedBiz.created_at || new Date().toISOString(),
        contactName: this.currentUser.fullName,
        phone: this.currentUser.phone,
        email: matchedBiz.email || uniqueCandidates[0],
        googleMapsUrl: matchedBiz.googleMapsUrl || matchedBiz.google_maps_url,
        username: matchedBiz.username,
      };
      setStored(KEY_USER, this.currentUser);
      setStored(KEY_BUSINESS, this.currentBusiness);
      this.notify();
      return { success: true };
    }

    return {
      success: false,
      error: 'Identifiant ou mot de passe incorrect. Vous pouvez vous connecter avec votre N° de téléphone (mondial), votre nom d’utilisateur (ID) ou votre email.',
    };
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
  }): Promise<{ success: boolean; error?: string }> {
    const normPhone = normalizePhone(params.phone);
    const cleanDigits = params.phone.replace(/[^0-9]/g, '');
    const nameSlug = params.fullName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const finalEmail = params.email?.trim().toLowerCase() || `${normPhone || cleanDigits || nameSlug || Date.now()}@pontagricole.client`;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: finalEmail,
          password: params.password,
          options: {
            data: {
              full_name: params.fullName,
              phone: params.phone,
              business_name: params.businessName,
              business_type: params.businessType,
              city: params.city,
              delivery_address: params.deliveryAddress,
              google_maps_url: params.googleMapsUrl || '',
              username: nameSlug,
              email: finalEmail,
            },
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes('already registered')) {
            return {
              success: false,
              error: 'Un compte existe déjà avec ce numéro de téléphone ou cet email. Connectez-vous directement.',
            };
          }
          return { success: false, error: error.message };
        }

        const userId = data.user?.id || `usr-${Date.now()}`;

        // 1. Sauvegarder explicitement dans la table profiles de Supabase
        try {
          await supabase.from('profiles').upsert({
            id: userId,
            full_name: params.fullName,
            phone: params.phone,
            role: 'customer',
            email: finalEmail,
            updated_at: new Date().toISOString(),
          });
        } catch (pe) {
          console.warn('Profile direct save warning', pe);
        }

        // 2. Sauvegarder explicitement dans la table businesses de Supabase
        let newBizId = `biz-${Date.now()}`;
        try {
          const { data: existingBiz } = await supabase
            .from('businesses')
            .select('id')
            .eq('owner_id', userId)
            .maybeSingle();

          if (existingBiz?.id) {
            newBizId = existingBiz.id;
            await supabase.from('businesses').update({
              business_name: params.businessName,
              business_type: params.businessType,
              city: params.city,
              delivery_address: params.deliveryAddress,
              contact_name: params.fullName,
              phone: params.phone,
              email: finalEmail,
              google_maps_url: params.googleMapsUrl || null,
              username: nameSlug,
              approval_status: 'approved',
              updated_at: new Date().toISOString(),
            }).eq('id', existingBiz.id);
          } else {
            const { data: createdBiz } = await supabase.from('businesses').insert({
              owner_id: userId,
              business_name: params.businessName,
              business_type: params.businessType,
              city: params.city,
              delivery_address: params.deliveryAddress,
              contact_name: params.fullName,
              phone: params.phone,
              email: finalEmail,
              google_maps_url: params.googleMapsUrl || null,
              username: nameSlug,
              approval_status: 'approved',
            }).select().single();

            if (createdBiz?.id) {
              newBizId = createdBiz.id;
            }
          }
        } catch (be) {
          console.warn('Business direct save warning', be);
        }

        this.currentUser = {
          id: userId,
          fullName: params.fullName,
          phone: params.phone,
          role: 'customer',
          createdAt: data.user?.created_at || new Date().toISOString(),
        };

        this.currentBusiness = {
          id: newBizId,
          ownerId: userId,
          businessName: params.businessName,
          businessType: params.businessType,
          city: params.city,
          deliveryAddress: params.deliveryAddress,
          approvalStatus: 'approved',
          createdAt: new Date().toISOString(),
          contactName: params.fullName,
          phone: params.phone,
          email: finalEmail,
          googleMapsUrl: params.googleMapsUrl,
          username: nameSlug,
        };

        // Sauvegarder dans la liste pour consultation admin
        const allBiz = getStored<Business[]>(KEY_BUSINESSES, []);
        const existingIdx = allBiz.findIndex((b) => b.ownerId === userId);
        if (existingIdx >= 0) allBiz[existingIdx] = this.currentBusiness;
        else allBiz.unshift(this.currentBusiness);
        setStored(KEY_BUSINESSES, allBiz);

        setStored(KEY_USER, this.currentUser);
        setStored(KEY_BUSINESS, this.currentBusiness);
        this.notify();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || "Erreur lors de l'inscription" };
      }
    }

    // Fallback registration with local persistence
    const newUserId = `usr-${Date.now()}`;
    const newBizId = `biz-${Date.now()}`;
    const newProfile: UserProfile = {
      id: newUserId,
      fullName: params.fullName,
      phone: params.phone,
      role: 'customer',
      createdAt: new Date().toISOString(),
    };
    const newBusiness: Business = {
      id: newBizId,
      ownerId: newUserId,
      businessName: params.businessName,
      businessType: params.businessType,
      city: params.city,
      deliveryAddress: params.deliveryAddress,
      approvalStatus: 'approved',
      createdAt: new Date().toISOString(),
      contactName: params.fullName,
      phone: params.phone,
      email: finalEmail,
      googleMapsUrl: params.googleMapsUrl,
      username: nameSlug,
    };

    // Save in all businesses list for admin
    const allBusinesses = getStored<Business[]>(KEY_BUSINESSES, []);
    allBusinesses.unshift(newBusiness);
    setStored(KEY_BUSINESSES, allBusinesses);

    this.currentUser = newProfile;
    this.currentBusiness = newBusiness;
    setStored(KEY_USER, this.currentUser);
    setStored(KEY_BUSINESS, this.currentBusiness);
    this.notify();
    return { success: true };
  }

  public async logout(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    this.currentUser = null;
    this.currentBusiness = null;
    localStorage.removeItem(KEY_USER);
    localStorage.removeItem(KEY_BUSINESS);
    this.notify();
  }

  // Quick switch for client testing (Admin is strictly locked to achrafabouziad credentials)
  public switchRole(role: 'admin' | 'approved_client' | 'pending_client' | 'visitor'): void {
    if (role === 'admin') {
      // Admin est strictement verrouillé aux identifiants réels achrafabouziad@gmail.com + Achrafgt6313
      return;
    } else if (role === 'approved_client') {
      this.currentUser = DEMO_CLIENT_PROFILE;
      this.currentBusiness = DEMO_CLIENT_BUSINESS;
    } else if (role === 'pending_client') {
      this.currentUser = DEMO_PENDING_CLIENT_PROFILE;
      this.currentBusiness = DEMO_PENDING_BUSINESS;
    } else {
      this.currentUser = null;
      this.currentBusiness = null;
    }
    setStored(KEY_USER, this.currentUser);
    setStored(KEY_BUSINESS, this.currentBusiness);
    this.notify();
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

  // --- ORDERS METHODS ---
  public async getOrders(): Promise<Order[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((o: any) => ({
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
        }));
      }
    }

    const allOrders = getStored<Order[]>(KEY_ORDERS, DEMO_INITIAL_ORDERS);
    // If client, filter to their orders
    if (this.currentUser && this.currentUser.role === 'customer') {
      return allOrders.filter((o) => o.customerId === this.currentUser?.id);
    }
    // Admin sees all
    return allOrders;
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

    // 4. Fetch delivery zone to get fee & min order
    const zones = await this.getDeliveryZones();
    const zone = zones.find((z) => z.city.toLowerCase() === params.deliveryCity.toLowerCase()) || zones[0];
    const subtotal = this.getCartSubtotal();

    if (zone && subtotal < zone.minimumOrderAmount) {
      return {
        success: false,
        error: `Le montant minimum de commande pour ${params.deliveryCity} est de ${zone.minimumOrderAmount} DH (Sous-total actuel : ${subtotal.toFixed(2)} DH).`,
      };
    }

    const settings = await this.getCompanySettings();
    const deliveryFee = subtotal >= settings.freeDeliveryThreshold ? 0 : zone ? zone.deliveryFee : 35;
    const total = subtotal + deliveryFee;

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

    // Persist locally
    const orders = getStored<Order[]>(KEY_ORDERS, DEMO_INITIAL_ORDERS);
    orders.unshift(newOrder);
    setStored(KEY_ORDERS, orders);

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

    const orders = getStored<Order[]>(KEY_ORDERS, DEMO_INITIAL_ORDERS);
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = status;
      if (reason) order.rejectionReason = reason;
      order.updatedAt = new Date().toISOString();
      setStored(KEY_ORDERS, orders);
      this.notify();
    }
  }

  // --- CLIENTS & BUSINESSES (ADMIN) ---
  public async getBusinesses(): Promise<Business[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          let profMap = new Map<string, any>();
          try {
            const { data: profs } = await supabase.from('profiles').select('*');
            if (profs) {
              profMap = new Map(profs.map((p: any) => [p.id, p]));
            }
          } catch {
            // Profils optionnels
          }

          const mapped: Business[] = data.map((b: any) => {
            const prof = profMap.get(b.owner_id);
            return {
              id: b.id,
              ownerId: b.owner_id,
              businessName: b.business_name,
              businessType: b.business_type,
              city: b.city,
              deliveryAddress: b.delivery_address,
              approvalStatus: b.approval_status || 'approved',
              createdAt: b.created_at,
              contactName: b.contact_name || prof?.full_name || 'Client Professionnel',
              phone: b.phone || prof?.phone || '',
              email: b.email || prof?.email || '',
              googleMapsUrl: b.google_maps_url || undefined,
              username: b.username || undefined,
            };
          });

          setStored(KEY_BUSINESSES, mapped);
          return mapped;
        }
      } catch (e) {
        console.warn('Error fetching businesses from Supabase', e);
      }
    }
    return getStored<Business[]>(KEY_BUSINESSES, [
      {
        ...DEMO_CLIENT_BUSINESS,
        contactName: DEMO_CLIENT_PROFILE.fullName,
        phone: DEMO_CLIENT_PROFILE.phone,
      },
      {
        ...DEMO_PENDING_BUSINESS,
        contactName: DEMO_PENDING_CLIENT_PROFILE.fullName,
        phone: DEMO_PENDING_CLIENT_PROFILE.phone,
      },
    ]);
  }

  public async updateBusinessApproval(businessId: string, status: ApprovalStatus): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('businesses').update({ approval_status: status }).eq('id', businessId);
    }
    const businesses = getStored<Business[]>(KEY_BUSINESSES, [DEMO_CLIENT_BUSINESS, DEMO_PENDING_BUSINESS]);
    const b = businesses.find((biz) => biz.id === businessId);
    if (b) {
      b.approvalStatus = status;
      setStored(KEY_BUSINESSES, businesses);
      // If current business was updated, sync it
      if (this.currentBusiness && this.currentBusiness.id === businessId) {
        this.currentBusiness.approvalStatus = status;
        setStored(KEY_BUSINESS, this.currentBusiness);
      }
      this.notify();
    }
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
      const { data, error } = await supabase.from('company_settings').select('*').single();
      if (!error && data) {
        return {
          companyName: data.company_name,
          tagline: data.tagline,
          phone: data.phone,
          whatsapp: data.whatsapp,
          email: data.email,
          address: data.address,
          minOrderDefault: Number(data.min_order_default),
          freeDeliveryThreshold: Number(data.free_delivery_threshold),
          deliveryDays: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
          orderCutoffTime: data.order_cutoff_time,
        };
      }
    }
    return getStored<CompanySettings>(KEY_SETTINGS, INITIAL_COMPANY_SETTINGS);
  }

  public async saveCompanySettings(settings: CompanySettings): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('company_settings').upsert({
        id: 1,
        company_name: settings.companyName,
        tagline: settings.tagline,
        phone: settings.phone,
        whatsapp: settings.whatsapp,
        email: settings.email,
        address: settings.address,
        min_order_default: settings.minOrderDefault,
        free_delivery_threshold: settings.freeDeliveryThreshold,
        order_cutoff_time: settings.orderCutoffTime,
      });
    }
    setStored(KEY_SETTINGS, settings);
    this.notify();
  }
}

export const store = new StoreService();
