import {
  pgTable,
  integer,
  text,
  timestamp,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "purchase",
  "deduction",
  "refund",
  "grant",
]);

export const creditBalancesTable = pgTable("credit_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const creditTransactionsTable = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  type: creditTransactionTypeEnum("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCreditBalanceSchema = createInsertSchema(
  creditBalancesTable
).omit({ id: true, updatedAt: true });

export const insertCreditTransactionSchema = createInsertSchema(
  creditTransactionsTable
).omit({ id: true, createdAt: true });

export type InsertCreditBalance = z.infer<typeof insertCreditBalanceSchema>;
export type CreditBalance = typeof creditBalancesTable.$inferSelect;
export type InsertCreditTransaction = z.infer<
  typeof insertCreditTransactionSchema
>;
export type CreditTransaction = typeof creditTransactionsTable.$inferSelect;
