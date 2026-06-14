import { ConvexReactClient } from "convex/react";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;

// Public by design (spec §12). The deployment URL is safe to ship.
export const convexClient = url
  ? new ConvexReactClient(url, { unsavedChangesWarning: false })
  : null;
