import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const map = JSON.parse(
  await readFile(
    new URL("../sites/trello.com/board/actions.json", import.meta.url),
    "utf8",
  ),
);

const action = map.tools.find(
  (candidate) => candidate.name === "trello.card.comment.add",
);
assert.ok(action, "missing trello.card.comment.add");

const steps = action.workflow.steps;
const clearIndex = steps.findIndex((step) => step.id === "clearCommentDraft");
const insertIndex = steps.findIndex((step) => step.id === "insertComment");
assert.ok(clearIndex >= 0, "comment add must clear inherited editor text");
assert.ok(clearIndex < insertIndex, "draft clearing must precede insertion");

const clear = steps[clearIndex];
assert.equal(clear.primitive, "keyboard.press");
assert.equal(clear.args.key, "Control+a");

const insert = steps[insertIndex];
assert.equal(insert.primitive, "text.insert");
assert.equal(insert.args.mode, "replace");
assert.match(insert.args.target.selector, /contenteditable/);
assert.doesNotMatch(
  JSON.stringify(insert),
  /clipboard\.paste/,
  "comment insertion must not append to a persisted draft",
);

const saveClicks = steps.filter(
  (step) => step.primitive === "pointer.click" && /save/i.test(step.id ?? ""),
);
assert.equal(
  saveClicks.length,
  1,
  "comment add must issue exactly one commit click; a delayed editor dismissal must not duplicate the comment",
);
assert.equal(saveClicks[0].id, "clickSave");

const verify = steps.find((step) => step.id === "verifyPostedComments");
assert.ok(verify, "comment add must verify posted activity comments");
assert.equal(verify.primitive, "locator.text_content");
assert.match(
  verify.retry_until ?? "",
  /input\.text/,
  "posted-comment verification must wait for the requested body to appear",
);
assert.ok(verify.max_attempts >= 2, "posted-comment verification must retry after Save");

assert.match(action.description, /replace|inherited|persisted/i);

console.log("Trello comment add isolates inherited persisted drafts.");
