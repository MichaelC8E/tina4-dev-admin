/**
 * AI client — fixed configuration for the andrevanzuydam.com model stack.
 *
 * Five services, known ports, routed through Vite proxies so the browser
 * only ever talks to same-origin URLs:
 *
 *   /ai      → Qwen2.5-Coder-14B @ 45K YaRN   (chat + FIM completion)   :11437
 *   /vision  → Qwen2.5-VL-7B                  (image understanding)     :11434
 *   /embed   → nomic-embed-text               (semantic retrieval)      :11435
 *   /image   → SDXL Turbo                     (diffusion)               :11436
 *   /rag     → tina4-rag                      (framework docs)          :11438
 *
 * The client-side chat/image/RAG helpers that used to live here were
 * retired when the Threads pane moved the agent loop server-side (the Rust
 * supervisor). What remains is the endpoint registry + a reachability probe,
 * the only surface Editor.ts still consumes.
 */

export const MODELS = {
  chat:   { endpoint: "/ai",    model: "qwen2.5-coder:14b" },
  vision: { endpoint: "/vision", model: "qwen2.5-vl:7b" },
  embed:  { endpoint: "/embed",  model: "nomic-embed-text" },
  image:  { endpoint: "/image",  model: "sdxl-turbo" },
  rag:    { endpoint: "/rag" },
} as const;

export type ModelKey = keyof typeof MODELS;

// ── Reachability probe ──────────────────────────────────────────
//
// Used by the session panel's model health row. Any response (even 4xx)
// counts as "up" — the service is answering. Only network failures and
// 5xx mean "down." 2.5s timeout keeps the strip responsive when one of
// the backends hangs.
export async function probeEndpoint(url: string, timeoutMs = 2500): Promise<boolean> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method: "GET", signal: ctl.signal });
    return r.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}
