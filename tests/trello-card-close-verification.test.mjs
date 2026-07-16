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
const byId = Object.fromEntries(workflow.steps.map((step) => [step.id, step]));
assert.equal(byId.verifyCardGone.primitive, "dom.observe.visible");
assert.match(byId.verifyCardGone.retry_until, /match_count = 0/);
assert.equal(
  byId.verifyCardGone.on_error,
  "stop",
  "card.close must fail loudly when the card remains open",
);
assert.equal(byId.verifyBoardRoute.primitive, "locator.wait_for");
assert.equal(byId.verifyBoardRoute.args.state, "visible");
assert.equal(
  byId.verifyBoardRoute.args.locator.selector,
  "[data-testid='list-name']",
);
assert.match(
  workflow.output,
  /verifyCardGone\.output\.match_count = 0/,
  "trello.card.close output must include modal absence in its closed result",
);
assert.match(
  workflow.output,
  /verifyBoardRoute\.output\.matched/,
  "trello.card.close output must derive board visibility from a bounded readiness wait",
);
assert.match(
  workflow.output,
  /'closed': \$boardVisible and \$cardGone/,
  "closed must require both board visibility and modal absence",
);

console.log("trello card close verification contract passed");
