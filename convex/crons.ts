import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sweep abandoned lobbies + their child docs hourly (see maintenance.ts).
crons.interval(
  "cleanup stale lobbies",
  { hours: 1 },
  internal.maintenance.cleanupStaleLobbies,
  {},
);

export default crons;
