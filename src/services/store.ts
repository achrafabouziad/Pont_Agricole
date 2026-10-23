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

  public async login(email: string, pass: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.includes('@') ? email.trim().toLowerCase() : `${email.trim().toLowerCase()}@gmail.com`;
    const isAdminAccount = cleanEmail === 'achrafabouziad@gmail.com';

    // 1. COMPTE ADMINISTRATEUR STRICT (Seul achrafabouziad@gmail.com avec mot de passe Achrafgt6313 est Admin)
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
            email: cleanEmail,
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

    // 2. TOUS LES AUTRES UTILISATEURS (Clients CHR inscrits : cafés, restaurants, hôtels)
    // Authentification stricte via Supabase avec mot de passe personnel
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('invalid login credentials') || msg.includes('invalid grant')) {
            return {
              success: false,
              error: 'Mot de passe incorrect ou compte introuvable. Veuillez vérifier vos identifiants ou créer un compte.',
            };
          }
          if (msg.includes('email not confirmed')) {
            return {
              success: false,
              error: 'Compte en attente de confirmation. Veuillez vérifier votre boîte email ou contacter le support.',
            };
          }
          return { success: false, error: error.message };
        }

        if (data.user) {
          // Récupérer le profil et l'établissement
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
          const { data: biz } = await supabase.from('businesses').select('*').eq('owner_id', data.user.id).single();

          // Tous les autres utilisateurs ont strictement le rôle 'customer' (Client Pro)
          this.currentUser = {
            id: data.user.id,
            fullName: prof?.full_name || data.user.user_metadata?.full_name || 'Client Professionnel',
            phone: prof?.phone || data.user.user_metadata?.phone || '',
            role: 'customer',
            createdAt: data.user.created_at,
          };

          if (biz) {
            this.currentBusiness = {
              id: biz.id,
              ownerId: biz.owner_id,
              businessName: biz.business_name,
              businessType: biz.business_type,
              city: biz.city,
              deliveryAddress: biz.delivery_address,
              approvalStatus: 'approved',
              createdAt: biz.created_at,
            };
          } else {
            this.currentBusiness = {
              id: `biz-${data.user.id}`,
              ownerId: data.user.id,
              businessName: data.user.user_metadata?.business_name || 'Mon Établissement',
              businessType: data.user.user_metadata?.business_type || 'restaurant',
              city: data.user.user_metadata?.city || 'Casablanca',
              deliveryAddress: data.user.user_metadata?.delivery_address || '',
              approvalStatus: 'approved',
              createdAt: new Date().toISOString(),
            };
          }

          setStored(KEY_USER, this.currentUser);
          setStored(KEY_BUSINESS, this.currentBusiness);
          this.notify();
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Erreur lors de la connexion.' };
      }
    }

    // Fallback local pour clients inscrits localement
    const allBusinesses = getStored<Business[]>(KEY_BUSINESSES, []);
    const foundBiz = allBusinesses.find((b) => b.ownerId === cleanEmail || b.businessName.toLowerCase() === cleanEmail);
    if (foundBiz) {
      this.currentUser = {
        id: foundBiz.ownerId,
        fullName: foundBiz.businessName,
        phone: '+212 6 00 00 00 00',
        role: 'customer',
        createdAt: new Date().toISOString(),
      };
      this.currentBusiness = foundBiz;
      setStored(KEY_USER, this.currentUser);
      setStored(KEY_BUSINESS, this.currentBusiness);
      this.notify();
      return { success: true };
    }

    return {
      success: false,
      error: 'Compte introuvable. Veuillez vous inscrire via l’onglet Inscription B2B.',
    };
  }

  public async register(params: {
    fullName: string;
    phone: string;
    email: string;
    password: string;
    businessName: string;
    businessType: BusinessType;
    city: string;
    deliveryAddress: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: {
            data: {
              full_name: params.fullName,
              phone: params.phone,
              business_name: params.businessName,
              business_type: params.businessType,
              city: params.city,
              delivery_address: params.deliveryAddress,
            },
          },
        });
        if (error) return { success: false, error: error.message };
        if (data.user) {
          this.currentUser = {
            id: data.user.id,
            fullName: params.fullName,
            phone: params.phone,
            role: 'customer',
            createdAt: new Date().toISOString(),
          };
          this.currentBusiness = {
            id: `biz-${Date.now()}`,
            ownerId: data.user.id,
            businessName: params.businessName,
            businessType: params.businessType,
            city: params.city,
            deliveryAddress: params.deliveryAddress,
            approvalStatus: 'approved',
            createdAt: new Date().toISOString(),
            contactName: params.fullName,
            phone: params.phone,
            email: params.email,
          };

          // Sauvegarder dans la liste pour consultation admin
          const allBiz = getStored<Business[]>(KEY_BUSINESSES, []);
          const existingIdx = allBiz.findIndex(b => b.ownerId === data.user.id);
          if (existingIdx >= 0) allBiz[existingIdx] = this.currentBusiness;
          else allBiz.unshift(this.currentBusiness);
          setStored(KEY_BUSINESSES, allBiz);

          setStored(KEY_USER, this.currentUser);
          setStored(KEY_BUSINESS, this.currentBusiness);
          this.notify();
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
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
      email: params.email,
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
          .select(`
            id,
            owner_id,
            business_name,
            business_type,
            city,
            delivery_address,
            approval_status,
            created_at,
            profiles:owner_id (
              full_name,
              phone
            )
          `)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((b: any) => ({
            id: b.id,
            ownerId: b.owner_id,
            businessName: b.business_name,
            businessType: b.business_type,
            city: b.city,
            deliveryAddress: b.delivery_address,
            approvalStatus: b.approval_status,
            createdAt: b.created_at,
            contactName: b.profiles?.full_name || '',
            phone: b.profiles?.phone || '',
          }));
        }
      } catch (e) {
        console.warn('Error fetching businesses with joined profiles', e);
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
