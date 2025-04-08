// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  users;
  acUnits;
  reminders;
  notificationPreferences;
  userIdCounter;
  acUnitIdCounter;
  reminderIdCounter;
  notificationPreferencesIdCounter;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.acUnits = /* @__PURE__ */ new Map();
    this.reminders = /* @__PURE__ */ new Map();
    this.notificationPreferences = /* @__PURE__ */ new Map();
    this.userIdCounter = 1;
    this.acUnitIdCounter = 1;
    this.reminderIdCounter = 1;
    this.notificationPreferencesIdCounter = 1;
  }
  // User operations
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async getUserByEmail(email) {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }
  async createUser(insertUser) {
    const id = this.userIdCounter++;
    const now = /* @__PURE__ */ new Date();
    const user = {
      ...insertUser,
      id,
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }
  async updateUser(id, data) {
    const user = await this.getUser(id);
    if (!user) return void 0;
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  // AC Unit operations
  async getAcUnit(id) {
    return this.acUnits.get(id);
  }
  async getAcUnitsByUserId(userId) {
    return Array.from(this.acUnits.values()).filter(
      (unit) => unit.userId === userId
    );
  }
  async createAcUnit(insertAcUnit) {
    const id = this.acUnitIdCounter++;
    const now = /* @__PURE__ */ new Date();
    const acUnit = {
      ...insertAcUnit,
      id,
      createdAt: now
    };
    this.acUnits.set(id, acUnit);
    return acUnit;
  }
  async updateAcUnit(id, data) {
    const acUnit = await this.getAcUnit(id);
    if (!acUnit) return void 0;
    const updatedAcUnit = { ...acUnit, ...data };
    this.acUnits.set(id, updatedAcUnit);
    return updatedAcUnit;
  }
  async deleteAcUnit(id) {
    return this.acUnits.delete(id);
  }
  // Reminder operations
  async getReminder(id) {
    return this.reminders.get(id);
  }
  async getRemindersByUserId(userId) {
    return Array.from(this.reminders.values()).filter(
      (reminder) => reminder.userId === userId
    );
  }
  async getRemindersByAcUnitId(acUnitId) {
    return Array.from(this.reminders.values()).filter(
      (reminder) => reminder.acUnitId === acUnitId
    );
  }
  async createReminder(insertReminder) {
    const id = this.reminderIdCounter++;
    const now = /* @__PURE__ */ new Date();
    const reminder = {
      ...insertReminder,
      id,
      createdAt: now
    };
    this.reminders.set(id, reminder);
    return reminder;
  }
  async updateReminder(id, data) {
    const reminder = await this.getReminder(id);
    if (!reminder) return void 0;
    const updatedReminder = { ...reminder, ...data };
    this.reminders.set(id, updatedReminder);
    return updatedReminder;
  }
  async deleteReminder(id) {
    return this.reminders.delete(id);
  }
  // Notification preferences operations
  async getNotificationPreferences(userId) {
    return Array.from(this.notificationPreferences.values()).find(
      (pref) => pref.userId === userId
    );
  }
  async createNotificationPreferences(insertPreferences) {
    const id = this.notificationPreferencesIdCounter++;
    const preferences = {
      ...insertPreferences,
      id
    };
    this.notificationPreferences.set(id, preferences);
    return preferences;
  }
  async updateNotificationPreferences(userId, data) {
    const preferences = await this.getNotificationPreferences(userId);
    if (!preferences) return void 0;
    const updatedPreferences = { ...preferences, ...data };
    this.notificationPreferences.set(preferences.id, updatedPreferences);
    return updatedPreferences;
  }
  // Dashboard statistics
  async getDashboardStats(userId) {
    const userAcUnits = await this.getAcUnitsByUserId(userId);
    const now = /* @__PURE__ */ new Date();
    const upcomingServices = userAcUnits.filter((unit) => {
      const nextService = new Date(unit.nextServiceDate);
      const diffTime = nextService.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30;
    }).length;
    const overdueServices = userAcUnits.filter((unit) => {
      const nextService = new Date(unit.nextServiceDate);
      return nextService < now;
    }).length;
    const totalUnits = userAcUnits.length;
    const servicesCompleted = userAcUnits.filter(
      (unit) => unit.lastServiceDate !== null && new Date(unit.lastServiceDate) <= now && new Date(unit.nextServiceDate) > now
    ).length;
    return {
      totalUnits,
      upcomingServices,
      overdueServices,
      servicesCompleted
    };
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var acUnits = pgTable("ac_units", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  location: text("location").notNull(),
  lastServiceDate: timestamp("last_service_date"),
  nextServiceDate: timestamp("next_service_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertAcUnitSchema = createInsertSchema(acUnits).omit({
  id: true,
  createdAt: true
});
var reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  acUnitId: integer("ac_unit_id").notNull(),
  reminderDate: timestamp("reminder_date").notNull(),
  reminderSent: boolean("reminder_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true
});
var notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  emailEnabled: boolean("email_enabled").default(true).notNull(),
  smsEnabled: boolean("sms_enabled").default(false).notNull(),
  daysBeforeService: integer("days_before_service").default(7).notNull()
});
var insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true
});

