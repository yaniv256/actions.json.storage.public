import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const map = JSON.parse(
  await readFile(
    new URL("../sites/trello.com/board/actions.json", import.meta.url),
    "utf8",
  ),
);
const action = map.tools.find(
  (candidate) => candidate.name === "trello.card.drag_between_lists",
);
assert.ok(action, "missing trello.card.drag_between_lists");

const drag = action.workflow.steps.find((step) => step.id === "animatedDrag");
assert.ok(drag, "drag workflow must have animatedDrag step");
assert.equal(drag.primitive, "pointer.drag");
assert.ok(drag.args.from.locator, "drag start must be identity-bearing");
assert.ok(drag.args.to.locator, "drag destination must be identity-bearing");
assert.match(drag.args.from.locator.text_contains, /input\.card_title/);
assert.match(drag.args.to.locator.text_contains, /input\.destination_list_name/);
assert.match(action.description, /receive events/i);
assert.match(action.description, /post-drag verification/i);

console.log("Trello drag map uses identity-bearing actionability targets.");
