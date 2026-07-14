import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const map = JSON.parse(
  readFileSync(new URL("../sites/trello.com/board/actions.json", import.meta.url), "utf8"),
);
const close = map.tools.find((candidate) => candidate.name === "trello.card.close");

assert.ok(close, "missing trello.card.close");

const workflow = close.workflow;
assert.ok(
  workflow.steps.some((step) => step.id === "verifyCardGone"),
  "trello.card.close must independently probe that the card modal is gone",
);
assert.match(
  workflow.output,
  /cardGone/,
  "trello.card.close output must include modal absence in its closed result",
);
assert.match(
  workflow.output,
  /'closed': \$boardVisible and \$cardGone/,
  "closed must require both board visibility and modal absence",
);

console.log("trello card close verification contract passed");
