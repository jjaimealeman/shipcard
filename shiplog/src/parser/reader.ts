/**
 * File discovery and streaming JSONL reader.
 *
 * Uses Node 22+ built-in glob (node:fs/promises) and readline for streaming.
 * Never buffers entire files — yields entries one at a time.
 */

import { glob } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

/**
 * Discover all .jsonl files under `projectsDir` using the async iterator form
 * of Node 22's built-in glob. Files are yielded as discovered (no sorting).
 */
export async function* discoverJsonlFiles(
  projectsDir: string
): AsyncGenerator<string> {
  const pattern = `${projectsDir}/**/*.jsonl`;
  for await (const file of glob(pattern)) {
    yield file;
  }
}

/**
 * Stream a single JSONL file line-by-line, yielding parsed JSON values.
 * Corrupt / unparseable lines are skipped; `stats.linesSkipped` is incremented
 * for each one so callers can report data quality.
 *
 * @param filePath  Absolute path to the .jsonl file
 * @param stats     Optional mutable stats bag; linesSkipped is incremented in-place
 */
export async function* streamJsonlFile(
  filePath: string,
  stats?: { linesSkipped: number }
): AsyncGenerator<unknown> {
  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed === "") continue; // skip blank lines

    try {
      yield JSON.parse(trimmed);
    } catch {
      if (stats !== undefined) {
        stats.linesSkipped += 1;
      }
    }
  }
}
