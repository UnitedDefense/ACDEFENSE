/**
 * Extracts a Postgres error code (e.g. "23505" for unique_violation) from an
 * unknown thrown value. drizzle-orm 0.45's postgres-js driver wraps the raw
 * `PostgresError` in a `DrizzleQueryError`, so the code lives on `err.cause`,
 * not on `err` directly — check both shapes.
 */
export function getPgErrorCode(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined;
  const direct = (err as Error & { code?: string }).code;
  if (direct) return direct;
  const cause = (err as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    return (cause as Error & { code?: string }).code;
  }
  return undefined;
}
