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

export const fbOrderStatusEnum = pgEnum("fb_order_status", [
  "open",
  "served",
  "paid",
  "cancelled",
]);

export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "in",
  "out",
  "adjust",
]);

export const maintenanceStatusEnum = pgEnum("maintenance_status", [
  "open",
  "in_progress",
  "resolved",
  "cancelled",
]);

export const maintenancePriorityEnum = pgEnum("maintenance_priority", [
  "low",
  "medium",
  "high",
  "urgent",
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

export const fbMenuCategories = pgTable("fb_menu_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active").notNull().default(1), // 1 = active, 0 = inactive
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fbMenuItems = pgTable("fb_menu_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").references(() => fbMenuCategories.id),
  name: varchar("name", { length: 120 }).notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  active: integer("active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fbOrders = pgTable("fb_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  reference: varchar("reference", { length: 20 }).notNull().unique(),
  status: fbOrderStatusEnum("status").notNull().default("open"),
  tableLabel: varchar("table_label", { length: 40 }),
  reservationId: uuid("reservation_id").references(() => reservations.id),
  roomId: uuid("room_id").references(() => rooms.id),
  guestName: varchar("guest_name", { length: 120 }),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fbOrderItems = pgTable("fb_order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => fbOrders.id),
  menuItemId: uuid("menu_item_id").references(() => fbMenuItems.id),
  description: varchar("description", { length: 160 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  category: varchar("category", { length: 80 }),
  unit: varchar("unit", { length: 30 }).notNull().default("pcs"),
  quantity: integer("quantity").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(0),
  location: varchar("location", { length: 80 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryMovements = pgTable("inventory_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => inventoryItems.id),
  type: inventoryMovementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  reason: varchar("reason", { length: 160 }),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const maintenanceWorkOrders = pgTable("maintenance_work_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").references(() => rooms.id),
  area: varchar("area", { length: 120 }),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  priority: maintenancePriorityEnum("priority").notNull().default("medium"),
  status: maintenanceStatusEnum("status").notNull().default("open"),
  assignedTo: varchar("assigned_to", { length: 120 }),
  reportedBy: varchar("reported_by", { length: 120 }),
  createdBy: text("created_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const maintenanceLogs = pgTable("maintenance_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workOrderId: uuid("work_order_id")
    .notNull()
    .references(() => maintenanceWorkOrders.id),
  note: text("note").notNull(),
  status: maintenanceStatusEnum("status"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Row types for consumers ----------------------------------------------

export type Room = typeof rooms.$inferSelect;
export type Guest = typeof guests.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type HousekeepingTask = typeof housekeepingTasks.$inferSelect;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type FbMenuCategory = typeof fbMenuCategories.$inferSelect;
export type FbMenuItem = typeof fbMenuItems.$inferSelect;
export type FbOrder = typeof fbOrders.$inferSelect;
export type FbOrderItem = typeof fbOrderItems.$inferSelect;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type MaintenanceWorkOrder = typeof maintenanceWorkOrders.$inferSelect;
export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;
