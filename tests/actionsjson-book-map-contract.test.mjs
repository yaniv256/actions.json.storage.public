import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mapUrl = new URL(
  "../sites/actionsjson.com/book/actions.json",
  import.meta.url,
);
const map = JSON.parse(await readFile(mapUrl, "utf8"));
const tools = new Map((map.tools ?? []).map((tool) => [tool.name, tool]));
const projections = new Map(
  (map.state_projections ?? []).map((projection) => [projection.name, projection]),
);

assert.equal(map.scope?.url_matches, "https://actionsjson.com/book/*");
assert.deepEqual(
  new Set(projections.keys()),
  new Set(["book.page", "book.tutor", "book.workbook"]),
);

for (const name of [
  "book.chapter.open",
  "book.section.open",
  "book.adjacent.open",
  "book.feedback.open",
  "book.glossary.open",
  "book.workbook.open",
  "book.workbook.artifact.open",
  "book.tutor.session.start",
  "book.tutor.session.pause",
  "book.tutor.session.resume",
  "book.tutor.session.end",
  "book.tutor.microphone.mute",
  "book.tutor.microphone.unmute",
  "book.tutor.speaker.mute",
  "book.tutor.speaker.unmute",
  "book.tutor.transcript.open",
  "book.tutor.transcript.close",
]) {
  const tool = tools.get(name);
  assert.ok(tool, `missing ${name}`);
  assert.equal(tool.workflow.steps[0].primitive, "overlay.menu.hide", name);
  const readiness = tool.workflow.steps.find(
    (step) => step.primitive === "locator.element_info",
  );
  assert.ok(readiness, `${name} must resolve a control before clicking`);
  assert.match(
    readiness.args.locator.selector,
    /data-testid|aria-label/,
    `${name} must use a stable site identity`,
  );
}

const allPostconditions = new Set(
  [...projections.values()].flatMap((projection) =>
    Object.keys(projection.postconditions ?? {}),
  ),
);
for (const [name, tool] of tools) {
  if (tool.workflow?.steps?.some((step) => step.primitive === "pointer.click")) {
    assert.ok(allPostconditions.has(name), `${name} needs an independent postcondition`);
  }
}

const serialized = JSON.stringify(map).toLowerCase();
for (const forbidden of ["tweet.create", "reply.create", "follow.create", "like.create"]) {
  assert.ok(!serialized.includes(forbidden), `book map must not expose ${forbidden}`);
}

console.log("actionsjson.com book map contract passed.");
