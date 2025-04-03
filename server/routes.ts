import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertAcUnitSchema,
  insertReminderSchema,
  insertNotificationPreferencesSchema
} from "@shared/schema";
import { z, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcryptjs";
import session from "express-session";

// Extend express-session types
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}
import MemoryStore from "memorystore";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Set up session
  const MemStore = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "coolTrackSecretKey",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production", maxAge: 86400000 }, // 1 day
      store: new MemStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Type guard to ensure userId is defined
  function ensureUserId(req: Request): asserts req is Request & { session: { userId: number } } {
    if (req.session.userId === undefined) {
      throw new Error("User ID is not defined in session");
    }
  }

  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // Force TypeScript to understand that userId is defined in all following routes
    req.session.userId = req.session.userId as number;
    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Create default notification preferences
      await storage.createNotificationPreferences({
        userId: user.id,
        emailEnabled: true,
        smsEnabled: false,
        daysBeforeService: 7,
      });

      // Set session
      req.session.userId = user.id;

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const loginSchema = z.object({
        username: z.string(),
        password: z.string(),
      });

      const { username, password } = loginSchema.parse(req.body);
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      // Using non-null assertion since we've checked in requireAuth
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // User routes
  app.patch("/api/users/me", requireAuth, async (req, res) => {
    try {
      const updateUserSchema = insertUserSchema.partial();
      const userData = updateUserSchema.parse(req.body);
      
      // If password is included, hash it
      if (userData.password) {
        const salt = await bcrypt.genSalt(10);
        userData.password = await bcrypt.hash(userData.password, salt);
      }

      const user = await storage.updateUser(req.session.userId!, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // AC Unit routes
  app.get("/api/ac-units", requireAuth, async (req, res) => {
    try {
      const acUnits = await storage.getAcUnitsByUserId(req.session.userId!);
      res.status(200).json(acUnits);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/ac-units", requireAuth, async (req, res) => {
    try {
      const acUnitData = insertAcUnitSchema.parse({
        ...req.body,
        userId: req.session.userId!
      });

      const acUnit = await storage.createAcUnit(acUnitData);
      res.status(201).json(acUnit);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/ac-units/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const acUnit = await storage.getAcUnit(id);
      if (!acUnit) {
        return res.status(404).json({ message: "AC unit not found" });
      }

      // Verify ownership
      if (acUnit.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.status(200).json(acUnit);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/ac-units/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      // Verify ownership
      const acUnit = await storage.getAcUnit(id);
      if (!acUnit) {
        return res.status(404).json({ message: "AC unit not found" });
      }

      if (acUnit.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updateAcUnitSchema = insertAcUnitSchema.partial();
      const acUnitData = updateAcUnitSchema.parse(req.body);

      const updatedAcUnit = await storage.updateAcUnit(id, acUnitData);
      res.status(200).json(updatedAcUnit);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/ac-units/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      // Verify ownership
      const acUnit = await storage.getAcUnit(id);
      if (!acUnit) {
        return res.status(404).json({ message: "AC unit not found" });
      }

      if (acUnit.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteAcUnit(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.session.userId!);
      res.status(200).json(stats);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Notification preferences
  app.get("/api/notification-preferences", requireAuth, async (req, res) => {
    try {
      const preferences = await storage.getNotificationPreferences(req.session.userId!);
      if (!preferences) {
        // Create default preferences if not found
        const defaultPreferences = await storage.createNotificationPreferences({
          userId: req.session.userId!,
          emailEnabled: true,
          smsEnabled: false,
          daysBeforeService: 7,
        });
        return res.status(200).json(defaultPreferences);
      }
      
      res.status(200).json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/notification-preferences", requireAuth, async (req, res) => {
    try {
      const preferencesSchema = insertNotificationPreferencesSchema.partial();
      const preferencesData = preferencesSchema.parse(req.body);

      let preferences = await storage.getNotificationPreferences(req.session.userId!);
      if (!preferences) {
        // Create if not found
        preferences = await storage.createNotificationPreferences({
          userId: req.session.userId!,
          ...preferencesData,
          emailEnabled: preferencesData.emailEnabled ?? true,
          smsEnabled: preferencesData.smsEnabled ?? false,
          daysBeforeService: preferencesData.daysBeforeService ?? 7,
        });
      } else {
        // Update existing
        preferences = await storage.updateNotificationPreferences(req.session.userId!, preferencesData);
      }

      res.status(200).json(preferences);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  return httpServer;
}
