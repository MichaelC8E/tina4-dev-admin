import { describe, it, expect } from "vitest";
import { buildDependencyEdges } from "../src/components/Metrics";

/**
 * The engine (tina4 metrics, src/metrics.rs) resolves every import to a real
 * repo-relative file path. These lock in that the chart uses those paths exactly
 * and only falls back to name matching for older payloads.
 */
describe("buildDependencyEdges", () => {
  it("resolves an exact repo-relative path", () => {
    const paths = ["app/main.py", "app/auth.py"];
    expect(buildDependencyEdges(paths, { "app/main.py": ["app/auth.py"] })).toEqual([[0, 1]]);
  });

  it("links the RIGHT file when two directories share a basename", () => {
    // Regression: name matching keyed on the basename alone, so the last file
    // wins the key and every "util" import pointed at b/util.py. The exact-path
    // lookup is what fixes it - this test fails on basename-only matching.
    const paths = ["a/util.py", "b/util.py", "app/main.py"];
    const edges = buildDependencyEdges(paths, { "app/main.py": ["a/util.py"] });
    expect(edges).toEqual([[2, 0]]);
    expect(edges).not.toEqual([[2, 1]]);
  });

  it("still resolves a legacy module-name payload by segment", () => {
    // Older framework metrics modules emitted module names, not paths.
    const paths = ["tina4_python/auth.py", "tina4_python/router.py"];
    expect(
      buildDependencyEdges(paths, { "tina4_python/router.py": ["tina4_python.auth"] }),
    ).toEqual([[1, 0]]);
  });

  it("drops self-edges and unknown sources", () => {
    const paths = ["app/main.py"];
    expect(buildDependencyEdges(paths, { "app/main.py": ["app/main.py"] })).toEqual([]);
    expect(buildDependencyEdges(paths, { "not/scanned.py": ["app/main.py"] })).toEqual([]);
  });

  it("ignores imports that resolve to nothing in the scanned set", () => {
    // External/stdlib imports have no bubble, so they must not create an edge.
    const paths = ["app/main.py"];
    expect(buildDependencyEdges(paths, { "app/main.py": ["os", "json"] })).toEqual([]);
  });
});
