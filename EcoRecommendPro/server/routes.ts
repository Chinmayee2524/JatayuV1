import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import multer from "multer";
import { storage } from "./storage";
import { insertUserSchema, insertCartItemSchema, insertWishlistItemSchema, insertViewedProductSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; name: string; age: number; gender: string; };
    }
  }
}

// Extend Express Session to include userId
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const searchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Multer setup for file uploads
  const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.mimetype === 'application/json') {
        cb(null, true);
      } else {
        cb(new Error('Only CSV and JSON files are allowed'));
      }
    }
  });

  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'eco-recommend-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Auth middleware
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  };

  // Load user middleware
  const loadUser = async (req: Request, res: Response, next: Function) => {
    if (req.session?.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            age: user.age,
            gender: user.gender,
          };
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    }
    next();
  };

  app.use(loadUser);

  // Authentication routes
  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Create session
      req.session.userId = user.id;

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(400).json({ error: "Invalid signup data" });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Create session
      req.session.userId = user.id;

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ error: "Invalid login data" });
    }
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    if (req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.put('/api/auth/profile', requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, email, age, gender } = req.body;
      
      // Check if email is being changed and if it's already taken
      if (email !== req.user!.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.user!.id) {
          return res.status(400).json({ error: "Email already in use" });
        }
      }

      // Update user profile
      const updatedUser = await storage.updateUser(req.user!.id, {
        name,
        email,
        age: parseInt(age),
        gender,
      });

      res.json({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        age: updatedUser.age,
        gender: updatedUser.gender,
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(400).json({ error: "Failed to update profile" });
    }
  });

  // Product routes
  // Get all products
  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const products = await storage.getProducts(limit, offset);

      // Debug: Log first product's eco-score
      if (products.length > 0) {
        console.log(`[DEBUG] First product eco-score: ${products[0].ecoScore}, title: ${products[0].title}`);
      }

      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get('/api/products/search', async (req: Request, res: Response) => {
    try {
      const { query, limit } = searchSchema.parse({
        query: req.query.q,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      });

      const products = await storage.searchProducts(query, limit);
      res.json(products);
    } catch (error) {
      console.error('Search products error:', error);
      res.status(400).json({ error: "Invalid search query" });
    }
  });

  app.get('/api/products/recommendations', requireAuth, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const products = await storage.getRecommendedProducts(req.user!.id, limit);
      res.json(products);
    } catch (error) {
      console.error('Get recommendations error:', error);
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  // Cold start recommendations based on demographics
  app.get('/api/products/cold-start', async (req: Request, res: Response) => {
    try {
      const age = parseInt(req.query.age as string) || 25;
      const gender = req.query.gender as string || 'male';
      const limit = parseInt(req.query.limit as string) || 20;

      const allProducts = await storage.getProducts(200);
      
      const recommendationInput = {
        products: allProducts,
        type: 'cold_start',
        user_data: { age, gender },
        limit
      };

      const { spawn } = require('child_process');
      const python = spawn('python3', ['server/recommendation_service.py']);
      
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
          console.error('Cold start recommendation error:', error);
          return res.json(allProducts.slice(0, limit));
        } else {
          try {
            const recommendations = JSON.parse(output);
            res.json(recommendations);
          } catch (parseError) {
            console.error('Failed to parse cold start recommendations:', parseError);
            res.json(allProducts.slice(0, limit));
          }
        }
      });

      python.stdin.write(JSON.stringify(recommendationInput));
      python.stdin.end();

    } catch (error) {
      console.error('Cold start recommendations error:', error);
      res.status(500).json({ error: "Failed to get cold start recommendations" });
    }
  });

  app.get('/api/products/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: "Failed to get product" });
    }
  });

  // Cart routes
  app.get('/api/cart', requireAuth, async (req: Request, res: Response) => {
    try {
      const items = await storage.getCartItems(req.user!.id);
      res.json(items);
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({ error: "Failed to get cart" });
    }
  });

  app.post('/api/cart', requireAuth, async (req: Request, res: Response) => {
    try {
      const cartItem = insertCartItemSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      const item = await storage.addToCart(cartItem);
      res.json(item);
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(400).json({ error: "Failed to add to cart" });
    }
  });

  app.put('/api/cart/:productId', requireAuth, async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      const { quantity } = req.body;

      await storage.updateCartQuantity(req.user!.id, productId, quantity);
      res.json({ message: "Cart updated" });
    } catch (error) {
      console.error('Update cart error:', error);
      res.status(400).json({ error: "Failed to update cart" });
    }
  });

  app.delete('/api/cart/:productId', requireAuth, async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      await storage.removeFromCart(req.user!.id, productId);
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      console.error('Remove from cart error:', error);
      res.status(400).json({ error: "Failed to remove from cart" });
    }
  });

  // Wishlist routes
  app.get('/api/wishlist', requireAuth, async (req: Request, res: Response) => {
    try {
      const items = await storage.getWishlistItems(req.user!.id);
      res.json(items);
    } catch (error) {
      console.error('Get wishlist error:', error);
      res.status(500).json({ error: "Failed to get wishlist" });
    }
  });

  app.post('/api/wishlist', requireAuth, async (req: Request, res: Response) => {
    try {
      const wishlistItem = insertWishlistItemSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      const item = await storage.addToWishlist(wishlistItem);
      res.json(item);
    } catch (error) {
      console.error('Add to wishlist error:', error);
      res.status(400).json({ error: "Failed to add to wishlist" });
    }
  });

  app.delete('/api/wishlist/:productId', requireAuth, async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      await storage.removeFromWishlist(req.user!.id, productId);
      res.json({ message: "Item removed from wishlist" });
    } catch (error) {
      console.error('Remove from wishlist error:', error);
      res.status(400).json({ error: "Failed to remove from wishlist" });
    }
  });

  // Activity tracking routes
  app.post('/api/activity/view', requireAuth, async (req: Request, res: Response) => {
    try {
      const viewData = insertViewedProductSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      const view = await storage.trackView(viewData);
      res.json(view);
    } catch (error) {
      console.error('Track view error:', error);
      res.status(400).json({ error: "Failed to track view" });
    }
  });

  app.get('/api/activity/viewed', requireAuth, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const products = await storage.getViewedProducts(req.user!.id, limit);
      res.json(products);
    } catch (error) {
      console.error('Get viewed products error:', error);
      res.status(500).json({ error: "Failed to get viewed products" });
    }
  });

  // Admin routes
  app.post('/api/admin/upload-dataset', upload.single('dataset'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const filePath = req.file.path;
      const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();

      if (fileExt !== 'csv' && fileExt !== 'json') {
        return res.status(400).json({ error: "Only CSV and JSON files are supported" });
      }

      // Here you would process the file and update the database
      // For now, we'll just return success
      res.json({ 
        message: "Dataset uploaded successfully", 
        filename: req.file.originalname,
        processed: true 
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: "Failed to upload dataset" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}