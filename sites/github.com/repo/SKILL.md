# Action Authoring Skill — preserve what worked

Read this when the user asks you to preserve, save, or write down a working
primitive sequence as a reusable action, or to author a new actions.json map
entry. This is how exploration becomes permanent capability: you did something
by hand once; now you write it down so no agent ever has to rediscover it.

## The loop

1. **You just did something with primitives** (on this tab or another) and
   verified it worked.
2. **Formulate it** as one actions.json tool entry (JSON, format below).
3. **Preserve it** as a NEW draft file in the storage repo through this GitHub
   tab (procedure below). Drafts are inert — a bad draft cannot break anything —
   so drafts commit directly to main. Promotion into a live site map happens
   later, after review.
4. **Report** the committed file path and a one-line summary of what the action
   does.

## Formulating the entry

Write a single JSON object:

```json
{
  "name": "site.surface.operation",
  "description": "What it does + every gotcha you hit + how to verify. Future agents only know what you write here.",
  "input_schema": {
    "type": "object",
    "required": ["the_args_that_varied"],
    "properties": { "the_args_that_varied": { "type": "string", "description": "..." } },
    "additionalProperties": false
  },
  "workflow": {
    "version": 1,
    "expression_language": "jsonata",
    "steps": [ "...see below: each step is a STRUCTURED OBJECT the runtime executes, never a sentence..." ],
    "output": "{% {'verified': <a JSONata expression that READS a verify step's result, never a literal true>, 'next_step': '...'} %}"
  }
}
```

