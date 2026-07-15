# GPT-Realtime-2 pricing monitor

This example shows the minimum reusable contract for monitoring a public pricing
page with actions.json:

1. Bind the map to one explicit source URL and route.
2. Expose a compact, named state projection instead of a raw page dump.
3. Preserve `card_count` and `complete`; incomplete extraction is a failed read,
   not a price change.
4. Wrap every successful projection in a dated observation outside the public
   map.
5. Compare only the declared JSON Pointer fields.
6. Keep the map read-only. A monitoring map does not earn mutation authority.

The first reviewed baseline was captured on 2026-07-15. It contained eight
price cards: text input/cached/output, audio input/cached/output, and image
input/cached input. Raw observations and authoring failures remain in the
private scope; this directory contains only the reviewed map and reusable
method.

Run `openai.model.pricing.map`, then read the `openai.model.pricing` state
projection. Store the returned state with an `observed_at` timestamp and source
URL before comparing it with the prior successful observation.
