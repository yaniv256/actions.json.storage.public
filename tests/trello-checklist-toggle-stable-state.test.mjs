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
  const byId = Object.fromEntries(steps.map((step) => [step.id, step]));
  const optimisticIndex = steps.findIndex(
    (step) => step.id === "readStateAfterOptimistic",
  );
  const settledIndex = steps.findIndex((step) => step.id === "readStateAfter");
  const retryResolveIndex = steps.findIndex(
    (step) => step.id === "resolveExactIdentityAgain",
  );
  const finalOptimisticIndex = steps.findIndex(
    (step) => step.id === "verifyDesiredStateOptimistic",
  );
  const finalStableIndex = steps.findIndex(
    (step) => step.id === "verifyDesiredState",
  );

  assert.ok(
    optimisticIndex >= 0 && optimisticIndex < settledIndex,
    `${actionName} must sample and wait before its settled-state read`,
  );
  assert.ok(
    settledIndex < retryResolveIndex,
    `${actionName} must gate its bounded retry on settled state`,
  );
  assert.ok(
    finalOptimisticIndex >= 0 && finalOptimisticIndex < finalStableIndex,
    `${actionName} must stabilize before final success`,
  );

  assert.equal(byId.readStateAfterOptimistic.primitive, "dom.observe.attributes");
  assert.ok(
    byId.readStateAfterOptimistic.settle_after?.delay_ms >= 500,
    `${actionName} must allow optimistic checked state to revert before retry`,
  );
  assert.equal(byId.readStateAfter.primitive, "dom.observe.attributes");
  assert.match(
    byId.resolveExactIdentityAgain.when,
    new RegExp(`readStateAfter.*aria-checked.*${desiredState}`),
  );
  assert.match(
    byId.clickItemCheckboxAgain.when,
    new RegExp(`readStateAfter.*aria-checked.*${desiredState}`),
  );

  assert.equal(
    byId.verifyDesiredStateOptimistic.primitive,
    "dom.observe.attributes",
  );
  assert.ok(
    byId.verifyDesiredStateOptimistic.settle_after?.delay_ms >= 500,
    `${actionName} must allow retry optimism to settle before certification`,
  );
  assert.match(
    byId.verifyDesiredState.retry_until,
    new RegExp(`aria-checked.*${desiredState}`),
  );
  assert.match(action.workflow.output, /verifyDesiredState\.output/);
  assert.doesNotMatch(action.workflow.output, /verifyDesiredStateOptimistic\.output/);
}

console.log("Trello checklist toggles certify stable semantic state.");
