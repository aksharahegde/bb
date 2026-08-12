import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const GRAPHIFY_CANDIDATES = [
  "graphify",
  `${process.env.HOME ?? ""}/.local/bin/graphify`,
  "/opt/homebrew/bin/graphify",
  "/usr/local/bin/graphify",
].filter(
  (candidate, index, all) =>
    candidate.length > 0 && all.indexOf(candidate) === index,
);

export const GRAPHIFY_HINT =
  "Install Graphify (`uv tool install graphifyy` or see https://github.com/Graphify-Labs/graphify) and ensure `graphify` is on PATH.";

export class GraphifyCliError extends Error {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;

  constructor(message: string, exitCode: number, stdout: string, stderr: string) {
    super(message);
    this.name = "GraphifyCliError";
    this.exitCode = exitCode;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

let cachedGraphifyPath: string | null = null;

async function runBinary(
  file: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execFileAsync(file, args, {
      cwd: options.cwd,
      timeout: options.timeoutMs ?? 120_000,
      maxBuffer: 16 * 1024 * 1024,
      env: process.env,
    });
    return {
      stdout: String(result.stdout ?? ""),
      stderr: String(result.stderr ?? ""),
    };
  } catch (error) {
    const err = error as {
      code?: string | number;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      message?: string;
    };
    const stdout = String(err.stdout ?? "");
    const stderr = String(err.stderr ?? "");
    const exitCode =
      typeof err.code === "number" ? err.code : Number.parseInt(String(err.code ?? "1"), 10) || 1;
    throw new GraphifyCliError(
      stderr.trim() || err.message || `graphify failed with exit ${exitCode}`,
      exitCode,
      stdout,
      stderr,
    );
  }
}

export async function resolveGraphifyPath(): Promise<string> {
  if (cachedGraphifyPath !== null) {
    return cachedGraphifyPath;
  }
  for (const candidate of GRAPHIFY_CANDIDATES) {
    try {
      await runBinary(candidate, ["--help"], { timeoutMs: 5_000 });
      cachedGraphifyPath = candidate;
      return candidate;
    } catch {
      // try next
    }
  }
  throw new GraphifyCliError(
    `Graphify CLI not found. ${GRAPHIFY_HINT}`,
    1,
    "",
    `Graphify CLI not found. ${GRAPHIFY_HINT}`,
  );
}

export async function runGraphify(
  args: string[],
  options: { cwd: string; timeoutMs?: number },
): Promise<{ stdout: string; stderr: string }> {
  const file = await resolveGraphifyPath();
  return runBinary(file, args, options);
}

/** Reset cached path — for tests only. */
export function resetGraphifyPathCacheForTests(): void {
  cachedGraphifyPath = null;
}
