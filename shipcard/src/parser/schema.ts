/**
 * TypeScript types for Claude Code JSONL entry shapes.
 * Based on analysis of Claude Code's JSONL format.
 *
 * Entries are written per-message in session files under ~/.claude/projects/.
 * Each line is a JSON object; lines are independent (no wrapping array).
 */

// ---------------------------------------------------------------------------
// Token counts
// ---------------------------------------------------------------------------

export interface TokenCounts {
  input: number;
  output: number;
  cacheCreate: number;
  cacheRead: number;
}

// ---------------------------------------------------------------------------
// Content blocks (assistant message content)
// ---------------------------------------------------------------------------

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}

export type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock;

// ---------------------------------------------------------------------------
// Raw JSONL entry shapes
// ---------------------------------------------------------------------------

export interface BaseEntry {
  uuid: string;
  parentUuid: string | null;
  sessionId: string;
  timestamp: string;
  type: string;
  isSidechain: boolean;
}

export interface UserEntry extends BaseEntry {
  type: "user";
  cwd: string;
  version: string;
  message: {
    role: "user";
    content: string | unknown[];
  };
}

export interface AssistantEntry extends BaseEntry {
  type: "assistant";
  cwd: string;
  requestId?: string;
  message: {
    id: string;
    model: string;
    role: "assistant";
    stop_reason: string | null;
    content: ContentBlock[];
    usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
}

// ---------------------------------------------------------------------------
// Parsed / deduplicated output consumed by the engine
// ---------------------------------------------------------------------------

export interface ParsedMessage {
  sessionId: string;
  timestamp: string;
  model: string;
  tokens: TokenCounts;
  /** Names of all tool_use blocks in this assistant message */
  toolCalls: string[];
  /** Count of thinking blocks in this assistant message */
  thinkingBlocks: number;
  cwd: string;
  isSidechain: boolean;
}

// ---------------------------------------------------------------------------
// Defensive type guards
// ---------------------------------------------------------------------------

/**
 * Returns true if `entry` looks like a UserEntry.
 * Checks non-null object shape, type === "user", and required nested fields.
 */
export function isUserEntry(entry: unknown): entry is UserEntry {
  if (entry === null || typeof entry !== "object") return false;
  const e = entry as Record<string, unknown>;
  if (e["type"] !== "user") return false;
  if (typeof e["uuid"] !== "string") return false;
  if (typeof e["sessionId"] !== "string") return false;
  if (typeof e["timestamp"] !== "string") return false;
  if (typeof e["cwd"] !== "string") return false;
  if (e["message"] === null || typeof e["message"] !== "object") return false;
  const msg = e["message"] as Record<string, unknown>;
  if (msg["role"] !== "user") return false;
  return true;
}

/**
 * Returns true if `entry` looks like an AssistantEntry.
 * Checks non-null object shape, type === "assistant", and required nested fields.
 */
export function isAssistantEntry(entry: unknown): entry is AssistantEntry {
  if (entry === null || typeof entry !== "object") return false;
  const e = entry as Record<string, unknown>;
  if (e["type"] !== "assistant") return false;
  if (typeof e["uuid"] !== "string") return false;
  if (typeof e["sessionId"] !== "string") return false;
  if (typeof e["timestamp"] !== "string") return false;
  if (e["message"] === null || typeof e["message"] !== "object") return false;
  const msg = e["message"] as Record<string, unknown>;
  if (typeof msg["id"] !== "string") return false;
  if (typeof msg["model"] !== "string") return false;
  if (msg["role"] !== "assistant") return false;
  if (msg["usage"] === null || typeof msg["usage"] !== "object") return false;
  return true;
}
