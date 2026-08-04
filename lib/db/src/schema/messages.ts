import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const messagesTable = pgTable("lb_messages", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  senderId: integer("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  receiverId: integer("receiver_id"),
  receiverName: text("receiver_name"),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  isAnnouncement: boolean("is_announcement").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type Message = typeof messagesTable.$inferSelect;
