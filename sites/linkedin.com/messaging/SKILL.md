---
name: linkedin-messaging-outreach-operator
description: Use with the LinkedIn Messaging actions.json map when surveying warm outreach conversations and preparing Trello/Linear follow-up work.
---

# LinkedIn Messaging Outreach Operator

Use this skill only after the user has authorized the active LinkedIn Messaging
tab. Message content is private account data.

## Operating Rule

Survey first. Sync second. Never send by default.

The map is for reading, summarizing, and preparing follow-up payloads. It is not
a message-sending bot. If the user asks to contact someone, draft the text for
human review unless a separate confirmed send workflow has been explicitly
approved.

## Standard Flow

1. Call `linkedin.messaging.conversations.visible.read`.
2. Deduplicate repeated conversation-card wrappers by contact name and latest
   snippet.
3. For a target contact, call `linkedin.messaging.conversation.by_name.open`.
4. Call `linkedin.messaging.thread.header.read`.
5. Call `linkedin.messaging.thread.active.read`.
6. Summarize the thread using `linkedin.messaging.outreach.summary_context`.
7. Call `linkedin.messaging.transfer.followups.prepare` with reviewed,
   bounded summary records.

## Summary Judgment

For each conversation, extract:

- person
- profile URL when visible
- relationship context
- last contact date
- open ask
- promised follow-up
- preferred channel
- next action
- deadline or timing
- priority
- whether the next step belongs in Linear, Trello, both, or neither

Use the user's existing facts when available. If the thread says to move to
email, text, WhatsApp, or another channel, make that the preferred channel.

## Privacy

Do not store raw full thread transcripts in shared or public storage.

For transfer payloads, keep `evidence_excerpt_private` short. It may contain a
small private reminder such as "asked to switch to email" or "available after
July 4", but not a full conversation.

Do not include secrets, cookies, LinkedIn internal IDs, or bulk scraped message
history in task descriptions.

## Transfer Payloads

Use label `linkedin-warm-outreach`.

Good record:

```json
{
  "person": "Example Person",
  "linkedin_profile_url": "https://www.linkedin.com/in/example/",
  "relationship_context": "Warm prospect who asked to see a demo.",
  "last_contact_date": "2026-06-17",
  "open_ask": "Send demo materials.",
  "preferred_channel": "LinkedIn",
  "next_action": "Send concise demo follow-up and ask for a meeting time.",
  "deadline_or_timing": "This week",
  "priority": "high",
  "target": "linear",
  "evidence_excerpt_private": "Asked for demo follow-up."
}
```

The receiving Trello or Linear action should perform the mutation in its own
authorized tab. LinkedIn should only produce the transfer payload.

## Recovery

If `conversation.by_name.open` cannot find a person:

1. Call `linkedin.messaging.conversations.visible.read`.
2. Check whether the person is visible under a different spelling.
3. Scroll the conversation list and retry.
4. If still missing, report that the conversation is not visible in the loaded
   list rather than guessing.

If thread extraction returns duplicates, summarize by meaning, not by row count.
LinkedIn often exposes nested wrappers that repeat message text.
