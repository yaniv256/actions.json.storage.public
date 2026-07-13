import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const map = JSON.parse(
  readFileSync(new URL("../sites/trello.com/board/actions.json", import.meta.url), "utf8"),
);

const boardProjection = map.state_projections.find(
  (projection) => projection.name === "trello.board",
);
const postcondition =
  boardProjection?.postconditions?.["trello.card.by_title.open"];

assert.ok(postcondition, "trello.card.by_title.open must have a postcondition");
assert.equal(
  postcondition.projection,
  "trello.card_modal",
  "opening a card navigates to /c/, so verification must use card-modal state",
);
assert.match(
  postcondition.verify.expression,
  /\$split\(state\.modal\.title/,
  "the postcondition must bind the exact requested card title",
);
assert.ok(
  postcondition.verify.expression.includes(
    "'\n')[0] = $$.input.title",
  ),
  "the postcondition must tolerate Trello appending an adjacent control after the title line",
);

console.log("Trello card-open postcondition verifies exact card-modal identity.");
