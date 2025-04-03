import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// AC Units schema
export const acUnits = pgTable("ac_units", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  location: text("location").notNull(),
  lastServiceDate: timestamp("last_service_date"),
  nextServiceDate: timestamp("next_service_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAcUnitSchema = createInsertSchema(acUnits).omit({
  id: true,
  createdAt: true,
});

// Reminders schema
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  acUnitId: integer("ac_unit_id").notNull(),
  reminderDate: timestamp("reminder_date").notNull(),
  reminderSent: boolean("reminder_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
});

// Notification preferences schema
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  emailEnabled: boolean("email_enabled").default(true).notNull(),
  smsEnabled: boolean("sms_enabled").default(false).notNull(),
  daysBeforeService: integer("days_before_service").default(7).notNull(),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type AcUnit = typeof acUnits.$inferSelect;
export type InsertAcUnit = z.infer<typeof insertAcUnitSchema>;

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferencesSchema>;
