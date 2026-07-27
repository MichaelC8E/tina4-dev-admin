import { beforeEach, describe, expect, it, vi } from "vitest";
// Importing the module wires window.__threadsShowList / __threadsShowDetail and
// makes the internal toggle functions operate on the real document.
import "../src/components/Editor";

// A real ThreadMeta the app would receive from GET /__dev/api/threads.
const THREAD = {
  id: "t-1",
  title: "Test thread",
  created_at: "2026-01-01T00:00:00Z",
  last_message_at: "2026-01-01T00:00:00Z",
  archived: false,
  status_hint: "idle",
};

// The real thread-pane elements the toggle functions read by id, with the same
// initial hidden states as renderEditor's markup (list shown, detail hidden).
function mountThreadPane(): void {
  document.body.innerHTML = `
    <header class="threads-pane-head" id="threads-pane-head-list"></header>
    <header class="threads-pane-head threads-pane-head-detail" id="threads-pane-head-detail" hidden>
      <h3 id="threads-detail-title">Thread</h3>
    </header>
    <div class="threads-list-view" id="threads-list-view">
      <div id="threads-list-rows"></div>
    </div>
    <div class="threads-detail-view" id="threads-detail-view" hidden>
      <div id="threads-detail-meta"></div>
      <div id="threads-chat"></div>
      <textarea id="threads-reply-input"></textarea>
    </div>`;
}

// fetch stub: the threads list returns [THREAD], any messages endpoint returns
// []. Drives the real refresh/switch paths without a server.
function stubFetch(): void {
  global.fetch = vi.fn(async (url: any) => {
    const u = String(url);
    const body = u.endsWith("/api/threads") ? [THREAD] : [];
    return { ok: true, status: 200, json: async () => body } as any;
  }) as any;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

// Seed the module's internal threadList via the real refresh flow.
async function seedThreadList(): Promise<void> {
  (window as any).__threadsShowList();
  await flush();
  await flush();
}

beforeEach(() => {
  stubFetch();
  mountThreadPane();
});

describe("thread-pane null-guards (PR #1 + 2788 follow-up)", () => {
  it("threadsShowList does not throw when a pane element is missing, and still toggles the rest", () => {
    document.getElementById("threads-detail-view")!.remove(); // simulate absent DOM

    expect(() => (window as any).__threadsShowList()).not.toThrow();

    // Execution continued past the missing element and toggled the survivors.
    expect(document.getElementById("threads-pane-head-list")!.hidden).toBe(false);
    expect(document.getElementById("threads-pane-head-detail")!.hidden).toBe(true);
    expect(document.getElementById("threads-list-view")!.hidden).toBe(false);
  });

  it("threadsShowDetail renders the detail view with title and meta strip", async () => {
    await seedThreadList();

    // __threadsShowDetail is fire-and-forget; poll the real DOM until the async
    // detail render lands. A throw in the async path surfaces as an unhandled
    // rejection, which fails the test.
    (window as any).__threadsShowDetail(THREAD.id);

    await vi.waitFor(() =>
      expect(document.getElementById("threads-detail-title")!.textContent).toBe("Test thread"),
    );
    expect(document.getElementById("threads-pane-head-detail")!.hidden).toBe(false);
    expect(document.getElementById("threads-detail-view")!.hidden).toBe(false);
    // Meta strip got the pill + date (proves the 2788-guarded assignment ran).
    expect(document.getElementById("threads-detail-meta")!.innerHTML.length).toBeGreaterThan(0);
  });

  it("threadsShowDetail does not abort when the title element is missing, and still writes the meta strip", async () => {
    await seedThreadList();
    document.getElementById("threads-detail-title")!.remove(); // simulate absent DOM

    (window as any).__threadsShowDetail(THREAD.id);

    // The meta assignment runs AFTER the (missing) title. If the missing title
    // threw, execution would abort before this and the strip would stay empty —
    // so a populated meta strip proves the guard let execution continue.
    await vi.waitFor(() =>
      expect(document.getElementById("threads-detail-meta")!.innerHTML.length).toBeGreaterThan(0),
    );
    expect(document.getElementById("threads-detail-view")!.hidden).toBe(false);
  });

  it("threadsShowDetail does not abort when the meta element is missing (the 2788 guard), and still paints the chat", async () => {
    await seedThreadList();
    document.getElementById("threads-detail-meta")!.remove(); // simulate absent DOM

    (window as any).__threadsShowDetail(THREAD.id);

    // paintThreadsChat runs AFTER the (missing) meta assignment. If the missing
    // meta threw, the chat would never be painted — so a populated chat proves
    // the 2788 guard let execution continue past the absent element.
    await vi.waitFor(() =>
      expect(document.getElementById("threads-chat")!.innerHTML.length).toBeGreaterThan(0),
    );
    expect(document.getElementById("threads-detail-view")!.hidden).toBe(false);
  });
});
