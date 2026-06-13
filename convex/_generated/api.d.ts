/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as game from "../game.js";
import type * as helpers from "../helpers.js";
import type * as lobbies from "../lobbies.js";
import type * as maintenance from "../maintenance.js";
import type * as music_deezer from "../music/deezer.js";
import type * as music_musicbrainz from "../music/musicbrainz.js";
import type * as music_provider from "../music/provider.js";
import type * as music_titles from "../music/titles.js";
import type * as prebake from "../prebake.js";
import type * as rounds from "../rounds.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  game: typeof game;
  helpers: typeof helpers;
  lobbies: typeof lobbies;
  maintenance: typeof maintenance;
  "music/deezer": typeof music_deezer;
  "music/musicbrainz": typeof music_musicbrainz;
  "music/provider": typeof music_provider;
  "music/titles": typeof music_titles;
  prebake: typeof prebake;
  rounds: typeof rounds;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
