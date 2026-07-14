import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const map = JSON.parse(
  readFileSync(new URL("../sites/trello.com/board/actions.json", import.meta.url), "utf8"),
);
const action = map.tools.find((candidate) => candidate.name === "trello.card.title.set");
assert.ok(action, "missing trello.card.title.set");
assert.match(action.workflow.output, /'safe_to_claim'/);
assert.match(action.workflow.output, /'safe_to_claim': \$verified/);
assert.match(action.workflow.output, /do not claim success/);

console.log("trello card title safe-claim contract passed");
