/**
 * Parser barrel export.
 *
 * Re-exports everything consumers need from the parser subsystem.
 * Centralizes imports so callers only need: import { ... } from './parser/index.js'
 */

// Deduplicator: full parse orchestration entry point and output type.
export { parseAllFiles, processFile } from "./deduplicator.js";
export type { ParseResult } from "./deduplicator.js";

// Schema: core data types.
export type { ParsedMessage, TokenCounts } from "./schema.js";

// Reader: file discovery and streaming.
export { discoverJsonlFiles, streamJsonlFile } from "./reader.js";
