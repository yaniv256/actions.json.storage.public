import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mapUrl = new URL("../sites/trello.com/board/actions.json", import.meta.url);
const map = JSON.parse(await readFile(mapUrl, "utf8"));
const tool = map.tools.find(
  (candidate) => candidate.name === "trello.card.checklist_unchecked_items.read",
);

assert.ok(tool, "missing unchecked-checklist read action");

const output = tool.workflow.output;
assert.doesNotMatch(
  output,
  /'reveal'\s*:\s*steps\./,
  "semantic output must not copy a complete locator diagnostic object",
);
assert.doesNotMatch(
  output,
  /'visibility'\s*:\s*visibility/,
  "semantic output must not repeat rich visibility diagnostics per row",
);
assert.match(output, /'item_text'\s*:\s*text/);
assert.match(output, /'clickable_center'\s*:\s*clickable_center/);

// Ten investigation phases with deliberately long labels and centers remain far
// below the workflow evaluator's 16 KB expression-output boundary. This models
// the semantic shape, not the locator's state-dependent clipping diagnostics.
const representative = {
  visible_unchecked_count: 10,
  items: Array.from({ length: 10 }, (_, index) => ({
    item_text: `Phase ${index + 1}: investigate a long reliability condition with exact evidence and reconciliation`,
    checked: "false",
    clickable_center: { x: 468.3999938964844, y: 218.31249809265137 + index * 36 },
  })),
  revealed_first_unchecked: true,
  binding_rule:
    "Copy an exact item_text from items into trello.card.checklist_item.complete; do not invent checklist item text.",
};

const bytes = Buffer.byteLength(JSON.stringify(representative), "utf8");
assert.ok(bytes < 4_000, `bounded semantic result unexpectedly grew to ${bytes} bytes`);
assert.ok(bytes < 16_000, `bounded semantic result exceeds evaluator limit: ${bytes}`);

console.log(`Trello unchecked-checklist output is bounded (${bytes} representative bytes).`);