// server/routes.ts
import { z, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcryptjs";
import session from "express-session";
import MemoryStore from "memorystore";
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const MemStore = MemoryStore(session);
  app2.use(
    session({
      secret: process.env.SESSION_SECRET || "coolTrackSecretKey",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production", maxAge: 864e5 },
      // 1 day
      store: new MemStore({
        checkPeriod: 864e5
        // prune expired entries every 24h
      })
    })
  );
  function ensureUserId(req) {
    if (req.session.userId === void 0) {
      throw new Error("User ID is not defined in session");
    }
  }
  const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.session.userId = req.session.userId;
    next();
  };
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      await storage.createNotificationPreferences({
        userId: user.id,
        emailEnabled: true,
        smsEnabled: false,
        daysBeforeService: 7
      });
      req.session.userId = user.id;
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const loginSchema = z.object({
        username: z.string(),
        password: z.string()
      });
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  app2.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.patch("/api/users/me", requireAuth, async (req, res) => {
    try {
      const updateUserSchema = insertUserSchema.partial();
      const userData = updateUserSchema.parse(req.body);
      if (userData.password) {
        const salt = await bcrypt.genSalt(10);
        userData.password = await bcrypt.hash(userData.password, salt);
      }
      const user = await storage.updateUser(req.session.userId, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/ac-units", requireAuth, async (req, res) => {
    try {
      const acUnits2 = await storage.getAcUnitsByUserId(req.session.userId);
      res.status(200).json(acUnits2);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/ac-units", requireAuth, async (req, res) => {
    try {
      const acUnitData = insertAcUnitSchema.parse({
        ...req.body,
        userId: req.session.userId
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
  app2.get("/api/ac-units/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const acUnit = await storage.getAcUnit(id);
      if (!acUnit) {
        return res.status(404).json({ message: "AC unit not found" });
      }
      if (acUnit.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.status(200).json(acUnit);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.patch("/api/ac-units/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const acUnit = await storage.getAcUnit(id);
      if (!acUnit) {
        return res.status(404).json({ message: "AC unit not found" });
      }
      if (acUnit.userId !== req.session.userId) {
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
  app2.delete("/api/ac-units/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const acUnit = await storage.getAcUnit(id);
      if (!acUnit) {
        return res.status(404).json({ message: "AC unit not found" });
      }
      if (acUnit.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteAcUnit(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.session.userId);
      res.status(200).json(stats);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/notification-preferences", requireAuth, async (req, res) => {
    try {
      const preferences = await storage.getNotificationPreferences(req.session.userId);
      if (!preferences) {
        const defaultPreferences = await storage.createNotificationPreferences({
          userId: req.session.userId,
          emailEnabled: true,
          smsEnabled: false,
          daysBeforeService: 7
        });
        return res.status(200).json(defaultPreferences);
      }
      res.status(200).json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.patch("/api/notification-preferences", requireAuth, async (req, res) => {
    try {
      const preferencesSchema = insertNotificationPreferencesSchema.partial();
      const preferencesData = preferencesSchema.parse(req.body);
      let preferences = await storage.getNotificationPreferences(req.session.userId);
      if (!preferences) {
        preferences = await storage.createNotificationPreferences({
          userId: req.session.userId,
          ...preferencesData,
          emailEnabled: preferencesData.emailEnabled ?? true,
          smsEnabled: preferencesData.smsEnabled ?? false,
          daysBeforeService: preferencesData.daysBeforeService ?? 7
        });
      } else {
        preferences = await storage.updateNotificationPreferences(req.session.userId, preferencesData);
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

// server/vite.ts
import express from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen(port, "localhost", () => {
    log(`serving on port ${port}`);
  });
})();
