---
title: Trello comment verification must tolerate bare-domain smart links
date: 2026-07-20
category: integration-issues
module: Trello actions map
problem_type: integration_issue
component: tooling
symptoms:
  - "A committed Trello comment returned workflow_retry_exhausted and mutation_outcome_indeterminate"
  - "The visible comment replaced a submitted bare domain with a titled smart link"
root_cause: logic_error
resolution_type: code_fix
severity: high
tags:
  - "trello"
  - "actions-json"
  - "smart-links"
  - "mutation-verification"
---

# Trello comment verification must tolerate bare-domain smart links

## Problem

`trello.card.comment.add` could commit a comment exactly once and still report
an indeterminate mutation. Trello turns a bare domain such as `hey-code.ai` into
a titled smart link, so the rendered comment no longer contains the submitted
domain text.

## Symptoms

- The mutation reached `verifyPostedComments`, exhausted its retries, and
  returned `mutation_outcome_indeterminate` even though the comment existed.
- An independent card read showed the surrounding prose unchanged but the bare
  domain replaced by Trello's link title.

## What Didn't Work

- Retrying the mutation was unsafe because the comment had already committed and
  could have been duplicated.
- Splitting the expected identity only around `http://` and `https://` links did
  not account for Trello's automatic conversion of bare domains.

## Solution

The verifier in `sites/trello.com/board/actions.json` now treats both scheme URLs
and bare domains as replaceable link tokens. It still requires every non-link
prose segment to appear in the rendered posted-comment container.

The regression in
`tests/trello-comment-smart-link-verification.test.mjs` covers a submitted bare
domain whose rendered text becomes an unrelated smart-link title. The existing
negative assertion still proves that changed surrounding prose is rejected.

## Why This Works

The domain is presentation-unstable, while the surrounding prose is the stable
semantic identity. Removing only recognized link tokens lets Trello control link
presentation without weakening verification of the caller's actual prose. A
comment containing only a link still fails closed because it has no stable prose
segment.

The fix was live-validated through the stored action: the call returned
`verified: true`, and an independent card read found the unique rendered comment
once. The durable change was merged in
[actions.json.storage.public PR 61](https://github.com/yaniv256/actions.json.storage.public/pull/61)
and pinned by
[actions.json.storage.full PR 31](https://github.com/yaniv256/actions.json.storage.full/pull/31).

## Prevention

- Test mutation verifiers against the application's rendered representation,
  including automatic link expansion, rather than only the submitted source.
- Separate presentation-unstable tokens from stable prose, but fail closed when
  no stable identity remains.
- After a verifier failure, independently read state before retrying any mutation.

## Related Issues

- `trello.card.description.set` has the same documented smart-link boundary for
  URL-bearing descriptions and verifies links separately by `href`.
