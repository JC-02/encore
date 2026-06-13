// One place for turning an unknown thrown value into a user-facing string.
// Convex mutations throw Error with a readable `.message`; anything else falls
// back to the provided default.
export function errMessage(e: unknown, fallback = "Something went wrong"): string {
  return e instanceof Error ? e.message : fallback;
}
