/**
 * Two-level deduplication for Claude Code JSONL files.
 *
 * Level 1 — uuid dedup: Claude Code sometimes writes the same logical entry
 *   to multiple files (e.g. when a project is open in multiple windows or the
 *   session file is rotated). The uuid field is globally unique per turn, so
 *   we track seen uuids across all files in a shared Set.
 *
 * Level 2 — message.id dedup: Streaming responses produce multiple assistant
 *   entries sharing the same message.id (one per chunk). We only want the
 *   final chunk, identified by the highest output_tokens count, since the
 *   final message has the complete accumulated token count.
 */

import { discoverJsonlFiles, streamJsonlFile } from "./reader.js";
import {
  isUserEntry,
  isAssistantEntry,
  type AssistantEntry,
  type ParsedMessage,
} from "./schema.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParseResult {
  messages: ParsedMessage[];
  sessions: Map<
    string,
    {
      cwd: string;
      firstTimestamp: string;
      lastTimestamp: string;
    }
  >;
  stats: {
    filesRead: number;
    linesSkipped: number;
    userMessages: number;
  };
  userMessagesByDate: Map<string, number>;
}

// ---------------------------------------------------------------------------
// File-level processing
// ---------------------------------------------------------------------------

/**
 * Stream one JSONL file, apply both dedup levels, and return ParsedMessages.
 *
 * @param filePath   Absolute path to the .jsonl file
 * @param seenUuids  Shared set across all files — mutated in-place (Level 1 dedup)
 * @param stats      Shared stats bag — linesSkipped is mutated in-place
 */
export async function processFile(
  filePath: string,
  seenUuids: Set<string>,
  stats: { linesSkipped: number }
): Promise<{ messages: ParsedMessage[]; userMessages: number; userMessagesByDate: Map<string, number> }> {
  // Level 2 dedup: for each message.id, keep the AssistantEntry with the
  // highest output_tokens (i.e. the final streaming chunk for that turn).
  const bestByMessageId = new Map<string, AssistantEntry>();

  // Collect per-session cwd from user entries (user entries have authoritative cwd).
  const sessionCwd = new Map<string, string>();

  // Count user messages (UserEntry items) in this file.
  let userMessageCount = 0;

  // Track user message counts per date (UTC date slice of timestamp).
  const userMessagesByDate = new Map<string, number>();

  for await (const raw of streamJsonlFile(filePath, stats)) {
    // Level 1 dedup — skip if uuid already seen across files.
    if (
      raw !== null &&
      typeof raw === "object" &&
      typeof (raw as Record<string, unknown>)["uuid"] === "string"
    ) {
      const uuid = (raw as Record<string, unknown>)["uuid"] as string;
      if (seenUuids.has(uuid)) continue;
      seenUuids.add(uuid);
    }

    if (isUserEntry(raw)) {
      // Track authoritative cwd per session from user entries.
      if (!sessionCwd.has(raw.sessionId)) {
        sessionCwd.set(raw.sessionId, raw.cwd);
      }
      userMessageCount += 1;
      // Track per-date user message counts.
      const date = raw.timestamp.slice(0, 10);
      userMessagesByDate.set(date, (userMessagesByDate.get(date) ?? 0) + 1);
      continue; // user entries don't produce ParsedMessages
    }

    if (isAssistantEntry(raw)) {
      const messageId = raw.message.id;
      const existing = bestByMessageId.get(messageId);
      if (
        existing === undefined ||
        raw.message.usage.output_tokens > existing.message.usage.output_tokens
      ) {
        bestByMessageId.set(messageId, raw);
      }
    }
    // All other entry types (system, progress, tool_result, etc.) are ignored.
  }

  // Convert deduplicated AssistantEntries → ParsedMessages.
  const messages: ParsedMessage[] = [];

  for (const entry of bestByMessageId.values()) {
    const usage = entry.message.usage;
    const cwd = sessionCwd.get(entry.sessionId) ?? entry.cwd;
    const thinkingBlocks = entry.message.content.filter(
      (block) => block.type === "thinking"
    ).length;

    messages.push({
      sessionId: entry.sessionId,
      timestamp: entry.timestamp,
      model: entry.message.model,
      tokens: {
        input: usage.input_tokens ?? 0,
        output: usage.output_tokens ?? 0,
        cacheCreate: usage.cache_creation_input_tokens ?? 0,
        cacheRead: usage.cache_read_input_tokens ?? 0,
      },
      toolCalls: entry.message.content
        .filter((block) => block.type === "tool_use")
        .map((block) => (block as { type: "tool_use"; name: string }).name),
      thinkingBlocks,
      cwd,
      isSidechain: entry.isSidechain,
    });
  }

  return { messages, userMessages: userMessageCount, userMessagesByDate };
}

// ---------------------------------------------------------------------------
// Full parse orchestration
// ---------------------------------------------------------------------------

/**
 * Discover and parse all JSONL files under `projectsDir`.
 *
 * Returns deduplicated ParsedMessages, per-session metadata, and error stats.
 */
export async function parseAllFiles(projectsDir: string): Promise<ParseResult> {
  const seenUuids = new Set<string>();
  const stats = { filesRead: 0, linesSkipped: 0, userMessages: 0 };
  const allMessages: ParsedMessage[] = [];
  const userMessagesByDate = new Map<string, number>();

  for await (const filePath of discoverJsonlFiles(projectsDir)) {
    stats.filesRead += 1;
    const fileResult = await processFile(filePath, seenUuids, stats);
    allMessages.push(...fileResult.messages);
    stats.userMessages += fileResult.userMessages;
    // Merge per-file userMessagesByDate into the combined map.
    for (const [date, count] of fileResult.userMessagesByDate) {
      userMessagesByDate.set(date, (userMessagesByDate.get(date) ?? 0) + count);
    }
  }

  // Build sessions map: aggregate per-session metadata from all messages.
  const sessions = new Map<
    string,
    { cwd: string; firstTimestamp: string; lastTimestamp: string }
  >();

  for (const msg of allMessages) {
    const existing = sessions.get(msg.sessionId);
    if (existing === undefined) {
      sessions.set(msg.sessionId, {
        cwd: msg.cwd,
        firstTimestamp: msg.timestamp,
        lastTimestamp: msg.timestamp,
      });
    } else {
      // Keep earliest first and latest last.
      if (msg.timestamp < existing.firstTimestamp) {
        existing.firstTimestamp = msg.timestamp;
      }
      if (msg.timestamp > existing.lastTimestamp) {
        existing.lastTimestamp = msg.timestamp;
      }
    }
  }

  return {
    messages: allMessages,
    sessions,
    stats,
    userMessagesByDate,
  };
}
