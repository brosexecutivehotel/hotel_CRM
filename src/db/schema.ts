import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// --- Enums -----------------------------------------------------------------

export const roomStatusEnum = pgEnum("room_status", [
  "ready",
  "cleaning",
  "reserved",
  "occupied",
  "maintenance",
]);

export const guestSegmentEnum = pgEnum("guest_segment", [
  "vip",
  "returning",
  "corporate",
  "new",
]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "reserved",
  "checked_in",
  "checked_out",
  "cancelled",
]);

export const reservationSourceEnum = pgEnum("reservation_source", [
  "direct",
  "booking_com",
  "corporate",
  "walk_in",
  "phone",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card",
  "mobile_money",
  "bank_transfer",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "refunded",
]);

export const housekeepingStatusEnum = pgEnum("housekeeping_status", [
  "pending",
  "in_progress",
  "done",
]);

// --- Tables ----------------------------------------------------------------

export const rooms = pgTable("rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  number: varchar("number", { length: 10 }).notNull().unique(),
  type: text("type").notNull(),
  floor: integer("floor"),
  status: roomStatusEnum("status").notNull().default("ready"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const guests = pgTable("guests", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  country: varchar("country", { length: 80 }),
  segment: guestSegmentEnum("segment").notNull().default("new"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reservations = pgTable("reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  reference: varchar("reference", { length: 20 }).notNull().unique(),
  guestId: uuid("guest_id")
    .notNull()
    .references(() => guests.id),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id),
  checkIn: date("check_in").notNull(),
  checkOut: date("check_out").notNull(),
  nights: integer("nights").notNull(),
  status: reservationStatusEnum("status").notNull().default("reserved"),
  source: reservationSourceEnum("source").notNull().default("direct"),
  createdBy: text("created_by"), // Clerk user id of the staff member who created it
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  reservationId: uuid("reservation_id")
    .notNull()
    .references(() => reservations.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  method: paymentMethodEnum("method").notNull().default("cash"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const housekeepingTasks = pgTable("housekeeping_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id),
  status: housekeepingStatusEnum("status").notNull().default("pending"),
  assignedTo: varchar("assigned_to", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityLog = pgTable("activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: text("actor_id"), // Clerk user id
  actorName: varchar("actor_name", { length: 120 }),
  action: varchar("action", { length: 60 }).notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Row types for consumers ----------------------------------------------

export type Room = typeof rooms.$inferSelect;
export type Guest = typeof guests.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type HousekeepingTask = typeof housekeepingTasks.$inferSelect;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
