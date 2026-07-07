import { users, tasks } from "@nuxthub/db/schema";

export type User = typeof users.$inferSelect;
export type Task = typeof tasks.$inferSelect;


