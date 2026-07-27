import { vi } from "vitest";

// The dev-admin opens a hot-reload WebSocket and polls for health. Neither is
// under test here, and happy-dom would attempt real connections (ECONNREFUSED
// noise). No-op the realtime globals so the suite stays quiet and offline.
class NoopSocket {
  close(): void {}
  send(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
}
vi.stubGlobal("WebSocket", NoopSocket);
vi.stubGlobal("EventSource", NoopSocket);

// Default offline fetch so any import-time / background request (before a test
// installs its own stub) resolves instead of hitting the network. Individual
// tests override global.fetch with the responses they need.
vi.stubGlobal(
  "fetch",
  vi.fn(async () => ({ ok: true, status: 200, json: async () => [] })),
);
