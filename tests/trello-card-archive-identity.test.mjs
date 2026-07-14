import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const map = JSON.parse(
  await readFile(new URL("../sites/trello.com/board/actions.json", import.meta.url), "utf8"),
);
const action = map.tools.find((candidate) => candidate.name === "trello.card.archive");

assert.ok(action, "missing trello.card.archive");
const steps = Object.fromEntries(action.workflow.steps.map((step) => [step.id, step]));

assert.equal(steps.findArchiveBeforeOpen.primitive, "a11y.query");
assert.equal(steps.findArchiveBeforeOpen.args.name, "Archive");
assert.equal(steps.findArchiveBeforeOpen.on_error, "continue");
assert.equal(steps.findActions.primitive, "a11y.query");
assert.equal(steps.findArchive.primitive, "a11y.query");
assert.equal(steps.findActions.args.name, "Actions");
assert.equal(steps.findArchive.args.name, "Archive");
assert.match(steps.findActions.when, /findArchiveBeforeOpen/);
assert.match(steps.openActionsMenu.when, /findArchiveBeforeOpen/);
assert.doesNotMatch(steps.openActionsMenu.when, /findActions\.output/);
assert.equal(steps.verifyArchived.primitive, "locator.text_content");
assert.equal(
  steps.verifyArchived.args.locator.selector,
  "[data-testid='card-back-archive-banner']",
);
assert.doesNotMatch(JSON.stringify(action), /data-testid='popover'/);
assert.match(steps.verifyArchived.retry_until, /This card was archived/);
assert.match(action.workflow.output, /'verified': \$contains\(steps\.verifyArchived\.output\.text/);
assert.match(action.workflow.output, /'safe_to_claim': false/);
assert.equal(steps.closeCard.primitive, "keyboard.press");
assert.equal(steps.closeCard.args.key, "Escape");
assert.equal(steps.verifyBoardVisible.primitive, "locator.element_info");
assert.equal(steps.verifyBoardVisible.args.locator.selector, "[data-testid='lists']");
assert.match(action.workflow.output, /'board_visible': \$exists\(steps\.verifyBoardVisible\.output\.bounding_box\)/);

console.log("Trello card archive is idempotent across menu state and returns to the board after durable verification.");
