/** Reads a port from the environment, falling back to the service's default port. */
export function readPort(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (!raw) return fallback;
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`${envName} must be a valid port number, got "${raw}"`);
  }
  return port;
}
