import http, { IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import { parse as parseQuery } from 'querystring';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { storage } from './storage';
import {
  insertUserSchema,
  insertAcUnitSchema,
  insertNotificationPreferencesSchema
} from '@shared/schema';
import { z, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { nanoid } from 'nanoid';
import { createServer as createViteServer } from 'vite';
import viteConfig from '../vite.config';

// Path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const PORT = 5001;  // Using a different port for Node.js version
const SESSION_SECRET = process.env.SESSION_SECRET || 'coolTrackSecretKey';

// Session store
type Session = {
  id: string;
  userId?: number;
  createdAt: number;
  expires: number;
};

class MemorySessionStore {
  private sessions: Map<string, Session> = new Map();
  
  constructor() {
    // Cleanup expired sessions every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  get(id: string): Session | undefined {
    const session = this.sessions.get(id);
    if (session && session.expires < Date.now()) {
      this.sessions.delete(id);
      return undefined;
    }
    return session;
  }

  set(id: string, session: Session): void {
    this.sessions.set(id, session);
  }

  destroy(id: string): void {
    this.sessions.delete(id);
  }

  private cleanup(): void {
    const now = Date.now();
    // Convert to array first to avoid TypeScript iterator issue
    const sessionEntries = Array.from(this.sessions.entries());
    for (const [id, session] of sessionEntries) {
      if (session.expires < now) {
        this.sessions.delete(id);
      }
    }
  }
}

const sessionStore = new MemorySessionStore();

// Utility for logging
function log(message: string, source = 'node-server'): void {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Parse request body
async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const bodyParts: Buffer[] = [];
    req.on('data', (chunk) => {
      bodyParts.push(chunk);
    });
    req.on('end', () => {
      try {
        const body = Buffer.concat(bodyParts).toString();
        if (body) {
          resolve(JSON.parse(body));
        } else {
          resolve({});
        }
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

// Handle sessions
function handleSession(req: IncomingMessage & { session?: Session }, res: ServerResponse): string {
  // Check for existing session cookie
  const cookieHeader = req.headers.cookie;
  let sessionId: string | null = null;
  
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
    const sessionCookie = cookies.find(cookie => cookie.startsWith('sessionId='));
    if (sessionCookie) {
      sessionId = sessionCookie.split('=')[1];
    }
  }
  
  // Create new session if needed
  if (!sessionId || !sessionStore.get(sessionId)) {
    sessionId = crypto.randomBytes(32).toString('hex');
    const session: Session = {
      id: sessionId,
      createdAt: Date.now(),
      expires: Date.now() + 24 * 60 * 60 * 1000, // 1 day
    };
    sessionStore.set(sessionId, session);
    res.setHeader('Set-Cookie', `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=86400`);
  }
  
  // Attach session to request
  req.session = sessionStore.get(sessionId);
  
  return sessionId;
}

// Require authentication middleware
function requireAuth(req: IncomingMessage & { session?: Session }, res: ServerResponse): boolean {
  if (!req.session?.userId) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Unauthorized' }));
    return false;
  }
  return true;
}

// Serve static files
async function serveStatic(req: IncomingMessage, res: ServerResponse, filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        resolve(false);
        return;
      }

      const extname = path.extname(filePath);
      const contentTypeMap: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
      };

      const contentType = contentTypeMap[extname] || 'text/plain';
      res.setHeader('Content-Type', contentType);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      fileStream.on('end', () => resolve(true));
      fileStream.on('error', () => resolve(false));
    });
  });
}

// Setup Vite in development mode
async function setupVite() {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: {
      middlewareMode: true,
      hmr: true,
    },
    appType: 'custom',
  });

  return vite;
}

