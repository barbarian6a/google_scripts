/**
 * Chunked Gmail cleanup with resumable cursors.
 * - Promotions older than 30d -> Trash
 * - Social older than 7d -> Trash
 * - Updates from KUIU/Insurify/Etsy older than 30d -> Trash
 * - Empty Trash permanently
 *
 * One-time: add Advanced Service "Gmail API" (left sidebar → Services).
 * Set TRIGGER to run hourly until backlog clears, then switch to daily.
 */
function purgeGmailAgingMail() {
  const DRY_RUN = false;                 // set true to test safely
  const MAX_RUNTIME_MS = 5 * 60 * 1000;  // stop before Apps Script 6-min cap
  const START = Date.now();

  // Per-run limits (tune if you still hit the cap)
  const LIMIT_THREADS_PER_QUERY = 300;   // max threads trashed per query per run
  const LIMIT_EMPTY_TRASH_MSGS   = 2000; // max messages permanently deleted per run

  const senderDomains = ['kuiu.com', 'insurify.com', 'etsy.com'];

  // Queries
  const QUERIES = [
    { key: 'promotions30', q: 'category:promotions older_than:30d -in:trash' },
    { key: 'social7',      q: 'category:social older_than:7d -in:trash' },
    {
      key: 'updatesTargets30',
      q: `( ${senderDomains.map(d=>`from:*@${d}`).join(' OR ')} ) category:updates older_than:30d -in:trash`
    },
  ];

  // 1) Trash by queries (resumable)
  for (const { key, q } of QUERIES) {
    if (!timeLeft()) break;
    trashThreadsByQueryResumable(key, q, LIMIT_THREADS_PER_QUERY);
  }

  // 2) Empty Trash in chunks (resumable)
  if (timeLeft()) {
    emptyTrashResumable(LIMIT_EMPTY_TRASH_MSGS);
  }

  // ===== helpers =====
  function timeLeft() {
    return (Date.now() - START) < MAX_RUNTIME_MS;
  }

  function props() { return PropertiesService.getScriptProperties(); }

  /**
   * List threads by query (using Gmail API), resume via pageToken,
   * trash up to 'limit' threads per run.
   */
  function trashThreadsByQueryResumable(cursorKey, query, limit) {
    const p = props();
    let token = p.getProperty(`cursor.${cursorKey}`) || null;
    let processed = 0;

    while (timeLeft() && processed < limit) {
      const resp = Gmail.Users.Threads.list('me', {
        q: query,
        maxResults: 100,
        pageToken: token || undefined
      });

      const threads = resp.threads || [];
      if (threads.length === 0) {
        // Done with this query; clear cursor and exit.
        p.deleteProperty(`cursor.${cursorKey}`);
        log(`[${cursorKey}] done (no more results).`);
        return;
      }

      for (const th of threads) {
        if (!timeLeft() || processed >= limit) break;
        if (!DRY_RUN) {
          // Move entire thread to Trash
          Gmail.Users.Threads.trash('me', th.id);
        }
        processed++;
      }

      // Advance page if we fully consumed this page and still have time/limit
      if (processed < limit && timeLeft() && resp.nextPageToken) {
        token = resp.nextPageToken;
      } else {
        // Save progress and exit this run
        if (resp.nextPageToken) {
          p.setProperty(`cursor.${cursorKey}`, resp.nextPageToken);
        } else {
          p.deleteProperty(`cursor.${cursorKey}`);
        }
        log(`[${cursorKey}] moved ${processed} thread(s) to Trash this run.`);
        return;
      }
    }
  }

  /**
   * Permanently delete messages in Trash in batches, resuming via pageToken.
   */
  function emptyTrashResumable(limitMsgs) {
    const p = props();
    let token = p.getProperty('cursor.emptyTrash') || null;
    let deleted = 0;

    while (timeLeft() && deleted < limitMsgs) {
      const list = Gmail.Users.Messages.list('me', {
        q: 'in:trash',
        maxResults: 500,
        pageToken: token || undefined
      });
      const ids = (list.messages || []).map(m => m.id);
      if (ids.length === 0) {
        p.deleteProperty('cursor.emptyTrash');
        log(`[emptyTrash] done (trash empty).`);
        return;
      }

      // batch delete chunked to respect API payloads
      for (let i = 0; i < ids.length && timeLeft() && deleted < limitMsgs; i += 1000) {
        const chunk = ids.slice(i, i + 1000);
        if (!DRY_RUN && chunk.length) {
          Gmail.Users.Messages.batchDelete({ ids: chunk }, 'me');
        }
        deleted += chunk.length;
      }

      if (list.nextPageToken && timeLeft() && deleted < limitMsgs) {
        token = list.nextPageToken;
      } else {
        if (list.nextPageToken) {
          p.setProperty('cursor.emptyTrash', list.nextPageToken);
        } else {
          p.deleteProperty('cursor.emptyTrash');
        }
        log(`[emptyTrash] permanently deleted ${deleted} message(s) this run.`);
        return;
      }
    }
  }

  function log(msg) { console.log(msg); }
}
