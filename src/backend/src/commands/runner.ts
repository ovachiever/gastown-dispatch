import { spawn, SpawnOptionsWithoutStdio } from "child_process";

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface CommandOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

const DEFAULT_TIMEOUT = 30_000;

export async function runCommand(
  command: string,
  args: string[],
  options: CommandOptions = {}
): Promise<CommandResult> {
  const { cwd, timeout = DEFAULT_TIMEOUT, env } = options;

  return new Promise((resolve, reject) => {
    const spawnOptions: SpawnOptionsWithoutStdio = {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
    };

    const proc = spawn(command, args, spawnOptions);

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`Command timed out after ${timeout}ms: ${command} ${args.join(" ")}`));
    }, timeout);

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function runGt(
  args: string[],
  options: CommandOptions = {}
): Promise<CommandResult> {
  return runCommand("gt", args, options);
}

export async function runBd(
  args: string[],
  options: CommandOptions = {}
): Promise<CommandResult> {
  return runCommand("bd", args, options);
}

export async function runGtJson<T>(
  args: string[],
  options: CommandOptions = {}
): Promise<T> {
  const result = await runGt([...args, "--json"], options);
  if (result.exitCode !== 0) {
    throw new Error(`gt ${args.join(" ")} failed: ${result.stderr}`);
  }
  try {
    return JSON.parse(result.stdout) as T;
  } catch {
    throw new Error(`Failed to parse JSON from gt ${args.join(" ")}: ${result.stdout}`);
  }
}

export async function runBdJson<T>(
  args: string[],
  options: CommandOptions = {}
): Promise<T> {
  const result = await runBd([...args, "--json"], options);
  if (result.exitCode !== 0) {
    throw new Error(`bd ${args.join(" ")} failed: ${result.stderr}`);
  }
  try {
    return JSON.parse(result.stdout) as T;
  } catch {
    throw new Error(`Failed to parse JSON from bd ${args.join(" ")}: ${result.stdout}`);
  }
}