// Main server creation
async function createServer() {
  let vite: any = null;
  
  if (process.env.NODE_ENV !== 'production') {
    vite = await setupVite();
  }

  const server = http.createServer(async (req: IncomingMessage & { session?: Session }, res: ServerResponse) => {
    const start = Date.now();
    
    // Parse URL
    const parsedUrl = parseUrl(req.url || '/');
    const pathname = parsedUrl.pathname || '/';
    
    // Handle session
    handleSession(req, res);
    
    // API routes
    if (pathname.startsWith('/api')) {
      // Set default headers for API responses
      res.setHeader('Content-Type', 'application/json');
      
      // Auth routes
      if (pathname === '/api/auth/register' && req.method === 'POST') {
        try {
          const body = await parseBody(req);
          const userData = insertUserSchema.parse(body);
          
          // Check if user already exists
          const existingUser = await storage.getUserByUsername(userData.username);
          if (existingUser) {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: 'Username already exists' }));
            return;
          }

          const existingEmail = await storage.getUserByEmail(userData.email);
          if (existingEmail) {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: 'Email already exists' }));
            return;
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
          if (req.session) {
            req.session.userId = user.id;
            sessionStore.set(req.session.id, req.session);
          }

          // Return user without password
          const { password, ...userWithoutPassword } = user;
          res.statusCode = 201;
          res.end(JSON.stringify(userWithoutPassword));
        } catch (error) {
          if (error instanceof ZodError) {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: fromZodError(error).message }));
            return;
          }
          res.statusCode = 500;
          res.end(JSON.stringify({ message: 'Server error' }));
        }
        return;
      }
      
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        try {
          const body = await parseBody(req);
          const loginSchema = z.object({
            username: z.string(),
            password: z.string(),
          });

          const { username, password } = loginSchema.parse(body);
          
          // Find user
          const user = await storage.getUserByUsername(username);
          if (!user) {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: 'Invalid credentials' }));
            return;
          }

          // Check password
          const validPassword = await bcrypt.compare(password, user.password);
          if (!validPassword) {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: 'Invalid credentials' }));
            return;
          }

          // Set session
          if (req.session) {
            req.session.userId = user.id;
            sessionStore.set(req.session.id, req.session);
          }

          // Return user without password
          const { password: _, ...userWithoutPassword } = user;
          res.statusCode = 200;
          res.end(JSON.stringify(userWithoutPassword));
        } catch (error) {
          if (error instanceof ZodError) {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: fromZodError(error).message }));
            return;
          }
          res.statusCode = 500;
          res.end(JSON.stringify({ message: 'Server error' }));
        }
        return;
      }
      
      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        if (req.session) {
          sessionStore.destroy(req.session.id);
        }
        res.statusCode = 200;
        res.end(JSON.stringify({ message: 'Logged out successfully' }));
        return;
      }
      
      if (pathname === '/api/auth/me' && req.method === 'GET') {
        if (!requireAuth(req, res)) return;
        
        try {
          // Using non-null assertion since we've checked in requireAuth
          const user = await storage.getUser(req.session!.userId!);
          if (!user) {
            res.statusCode = 404;
            res.end(JSON.stringify({ message: 'User not found' }));
            return;
          }

          // Return user without password
          const { password, ...userWithoutPassword } = user;
          res.statusCode = 200;
          res.end(JSON.stringify(userWithoutPassword));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ message: 'Server error' }));
        }
        return;
      }
      
      // User routes
      if (pathname === '/api/users/me' && req.method === 'PATCH') {
        if (!requireAuth(req, res)) return;
        
        try {
          const body = await parseBody(req);
          const updateUserSchema = insertUserSchema.partial();
          const userData = updateUserSchema.parse(body);
          
          // If password is included, hash it
          if (userData.password) {
            const salt = await bcrypt.genSalt(10);
            userData.password = await bcrypt.hash(userData.password, salt);
          }

          const user = await storage.updateUser(req.session!.userId!, userData);
          if (!user) {
            res.statusCode = 404;
            res.end(JSON.stringify({ message: 'User not found' }));
            return;
          }

          // Return user without password
          const { password, ...userWithoutPassword } = user;
          res.statusCode = 200;
          res.end(JSON.stringify(userWithoutPassword));
        } catch (error) {
          if (error instanceof ZodError) {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: fromZodError(error).message }));
            return;
          }
          res.statusCode = 500;
          res.end(JSON.stringify({ message: 'Server error' }));
        }
        return;
      }
      
      // AC Unit routes
      if (pathname === '/api/ac-units' && req.method === 'GET') {
        if (!requireAuth(req, res)) return;
        
        try {
          const acUnits = await storage.getAcUnitsByUserId(req.session!.userId!);
          res.statusCode = 200;
          res.end(JSON.stringify(acUnits));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ message: 'Server error' }));
        }
        return;
      }
      
      if (pathname === '/api/ac-units' && req.method === 'POST') {
        if (!requireAuth(req, res)) return;
        
        try {
          const body = await parseBody(req);
          const acUnitData = insertAcUnitSchema.parse({
            ...body,
            userId: req.session!.userId!
          });

          const acUnit = await storage.createAcUnit(acUnitData);
          res.statusCode = 201;
          res.end(JSON.stringify(acUnit));
        } catch (error) {
          if (error instanceof ZodError) {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: fromZodError(error).message }));
            return;
          }
          res.statusCode = 500;
          res.end(JSON.stringify({ message: 'Server error' }));
        }
        return;
      }
      
      // AC Unit by ID routes (GET, PATCH, DELETE)
      if (pathname.startsWith('/api/ac-units/') && req.method === 'GET') {
        if (!requireAuth(req, res)) return;
        
        try {
          const id = parseInt(pathname.split('/').pop() || '');
          if (isNaN(id)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: 'Invalid ID' }));
            return;
          }

          const acUnit = await storage.getAcUnit(id);
          if (!acUnit) {
            res.statusCode = 404;
            res.end(JSON.stringify({ message: 'AC unit not found' }));
            return;
          }

          // Verify ownership
          if (acUnit.userId !== req.session!.userId!) {
            res.statusCode = 403;
            res.end(JSON.stringify({ message: 'Forbidden' }));
            return;
          }

          res.statusCode = 200;
          res.end(JSON.stringify(acUnit));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ message: 'Server error' }));
        }
        return;
      }
      
      if (pathname.startsWith('/api/ac-units/') && req.method === 'PATCH') {
        if (!requireAuth(req, res)) return;
        
        try {
          const id = parseInt(pathname.split('/').pop() || '');
          if (isNaN(id)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: 'Invalid ID' }));
            return;
          }

          // Verify ownership
          const acUnit = await storage.getAcUnit(id);
          if (!acUnit) {
            res.statusCode = 404;
            res.end(JSON.stringify({ message: 'AC unit not found' }));
            return;
          }

          if (acUnit.userId !== req.session!.userId!) {
            res.statusCode = 403;
            res.end(JSON.stringify({ message: 'Forbidden' }));
            return;
          }

          const body = await parseBody(req);
          const updateAcUnitSchema = insertAcUnitSchema.partial();
          const acUnitData = updateAcUnitSchema.parse(body);

          const updatedAcUnit = await storage.updateAcUnit(id, acUnitData);
          res.statusCode = 200;
          res.end(JSON.stringify(updatedAcUnit));
        } catch (error) {
          if (error instanceof ZodError) {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: fromZodError(error).message }));
            return;
          }
          res.statusCode = 500;
          res.end(JSON.stringify({ message: 'Server error' }));
        }
        return;
      }
      
      if (pathname.startsWith('/api/ac-units/') && req.method === 'DELETE') {
        if (!requireAuth(req, res)) return;
        
        try {
          const id = parseInt(pathname.split('/').pop() || '');
          if (isNaN(id)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: 'Invalid ID' }));
            return;
          }

          // Verify ownership
          const acUnit = await storage.getAcUnit(id);
          if (!acUnit) {
            res.statusCode = 404;
            res.end(JSON.stringify({ message: 'AC unit not found' }));
            return;
          }

          if (acUnit.userId !== req.session!.userId!) {
            res.statusCode = 403;
            res.end(JSON.stringify({ message: 'Forbidden' }));
            return;
          }

          await storage.deleteAcUnit(id);
          res.statusCode = 204;
          res.end();
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ message: 'Server error' }));
        }
        return;
      }
      
      // Dashboard stats
      if (pathname === '/api/dashboard/stats' && req.method === 'GET') {
        if (!requireAuth(req, res)) return;
        
        try {
          const stats = await storage.getDashboardStats(req.session!.userId!);
          res.statusCode = 200;
          res.end(JSON.stringify(stats));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ message: 'Server error' }));
        }
        return;
      }
      
      // Notification preferences
      if (pathname === '/api/notification-preferences' && req.method === 'GET') {
        if (!requireAuth(req, res)) return;
        
        try {
          const preferences = await storage.getNotificationPreferences(req.session!.userId!);
          if (!preferences) {
            // Create default preferences if not found
            const defaultPreferences = await storage.createNotificationPreferences({
              userId: req.session!.userId!,
              emailEnabled: true,
              smsEnabled: false,
              daysBeforeService: 7,
            });
            res.statusCode = 200;
            res.end(JSON.stringify(defaultPreferences));
            return;
          }
          
          res.statusCode = 200;
          res.end(JSON.stringify(preferences));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ message: 'Server error' }));
        }
        return;
      }
      
      if (pathname === '/api/notification-preferences' && req.method === 'PATCH') {
        if (!requireAuth(req, res)) return;
        
        try {
          const body = await parseBody(req);
          const preferencesSchema = insertNotificationPreferencesSchema.partial();
          const preferencesData = preferencesSchema.parse(body);

          let preferences = await storage.getNotificationPreferences(req.session!.userId!);
          if (!preferences) {
            // Create if not found
            preferences = await storage.createNotificationPreferences({
              userId: req.session!.userId!,
              ...preferencesData,
              emailEnabled: preferencesData.emailEnabled ?? true,
              smsEnabled: preferencesData.smsEnabled ?? false,
              daysBeforeService: preferencesData.daysBeforeService ?? 7,
            });
          } else {
            // Update existing
            preferences = await storage.updateNotificationPreferences(req.session!.userId!, preferencesData);
          }

          res.statusCode = 200;
          res.end(JSON.stringify(preferences));
        } catch (error) {
          if (error instanceof ZodError) {
            res.statusCode = 400;
            res.end(JSON.stringify({ message: fromZodError(error).message }));
            return;
          }
          res.statusCode = 500;
          res.end(JSON.stringify({ message: 'Server error' }));
        }
        return;
      }
      
      // API route not found
      res.statusCode = 404;
      res.end(JSON.stringify({ message: 'API endpoint not found' }));
      return;
    }
    
    // Static file serving in production
    if (process.env.NODE_ENV === 'production') {
      const distPath = path.resolve(__dirname, 'public');
      
      // Check if file exists in public folder
      const filePath = path.join(distPath, pathname === '/' ? 'index.html' : pathname);
      const served = await serveStatic(req, res, filePath);
      
      // If file not served, fallback to index.html
      if (!served) {
        const indexPath = path.join(distPath, 'index.html');
        await serveStatic(req, res, indexPath);
      }
    } else {
      // Development mode with Vite
      try {
        if (!vite) {
          res.statusCode = 500;
          res.end('Vite server not initialized');
          return;
        }
        
        const clientTemplate = path.resolve(__dirname, '..', 'client', 'index.html');
        
        // Always reload the index.html file from disk in case it changes
        let template = await fs.promises.readFile(clientTemplate, 'utf-8');
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`,
        );
        
        // Transform and serve the template with Vite
        const url = req.url || '/';
        const transformed = await vite.transformIndexHtml(url, template);
        
        res.setHeader('Content-Type', 'text/html');
        res.end(transformed);
      } catch (error) {
        console.error('Error processing request:', error);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    }
    
    // Log API requests
    const duration = Date.now() - start;
    if (pathname.startsWith('/api')) {
      let logLine = `${req.method} ${pathname} ${res.statusCode} in ${duration}ms`;
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…';
      }
      log(logLine);
    }
  });

  return server;
}

// Start the server
createServer().then(server => {
  server.listen(PORT, () => {
    log(`Server running at http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
});