import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch as it's not supported in Postgres.js + Drizzle
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client);