**Steps are executable objects, not prose.** The runtime runs each step by
calling the named primitive with the given args — it cannot run an English
sentence. A step describing what to do ("Locate the comment and click its
Delete") is a comment, not an action; it will never execute. Each step is an
object: an `id`, a `primitive` (e.g. `locator.element_info`, `pointer.click`,
`keyboard.press`, `text.insert`), an `args` object, and optionally a
`settle_after`. Values that come from input or from an earlier step's output are
whole-string JSONata slots `{% ... %}`.

Here is the SAME comment-delete flow you performed, written as runnable steps —
study the shape:

```json
"steps": [
  {
    "id": "findCommentDelete",
    "primitive": "locator.element_info",
    "args": {
      "locator": {
        "selector": "[data-testid='comment-container'] button, [role='listitem'] a",
        "text_equals": "Delete"
      }
    }
  },
  {
    "id": "clickDelete",
    "primitive": "pointer.click",
    "args": {
      "x": "{% steps.findCommentDelete.output.clickable_center.x %}",
      "y": "{% steps.findCommentDelete.output.clickable_center.y %}"
    },
    "settle_after": { "locator": { "selector": "button", "text_equals": "Delete comment" }, "state": "visible", "timeout_ms": 4000 }
  },
  {
    "id": "findConfirm",
    "primitive": "locator.element_info",
    "args": { "locator": { "selector": "button", "text_equals": "Delete comment" } }
  },
  {
    "id": "confirmDelete",
    "primitive": "pointer.click",
    "args": {
      "x": "{% steps.findConfirm.output.clickable_center.x %}",
      "y": "{% steps.findConfirm.output.clickable_center.y %}"
    },
    "settle_after": { "delay_ms": 600 }
  },
  {
    "id": "verifyGone",
    "primitive": "locator.text_content",
    "args": { "locator": { "selector": "[data-testid='card-back-comments'], .window" } }
  }
],
"output": "{% {'verified': $not($contains(steps.verifyGone.output.text ? steps.verifyGone.output.text : '', input.comment_text)), 'next_step': 'If verified is false the comment is still present; do not report success.'} %}"
```

Note the two things a runnable action has that a sketch does not: every step
NAMES a primitive and passes concrete args (with `{% %}` slots to carry
geometry forward from `clickable_center`), and `verified` is COMPUTED from what
the verify step actually read — here, "the comment text is NOT contained in the
comments area" — never a hardcoded `true`. A hardcoded `verified: true` is a
lie the moment the flow fails; the whole point of the flag is that it can be
false.

Authoring rules — these are paid-for lessons, not style preferences:

- **Locator identity, not geometry.** Resolve controls by their own stable
  identity: `data-testid` or an `aria-label` that NAMES the object. Exact
  `text_equals` beats `text_contains`; bare text near a location is a defect.
  Watch for ellipsis in visible labels ("Commit changes..." ≠ "Commit changes").
- **Click `clickable_center`,** never `bounding_box` x/y.
- **Never `text.insert` `mode=replace` without an explicit `target` locator.**
  If focus is elsewhere, replace mode wipes the focused document. This exact
  mistake destroyed a README.
- **Every workflow ends with a verify step,** and the output's `verified` flag
  must come from it. Verify the intended effect AND that nothing else changed —
  presence-only checks pass through catastrophes. For commits, read the diff
  description; a one-line fix shows one deletion.
- **`{% %}` slots must be whole-string JSONata expressions** — partial embedded
  expressions are unsupported. Build concatenations inside the expression:
  `{% 'More actions on ' & input.list_name %}`.
- **Record what you learned in `description`:** the gotchas ARE the value.

## Preserving the draft through this GitHub tab

Target repo: your storage repo (`<owner>/actions.json.storage.<scope>`). Draft path convention:

```
drafts/<site-domain>/<action-name>.json
```

A DRAFT ALWAYS GOES ON A BRANCH AS A PULL REQUEST — never committed to main,
not even into the drafts folder. A PR is how the entry gets reviewed before it
touches shared memory: a wrong draft is then a red diff a human can reject, not
a mutation of the repository everyone runs. This is non-negotiable.

Procedure — USE THE SITE ACTION, do not hand-drive the editor:

1. FIRST call the `browser.navigate` tool DIRECTLY (standalone, not inside an
   action — navigate cannot be a workflow step) to
   `https://github.com/<owner>/<repo>/new/main?filename=drafts/<site>/<action-name>.json`
   so the empty new-file editor is open.
2. Then call the `github.repo.file.create_pr` site action with `file_content` =
   your ENTIRE JSON (exactly one top-level object), `branch_name` =
   `draft-<site>-<action-name>` (no spaces), and `pr_title` =
   `draft: <action-name>`. It inserts the content into the blank editor (no
   append hazard), selects "Create a new branch and start a pull request", names
   the branch, and opens the PR.
2. Read the returned output: `opened_pr` must be true and `pr_url` must contain
   `/pull/`. If not, the flow stalled — screenshot the dialog and report; do not
   claim a PR exists.
3. Report the `pr_url` to the user for review. Do NOT merge it yourself, and do
   NOT commit drafts directly to main with `github.repo.file.create` (that action
   exists for non-draft one-off writes only). Do NOT edit existing map files
   (`sites/**/actions.json`) — those change only through review.

To REVISE a draft that is still an open PR, push another file version to the
SAME branch (create_pr again with the same branch_name updates it), or ask the
reviewer. Never open a second competing PR for the same draft.

## Revising a draft you already committed — REPLACE, never append

A `.json` file must contain EXACTLY ONE top-level object. If a parser meets a
second `{` after the first object closes, it fails with "Extra data". This is
the most common way a revision breaks: you open the file to fix it and your new
version lands BELOW the old one, so the file ends up with two (then three, then
four) concatenated objects — each "fix" that appends makes it worse.

Selecting-all-and-replacing inside the CodeMirror blob editor is UNRELIABLE from
primitives — the select-all often does not take, and `text.insert` then appends.
So do NOT try to edit the existing content in place. Instead, replace the file
wholesale using the two site actions:

1. Call `github.repo.file.delete` with the `file_path` and a message like
   `remove stale draft <name>`. This deletes the old file cleanly.
2. Call `github.repo.file.create` with the same `file_path`, the corrected full
   content (one top-level object), and a message like `draft: <name> (revised)`.

Never edit-in-place, and never append a corrected copy beside a wrong copy —
that is the bug, not the fix. If either action fails, stop and report the object
count of the current file rather than hand-driving the editor with raw
primitives.

## Scope guard

Stay inside your storage repo (`<owner>/actions.json.storage.<scope>`). Never write to any other
repository, never touch existing files under `sites/`, never modify repo
settings. If the filename you want already exists, pick a suffixed name
(`<action-name>-2.json`) rather than overwriting.
