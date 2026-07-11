import assert from "node:assert/strict";
import fs from "node:fs";

const map = JSON.parse(
  fs.readFileSync(
    new URL("../sites/trello.com/board/actions.json", import.meta.url),
    "utf8",
  ),
);

for (const [actionName, desiredState] of [
  ["trello.card.checklist_item.complete", "true"],
  ["trello.card.checklist_item.uncomplete", "false"],
]) {
const action = map.tools.find((candidate) => candidate.name === actionName);
assert.ok(action, `${actionName} action must exist`);

const steps = action.workflow.steps;
const revealIndex = steps.findIndex((step) => step.id === "resolveExactIdentity");
const clickIndex = steps.findIndex((step) => step.id === "clickItemCheckbox");
const readBeforeIndex = steps.findIndex((step) => step.id === "readStateBefore");
const readAfterIndex = steps.findIndex((step) => step.id === "readStateAfter");
const retryResolveIndex = steps.findIndex((step) => step.id === "resolveExactIdentityAgain");
const retryClickIndex = steps.findIndex((step) => step.id === "clickItemCheckboxAgain");
const verifyIndex = steps.findIndex((step) => step.id === "verifyDesiredState");

assert.ok(revealIndex >= 0, "exact target must be revealed before geometry is sampled");
assert.ok(
  revealIndex < readBeforeIndex && readBeforeIndex < clickIndex,
  "identity resolution and authoritative state read must precede the click",
);

const reveal = steps[revealIndex];
assert.equal(reveal.primitive, "locator.element_info");
assert.equal(reveal.args.locator.text_equals, "{% input.item_text %}");
assert.equal(
  reveal.args.locator.selector,
  "[data-testid='checklist-items'] input[type='checkbox'][aria-label]",
);
assert.deepEqual(reveal.args.locator.retarget, {
  closest: "[data-testid='check-item-container']",
  selector: "label[data-testid='clickable-checkbox']",
});
assert.match(reveal.retry_until, /candidate_count = 1/);
assert.deepEqual(reveal.after_each?.args?.scope, {
  selector: "main",
  root_strategy: "scope",
});

for (const step of steps.slice(revealIndex + 1, clickIndex)) {
  assert.notEqual(step.primitive, "viewport.scroll");
  assert.notEqual(step.primitive, "locator.element_info");
  assert.notEqual(step.after_each?.primitive, "viewport.scroll");
}

const clickArgs = JSON.stringify(steps[clickIndex].args);
assert.match(clickArgs, /resolveExactIdentity\.output\.clickable_center/);
assert.doesNotMatch(clickArgs, /bounding_box/);
assert.match(steps[clickIndex].when, new RegExp(`aria-checked.*${desiredState}`));

for (const index of [readBeforeIndex, readAfterIndex, verifyIndex]) {
  const read = steps[index];
  assert.equal(read.primitive, "dom.observe.attributes");
  assert.deepEqual(read.args.attributes, ["aria-label", "aria-checked"]);
  assert.equal(read.args.max_matches, 200);
}

assert.ok(clickIndex < readAfterIndex && readAfterIndex < retryResolveIndex);
assert.ok(retryResolveIndex < retryClickIndex && retryClickIndex < verifyIndex);
assert.match(
  steps[retryResolveIndex].when,
  new RegExp(`aria-checked.*${desiredState}`),
);
assert.match(
  steps[retryClickIndex].when,
  new RegExp(`aria-checked.*${desiredState}`),
);
assert.match(
  JSON.stringify(steps[retryClickIndex].args),
  /resolveExactIdentityAgain\.output\.clickable_center/,
);
assert.match(steps[verifyIndex].retry_until, new RegExp(`aria-checked.*${desiredState}`));
assert.equal(steps[verifyIndex].on_error, "stop");
}

console.log("trello exact checklist toggle scroll-safety contracts verified");
