import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isEmailVerified: boolean("is_email_verified").default(false).notNull(),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  lastLoginAt: timestamp("last_login_at"),
  streakDays: integer("streak_days").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


// Forum posts (now meme-focused)
export const forumPosts = pgTable("forum_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title"), // Optional for tweet-style posts
  content: text("content").notNull(),
  imageUrl: text("image_url"), // For meme images
  fileName: text("file_name"), // Original filename
  fileType: text("file_type"), // MIME type (image/jpeg, video/mp4, etc.)
  fileSize: integer("file_size"), // File size in bytes
  memeCaption: text("meme_caption"), // Caption for memes
  memeTemplate: text("meme_template"), // Template name (e.g., "Drake pointing", "Distracted boyfriend")
  categories: text("categories").array().default([]),
  upvotes: integer("upvotes").default(0).notNull(),
  downvotes: integer("downvotes").default(0).notNull(),
  commentCount: integer("comment_count").default(0).notNull(),
  isReply: boolean("is_reply").default(false).notNull(),
  parentPostId: integer("parent_post_id").references(() => forumPosts.id),
  mentions: text("mentions").array().default([]),
  hashtags: text("hashtags").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertForumPostSchema = createInsertSchema(forumPosts).pick({
  userId: true,
  title: true,
  content: true,
  imageUrl: true,
  fileName: true,
  fileType: true,
  fileSize: true,
  memeCaption: true,
  memeTemplate: true,
  categories: true,
  isReply: true,
  parentPostId: true,
  mentions: true,
  hashtags: true,
});

// Forum comments
// Post reactions
export const postReactions = pgTable("post_reactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => forumPosts.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'like', 'love', 'rocket', 'fire'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPostReactionSchema = createInsertSchema(postReactions).pick({
  postId: true,
  userId: true,
  type: true,
});

// Forum comments (deprecated - now using replies in forumPosts)
export const forumComments = pgTable("forum_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => forumPosts.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  upvotes: integer("upvotes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertForumCommentSchema = createInsertSchema(forumComments).pick({
  postId: true,
  userId: true,
  content: true,
});

// Portfolio entries
export const portfolioEntries = pgTable("portfolio_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  asset: text("asset").notNull(), // 'bitcoin'
  amount: doublePrecision("amount").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPortfolioEntrySchema = createInsertSchema(portfolioEntries).pick({
  userId: true,
  asset: true,
  amount: true,
});

// Daily tips
export const dailyTips = pgTable("daily_tips", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDailyTipSchema = createInsertSchema(dailyTips).pick({
  title: true,
  content: true,
  category: true,
});

// Learning progress
export const learningProgress = pgTable("learning_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull(),
  completedLessons: integer("completed_lessons").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLearningProgressSchema = createInsertSchema(learningProgress).pick({
  userId: true,
  courseId: true,
  completedLessons: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;


export type ForumPost = typeof forumPosts.$inferSelect;
export type InsertForumPost = z.infer<typeof insertForumPostSchema>;

export type PostReaction = typeof postReactions.$inferSelect;
export type InsertPostReaction = z.infer<typeof insertPostReactionSchema>;

export type ForumComment = typeof forumComments.$inferSelect;
export type InsertForumComment = z.infer<typeof insertForumCommentSchema>;

export type PortfolioEntry = typeof portfolioEntries.$inferSelect;
export type InsertPortfolioEntry = z.infer<typeof insertPortfolioEntrySchema>;

export type DailyTip = typeof dailyTips.$inferSelect;
export type InsertDailyTip = z.infer<typeof insertDailyTipSchema>;

export type LearningProgress = typeof learningProgress.$inferSelect;
export type InsertLearningProgress = z.infer<typeof insertLearningProgressSchema>;

// Anonymous user data (no auth required for MVP persistence).
// Each user is identified by a UUID generated client-side and stored in
// their localStorage. Server uses the UUID as the user identifier — no
// login needed. dataKey is a string like 'workbench_indicators' /
// 'mpt_portfolios' / 'dca_plan' / 'canvas_positions'. dataValue is a
// JSON-stringified blob (saved portfolios, indicators, etc.).
//
// Self-healing: the /api/persistence/sync handler runs CREATE TABLE IF
// NOT EXISTS on cold-start so a missing migration step doesn't 500.
// Real Google OAuth (replacing the UUID with a users.id FK) is a follow-up
// once Tyler picks an auth provider.
export const anonymousData = pgTable("anonymous_data", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  dataKey: text("data_key").notNull(),
  dataValue: text("data_value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  visibility: text("visibility").notNull().default('private'),
  galleryTitle: text("gallery_title"),
  galleryDescription: text("gallery_description"),
  viewCount: integer("view_count").notNull().default(0),
  forkCount: integer("fork_count").notNull().default(0),
  publishedAt: timestamp("published_at"),
}, (table) => ({
  uniqUserKey: uniqueIndex("anon_data_user_key_idx").on(table.userId, table.dataKey),
}));

export type AnonymousData = typeof anonymousData.$inferSelect;

// Persistence audit log (BitcoinHub Phase 4 hardening).
// Stores HASHED user IDs + HASHED IPs only — no plaintext PII, no plaintext UUIDs.
// action: 'read' | 'write' | 'list'. data_key is null for 'list'. byte_size tracks
// per-row storage cost (helps detect abuse patterns).
export const persistenceAudit = pgTable("persistence_audit", {
  id: serial("id").primaryKey(),
  userIdHash: text("user_id_hash").notNull(),
  action: text("action").notNull(),
  dataKey: text("data_key"),
  byteSize: integer("byte_size"),
  ipHash: text("ip_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PersistenceAudit = typeof persistenceAudit.$inferSelect;
