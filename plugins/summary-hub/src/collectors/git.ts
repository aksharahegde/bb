import { execFile } from "node:child_process";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import type { ProjectSource } from "../project-source.js";
import type { GitCommitEntry } from "../types.js";

function runGit(
  cwd: string,
  args: string[],
  timeoutMs = 30_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      ["-C", cwd, ...args],
      { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `git ${args.slice(0, 3).join(" ")} failed: ${
                stderr.trim() || error.message
              }`,
            ),
          );
        } else {
          resolve(stdout);
        }
      },
    );
  });
}

function decodeTerminalOutput(chunks: { dataBase64: string }[]): string {
  return chunks
    .map((chunk) => Buffer.from(chunk.dataBase64, "base64").toString("utf8"))
    .join("");
}

async function runGitOnHost(
  bb: BbPluginApi,
  source: ProjectSource,
  args: string[],
): Promise<string> {
  try {
    return await runGit(source.rootPath, args, 20_000);
  } catch {
    const command = `git ${args.map((arg) => JSON.stringify(arg)).join(" ")}`;
    const terminal = await bb.sdk.terminals.create({
      scope: {
        kind: "host_path",
        hostId: source.hostId,
        cwd: source.rootPath,
      },
      cols: 120,
      rows: 24,
      start: { mode: "command", command },
      title: "summary-hub git",
    });
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const session = await bb.sdk.terminals.get({ terminalId: terminal.id });
      if (session.status !== "running") break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const output = await bb.sdk.terminals.output({ terminalId: terminal.id });
    await bb.sdk.terminals.close({
      terminalId: terminal.id,
      mode: "force",
    });
    return decodeTerminalOutput(output.chunks);
  }
}

export async function collectGitCommits(
  bb: BbPluginApi,
  source: ProjectSource,
  start: Date,
  end: Date,
): Promise<GitCommitEntry[]> {
  const since = start.toISOString();
  const until = end.toISOString();
  const stdout = await runGitOnHost(bb, source, [
    "log",
    `--since=${since}`,
    `--until=${until}`,
    "--no-merges",
    "--pretty=format:%H|%s|%an|%aI",
  ]);
  if (stdout.trim().length === 0) return [];
  return stdout
    .trim()
    .split("\n")
    .map((line) => {
      const [hash = "", subject = "", author = "", committedAt = ""] =
        line.split("|");
      return { hash, subject, author, committedAt };
    })
    .filter((entry) => entry.hash.length > 0);
}
