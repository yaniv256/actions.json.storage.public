import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const map = JSON.parse(
  fs.readFileSync(new URL("../sites/trello.com/board/actions.json", import.meta.url), "utf8"),
);

const tool = (name) => map.tools.find((candidate) => candidate.name === name);

test("Trello remote upload binds one local file to the bridge with exact origin and retry id", () => {
  const upload = tool("trello.card.attachment.upload_remote");
  assert.ok(upload);
  assert.equal(upload.x_actions.handler, "file.upload");
  assert.deepEqual(upload.input_schema.required, ["local_path", "file_input", "transfer_id"]);
  assert.equal(upload.x_actions.binding.arguments.origin, "https://trello.com");
  assert.equal(upload.x_actions.binding.arguments.local_path, "{% input.local_path %}");
  assert.equal(upload.x_actions.binding.arguments.file_input, "{% input.file_input %}");
  assert.equal(upload.x_actions.binding.arguments.transfer_id, "{% input.transfer_id %}");
});

test("Trello remote download is same-origin and requires a retry-safe transfer id", () => {
  const download = tool("trello.card.attachment.download_remote");
  assert.ok(download);
  assert.equal(download.x_actions.handler, "file.download");
  assert.deepEqual(download.input_schema.required, ["url", "transfer_id"]);
  assert.equal(download.x_actions.binding.arguments.origin, "https://trello.com");
  assert.equal(download.x_actions.binding.arguments.url, "{% input.url %}");
  assert.equal(download.x_actions.binding.arguments.transfer_id, "{% input.transfer_id %}");
});
