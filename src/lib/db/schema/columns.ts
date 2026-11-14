import { timestamp, uuid } from 'drizzle-orm/pg-core';

// Every id is a uuid; generate it in app code when you need it back (RETURNING needs SELECT under RLS).
export const id = () => uuid('id').primaryKey().defaultRandom();

// No DB default: app code writes it from clock.now() (I9).
export const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull();

export const ts = (name: string) => timestamp(name, { withTimezone: true });
