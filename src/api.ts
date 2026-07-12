// API wrapper for /__dev/api/* endpoints
const BASE = "/__dev/api";

export async function api<T = any>(path: string, method = "GET", body?: any): Promise<T> {
  const opts: RequestInit = { method, headers: {} };
  if (body) {
    (opts.headers as Record<string, string>)["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, opts);

  // Parse the body once — most endpoints answer JSON, but an error page (405/500
  // from the framework) can be HTML. Tolerate both so the thrown message is useful.
  const text = await res.text();
  let data: any = undefined;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  // Throw on non-2xx. Previously this returned the error body as if it had
  // succeeded, so a 405/400 rendered as a green ✔ (the scaffold-chip bug). Callers
  // that want to tolerate failure already wrap this in try/catch. Surface the
  // backend's own `error`/`message` when present so the UI shows a real reason.
  if (!res.ok) {
    const detail = data && typeof data === "object"
      ? (data.error || data.message || JSON.stringify(data))
      : (typeof data === "string" && data ? data.slice(0, 200) : "");
    throw new Error(detail ? `${res.status}: ${detail}` : `HTTP ${res.status}`);
  }

  return data as T;
}

export function esc(s: string): string {
  const el = document.createElement("span");
  el.textContent = s;
  return el.innerHTML;
}
