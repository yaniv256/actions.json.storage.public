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
const steps = action.workflow?.steps ?? [];
const verify = steps.find((step) => step.id === "verifyPostedComments");
const scroll = steps.find((step) => step.id === "scrollToPostedActivity");

assert.ok(scroll, "comment verification must make offscreen activity reachable");
assert.equal(scroll.primitive, "viewport.scroll");
assert.ok(scroll.args.delta_y >= 4000, "activity scroll must reach long-card comments");
assert.equal(scroll.args.scope.selector, "main");
assert.match(scroll.args.scope.text_contains, /Comments and activity/i);
assert.ok(
  steps.indexOf(scroll) < steps.indexOf(verify),
  "activity scroll must precede the visible-only comment locator",
);

assert.ok(verify, "missing posted-comment retry gate");
const retry = verify.retry_until ?? "";
assert.match(retry, /\$canonical := function/);
assert.match(retry, /\$segments :=/);
assert.match(retry, /\[-\*\+\]/, "canonicalizer must ignore rendered list markers");
assert.match(retry, /\$replace\(.*'',/s, "canonicalizer must remove whitespace");
assert.doesNotMatch(
  retry,
  /\$contains\([^;]+\$trim\(\$replace\(input\.text/,
  "terminal retry must not use the raw full-text verifier",
);

assert.match(output, /verification_expected_prose/);
assert.match(output, /verification_ignores_urls/);
assert.match(output, /verification_segments/);
assert.match(output, /\$split\(input\.text/);
assert.match(
  output,
  /'verified': true/,
  "reaching output must mean the terminal retry identity already passed",
);
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

const whitespace = /[\s\u200B\u200C\u200D\uFEFF\u00A0]+/g;
const links = /https?:\/\/[^\s]+/g;
const canonical = (value) =>
  value.replace(/^\s*[-*+]\s+/gm, "").replace(whitespace, "");
const verifies = (input, posted) => {
  const prose = input
    .split(links)
    .filter((part) => canonical(part).length > 0);
  const rendered = canonical(posted);
  return prose.length > 0 && prose.every((part) => rendered.includes(canonical(part)));
};

const submitted = `Completed the feasibility study.

Published evidence:
- Private report: https://github.com/example/report/pull/22
- Report: research/study.md
- Architecture guidance: https://github.com/example/architecture/pull/19

Verdict: compatible at the audio boundary.`;
const rendered =
  "Completed the feasibility study.Published evidence:" +
  "Private report: Report: research/study.mdArchitecture guidance: " +
  "Verdict: compatible at the audio boundary.";

assert.equal(
  verifies(submitted, rendered),
  true,
  "verification must survive smart-link URL replacement, joined paragraphs, and rendered bullets",
);
assert.equal(
  verifies(submitted.replace("compatible", "incompatible"), rendered),
  false,
  "rendering tolerance must not accept changed prose",
);
assert.equal(
  verifies("https://github.com/example/report/pull/22", rendered),
  false,
  "URL-only comments have no safe prose identity and must fail closed",
);

console.log("Trello comment verification is smart-link aware.");
