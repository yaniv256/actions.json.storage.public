import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const map = JSON.parse(
  await readFile(new URL("../sites/trello.com/board/actions.json", import.meta.url), "utf8"),
);
const action = map.tools.find((candidate) => candidate.name === "trello.card.archive");

assert.ok(action, "missing trello.card.archive");
const steps = Object.fromEntries(action.workflow.steps.map((step) => [step.id, step]));

assert.equal(steps.findActions.primitive, "a11y.query");
assert.equal(steps.findArchive.primitive, "a11y.query");
assert.equal(steps.findActions.args.name, "Actions");
assert.equal(steps.findArchive.args.name, "Archive");
assert.equal(steps.verifyArchived.primitive, "locator.text_content");
assert.equal(
  steps.verifyArchived.args.locator.selector,
  "[data-testid='card-back-archive-banner']",
);
assert.doesNotMatch(JSON.stringify(action), /data-testid='popover'/);
assert.match(steps.verifyArchived.retry_until, /This card was archived/);
assert.match(action.workflow.output, /'verified': \$contains\(steps\.verifyArchived\.output\.text/);
assert.match(action.workflow.output, /'safe_to_claim': false/);

console.log("Trello card archive verifies durable state without treating the banner as an affordance.");
