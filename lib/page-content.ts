import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { pageContent } from "@/lib/db/schema";

/**
 * Load admin-editable copy (Admin -> Site Content) for one page in a single
 * query. Missing keys come back as "" so callers can `|| fallback`.
 */
export async function getPageContent<K extends string>(
  page: string,
  keys: readonly K[]
): Promise<Record<K, string>> {
  const rows = await db
    .select({ key: pageContent.key, value: pageContent.value })
    .from(pageContent)
    .where(and(eq(pageContent.page, page), inArray(pageContent.key, [...keys])));
  const out = Object.fromEntries(keys.map((k) => [k, ""])) as Record<K, string>;
  for (const row of rows) out[row.key as K] = row.value;
  return out;
}
