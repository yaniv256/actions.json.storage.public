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

const output = action.workflow?.output ?? "";
assert.match(output, /verification_expected_prose/);
assert.match(output, /verification_ignores_urls/);
assert.match(output, /https\?:/);
assert.match(output, /\[\^\\s\]\+/);
assert.match(
  output,
  /data-testid=comment-container/,
  "comment verification must read posted comment containers, not the draft editor",
);
assert.match(
  action.description,
  /smart cards.*URL-free prose/i,
  "the smart-link verification boundary must be documented",
);

console.log("Trello comment verification is smart-link aware.");
