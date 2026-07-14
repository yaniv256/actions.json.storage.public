import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const map = JSON.parse(
  readFileSync(new URL("../sites/trello.com/board/actions.json", import.meta.url), "utf8"),
);
const skill = readFileSync(
  new URL("../sites/trello.com/board/SKILL.md", import.meta.url),
  "utf8",
);

const create = map.tools.find((candidate) => candidate.name === "trello.card.create");
assert.ok(create, "missing trello.card.create");

const steps = Object.fromEntries(create.workflow.steps.map((step) => [step.id, step]));
const postcondition = map.state_projections
  .find((candidate) => candidate.name === "trello.board")
  .postconditions["trello.card.create"];

test("trello.card.create replaces a persisted composer draft before submitting", () => {
  assert.equal(steps.insertTitle.primitive, "text.insert");
  assert.equal(steps.insertTitle.args.mode, "replace");
  assert.equal(
    steps.insertTitle.args.target.selector,
    "[data-testid='list-card-composer-textarea']",
  );
});

test("trello.card.create refuses to submit until the composer equals the requested title", () => {
  assert.equal(steps.verifyComposerTitle.primitive, "locator.value");
  assert.equal(
    steps.verifyComposerTitle.args.locator.selector,
    "[data-testid='list-card-composer-textarea']",
  );
  assert.match(steps.verifyComposerTitle.retry_until, /output\.value = input\.title/);
  assert.equal(steps.verifyComposerTitle.on_error, "stop");
  assert.ok(
    create.workflow.steps.findIndex((step) => step.id === "verifyComposerTitle") <
      create.workflow.steps.findIndex((step) => step.id === "submitCard"),
    "the exact composer value must be verified before the card is submitted",
  );
});

test("trello.card.create verifies an exact title in the requested list", () => {
  assert.equal(steps.verifyCardPresent.args.text_equals, "{% input.title %}");
  assert.equal(steps.verifyCardPresent.args.text_contains, undefined);
  assert.equal(
    postcondition.verify.expression,
    "{% $exists(state.board.lists[name = $$.input.list_name].cards[title = $$.input.title]) %}",
  );
});

test("the Trello skill preserves the persisted-draft warning", () => {
  assert.match(skill, /persists canceled card-composer drafts/i);
  assert.match(skill, /clipboard paste appends/i);
});
