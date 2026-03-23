type Level = "info" | "warn" | "error" | "debug";

function line(level: Level, msg: string, meta?: unknown) {
  const ts = new Date().toISOString();
  const extra = meta !== undefined ? ` ${JSON.stringify(meta)}` : "";
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](`[${ts}] [${level.toUpperCase()}] ${msg}${extra}`);
}

export const logger = {
  info: (msg: string, meta?: unknown) => line("info", msg, meta),
  warn: (msg: string, meta?: unknown) => line("warn", msg, meta),
  error: (msg: string, meta?: unknown) => line("error", msg, meta),
  debug: (msg: string, meta?: unknown) => line("debug", msg, meta),
};
