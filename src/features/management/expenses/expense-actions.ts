"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activityLog, expenses } from "@/db/schema";
import { requireDashboardRole } from "@/lib/auth/roles";

export type ExpenseFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export type ExpenseActionState = {
  ok: boolean;
  message?: string;
};

const EXPENSE_METHODS = ["cash", "card", "mobile_money", "bank_transfer"] as const;
const EXPENSE_STATUSES = ["pending", "paid"] as const;

const createSchema = z.object({
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expense date is required"),
  category: z.string().trim().min(2, "Category is required").max(80),
  description: z.string().trim().min(2, "Description is required").max(500),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(99999999.99, "Amount is too large"),
  currency: z.string().trim().length(3, "Use a 3-letter currency code").transform((v) => v.toUpperCase()),
  method: z.enum(EXPENSE_METHODS),
  status: z.enum(EXPENSE_STATUSES),
  vendor: z.string().trim().max(120).optional().transform((v) => (v ? v : undefined)),
  reference: z.string().trim().max(80).optional().transform((v) => (v ? v : undefined)),
  notes: z.string().trim().max(1000).optional().transform((v) => (v ? v : undefined)),
});

function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

async function getActor() {
  const user = await currentUser();
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Staff";
  return { id: user?.id ?? null, name: actorName.slice(0, 120) };
}

function revalidateExpenseViews() {
  revalidatePath("/management/expenses");
  revalidatePath("/management");
}

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function createExpense(_prev: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  await requireDashboardRole("management");

  const parsed = createSchema.safeParse({
    expenseDate: formData.get("expenseDate") ?? "",
    category: formData.get("category") ?? "",
    description: formData.get("description") ?? "",
    amount: formData.get("amount") ?? "",
    currency: formData.get("currency") || "USD",
    method: formData.get("method") || "cash",
    status: formData.get("status") || "paid",
    vendor: formData.get("vendor") ?? "",
    reference: formData.get("reference") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrorsFrom(parsed.error) };
  }

  const data = parsed.data;
  const db = getDb();

  await db.insert(expenses).values({
    expenseDate: data.expenseDate,
    category: data.category,
    description: data.description,
    amount: data.amount.toFixed(2),
    currency: data.currency,
    method: data.method,
    status: data.status,
    vendor: data.vendor ?? null,
    reference: data.reference ?? null,
    notes: data.notes ?? null,
  });

  const actor = await getActor();
  await db.insert(activityLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action: data.status === "paid" ? "expense_paid" : "expense_recorded",
    detail: `${formatMoney(data.amount, data.currency)} · ${data.category} · ${data.description}`,
  });

  revalidateExpenseViews();
  return { ok: true, message: `Expense recorded: ${data.category}.` };
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(EXPENSE_STATUSES),
});

export async function updateExpenseStatus(_prev: ExpenseActionState, formData: FormData): Promise<ExpenseActionState> {
  await requireDashboardRole("management");
  const parsed = statusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return { ok: false, message: "Invalid expense update." };

  const db = getDb();
  const [row] = await db
    .select({ id: expenses.id, status: expenses.status, amount: expenses.amount, currency: expenses.currency, category: expenses.category, description: expenses.description })
    .from(expenses)
    .where(eq(expenses.id, parsed.data.id))
    .limit(1);

  if (!row) return { ok: false, message: "Expense not found." };
  if (row.status === parsed.data.status) return { ok: true, message: "No changes." };

  await db.update(expenses).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(expenses.id, row.id));

  const actor = await getActor();
  await db.insert(activityLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action: parsed.data.status === "paid" ? "expense_paid" : "expense_updated",
    detail: `${formatMoney(Number(row.amount), row.currency)} · ${row.category} → ${parsed.data.status}`,
  });

  revalidateExpenseViews();
  return { ok: true, message: "Expense updated." };
}
