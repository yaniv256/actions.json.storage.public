import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mapUrl = new URL(
  "../sites/docs.google.com/spreadsheets/actions.json",
  import.meta.url,
);
const ledgerUrl = new URL(
  "../sites/docs.google.com/spreadsheets/accepted-gaps.json",
  import.meta.url,
);
const map = JSON.parse(await readFile(mapUrl, "utf8"));
const ledger = JSON.parse(await readFile(ledgerUrl, "utf8"));
const tool = (name) => map.tools.find((entry) => entry.name === name);

for (const name of [
  "sheets.range.paste_tsv",
  "sheets.range.paste_tsv_at_anchor",
  "sheets.cell.set",
]) {
  const action = tool(name);
  assert.ok(action, `missing ${name}`);
  assert.equal(action.x_actions.effect, "durable_mutation");
  assert.ok(action.input_schema.required.includes("sheet_id"));
  assert.ok(action.input_schema.required.includes("gid"));
  assert.ok(
    action.input_schema.required.includes(
      name === "sheets.cell.set" ? "cell_ref" : "anchor_cell",
    ),
  );
  assert.ok(action.workflow.steps.some((step) => step.id === "fetchBefore"));
  assert.ok(action.workflow.steps.some((step) => step.id === "verifyFetch"));
  assert.ok(action.workflow.steps.some((step) => step.id === "staleProbeFetch"));
  assert.ok(
    action.workflow.steps.find((step) => step.id === "staleProbeFetch").settle_after.delay_ms >= 2000,
  );
  assert.match(
    action.workflow.steps.find((step) => step.id === "verifyFetch").args.url,
    /_actions_json_confirm=/,
    `${name} verification fetch must bypass stale htmlview responses`,
  );
  assert.match(action.workflow.output, /before_region|before_value/);
  assert.match(action.workflow.output, /after_region|after_value/);
  assert.match(action.workflow.output, /verified/);
  assert.match(`${action.description}\n${action.workflow.output}`, /sheets\.read|htmlview/i);
}

const anchored = tool("sheets.range.paste_tsv_at_anchor");
for (const stepId of ["findNameBox", "typeAnchor"]) {
  const step = anchored.workflow.steps.find((candidate) => candidate.id === stepId);
  const selector = step.args.locator?.selector ?? step.args.target?.selector;
  assert.equal(
    selector,
    "input.waffle-name-box",
    `${stepId} must use the live Name Box identity; Sheets exposes no aria-label on this input`,
  );
}
assert.equal(
  anchored.workflow.steps.some((step) => step.id === "clickNameBox"),
  false,
  "targeted Name Box replacement owns focus; a preliminary coordinate click races Sheets focus state",
);
assert.equal(
  anchored.workflow.steps.find((step) => step.id === "selectAnchor").args.trusted,
  true,
  "Name Box selection must use a real Enter event",
);
assert.equal(
  anchored.workflow.steps.some((step) => step.id === "clickGrid"),
  false,
  "anchored range paste must not replace the named anchor with a geometry click",
);
assert.equal(
  Object.hasOwn(anchored.x_actions, "geometry_identity_exception"),
  false,
  "removed geometry refocus must not leave a stale investigation exception",
);

const cellSet = tool("sheets.cell.set");
for (const stepId of ["focusNameBox", "typeRef"]) {
  const step = cellSet.workflow.steps.find((candidate) => candidate.id === stepId);
  const selector = step.args.locator?.selector ?? step.args.target?.selector;
  assert.equal(
    selector,
    "input.waffle-name-box",
    `${stepId} must use the live Name Box identity; Sheets exposes no aria-label on this input`,
  );
}
assert.equal(
  cellSet.workflow.steps.some((step) => step.id === "clickNameBox"),
  false,
  "single-cell addressing must use targeted Name Box replacement without a coordinate click",
);
assert.equal(
  cellSet.workflow.steps.find((step) => step.id === "selectCell").args.trusted,
  true,
);
assert.equal(
  cellSet.workflow.steps.find((step) => step.id === "commitCell").args.trusted,
  true,
);
assert.ok(
  cellSet.workflow.steps.find((step) => step.id === "commitCell").settle_after.delay_ms >= 3500,
  "Sheets htmlview must be allowed to observe the committed server-model write before verification",
);
assert.match(cellSet.workflow.output, /\$exists\(\$before\)/);

const expectedGaps = new Set([
  "weak-postcondition:sheets.range.paste_tsv:missing",
  "weak-postcondition:sheets.range.paste_tsv_at_anchor:missing",
  "weak-postcondition:sheets.cell.set:missing",
  "state-machine:sheets.range.paste_tsv:prose-precondition-without-state-assertion",
]);
for (const gap of ledger.accepted_gaps) expectedGaps.delete(gap.finding_id);
assert.deepEqual([...expectedGaps], []);

console.log("Sheets durable workflows carry identity-bound server-model contracts.");
