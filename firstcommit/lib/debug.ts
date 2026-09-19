export function debugLog(scope: string, message: string, details?: Record<string, unknown>) {
  if (process.env.DEBUG_LOGS !== "true") return;
  const suffix = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[debug:${scope}] ${message}${suffix}`);
}

export function debugError(scope: string, message: string, error: unknown, details?: Record<string, unknown>) {
  if (process.env.DEBUG_LOGS !== "true") return;
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error && error.stack ? `\n${error.stack}` : "";
  console.error(`[debug:${scope}] ${message}: ${errorMessage}${details ? ` ${JSON.stringify(details)}` : ""}${stack}`);
}
