import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mapUrl = new URL(
  "../sites/linkedin.com/messaging/actions.json",
  import.meta.url,
);
const map = JSON.parse(await readFile(mapUrl, "utf8"));

assert.equal(
  map.scope?.url_matches,
  "https://www.linkedin.com/messaging*",
  "LinkedIn Messaging must declare a path-level scope so its tools do not leak onto the feed",
);

assert.ok(
  map.tools.every((tool) => tool.name.startsWith("linkedin.messaging.")),
  "the path-scoped map must contain only LinkedIn Messaging actions",
);

console.log("LinkedIn Messaging map is scoped to the messaging surface.");
