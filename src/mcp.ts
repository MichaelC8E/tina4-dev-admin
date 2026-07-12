/**
 * MCP tool bridge — thin client for the dev-admin REST shim at
 * `/__dev/api/mcp/tools` + `/__dev/api/mcp/call`. The backend exposes
 * the same 24 built-in dev tools the full MCP JSON-RPC server does, just
 * over plain REST so the browser can speak them without SSE/JSON-RPC.
 *
 * The registry is fetched once on demand and memoised — tools don't
 * change at runtime.
 */

export interface McpTool {
  name: string;
  description: string;
  /** JSON Schema for arguments (type: object, properties, required). */
  schema: {
    type?: string;
    properties?: Record<string, { type?: string; default?: unknown; description?: string }>;
    required?: string[];
  };
}

export interface McpCallResult<T = unknown> {
  ok: boolean;
  name?: string;
  result?: T;
  error?: string;
}

let _loadingPromise: Promise<McpTool[]> | null = null;

/** Fetch the tool list. Returns [] on failure — never throws.
 *  No long-lived cache here: callers (e.g. the chat's `getMcpTools`)
 *  own their own TTLs, which keeps this function honest when a user
 *  adds a new `@mcp_tool` handler at runtime. In-flight calls are
 *  still deduped so a burst of turns only triggers one network hit. */
export async function listMcpTools(): Promise<McpTool[]> {
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = (async () => {
    try {
      const r = await fetch("/__dev/api/mcp/tools");
      if (!r.ok) return [];
      const data = await r.json();
      return (data.tools as McpTool[]) || [];
    } catch {
      return [];
    } finally {
      _loadingPromise = null;
    }
  })();
  return _loadingPromise;
}

/** Invoke an MCP tool by name. Arguments must match the tool's schema. */
export async function callMcpTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<McpCallResult> {
  try {
    const r = await fetch("/__dev/api/mcp/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, arguments: args }),
    });
    const data = await r.json();
    return data;
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
