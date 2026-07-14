import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const siteUrl = new URL(
  "../sites/docs.google.com/presentation/actions.json",
  import.meta.url,
);
const ledgerUrl = new URL(
  "../sites/docs.google.com/presentation/accepted-gaps.json",
  import.meta.url,
);
const map = JSON.parse(await readFile(siteUrl, "utf8"));
const ledger = JSON.parse(await readFile(ledgerUrl, "utf8"));

const tool = (name) => {
  const candidate = map.tools.find((entry) => entry.name === name);
  assert.ok(candidate, `missing ${name}`);
  return candidate;
};

const read = tool("slides.current_slide.textboxes.read");
assert.ok(
  read.workflow.steps.some(
    (step) => step.primitive === "browser.extract_elements",
  ),
  "textbox read must extract identity from the rendered current-slide surface",
);
assert.match(read.workflow.output, /object_id/);
assert.match(read.workflow.output, /role/);
assert.match(read.workflow.output, /slide_number/);

const set = tool("slides.current_slide.textbox.set");
assert.equal(set.x_actions.effect, "durable_mutation");
assert.ok(
  set.input_schema.anyOf?.length >= 2,
  "textbox set must require role or existing_text",
);
assert.ok(
  set.workflow.steps.some(
    (step) => step.primitive === "browser.extract_elements",
  ),
  "textbox set must resolve live object identity before geometry",
);
assert.ok(
  set.workflow.steps.some((step) => step.primitive === "pointer.double_click"),
  "textbox set must enter edit mode through the visible box",
);
assert.equal(
  set.workflow.steps.find((step) => step.id === "selectContents").args.trusted,
  true,
  "textbox replacement must select canvas-editor text with trusted input",
);
assert.match(set.workflow.output, /before_new_count/);
assert.match(set.workflow.output, /after_new_count/);
assert.match(set.workflow.output, /slide_number/);
assert.match(set.workflow.output, /resolution/);

assert.ok(
  ledger.accepted_gaps.some(
    (gap) =>
      gap.finding_id ===
      "weak-postcondition:slides.current_slide.textbox.set:missing",
  ),
  "textbox set must classify its fetch-backed external postcondition boundary",
);

console.log("Slides exposes coordinate-free current-slide textbox contracts.");
