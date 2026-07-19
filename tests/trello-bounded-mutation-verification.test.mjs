import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const map = JSON.parse(
  readFileSync(new URL("../sites/trello.com/board/actions.json", import.meta.url), "utf8"),
);
const tools = new Map(map.tools.map((tool) => [tool.name, tool]));
const boardProjection = map.state_projections.find(
  (projection) => projection.name === "trello.board",
);

test("growing Trello board state is not retransmitted after mutation workflows", () => {
  const fullBoardPostconditions = Object.entries(boardProjection.postconditions ?? {})
    .filter(([, postcondition]) => postcondition.projection === "trello.board")
    .map(([name]) => name);
  assert.deepEqual(fullBoardPostconditions, []);
});

test("mutations that lost full-board postconditions fail closed on local evidence", () => {
  const expectedStops = new Map([
    ["trello.card.create", "verifyCardPresent"],
    ["trello.card.move_to_list_from_open_card", "verifyMovedList"],
    ["trello.card.delete", "verifyCardGone"],
    ["trello.list.archive", "verifyListGone"],
  ]);
  for (const [toolName, stepId] of expectedStops) {
    const step = tools.get(toolName)?.workflow?.steps?.find((candidate) => candidate.id === stepId);
    assert.ok(step, `${toolName} is missing ${stepId}`);
    assert.equal(step.on_error ?? "stop", "stop", `${toolName}.${stepId} must fail closed`);
  }

  const listCreate = tools.get("trello.board.list.create");
  const submitList = listCreate.workflow.steps.find((step) => step.id === "submitList");
  assert.equal(submitList.settle_after?.state, "visible");
  assert.match(JSON.stringify(submitList.settle_after), /input\.name/);

  const composer = tools.get("trello.board.add_card.open_composer");
  const openComposer = composer.workflow.steps.find((step) => step.id === "clickMatchingAddCard");
  assert.equal(openComposer.settle_after?.state, "visible");
  assert.match(openComposer.settle_after?.locator?.selector ?? "", /list-card-composer-textarea/);

  for (const toolName of ["trello.card.date_popover.clear", "trello.card.due_date.clear"]) {
    const clear = tools.get(toolName);
    const remove = clear.workflow.steps.find((step) => step.id === "clickRemove");
    assert.equal(remove.settle_after?.state, "hidden");
    assert.match(remove.settle_after?.locator?.selector ?? "", /due-date-badge/);
  }
});
