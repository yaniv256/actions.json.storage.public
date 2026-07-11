import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const map = JSON.parse(
  await readFile(
    new URL("../sites/trello.com/board/actions.json", import.meta.url),
    "utf8",
  ),
);
const action = map.tools.find(
  (candidate) => candidate.name === "trello.card.checklist.read",
);

assert.ok(action, "missing trello.card.checklist.read");

const steps = action.workflow.steps;
const percentages = steps.find((step) => step.id === "readPercentages");
assert.ok(percentages, "all section percentages must be enumerated");
assert.equal(percentages.primitive, "dom.observe.attributes");
assert.deepEqual(percentages.args.attributes, ["text"]);
assert.equal(
  percentages.args.selector,
  "[data-testid='checklist-progress-percentage']",
);
assert.equal(
  steps.some((step) => step.id === "readPercent"),
  false,
  "a singular section percentage cannot certify card-wide completion",
);

const output = action.workflow.output;
assert.match(output, /'section_percentages'\s*:\s*\$pcts/);
assert.match(output, /\$total\s*>\s*0\s+and\s+\$checked\s*=\s*\$total/);
assert.match(output, /'complete'\s*:\s*\$isComplete/);
assert.doesNotMatch(output, /'complete'\s*:\s*\$pct\s*=\s*'100%'/);

for (const phrase of [
  "card-wide item state",
  "section_percentages",
  "empty checklist",
]) {
  assert.match(action.description.toLowerCase(), new RegExp(phrase));
}

console.log("Trello checklist completion uses one card-wide authority.");
