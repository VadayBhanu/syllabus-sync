import { describe, expect, it } from "vitest";
import { checkDraft, OFFLINE_DRAFT, previewHtml } from "@/lib/builder";

describe("AI Builder safety checks", () => {
  it("passes the saved example", () => {
    expect(checkDraft(OFFLINE_DRAFT).every((c) => c.ok)).toBe(true);
  });
  it("blocks network, storage, eval and escaping the sandbox", () => {
    for (const bad of ["fetch('/api/x')", "localStorage.setItem('a','b')", "eval('1')", "window.parent.postMessage(1)", "import x from 'y'"]) {
      const d = { ...OFFLINE_DRAFT, code: `function Feature() { ${bad}; return <div/>; }` };
      expect(checkDraft(d).some((c) => !c.ok)).toBe(true);
    }
  });
  it("can't break out of the preview's script tag", () => {
    expect(previewHtml("function Feature(){return '</script><script>alert(1)'}")).not.toContain("</script><script>alert(1)");
  });
});
