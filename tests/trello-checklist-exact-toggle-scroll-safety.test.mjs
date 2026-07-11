import assert from "node:assert/strict";
import fs from "node:fs";

const map = JSON.parse(
  fs.readFileSync(
    new URL("../sites/trello.com/board/actions.json", import.meta.url),
    "utf8",
  ),
);

for (const [actionName, expectedState] of [
  ["trello.card.checklist_item.complete", "false"],
  ["trello.card.checklist_item.uncomplete", "true"],
]) {
const action = map.tools.find((candidate) => candidate.name === actionName);
assert.ok(action, `${actionName} action must exist`);

const steps = action.workflow.steps;
const revealIndex = steps.findIndex((step) => step.id === "findTargetCheckbox");
const clickIndex = steps.findIndex((step) => step.id === "clickItemCheckbox");

assert.ok(revealIndex >= 0, "exact target must be revealed before geometry is sampled");
assert.ok(
  revealIndex < clickIndex,
  "identity-bound target resolution must precede the click",
);

const reveal = steps[revealIndex];
assert.equal(reveal.primitive, "locator.element_info");
assert.equal(reveal.args.locator.text_equals, "{% input.item_text %}");
assert.match(reveal.args.locator.selector, new RegExp(`aria-checked='${expectedState}'`));
assert.deepEqual(reveal.args.locator.retarget, {
  closest: "[data-testid='check-item-container']",
  selector: "label[data-testid='clickable-checkbox']",
});
assert.match(reveal.retry_until, /candidate_count = 1/);

for (const step of steps.slice(revealIndex + 1, clickIndex)) {
  assert.notEqual(step.primitive, "viewport.scroll");
  assert.notEqual(step.primitive, "locator.element_info");
  assert.notEqual(step.after_each?.primitive, "viewport.scroll");
}

const clickArgs = JSON.stringify(steps[clickIndex].args);
assert.match(clickArgs, /findTargetCheckbox\.output\.clickable_center/);
assert.doesNotMatch(clickArgs, /bounding_box/);
}

console.log("trello exact checklist toggle scroll-safety contracts verified");
