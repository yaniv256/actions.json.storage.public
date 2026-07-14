import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const map = JSON.parse(
  await readFile(
    new URL("../sites/trello.com/board/actions.json", import.meta.url),
    "utf8",
  ),
);

const action = map.tools.find(
  (candidate) => candidate.name === "trello.card.checklist_item.add",
);

assert.ok(action, "missing trello.card.checklist_item.add");

const verifyItem = action.workflow.steps.find((step) => step.id === "verifyItem");
assert.ok(verifyItem, "checklist item add must have a verifyItem step");
assert.equal(
  verifyItem.primitive,
  "dom.observe.attributes",
  "verifyItem must read semantic checkbox attributes, not visible text",
);
assert.equal(
  verifyItem.args.selector,
  "[data-testid='checklist-items'] input[type='checkbox'][aria-label]",
);
assert.deepEqual(verifyItem.args.attributes, ["aria-label", "aria-checked"]);
assert.equal(verifyItem.args.max_matches, 200);
assert.match(verifyItem.retry_until, /attributes\.`aria-label`\s*=\s*\$t/);
assert.match(verifyItem.retry_until, /\$count\(/);
assert.doesNotMatch(
  verifyItem.retry_until,
  /\$contains\(steps\.verifyItem\.output\.text/,
  "verification must not depend on visible text containment",
);
assert.doesNotMatch(
  action.workflow.output,
  /\$contains\(steps\.verifyItem\.output\.text/,
  "reported verified field must not depend on visible text containment",
);
assert.match(action.workflow.output, /'match_count'\s*:/);

const cardProjection = map.state_projections.find(
  (projection) => projection.name === "trello.card_modal",
);
assert.ok(cardProjection, "missing trello.card_modal projection");

const addPostcondition =
  cardProjection.postconditions?.["trello.card.checklist_item.add"];
assert.ok(addPostcondition, "add must declare independent card-state postcondition");
assert.equal(addPostcondition.projection, "trello.card_modal");
assert.match(addPostcondition.verify.expression, /state\.modal\.checklist_items/);
assert.match(addPostcondition.verify.expression, /text\s*=\s*\$\$\.input\.item_text/);
assert.doesNotMatch(
  addPostcondition.verify.expression,
  /\$contains\(state\.modal\.text/,
  "postcondition must use exact checklist item identity, not modal visible text",
);

for (const phrase of ["exact aria-label", "card-wide", "multi-section"]) {
  assert.match(
    action.description.toLowerCase(),
    new RegExp(phrase),
    `description must document the verification boundary: ${phrase}`,
  );
}

console.log("Trello checklist item add uses semantic card-wide verification.");
