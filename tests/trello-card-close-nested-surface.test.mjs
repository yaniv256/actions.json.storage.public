import assert from "node:assert/strict";
import fs from "node:fs";

const map = JSON.parse(
  fs.readFileSync(
    new URL("../sites/trello.com/board/actions.json", import.meta.url),
    "utf8",
  ),
);

const action = map.tools.find(
  (candidate) => candidate.name === "trello.card.close",
);
assert.ok(action, "trello.card.close action must exist");

const steps = action.workflow.steps;
const byId = Object.fromEntries(steps.map((step) => [step.id, step]));
const firstEscapeIndex = steps.findIndex((step) => step.id === "pressEscape");
const probeIndex = steps.findIndex(
  (step) => step.id === "probeCardAfterFirstEscape",
);
const secondEscapeIndex = steps.findIndex(
  (step) => step.id === "pressEscapeAgain",
);
const verifyCardGoneIndex = steps.findIndex(
  (step) => step.id === "verifyCardGone",
);
const verifyBoardRouteIndex = steps.findIndex(
  (step) => step.id === "verifyBoardRoute",
);

assert.ok(firstEscapeIndex >= 0, "the initial close attempt must remain explicit");
assert.ok(
  firstEscapeIndex < probeIndex &&
    probeIndex < secondEscapeIndex &&
    secondEscapeIndex < verifyCardGoneIndex &&
    verifyCardGoneIndex < verifyBoardRouteIndex,
  "card close must probe state before its bounded second Escape",
);

assert.equal(byId.pressEscape.primitive, "keyboard.press");
assert.equal(byId.pressEscape.args.key, "Escape");
assert.equal(byId.probeCardAfterFirstEscape.primitive, "locator.element_info");
assert.equal(
  byId.probeCardAfterFirstEscape.args.locator.selector,
  "[data-testid='card-back-name']",
);
assert.equal(byId.probeCardAfterFirstEscape.on_error, "continue");
assert.equal(byId.pressEscapeAgain.primitive, "keyboard.press");
assert.equal(byId.pressEscapeAgain.args.key, "Escape");
assert.match(byId.pressEscapeAgain.when, /probeCardAfterFirstEscape/);
assert.match(byId.pressEscapeAgain.when, /bounding_box/);
assert.doesNotMatch(byId.pressEscapeAgain.when, /\$not/);
assert.equal(byId.verifyCardGone.primitive, "dom.observe.visible");
assert.equal(
  byId.verifyCardGone.args.selector,
  "[data-testid='card-back-title-input'], [data-testid='card-back-name']",
);
assert.match(byId.verifyCardGone.retry_until, /match_count = 0/);
assert.equal(byId.verifyCardGone.on_error, "stop");
assert.equal(byId.verifyBoardRoute.primitive, "locator.wait_for");
assert.equal(
  byId.verifyBoardRoute.args.locator.selector,
  "[data-testid='list-name']",
);
assert.equal(byId.verifyBoardRoute.args.state, "visible");
assert.ok(byId.verifyBoardRoute.args.timeout_ms >= 5000);
assert.equal(
  steps.filter(
    (step) =>
      step.primitive === "keyboard.press" && step.args?.key === "Escape",
  ).length,
  2,
  "card close must remain bounded to two Escape attempts",
);
assert.match(action.description, /nested/i);
assert.match(action.description, /checklist item composer/i);

console.log("Trello card close recovers from one nested dismissible surface.");
