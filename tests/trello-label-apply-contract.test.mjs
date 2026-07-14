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
  assert.equal(byId.scrollCardControlsIntoView, undefined);
  assert.equal(byId.revealLabelControlsInShortViewport, undefined);
  assert.equal(byId.waitForLabelControlAfterScroll, undefined);
  assert.equal(byId.findExistingCardLabel.args.locator.selector, "[data-testid='card-back-labels-container'] [data-testid='card-label']");
  assert.equal(
    byId.findMatchingLabelRowBeforeOpen.args.locator.selector,
    "[data-testid='labels-popover-labels-screen'] [data-testid='clickable-checkbox']",
  );
  assert.equal(byId.findMatchingLabelRowBeforeOpen.on_error, "continue");
  assert.equal(byId.findLabelsControl.primitive, "a11y.query");
  assert.equal(byId.findLabelsControl.args.role, "button");
  assert.equal(byId.findLabelsControl.args.name, "Labels");
  assert.equal(byId.findAddLabelButton, undefined);
  assert.equal(byId.findLegacyLabelsButton, undefined);
  assert.equal(byId.findIconLabelButton, undefined);
  assert.match(byId.clickLabelsControl.args.x, /findLabelsControl/);
  assert.match(byId.clickLabelsControl.when, /findMatchingLabelRowBeforeOpen/);
  assert.equal(
    byId.clickLabelsControl.settle_after.locator.selector,
    "[data-testid='labels-popover-labels-screen']",
  );
  assert.ok(byId.clickLabelsControl.settle_after.timeout_ms <= 2000);
  assert.equal(byId.findMatchingLabelRowAfterFirstClick, undefined);
  assert.equal(byId.clickLabelsControlAfterNoop, undefined);
  assert.equal(byId.findMatchingLabelRow.args.locator.selector, "[data-testid='labels-popover-labels-screen'] [data-testid='clickable-checkbox']");
  assert.equal(byId.findMatchingLabelRow.retry_until, undefined);
  assert.equal(byId.clickMatchingLabelRow.when, "{% $not($exists(steps.findExistingCardLabel.output.clickable_center.x)) %}");
  assert.ok(
    steps.findIndex((step) => step.id === "clickClosePopover") <
      steps.findIndex((step) => step.id === "verifyCardLabel"),
    "popover must close before final card-level label verification so it cannot occlude the label container",
  );
  assert.equal(byId.verifyCardLabel.args.locator.selector, "[data-testid='card-back-labels-container'] [data-testid='card-label']");
  assert.match(apply.workflow.output, /already_present/);
  assert.match(apply.workflow.output, /verified/);
});

test("trello.board.label.ensure creates only missing exact board labels", () => {
  const ensure = tool("trello.board.label.ensure");
  const byId = Object.fromEntries(ensure.workflow.steps.map((step) => [step.id, step]));

  assert.equal(byId.findLabelsControl.primitive, "a11y.query");
  assert.deepEqual(byId.findLabelsControl.args, { role: "button", name: "Labels" });
  assert.equal(byId.findOpenLabelsScreen.on_error, "continue");
  assert.match(byId.findLabelsControl.when, /findOpenLabelsScreen/);
  assert.match(byId.openLabels.when, /findOpenLabelsScreen/);
  assert.equal(byId.findExistingLabel.on_error, "continue");
  assert.equal(byId.findCreateNewLabel.args.name, "Create a new label");
  assert.match(byId.openCreateLabel.when, /findExistingLabel/);
  assert.equal(byId.insertLabelTitle.args.target.selector, "#edit-label-title-input");
  assert.equal(byId.insertLabelTitle.args.text, "{% input.label %}");
  assert.equal(byId.findCreate.args.name, "Create");
  assert.equal(byId.createLabel.settle_after.locator.text_contains, "{% input.label %}");
  assert.equal(byId.verifyLabel.args.locator.text_contains, "{% input.label %}");
  assert.match(ensure.workflow.output, /verified/);
});
