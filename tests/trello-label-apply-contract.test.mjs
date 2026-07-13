import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const map = JSON.parse(readFileSync(new URL("../sites/trello.com/board/actions.json", import.meta.url), "utf8"));

function tool(name) {
  const found = map.tools.find((candidate) => candidate.name === name);
  assert.ok(found, `missing tool ${name}`);
  return found;
}

test("trello.card.label_options.candidates is scoped to the labels popover", () => {
  const candidates = tool("trello.card.label_options.candidates");
  const selector = candidates.x_actions.binding.arguments.locator.selector;

  assert.match(selector, /labels-popover-labels-screen/);
  assert.doesNotMatch(selector, /\[role='dialog'\] button/);
  assert.doesNotMatch(selector, /\.window button/);
});

test("trello.card.label.apply is idempotent and verifies against the card label container", () => {
  const apply = tool("trello.card.label.apply");
  const steps = apply.workflow.steps;
  const byId = Object.fromEntries(steps.map((step) => [step.id, step]));

  assert.equal(apply.input_schema.required.includes("label"), true);
  assert.equal(byId.findExistingCardLabel.args.locator.selector, "[data-testid='card-back-labels-container'] [data-testid='card-label']");
  assert.equal(byId.findAddLabelButton.args.locator.text_contains, "Add a label");
  assert.equal(byId.findLegacyLabelsButton.args.locator.text_contains, "Labels");
  assert.equal(byId.findMatchingLabelRow.args.locator.selector, "[data-testid='labels-popover-labels-screen'] [data-testid='clickable-checkbox']");
  assert.equal(byId.clickMatchingLabelRow.when, "{% $not($exists(steps.findExistingCardLabel.output.clickable_center.x)) %}");
  assert.equal(byId.verifyCardLabel.args.locator.selector, "[data-testid='card-back-labels-container'] [data-testid='card-label']");
  assert.match(apply.workflow.output, /already_present/);
  assert.match(apply.workflow.output, /verified/);
});
