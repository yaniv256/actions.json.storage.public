import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mapUrl = new URL("../sites/trello.com/board/actions.json", import.meta.url);
const map = JSON.parse(await readFile(mapUrl, "utf8"));
const cardProjection = map.state_projections.find(
  (projection) => projection.name === "trello.card_modal",
);

assert.ok(cardProjection, "missing trello.card_modal projection");

const complete =
  cardProjection.postconditions?.["trello.card.checklist_item.complete"];
const uncomplete =
  cardProjection.postconditions?.["trello.card.checklist_item.uncomplete"];

assert.ok(complete, "complete must declare an independent card-state postcondition");
assert.ok(
  uncomplete,
  "uncomplete must declare an independent card-state postcondition",
);
assert.equal(uncomplete.projection, complete.projection);
assert.match(complete.verify.expression, /aria_checked\s*=\s*'true'/);
assert.match(uncomplete.verify.expression, /aria_checked\s*=\s*'false'/);
assert.match(complete.verify.expression, /\$\$\.input\.item_text/);
assert.match(uncomplete.verify.expression, /\$\$\.input\.item_text/);
assert.notEqual(uncomplete.failure_message, complete.failure_message);

console.log("Trello checklist complete/uncomplete postconditions are symmetric.");
