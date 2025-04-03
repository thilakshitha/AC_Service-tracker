import { 
  users, type User, type InsertUser,
  acUnits, type AcUnit, type InsertAcUnit,
  reminders, type Reminder, type InsertReminder,
  notificationPreferences, type NotificationPreference, type InsertNotificationPreference
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  
  // AC Unit operations
  getAcUnit(id: number): Promise<AcUnit | undefined>;
  getAcUnitsByUserId(userId: number): Promise<AcUnit[]>;
  createAcUnit(acUnit: InsertAcUnit): Promise<AcUnit>;
  updateAcUnit(id: number, data: Partial<InsertAcUnit>): Promise<AcUnit | undefined>;
  deleteAcUnit(id: number): Promise<boolean>;
  
  // Reminder operations
  getReminder(id: number): Promise<Reminder | undefined>;
  getRemindersByUserId(userId: number): Promise<Reminder[]>;
  getRemindersByAcUnitId(acUnitId: number): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: number, data: Partial<InsertReminder>): Promise<Reminder | undefined>;
  deleteReminder(id: number): Promise<boolean>;
  
  // Notification preferences operations
  getNotificationPreferences(userId: number): Promise<NotificationPreference | undefined>;
  createNotificationPreferences(preferences: InsertNotificationPreference): Promise<NotificationPreference>;
  updateNotificationPreferences(userId: number, data: Partial<InsertNotificationPreference>): Promise<NotificationPreference | undefined>;
  
  // Dashboard statistics
  getDashboardStats(userId: number): Promise<{
    totalUnits: number;
    upcomingServices: number;
    overdueServices: number;
    servicesCompleted: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private acUnits: Map<number, AcUnit>;
  private reminders: Map<number, Reminder>;
  private notificationPreferences: Map<number, NotificationPreference>;
  
  private userIdCounter: number;
  private acUnitIdCounter: number;
  private reminderIdCounter: number;
  private notificationPreferencesIdCounter: number;

  constructor() {
    this.users = new Map();
    this.acUnits = new Map();
    this.reminders = new Map();
    this.notificationPreferences = new Map();
    
    this.userIdCounter = 1;
    this.acUnitIdCounter = 1;
    this.reminderIdCounter = 1;
    this.notificationPreferencesIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // AC Unit operations
  async getAcUnit(id: number): Promise<AcUnit | undefined> {
    return this.acUnits.get(id);
  }

  async getAcUnitsByUserId(userId: number): Promise<AcUnit[]> {
    return Array.from(this.acUnits.values()).filter(
      (unit) => unit.userId === userId,
    );
  }

  async createAcUnit(insertAcUnit: InsertAcUnit): Promise<AcUnit> {
    const id = this.acUnitIdCounter++;
    const now = new Date();
    const acUnit: AcUnit = { 
      ...insertAcUnit, 
      id,
      createdAt: now
    };
    this.acUnits.set(id, acUnit);
    return acUnit;
  }

  async updateAcUnit(id: number, data: Partial<InsertAcUnit>): Promise<AcUnit | undefined> {
    const acUnit = await this.getAcUnit(id);
    if (!acUnit) return undefined;
    
    const updatedAcUnit = { ...acUnit, ...data };
    this.acUnits.set(id, updatedAcUnit);
    return updatedAcUnit;
  }

  async deleteAcUnit(id: number): Promise<boolean> {
    return this.acUnits.delete(id);
  }

  // Reminder operations
  async getReminder(id: number): Promise<Reminder | undefined> {
    return this.reminders.get(id);
  }

  async getRemindersByUserId(userId: number): Promise<Reminder[]> {
    return Array.from(this.reminders.values()).filter(
      (reminder) => reminder.userId === userId,
    );
  }

  async getRemindersByAcUnitId(acUnitId: number): Promise<Reminder[]> {
    return Array.from(this.reminders.values()).filter(
      (reminder) => reminder.acUnitId === acUnitId,
    );
  }

  async createReminder(insertReminder: InsertReminder): Promise<Reminder> {
    const id = this.reminderIdCounter++;
    const now = new Date();
    const reminder: Reminder = { 
      ...insertReminder, 
      id,
      createdAt: now
    };
    this.reminders.set(id, reminder);
    return reminder;
  }

  async updateReminder(id: number, data: Partial<InsertReminder>): Promise<Reminder | undefined> {
    const reminder = await this.getReminder(id);
    if (!reminder) return undefined;
    
    const updatedReminder = { ...reminder, ...data };
    this.reminders.set(id, updatedReminder);
    return updatedReminder;
  }

  async deleteReminder(id: number): Promise<boolean> {
    return this.reminders.delete(id);
  }

  // Notification preferences operations
  async getNotificationPreferences(userId: number): Promise<NotificationPreference | undefined> {
    return Array.from(this.notificationPreferences.values()).find(
      (pref) => pref.userId === userId,
    );
  }

  async createNotificationPreferences(insertPreferences: InsertNotificationPreference): Promise<NotificationPreference> {
    const id = this.notificationPreferencesIdCounter++;
    const preferences: NotificationPreference = { 
      ...insertPreferences, 
      id
    };
    this.notificationPreferences.set(id, preferences);
    return preferences;
  }

  async updateNotificationPreferences(userId: number, data: Partial<InsertNotificationPreference>): Promise<NotificationPreference | undefined> {
    const preferences = await this.getNotificationPreferences(userId);
    if (!preferences) return undefined;
    
    const updatedPreferences = { ...preferences, ...data };
    this.notificationPreferences.set(preferences.id, updatedPreferences);
    return updatedPreferences;
  }

  // Dashboard statistics
  async getDashboardStats(userId: number): Promise<{
    totalUnits: number;
    upcomingServices: number;
    overdueServices: number;
    servicesCompleted: number;
  }> {
    const userAcUnits = await this.getAcUnitsByUserId(userId);
    const now = new Date();
    
    // Calculate upcoming services (due in the next 30 days)
    const upcomingServices = userAcUnits.filter(unit => {
      const nextService = new Date(unit.nextServiceDate);
      const diffTime = nextService.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30;
    }).length;
    
    // Calculate overdue services
    const overdueServices = userAcUnits.filter(unit => {
      const nextService = new Date(unit.nextServiceDate);
      return nextService < now;
    }).length;
    
    // Calculate completed services (total - upcoming - overdue)
    const totalUnits = userAcUnits.length;
    const servicesCompleted = userAcUnits.filter(unit => 
      unit.lastServiceDate !== null && 
      new Date(unit.lastServiceDate) <= now && 
      new Date(unit.nextServiceDate) > now
    ).length;
    
    return {
      totalUnits,
      upcomingServices,
      overdueServices,
      servicesCompleted
    };
  }
}

export const storage = new MemStorage();
