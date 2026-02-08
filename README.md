EMAIL RETENTION & ARCHIVAL POLICY
================================

Version: 2026-02-02 (Final)
Scope:   Gmail (authoritative inbox) + Private Server (long-term archive)


1. DEFINITIONS (AUTHORITATIVE)
-----------------------------

1.1 Gmail “Archive” (Google Definition)

In Gmail, the term "Archive" means:

- Message is removed from the Inbox only
- Message remains in All Mail
- Gmail storage usage is unchanged
- No retention, lifecycle, or preservation meaning
- Archive is a UI convenience only


1.2 Server Archive (System Definition)

Server Archive means:

- Message content is copied from Gmail to a private server
- Stored on ZFS-backed storage
- Indexed and searchable independently of Google
- Considered the long-term canonical copy

Server Archive is a controlled lifecycle transition.
It is NOT a Gmail UI action.


1.3 Retention Labels (Canonical Control Mechanism)

A Retention Label is a Gmail label that defines the minimum required
lifespan of a message.

Authoritative rules:

- Retention is governed solely by Retention/* labels
- The highest-level retention label governs
- Sub-labels inherit parent retention unless explicitly overridden

Retention labels:

- Do NOT move mail
- Do NOT imply server storage
- Define preservation duration only

Category labels (for example: Insurance, Exit Strategy) do NOT control
retention. They map to retention rules via policy tables.


1.4 Canonical Retention Labels

Retention/1-week     Preserve at least 7 days
Retention/1-month    Preserve at least 30 days
Retention/6-month    Preserve at least 180 days
Retention/1-year     Preserve at least 365 days
Retention/7-year     Preserve at least 7 years
Retention/Forever    Preserve indefinitely


1.5 Server Archive Workflow Labels (Machine-Managed)

These labels represent automation state, not human intent.

Server Archive/QUEUE   Eligible and approved for server archive
Server Archive/DONE    Successfully archived on server

Rules:

- Applied by automation only
- Monotonic progression: QUEUE → DONE
- Manual use permitted only for recovery


2. GLOBAL SAFETY RULES (FAIL-CLOSED)
-----------------------------------

A message is NEVER server-archived if ANY of the following apply:

- Message is Starred
- Message has NO Retention/* label

Notes:

- Missing retention label implies manual review is required
- No explicit REVIEW label exists
- Server archival is opt-in by retention label
- Only explicitly labeled messages are ever eligible


3. SERVER ARCHIVE ELIGIBILITY GATE
---------------------------------

A message becomes eligible for server archive ONLY when ALL conditions
are met:

- Message age is greater than or equal to ARCHIVE_AFTER_DAYS
  (Default: 180 days / 6 months)

- Message has one of the following retention labels:
    Retention/6-month
    Retention/1-year
    Retention/7-year
    Retention/Forever

- Message is NOT Starred
- Message is NOT already labeled Server Archive/DONE

When eligible:

- Automation applies Server Archive/QUEUE


4. RETENTION-DRIVEN DELETION RULES
---------------------------------

Deletion is independent of server archival.

- Server archival eligibility does NOT override Gmail deletion timelines
- Retention labels govern Gmail deletion eligibility only


4.1 Canonical Label-to-Retention Mapping (Authoritative)

Source of Truth:
- RETENTION_RULES in the Apps Script

Principles:

- Retention is determined solely by Gmail label assignment
- Sub-labels do NOT rely on Gmail inheritance
- Each sub-label is explicitly mapped in the script
- Overrides are intentional and explicit

Starred and review handling are governed elsewhere and are out of scope
for this section.


5. RETENTION SEMANTICS (NORMATIVE)
---------------------------------

Retention:
- Minimum required lifespan expressed by a Retention/* label

Gmail Deletion:
- Script-driven eligibility to remove mail from Gmail after retention
  expires

Server Archive:
- Indicates whether mail may be copied to the private server archive

Forever:
- No automated Gmail deletion

Time-bounded:
- Eligible for Gmail deletion after duration expires

Important notes:

- Retention labels do NOT move mail
- Retention labels do NOT imply server archiving by themselves
- Starred and review behavior is handled separately


6. GMAIL SYSTEM CATEGORIES (CLIENT-SIDE ONLY)
---------------------------------------------

Gmail system categories are used only for lightweight, client-side
cleanup.

They NEVER imply importance, retention intent, or server archival.

Retention labels always override category behavior.

Category behavior summary:

Social:
- Retention: 1 week
- Action: Delete after 7 days
- Server Archive: Never

Forums:
- Retention: 1 month
- Action: Delete after 30 days
- Server Archive: Never

Promotions:
- Retention: 6 months
- Action: Delete after 180 days unless upgraded
- Server Archive: Never

Updates:
- Retention: 3 months
- Action: Delete after 90 days unless retention-labeled
- Server Archive: Only if labeled

Primary:
- Retention: None
- Action: No automatic deletion
- Server Archive: Only if labeled

Clarifications:

- Inbox is a UI state, not a category
- Category deletion applies only when no Retention/* label is present
- Any Retention/* label suppresses category-based deletion


7. SENT MAIL HANDLING
--------------------

Sent mail follows the same rules as received mail.

- Retention/* label required
- Eligible for server archive after eligibility gate unless Starred
- Gmail deletion governed by retention window
- Missing retention label blocks archival
- Starred sent mail is never server-archived


8. INBOUND GARBAGE HANDLING
--------------------------

Principle:

Garbage should:
- Never reach Inbox
- Never receive a retention label
- Never be server-archived
- Consume minimal Gmail storage

Method:

Gmail filters:
- Skip Inbox
- Never mark important
- Delete immediately or quarantine briefly

Garbage handling occurs BEFORE retention logic.


9. REVIEW PROCESS (IMPLICIT, LABEL-FREE)
---------------------------------------

Because missing retention labels block archival, review is implicit.

Weekly review query:

-in:trash -is:starred
-(label:"Retention/1-week"
 OR label:"Retention/1-month"
 OR label:"Retention/6-month"
 OR label:"Retention/1-year"
 OR label:"Retention/7-year"
 OR label:"Retention/Forever")

Messages matching this query:

- Require manual retention classification
- Will never be server-archived until labeled


10. SERVER INGEST RULES (FUTURE PHASE)
-------------------------------------

Server ingests ONLY messages labeled:

- Server Archive/QUEUE

After successful ingest:
- Server records archive
- Gmail automation applies Server Archive/DONE

Optional future policy:
- Gmail copy may be deleted after verification


11. EXPLICIT NON-GOALS
---------------------

This system does NOT:

- Replace Gmail
- Act as an SMTP server
- Guess importance
- Use category labels for control
- Archive by sender, keyword, or category alone


12. AUTHORITATIVE SUMMARY
------------------------

Only explicitly retention-labeled, sufficiently old, non-starred mail
is ever archived to the server.

Everything else remains in Gmail or is deleted per retention policy.
