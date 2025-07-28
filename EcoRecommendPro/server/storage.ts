import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc, ilike, or, sql } from "drizzle-orm";
import { 
  users, products, cartItems, wishlistItems, viewedProducts, userSessions,
  type User, type InsertUser, type Product, type InsertProduct,
  type CartItem, type InsertCartItem, type WishlistItem, type InsertWishlistItem,
  type ViewedProduct, type InsertViewedProduct
} from "@shared/schema";

const connectionString = process.env.DATABASE_URL || "";
const client = neon(connectionString);
const db = drizzle(client);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;

  // Product management
  getProducts(limit?: number, offset?: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  searchProducts(query: string, limit?: number): Promise<Product[]>;
  getProductsByCategory(category: string, limit?: number): Promise<Product[]>;
  getRecommendedProducts(userId: number, limit?: number): Promise<Product[]>;

  // Cart management
  getCartItems(userId: number): Promise<(CartItem & { product: Product })[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartQuantity(userId: number, productId: number, quantity: number): Promise<void>;
  removeFromCart(userId: number, productId: number): Promise<void>;
  clearCart(userId: number): Promise<void>;

  // Wishlist management
  getWishlistItems(userId: number): Promise<(WishlistItem & { product: Product })[]>;
  addToWishlist(item: InsertWishlistItem): Promise<WishlistItem>;
  removeFromWishlist(userId: number, productId: number): Promise<void>;

  // Activity tracking
  trackView(view: InsertViewedProduct): Promise<ViewedProduct>;
  getViewedProducts(userId: number, limit?: number): Promise<Product[]>;

  // Session management
  saveUserSession(userId: number, sessionData: any): Promise<void>;
  getUserSession(userId: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async getProducts(limit: number = 20, offset: number = 0): Promise<Product[]> {
    const result = await db.select().from(products)
      .orderBy(desc(products.ecoScore))
      .limit(limit)
      .offset(offset);

    // Apply fallback eco-scoring for products with 0 or missing eco_score
    return result.map(product => ({
      ...product,
      ecoScore: parseFloat(this.normalizeEcoScore(product.ecoScore)) === 0 
        ? this.calculateFallbackEcoScore(product) 
        : this.normalizeEcoScore(product.ecoScore)
    }));
  }

  private normalizeEcoScore(ecoScore: string | number): string {
    if (typeof ecoScore === 'string') {
      return ecoScore;
    }
    return String(ecoScore || 0);
  }

  private calculateFallbackEcoScore(product: Product): string {
    const text = (product.text || '').toLowerCase();
    const title = (product.title || '').toLowerCase();
    const category = (product.category || '').toLowerCase();

    let score = 10; // Base score

    // Eco-friendly keywords with weights
    const ecoKeywords = [
      { word: 'organic', weight: 8 },
      { word: 'sustainable', weight: 8 },
      { word: 'eco-friendly', weight: 8 },
      { word: 'biodegradable', weight: 7 },
      { word: 'recyclable', weight: 6 },
      { word: 'renewable', weight: 6 },
      { word: 'natural', weight: 5 },
      { word: 'bamboo', weight: 6 },
      { word: 'hemp', weight: 6 },
      { word: 'cork', weight: 5 },
      { word: 'recycled', weight: 6 },
      { word: 'compostable', weight: 7 },
      { word: 'zero-waste', weight: 8 },
      { word: 'carbon-neutral', weight: 7 },
      { word: 'plant-based', weight: 6 },
      { word: 'solar', weight: 6 },
      { word: 'energy-efficient', weight: 5 },
      { word: 'reusable', weight: 6 },
      { word: 'bpa-free', weight: 4 },
      { word: 'non-toxic', weight: 4 }
    ];

    // Check title (higher weight)
    ecoKeywords.forEach(({ word, weight }) => {
      if (title.includes(word)) {
        score += weight * 1.5; // Title gets 1.5x multiplier
      }
    });

    // Check text content
    ecoKeywords.forEach(({ word, weight }) => {
      if (text.includes(word)) {
        score += weight;
      }
    });

    // Category bonuses
    const ecoCategories = [
      'home & kitchen',
      'grocery & gourmet food', 
      'tools & home improvement',
      'patio, lawn & garden'
    ];

    if (ecoCategories.some(cat => category.includes(cat))) {
      score += 5;
    }

    // Cap the score at 50
    return String(Math.min(score, 50));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);

    const product = result[0];
    if (!product) return undefined;

    return {
      ...product,
      ecoScore: parseFloat(this.normalizeEcoScore(product.ecoScore)) === 0 
        ? this.calculateFallbackEcoScore(product) 
        : this.normalizeEcoScore(product.ecoScore)
    };
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  async searchProducts(query: string, limit: number = 20): Promise<Product[]> {
    const result = await db.select().from(products)
      .where(
        or(
          ilike(products.title, `%${query}%`),
          ilike(products.text, `%${query}%`),
          ilike(products.category, `%${query}%`)
        )
      )
      .orderBy(desc(products.ecoScore))
      .limit(limit);

    return result.map(product => ({
      ...product,
      ecoScore: parseFloat(this.normalizeEcoScore(product.ecoScore)) === 0 
        ? this.calculateFallbackEcoScore(product) 
        : this.normalizeEcoScore(product.ecoScore)
    }));
  }

  async getProductsByCategory(category: string, limit: number = 20): Promise<Product[]> {
    const result = await db.select().from(products)
      .where(eq(products.category, category))
      .orderBy(desc(products.ecoScore))
      .limit(limit);

    return result.map(product => ({
      ...product,
      ecoScore: parseFloat(this.normalizeEcoScore(product.ecoScore)) === 0 
        ? this.calculateFallbackEcoScore(product) 
        : this.normalizeEcoScore(product.ecoScore)
    }));
  }

  async getRecommendedProducts(userId: number, limit: number = 20): Promise<Product[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    try {
      // Get all products for recommendation engine
      const allProducts = await this.getProducts(200); // Get more products for better recommendations
      
      // Get user activity data
      const cartItems = await this.getCartItems(userId);
      const wishlistItems = await this.getWishlistItems(userId);
      const viewedProductsData = await this.getViewedProducts(userId, 50);

      // Determine if user has enough activity for personalized recommendations
      const hasActivity = cartItems.length > 0 || wishlistItems.length > 0 || viewedProductsData.length > 2;

      const recommendationInput = {
        products: allProducts,
        type: hasActivity ? 'personalized' : 'cold_start',
        user_data: {
          age: user.age,
          gender: user.gender,
          cart_items: cartItems,
          wishlist_items: wishlistItems,
          viewed_products: viewedProductsData
        },
        limit
      };

      // Call Python recommendation service
      const { spawn } = require('child_process');
      const python = spawn('python3', ['server/recommendation_service.py']);
      
      return new Promise((resolve, reject) => {
        let output = '';
        let error = '';

        python.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        python.stderr.on('data', (data: Buffer) => {
          error += data.toString();
        });

        python.on('close', (code: number) => {
          if (code !== 0) {
            console.error('Recommendation service error:', error);
            // Fallback to basic recommendation
            resolve(allProducts.slice(0, limit));
          } else {
            try {
              const recommendations = JSON.parse(output);
              resolve(recommendations);
            } catch (parseError) {
              console.error('Failed to parse recommendations:', parseError);
              resolve(allProducts.slice(0, limit));
            }
          }
        });

        // Send input to Python script
        python.stdin.write(JSON.stringify(recommendationInput));
        python.stdin.end();
      });

    } catch (error) {
      console.error('Error getting recommendations:', error);
      // Fallback to basic products
      return await this.getProducts(limit);
    }
  }

  async getCartItems(userId: number): Promise<(CartItem & { product: Product })[]> {
    const result = await db.select({
      id: cartItems.id,
      userId: cartItems.userId,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      createdAt: cartItems.createdAt,
      product: products
    })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId))
      .orderBy(desc(cartItems.createdAt));

    return result as any;
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    // Check if item already exists
    const existing = await db.select().from(cartItems)
      .where(and(
        eq(cartItems.userId, item.userId),
        eq(cartItems.productId, item.productId)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update quantity
      await db.update(cartItems)
        .set({ quantity: existing[0].quantity + (item.quantity || 1) })
        .where(eq(cartItems.id, existing[0].id));
      return existing[0];
    } else {
      // Insert new item
      const result = await db.insert(cartItems).values(item).returning();
      return result[0];
    }
  }

  async updateCartQuantity(userId: number, productId: number, quantity: number): Promise<void> {
    await db.update(cartItems)
      .set({ quantity })
      .where(and(
        eq(cartItems.userId, userId),
        eq(cartItems.productId, productId)
      ));
  }

  async removeFromCart(userId: number, productId: number): Promise<void> {
    await db.delete(cartItems)
      .where(and(
        eq(cartItems.userId, userId),
        eq(cartItems.productId, productId)
      ));
  }

  async clearCart(userId: number): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  async getWishlistItems(userId: number): Promise<(WishlistItem & { product: Product })[]> {
    const result = await db.select({
      id: wishlistItems.id,
      userId: wishlistItems.userId,
      productId: wishlistItems.productId,
      createdAt: wishlistItems.createdAt,
      product: products
    })
      .from(wishlistItems)
      .innerJoin(products, eq(wishlistItems.productId, products.id))
      .where(eq(wishlistItems.userId, userId))
      .orderBy(desc(wishlistItems.createdAt));

    return result as any;
  }

  async addToWishlist(item: InsertWishlistItem): Promise<WishlistItem> {
    // Check if item already exists
    const existing = await db.select().from(wishlistItems)
      .where(and(
        eq(wishlistItems.userId, item.userId),
        eq(wishlistItems.productId, item.productId)
      ))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const result = await db.insert(wishlistItems).values(item).returning();
    return result[0];
  }

  async removeFromWishlist(userId: number, productId: number): Promise<void> {
    await db.delete(wishlistItems)
      .where(and(
        eq(wishlistItems.userId, userId),
        eq(wishlistItems.productId, productId)
      ));
  }

  async trackView(view: InsertViewedProduct): Promise<ViewedProduct> {
    const result = await db.insert(viewedProducts).values(view).returning();
    return result[0];
  }

  async getViewedProducts(userId: number, limit: number = 10): Promise<Product[]> {
    const result = await db.select({ product: products })
      .from(viewedProducts)
      .innerJoin(products, eq(viewedProducts.productId, products.id))
      .where(eq(viewedProducts.userId, userId))
      .orderBy(desc(viewedProducts.viewedAt))
      .limit(limit);

    return result.map(r => r.product);
  }

  async saveUserSession(userId: number, sessionData: any): Promise<void> {
    await db.insert(userSessions).values({
      userId,
      sessionData,
      lastAccessed: new Date()
    })
    .onConflictDoUpdate({
      target: userSessions.userId,
      set: {
        sessionData,
        lastAccessed: new Date()
      }
    });
  }

  async getUserSession(userId: number): Promise<any> {
    const result = await db.select().from(userSessions)
      .where(eq(userSessions.userId, userId))
      .limit(1);

    return result[0]?.sessionData || null;
  }
}

export const storage = new DatabaseStorage();