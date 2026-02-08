/**
 * Auto-assign Retention labels based on existing labels.
 * - Skips any thread that already has a Retention/* label.
 * - Applies the first matching rule in RETENTION_RULES (order matters = precedence).
 *
 * How to use:
 * 1) Set RETENTION_LABEL_PREFIX to match your naming (default "Retention/").
 * 2) Fill in RETENTION_RULES with your label->retention mapping.
 * 3) Run applyRetentionLabels() manually first with DRY_RUN=true.
 * 4) Then set DRY_RUN=false and optionally create a time-based trigger.
 */

const DRY_RUN = false; // <-- set false after verifying logs
const MAX_THREADS_PER_RUN = 10; // keep conservative for Apps Script runtime
const RETENTION_LABEL_PREFIX = "Retention/";

const RETENTION_LABELS = [
  "Retention/Forever",
  "Retention/7-year",
  "Retention/1-year",
  "Retention/6-month",
  "Retention/3-month",
  "Retention/1-month",
  "Retention/1-week"
];

// Longest -> shortest (SINGULAR names)
  const RETENTION_PRECEDENCE = [
  "Retention/Forever",
  "Retention/7-year",
  "Retention/1-year",
  "Retention/6-month",
  "Retention/3-month",
  "Retention/1-month",
  "Retention/1-week"
];

/** USE THIS IN GMAIL SEARCH TO FIND EMAILS WITHOUT ANY LABELS:
Gmail search to find messages with no user-applied labels

Use this search:

has:nouserlabels

*/


/** USE THIS IN GMAIL SEARCH TO FIND EMAILS WITHOUT RETENTION LABELS:

Use this search:

in:anywhere
-(
label:"Retention/Forever"
OR label:"Retention/7-year"
OR label:"Retention/1-year"
OR label:"Retention/6-month"
OR label:"Retention/3-month"
OR label:"Retention/1-month"
OR label:"Retention/1-week"
)

*/


/**
 * Canonical Category-to-Retention Mapping (from your §4.1 table)
 * Notes:
 * - This list is written to work even if Gmail does NOT apply parent labels automatically.
 * - Where a sub-label is NOT explicitly overridden in §4.1, it inherits the parent retention (represented here by mapping the sub-label explicitly).
 * - Order matters only if a thread can have multiple source labels; keep this in “most specific first” order by convention.
 */
const RETENTION_RULES = [
  // ----- Alerts -----
  { sourceLabel: "Alerts", retentionLabel: "Retention/1-week" },
  { sourceLabel: "Alerts/Critical", retentionLabel: "Retention/1-week" },
  { sourceLabel: "Alerts/Critical/Amazon Web Services", retentionLabel: "Retention/1-week" },
  { sourceLabel: "Alerts/Critical/Basement Water Sensor", retentionLabel: "Retention/1-week" },
  { sourceLabel: "Alerts/Critical/Fileserver", retentionLabel: "Retention/1-week" },
  { sourceLabel: "Alerts/Critical/Stock", retentionLabel: "Retention/1-week" },
  { sourceLabel: "Alerts/Routine", retentionLabel: "Retention/1-week" },
  { sourceLabel: "Alerts/Routine/Sprinkler", retentionLabel: "Retention/1-week" },
  { sourceLabel: "Alerts/Security", retentionLabel: "Retention/1-week" },

  // ----- Army -----
  { sourceLabel: "Army", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Army/B_2-136 Barbarians", retentionLabel: "Retention/Forever" },

  // ----- Auto -----
  { sourceLabel: "Auto", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Auto/1969 Chevelle", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Auto/2006 F150 FX4", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Auto/2006 Malibu", retentionLabel: "Retention/Forever" },

  { sourceLabel: "Auto/Classifieds", retentionLabel: "Retention/1-month" },  // override

  // ----- Banking -----
  { sourceLabel: "Banking", retentionLabel: "Retention/1-year" },

  //  BILLS
  { sourceLabel: "Banking/Bills", retentionLabel: "Retention/1-year" },

  { sourceLabel: "Banking/Bills/4ChangeEnergy", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Bills/AutoHomeInsurance", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Bills/AWS", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Bills/BJJ", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Bills/CityOfFargo", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Bills/Google Play", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Bills/Midco", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Bills/Rent", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Bills/Storage", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Bills/TXUEnergy", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Bills/Verizon", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Bills/Visible", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Bills/XcelEnergy", retentionLabel: "Retention/1-year" },

  // CREDIT
  { sourceLabel: "Banking/Credit", retentionLabel: "Retention/1-year" },

  { sourceLabel: "Banking/Credit/AmazonPrime", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Credit/COSTCO.Citi", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Credit/CreditKarma", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Credit/Fidelity Visa", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Credit/Paypal", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Credit/Scheels FNBO", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Credit/Venmo", retentionLabel: "Retention/1-year" },

  // BANKS
  { sourceLabel: "Banking/DECU", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/DFAS", retentionLabel: "Retention/7-year" },

  // Banking/Investment subtree
  { sourceLabel: "Banking/Investment", retentionLabel: "Retention/Forever" },

  // FIDELITY
  { sourceLabel: "Banking/Investment/Fidelity", retentionLabel: "Retention/Forever" },

  { sourceLabel: "Banking/Investment/Fidelity/Account Summaries", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Banking/Investment/Fidelity/Position Summaries", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Banking/Investment/Fidelity/Trades", retentionLabel: "Retention/Forever" },

  { sourceLabel: "Banking/Investment/Market News", retentionLabel: "Retention/1-month" },
  { sourceLabel: "Banking/Investment/SSA", retentionLabel: "Retention/7-year" },
  { sourceLabel: "Banking/Investment/TSP", retentionLabel: "Retention/7-year" },

  // BANKS (CONT)
  { sourceLabel: "Banking/Navy Federal", retentionLabel: "Retention/1-year" },
  { sourceLabel: "Banking/Retirement", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Banking/Taxes", retentionLabel: "Retention/Forever" },


  // ----- Complaints -----
  { sourceLabel: "Complaints", retentionLabel: "Retention/Forever" },


  // ----- Exit Strategy -----
  { sourceLabel: "Exit Strategy", retentionLabel: "Retention/Forever" },

  { sourceLabel: "Exit Strategy/Panama", retentionLabel: "Retention/Forever"  },
  { sourceLabel: "Exit Strategy/Texas", retentionLabel: "Retention/Forever"  },

  { sourceLabel: "Exit Strategy/Texas/Kingwood", retentionLabel: "Retention/1-year" },      // override
  { sourceLabel: "Exit Strategy/Texas/Land", retentionLabel: "Retention/1-year" },      // override

  { sourceLabel: "Exit Strategy/Texas/Lufkin", retentionLabel: "Retention/1-year" },      // override
  { sourceLabel: "Exit Strategy/Texas/Lufkin/Apartment", retentionLabel: "Retention/1-year" },      // override

  { sourceLabel: "Exit Strategy/Texas/Tyler", retentionLabel: "Retention/1-year" },      // override
  { sourceLabel: "Exit Strategy/Texas/Tyler/Storage", retentionLabel: "Retention/1-year" },      // override


  // ----- Faith -----
  { sourceLabel: "Faith", retentionLabel: "Retention/Forever" },

  { sourceLabel: "Faith/BSF", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Faith/Church", retentionLabel: "Retention/Forever" },


  // ----- Family -----
  { sourceLabel: "Family", retentionLabel: "Retention/Forever" },

  { sourceLabel: "Family/Aaron", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Family/Aaron/AP", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Family/Aaron/College", retentionLabel: "Retention/Forever" },

  { sourceLabel: "Family/Anger", retentionLabel: "Retention/Forever" },

  { sourceLabel: "Family/Donna", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Family/Donna/Pinehurst", retentionLabel: "Retention/Forever" },


  // ----- Google Voice -----
  { sourceLabel: "Google_Voice", retentionLabel: "Retention/Forever" },


  // ----- Health -----
  { sourceLabel: "Health", retentionLabel: "Retention/Forever" },        // parent default

  { sourceLabel: "Health/Catch a Lift", retentionLabel: "Retention/Forever" },        // parent default
  { sourceLabel: "Health/Massage", retentionLabel: "Retention/Forever" },        // parent default
  { sourceLabel: "Health/MensHealth", retentionLabel: "Retention/Forever" },        // parent default
  { sourceLabel: "Health/Sanford", retentionLabel: "Retention/Forever" },        // parent default
  { sourceLabel: "Health/Spiritual", retentionLabel: "Retention/Forever" },        // parent default
  { sourceLabel: "Health/VA", retentionLabel: "Retention/1-year" },      // override

  { sourceLabel: "Health/VA/VA Appointments", retentionLabel: "Retention/1-year" },      // override

  // ----- House -----
  { sourceLabel: "House", retentionLabel: "Retention/Forever" },
  { sourceLabel: "House/Fargo", retentionLabel: "Retention/Forever" },
  { sourceLabel: "House/Tyler", retentionLabel: "Retention/Forever" },


  // ----- Insurance -----
  { sourceLabel: "Insurance", retentionLabel: "Retention/Forever" },

  { sourceLabel: "Insurance/AAA", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Insurance/State Farm", retentionLabel: "Retention/Forever" },


  // ----- JohnDeere -----
  { sourceLabel: "JohnDeere", retentionLabel: "Retention/Forever" },

  // ----- Legal -----
  { sourceLabel: "Legal", retentionLabel: "Retention/Forever" },

  // ----- Military Service Organization -----
  { sourceLabel: "Military Service Organization", retentionLabel: "Retention/Forever" },         // parent default

  { sourceLabel: "Military Service Organization/34th Infantry Division Association", retentionLabel: "Retention/Forever" },         // parent default
  { sourceLabel: "Military Service Organization/82nd Airborne Association", retentionLabel: "Retention/Forever" },         // parent default
  { sourceLabel: "Military Service Organization/American Legion", retentionLabel: "Retention/Forever" },         // parent default
  { sourceLabel: "Military Service Organization/Family Readiness", retentionLabel: "Retention/Forever" },         // parent default
  { sourceLabel: "Military Service Organization/MOAA", retentionLabel: "Retention/Forever" },         // parent default
  { sourceLabel: "Military Service Organization/NGAUS", retentionLabel: "Retention/Forever" },         // parent default
  { sourceLabel: "Military Service Organization/ROA", retentionLabel: "Retention/Forever" },         // parent default
  { sourceLabel: "Military Service Organization/SOCOM Breakfast", retentionLabel: "Retention/Forever" },         // parent default
  { sourceLabel: "Military Service Organization/USARA", retentionLabel: "Retention/Forever" },         // parent default
  { sourceLabel: "Military Service Organization/Vet Tix", retentionLabel: "Retention/1-month" }, // override
  { sourceLabel: "Military Service Organization/VFW", retentionLabel: "Retention/Forever" },         // parent default
  { sourceLabel: "Military Service Organization/Wounded Warrior Guide Service", retentionLabel: "Retention/Forever" },         // parent default


  // ----- Notes -----
  { sourceLabel: "Notes", retentionLabel: "Retention/Forever" },


  // ----- Orders -----
  { sourceLabel: "Orders", retentionLabel: "Retention/Forever" },

  { sourceLabel: "Orders/Amazon", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Orders/Boat", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Orders/Chevelle", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Orders/CMAS", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Orders/Shipment", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Orders/VIVINT", retentionLabel: "Retention/Forever" },


  // ----- Outdoors -----
  { sourceLabel: "Outdoors", retentionLabel: "Retention/Forever" },            // parent default

  { sourceLabel: "Outdoors/BWCA", retentionLabel: "Retention/Forever" },            // parent default
  { sourceLabel: "Outdoors/Fishing", retentionLabel: "Retention/Forever" },            // parent default
  { sourceLabel: "Outdoors/Gun Shops", retentionLabel: "Retention/6-month" }, // override
  { sourceLabel: "Outdoors/Hunting", retentionLabel: "Retention/Forever" },            // parent default


  // ----- Post Office Mail -----
  { sourceLabel: "Post Office Mail", retentionLabel: "Retention/6-month" },

  // ----- School -----
  { sourceLabel: "School", retentionLabel: "Retention/Forever" },

  { sourceLabel: "School/Football", retentionLabel: "Retention/Forever" },
  { sourceLabel: "School/German Trip", retentionLabel: "Retention/Forever" },
  { sourceLabel: "School/JMS Issues", retentionLabel: "Retention/Forever" },
  { sourceLabel: "School/Park_Christian", retentionLabel: "Retention/Forever" },
  { sourceLabel: "School/Track", retentionLabel: "Retention/Forever" },


  // ----- Shared Parenting -----
  { sourceLabel: "Shared Parenting", retentionLabel: "Retention/Forever" },

  // ----- Sherri -----
  { sourceLabel: "Sherri", retentionLabel: "Retention/Forever" },

  { sourceLabel: "Sherri/Legal", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Sherri/Legal/Custody_Mod", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Sherri/Legal/Custody_Mod/Argument", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Sherri/Legal/Custody_Mod/Exhibits", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Sherri/Legal/Custody_Mod/Issues", retentionLabel: "Retention/Forever" },

  { sourceLabel: "Sherri/Medical", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Sherri/Medical/Aaron_Contacts", retentionLabel: "Retention/Forever" },


  // ----- Shopping -----
  { sourceLabel: "Shopping", retentionLabel: "Retention/1-year" },

  { sourceLabel: "Shopping/GSA", retentionLabel: "Retention/1-year" },


  // ----- Travel -----
  { sourceLabel: "Travel", retentionLabel: "Retention/Forever" },

  { sourceLabel: "Travel/Costa Rica 2023", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Travel/Duluth Fall 2024", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Travel/Florida Spring Break 2026", retentionLabel: "Retention/Forever" },
  { sourceLabel: "Travel/RCL Bahama Cruise and Florida 2025", retentionLabel: "Retention/Forever" },

];

function retentionExclusionQuery_() {
  return RETENTION_LABELS.map(l => `-label:"${escapeQuery_(l)}"`).join(" ");
}



/**
 * APPLY retention labels — API only (v3)
 * - Uses labelIds filter (reliable)
 * - Excludes threads that already have ANY Retention/* label via q
 * - Reads labelIds by UNION across all messages in the thread (not first message only)
 * - Avoids Threads.get partial-response "Invalid field selection labelIds" by NOT using fields:
 *
 * Requires Advanced Gmail Service identifier: Gmail
 */
function applyRetentionLabels_apiOnly_v3() {
  const PAGE_SIZE = 25;                 // conservative
  const THREADS_PER_RULE_CAP = 25;      // conservative

  // ---- Validate config ----
  if (!Array.isArray(RETENTION_LABELS) || RETENTION_LABELS.length === 0) {
    throw new Error("RETENTION_LABELS must be a non-empty array.");
  }
  if (!Array.isArray(RETENTION_RULES) || RETENTION_RULES.length === 0) {
    throw new Error("RETENTION_RULES must be a non-empty array.");
  }

  // ---- Label inventory ----
  const allLabels0 = listAllLabels_api_v1_(); // [{id,name}]
  const nameToId0 = new Map(allLabels0.map(l => [l.name, l.id]));

  // Ensure retention labels exist (creates only if DRY_RUN=false)
  ensureLabelsExist_api_v1_(RETENTION_LABELS, nameToId0, DRY_RUN);

  // Refresh labels after potential creation
  const allLabels = listAllLabels_api_v1_();
  const nameToId = new Map(allLabels.map(l => [l.name, l.id]));
  const normIndex = buildNormalizedLabelIndex_(allLabels);

  // Resolve retention IDs
  const retentionIds = RETENTION_LABELS.map(n => nameToId.get(n)).filter(Boolean);
  if (retentionIds.length !== RETENTION_LABELS.length) {
    throw new Error("One or more RETENTION_LABELS could not be resolved to IDs. Check spelling/case exactly.");
  }

  // Resolve rules: sourceLabelId + retentionLabelId
  const rules0 = normalizeRules_api_v1_(RETENTION_RULES);
  const rules = rules0.map(r => {
    const retentionLabelId = nameToId.get(r.retentionLabel);
    if (!retentionLabelId) throw new Error(`Target retention label not found: ${r.retentionLabel}`);

    const src = resolveLabelByNameOrNormalized_(r.sourceLabel, nameToId, normIndex);
    return {
      sourceLabel: r.sourceLabel,
      sourceLabelResolved: src ? src.name : null,
      sourceLabelId: src ? src.id : null,
      retentionLabel: r.retentionLabel,
      retentionLabelId
    };
  });

  // Warn + skip missing source labels
  const missing = rules.filter(r => !r.sourceLabelId);
  if (missing.length) {
    Logger.log(
      "WARN: %s source labels not found (skipping). Examples: %s",
      missing.length,
      missing.slice(0, 25).map(r => r.sourceLabel).join(" | ")
    );
  }
  const activeRules = rules.filter(r => r.sourceLabelId);

  // Build exclusion query: exclude threads that already have ANY retention label
  const retentionExclusion = buildRetentionExclusionQuery_api_v1_(RETENTION_LABELS);

  let processed = 0;
  let labeled = 0;
  let skippedAlreadyHasRetention = 0;

  for (const rule of activeRules) {
    if (processed >= MAX_THREADS_PER_RUN) break;

    Logger.log('RULE: source="%s" (resolved="%s") retention="%s"',
      rule.sourceLabel,
      rule.sourceLabelResolved || "(none)",
      rule.retentionLabel
    );

    let pageToken = undefined;
    let fetchedForRule = 0;

    while (processed < MAX_THREADS_PER_RUN && fetchedForRule < THREADS_PER_RULE_CAP) {
      let resp;
      try {
        resp = threadsList_({
          labelIds: [rule.sourceLabelId],
          q: retentionExclusion,
          maxResults: Math.min(PAGE_SIZE, MAX_THREADS_PER_RUN - processed, THREADS_PER_RULE_CAP - fetchedForRule),
          pageToken: pageToken || undefined,
          fields: "threads(id),nextPageToken"
        }, "applyRetentionLabels Threads.list labelIds");
      } catch (e) {
        Logger.log('ERROR: Threads.list failed for source="%s" (labelId=%s) err=%s',
          rule.sourceLabelResolved || rule.sourceLabel,
          rule.sourceLabelId,
          (e && e.message) ? e.message : String(e)
        );
        break; // abort this rule only
      }

      const threads = (resp && resp.threads) ? resp.threads : [];
      if (!threads.length) break;

      for (const t of threads) {
        if (processed >= MAX_THREADS_PER_RUN) break;

        processed++;
        fetchedForRule++;

        // Get thread metadata (NO fields filter; avoids "Invalid field selection labelIds")
        const meta = withRetries_(
          () => Gmail.Users.Threads.get("me", t.id, { format: "metadata" }),
          { label: "applyRetentionLabels Threads.get", retries: 6, baseMs: 800, maxMs: 20000, log: true }
        );

        // UNION labelIds across all messages
        const labelIds = getThreadLabelIdsUnion_safe_(meta);

        // Defensive: skip if it already has any retention label
        if (retentionIds.some(id => labelIds.includes(id))) {
          skippedAlreadyHasRetention++;
          continue;
        }

        if (!DRY_RUN) {
          withRetries_(
            () => Gmail.Users.Threads.modify({ addLabelIds: [rule.retentionLabelId] }, "me", t.id),
            { label: "applyRetentionLabels Threads.modify", retries: 6, baseMs: 800, maxMs: 20000, log: true }
          );
        }

        labeled++;
        Logger.log('%sApplied "%s" (source="%s") to threadId=%s',
          DRY_RUN ? "[DRY_RUN] " : "",
          rule.retentionLabel,
          rule.sourceLabelResolved || rule.sourceLabel,
          t.id
        );
      }

      pageToken = resp.nextPageToken || undefined;
      if (!pageToken) break;
    }
  }

  Logger.log("----- SUMMARY (API-only v3) -----");
  Logger.log("Processed: %s", processed);
  Logger.log("Labeled: %s", labeled);
  Logger.log("Skipped (already had Retention/*): %s", skippedAlreadyHasRetention);

  return { dryRun: DRY_RUN, processed, labeled, skippedAlreadyHasRetention };
}

/* ---------------- Small helpers used by v3 ---------------- */

function normalizeLabelName_(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\s_\-]+/g, "")
    .trim();
}

function buildNormalizedLabelIndex_(labels) {
  const map = new Map();
  for (const l of (labels || [])) {
    const key = normalizeLabelName_(l.name);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ id: l.id, name: l.name });
  }
  return map;
}

function resolveLabelByNameOrNormalized_(name, nameToId, normToLabels) {
  const exactId = nameToId.get(name);
  if (exactId) return { id: exactId, name };

  const norm = normalizeLabelName_(name);
  const candidates = normToLabels.get(norm) || [];

  if (candidates.length === 1) return candidates[0];

  if (candidates.length > 1) {
    Logger.log('WARN: label "%s" ambiguous after normalization. Candidates: %s',
      name,
      candidates.map(c => c.name).join(" | ")
    );
  }
  return null;
}

/**
 * UNION labelIds across all messages in the thread.
 * This fixes the "first message labelIds only" issue (your §1.3 issue).
 */
function getThreadLabelIdsUnion_safe_(thread) {
  const out = new Set();
  const msgs = (thread && thread.messages) ? thread.messages : [];
  for (const m of msgs) {
    const ids = (m && m.labelIds) ? m.labelIds : [];
    for (const id of ids) out.add(id);
  }
  return Array.from(out);
}




/**
 * applyRetentionLabels_apiOnly()
 * API-only retention labeling (no GmailApp).
 *
 * Key changes vs your current version:
 * - Uses Threads.list(labelIds=[...]) instead of q=label:"..."
 * - Resolves sourceLabel -> sourceLabelId once up front
 * - Reads thread-level labelIds when available; falls back to union of message labelIds
 * - Skips threads that already have ANY retention label
 *
 * Prereqs:
 * - Advanced Gmail service enabled (identifier: Gmail)
 * - Globals exist: DRY_RUN, MAX_THREADS_PER_RUN, RETENTION_LABELS, RETENTION_RULES
 * - Helpers exist: listAllLabels_api_v1_(), ensureLabelsExist_api_v1_(), normalizeRules_api_v1_(),
 *                  threadsList_(), withRetries_(), cleanParams_()
 */
function applyRetentionLabels_apiOnly() {
  // Tune these to avoid runtime overages
  const PAGE_SIZE = 20;            // Threads.list page size
  const THREADS_PER_RULE_CAP = 20; // max threads to process per rule per run

  // ---- Validate globals exist ----
  if (!Array.isArray(RETENTION_LABELS) || RETENTION_LABELS.length === 0) {
    throw new Error("RETENTION_LABELS must be a non-empty array.");
  }
  if (!Array.isArray(RETENTION_RULES) || RETENTION_RULES.length === 0) {
    throw new Error("RETENTION_RULES must be a non-empty array.");
  }
  if (typeof DRY_RUN === "undefined") {
    throw new Error("DRY_RUN global must be defined (true/false).");
  }
  if (typeof MAX_THREADS_PER_RUN === "undefined" || !MAX_THREADS_PER_RUN) {
    throw new Error("MAX_THREADS_PER_RUN global must be defined (e.g., 20).");
  }

  // ---- Label inventory (name <-> id) ----
  const labels = listAllLabels_api_v1_(); // [{id,name}]
  const nameToId = new Map(labels.map(l => [l.name, l.id]));

  // Ensure all retention labels exist (create via Gmail API if missing)
  ensureLabelsExist_api_v1_(RETENTION_LABELS, nameToId, DRY_RUN);

  // Resolve retention IDs (used for "already has retention" checks)
  const retentionIds = RETENTION_LABELS.map(n => nameToId.get(n)).filter(Boolean);
  if (retentionIds.length !== RETENTION_LABELS.length) {
    throw new Error("One or more RETENTION_LABELS could not be resolved to IDs. Check spelling/case exactly.");
  }

  // ---- Normalize + resolve rule sourceLabelId and retentionLabelId ----
  const rules = normalizeRules_api_v1_(RETENTION_RULES).map(r => {
    const sourceLabelName = String(r.sourceLabel).trim().replace(/\/+$/, ""); // strip trailing slash
    const sourceLabelId = nameToId.get(sourceLabelName) || null;

    const retentionLabelName = String(r.retentionLabel).trim();
    const retentionLabelId = nameToId.get(retentionLabelName);
    if (!retentionLabelId) throw new Error(`Target retention label not found: ${retentionLabelName}`);

    return {
      sourceLabel: sourceLabelName,
      sourceLabelId,
      retentionLabel: retentionLabelName,
      retentionLabelId
    };
  });

  // Log missing source labels once (skip them)
  const missingSources = rules.filter(r => !r.sourceLabelId).map(r => r.sourceLabel);
  if (missingSources.length) {
    Logger.log(
      "WARN: %s source labels not found (skipping). Examples: %s",
      missingSources.length,
      missingSources.slice(0, 25).join(" | ")
    );
  }

  let processed = 0;
  let labeled = 0;
  let skippedAlreadyHasRetention = 0;
  let skippedMissingSourceLabel = 0;

  for (const rule of rules) {
    if (processed >= MAX_THREADS_PER_RUN) break;

    if (!rule.sourceLabelId) {
      skippedMissingSourceLabel++;
      continue;
    }

    Logger.log('RULE: source="%s" retention="%s"', rule.sourceLabel, rule.retentionLabel);

    let pageToken = undefined;
    let fetchedForRule = 0;

    while (processed < MAX_THREADS_PER_RUN && fetchedForRule < THREADS_PER_RULE_CAP) {
      let resp;
      try {
        resp = threadsList_(
          {
            labelIds: [rule.sourceLabelId],
            maxResults: Math.min(
              PAGE_SIZE,
              MAX_THREADS_PER_RUN - processed,
              THREADS_PER_RULE_CAP - fetchedForRule
            ),
            pageToken: pageToken || undefined,
            fields: "threads(id),nextPageToken"
          },
          "applyRetentionLabels Threads.list labelIds"
        );
      } catch (e) {
        Logger.log(
          'ERROR: Threads.list failed for source="%s" (labelId=%s) err=%s',
          rule.sourceLabel,
          rule.sourceLabelId,
          (e && e.message) ? e.message : String(e)
        );
        // Abort this rule only; continue overall run
        break;
      }

      if (!resp) {
        Logger.log(
          'WARN: Threads.list returned null for source="%s" (labelId=%s)',
          rule.sourceLabel,
          rule.sourceLabelId
        );
        break;
      }

      const threads = resp.threads || [];
      if (!threads.length) break;

      pageToken = resp.nextPageToken || undefined;

      for (const t of threads) {
        if (processed >= MAX_THREADS_PER_RUN) break;

        processed++;
        fetchedForRule++;

        // Fetch thread metadata; prefer thread-level labelIds (fast + correct)
        const meta = Gmail.Users.Threads.get("me", t.id, {
          format: "metadata",
          fields: "labelIds,messages(labelIds)"
        });

        const labelIds = (meta && Array.isArray(meta.labelIds) && meta.labelIds.length)
          ? meta.labelIds
          : getThreadLabelIdsUnion_(meta);

        // Skip if it already has retention (defensive)
        if (retentionIds.some(id => labelIds.includes(id))) {
          skippedAlreadyHasRetention++;
          continue;
        }

        if (!DRY_RUN) {
          Gmail.Users.Threads.modify(
            { addLabelIds: [rule.retentionLabelId] },
            "me",
            t.id
          );
        }

        labeled++;
        Logger.log(
          '%sApplied "%s" (source="%s") to threadId=%s',
          DRY_RUN ? "[DRY_RUN] " : "",
          rule.retentionLabel,
          rule.sourceLabel,
          t.id
        );
      }

      if (!pageToken) break;
    }
  }

  Logger.log("----- SUMMARY (API-only) -----");
  Logger.log("DRY_RUN: %s", DRY_RUN);
  Logger.log("Processed: %s", processed);
  Logger.log("Labeled: %s", labeled);
  Logger.log("Skipped (already had Retention/*): %s", skippedAlreadyHasRetention);
  Logger.log("Skipped (missing source label): %s", skippedMissingSourceLabel);

  return {
    dryRun: DRY_RUN,
    processed,
    labeled,
    skippedAlreadyHasRetention,
    skippedMissingSourceLabel
  };
}

/**
 * Union labelIds across ALL messages in the thread (fallback path).
 * This avoids the "first message labelIds" correctness issue.
 */
function getThreadLabelIdsUnion_(threadMeta) {
  const set = new Set();
  const msgs = (threadMeta && threadMeta.messages) ? threadMeta.messages : [];
  for (const m of msgs) {
    const ids = (m && m.labelIds) ? m.labelIds : [];
    for (const id of ids) set.add(id);
  }
  return Array.from(set);
}




/* ---------------- Helpers (v1 unique names) ---------------- */

function listAllLabels_api_v1_() {
  const resp = Gmail.Users.Labels.list("me", { fields: "labels(id,name)" });
  return resp.labels || [];
}

function ensureLabelsExist_api_v1_(labelNames, nameToId, dryRun) {
  for (const name of labelNames) {
    if (nameToId.get(name)) continue;

    Logger.log('%sCreating missing label: %s', dryRun ? "[DRY_RUN] " : "", name);

    if (!dryRun) {
      const created = Gmail.Users.Labels.create({ name }, "me");
      nameToId.set(created.name, created.id);
    }
  }
}

function normalizeRules_api_v1_(rules) {
  return rules.map((r, idx) => {
    if (!r.sourceLabel || !r.retentionLabel) {
      throw new Error(`Invalid rule at index ${idx}: must include sourceLabel and retentionLabel.`);
    }
    return {
      sourceLabel: String(r.sourceLabel).trim(),
      retentionLabel: String(r.retentionLabel).trim()
    };
  });
}

function buildRetentionExclusionQuery_api_v1_(retentionLabelNames) {
  // build: -label:"Retention/Forever" -label:"Retention/7-year" ...
  return retentionLabelNames.map(n => `-label:"${escapeQuery_api_v1_(n)}"`).join(" ");
}

function escapeQuery_api_v1_(s) {
  return String(s).replace(/"/g, '\\"');
}

/** Escapes quotes in label names for Gmail search query usage. */
function escapeQuery_(s) {
  return String(s).replace(/"/g, '\\"');
}
/**
 * AUDIT ONLY — Gmail API ONLY (no GmailApp calls)
 * Counts threads that have >1 retention label.
 *
 * Requires Advanced Gmail Service added with identifier: Gmail
 */
function countThreadsWithMultipleRetentionFlags_apiOnly() {
  const maxThreads =
    (typeof MAX_THREADS !== 'undefined' && MAX_THREADS) ||
    (typeof MAX_THREADS_TO_PROCESS !== 'undefined' && MAX_THREADS_TO_PROCESS) ||
    (typeof MAX_THREAD_COUNT !== 'undefined' && MAX_THREAD_COUNT) ||
    5000;

  // Get all labels once via Gmail API
  const allLabels = listAllLabels_api_(); // [{id,name}]
  const retention = resolveRetentionLabelsFromConfig_api_(allLabels); // {names:[], ids:[]}

  if (!retention.ids.length) {
    Logger.log('No retention labels resolved. Check RETENTION_LABELS or RETENTION_LABEL_PREFIXES.');
    return { maxThreads, scanned: 0, offenders: 0, retentionLabelCount: 0 };
  }

  // Query threads that have ANY retention label
  const q = buildRetentionAnyQuery_(retention.names);

  let scanned = 0;
  let offenders = 0;
  const offenderSamples = [];
  const sampleLimit = 25;

  let pageToken = undefined;
  const pageSize = 500;

  while (scanned < maxThreads) {
    const resp = Gmail.Users.Threads.list('me', {
      q,
      maxResults: Math.min(pageSize, maxThreads - scanned),
      pageToken,
      fields: 'threads(id,labelIds),nextPageToken'
    });

    const threads = resp.threads || [];
    if (!threads.length) break;

    for (const t of threads) {
      scanned++;

      const labelIds = t.labelIds || [];
      let count = 0;

      // Count retention labelIds on the thread
      for (const rid of retention.ids) {
        if (labelIds.indexOf(rid) !== -1) {
          count++;
          if (count > 1) break;
        }
      }

      if (count > 1) {
        offenders++;
        if (offenderSamples.length < sampleLimit) {
          offenderSamples.push({ threadId: t.id, labelIds: labelIds.slice(0, 25) });
        }
      }

      if (scanned >= maxThreads) break;
    }

    pageToken = resp.nextPageToken;
    if (!pageToken) break;
  }

  Logger.log('Retention labels considered: %s', retention.names.length);
  Logger.log('Threads scanned (with any retention label): %s', scanned);
  Logger.log('Threads with >1 retention flag: %s', offenders);

  if (offenderSamples.length) {
    Logger.log('--- Offender samples (threadId + first 25 labelIds) ---');
    offenderSamples.forEach((s, i) =>
      Logger.log('#%s threadId=%s labelIds=%s', i + 1, s.threadId, s.labelIds.join(','))
    );
  }

  return {
    retentionLabelCount: retention.names.length,
    maxThreads,
    scannedThreadsWithAnyRetentionFlag: scanned,
    offendingThreadCount: offenders
  };
}

/** Gmail API: list all labels (id + name). */
function listAllLabels_api_() {
  const resp = Gmail.Users.Labels.list('me', { fields: 'labels(id,name)' });
  return resp.labels || [];
}

/**
 * Resolve retention labels from existing config using Gmail API label inventory.
 * Priority:
 *  1) RETENTION_LABELS (explicit names)
 *  2) RETENTION_LABEL_PREFIXES (prefix match)
 */
function resolveRetentionLabelsFromConfig_api_(allLabels) {
  let names = [];

  if (typeof RETENTION_LABELS !== 'undefined' && Array.isArray(RETENTION_LABELS) && RETENTION_LABELS.length) {
    names = RETENTION_LABELS.slice();
  } else {
    const prefixes =
      (typeof RETENTION_LABEL_PREFIXES !== 'undefined' &&
        Array.isArray(RETENTION_LABEL_PREFIXES) &&
        RETENTION_LABEL_PREFIXES.length)
        ? RETENTION_LABEL_PREFIXES
        : ['Retention/'];

    names = allLabels
      .map(l => l.name)
      .filter(n => prefixes.some(p => n.startsWith(p)));
  }

  // de-dupe
  names = Array.from(new Set(names)).sort();

  // map names -> ids
  const nameToId = new Map(allLabels.map(l => [l.name, l.id]));
  const ids = names.map(n => nameToId.get(n)).filter(Boolean);

  return { names, ids };
}

/** Build Gmail search query matching ANY retention label. */
function buildRetentionAnyQuery_(labelNames) {
  const parts = labelNames.map(n => `label:"${String(n).replace(/"/g, '\\"')}"`);
  return `(${parts.join(' OR ')})`;
}

/**
 * AUDIT ONLY — Gmail API ONLY
 * Counts threads that have >1 retention label.
 *
 * Note: threads.list does NOT return labelIds; we fetch minimal thread metadata via threads.get.
 */
function countThreadsWithMultipleRetentionFlags_apiOnly() {
  const maxThreads =
    (typeof MAX_THREADS !== 'undefined' && MAX_THREADS) ||
    (typeof MAX_THREADS_TO_PROCESS !== 'undefined' && MAX_THREADS_TO_PROCESS) ||
    (typeof MAX_THREAD_COUNT !== 'undefined' && MAX_THREAD_COUNT) ||
    2000;

  // Gmail API: list labels once
  const allLabels = listAllLabels_api_(); // [{id,name}]
  const retention = resolveRetentionLabelsFromConfig_api_(allLabels); // {names:[], ids:[]}

  if (!retention.ids.length) {
    Logger.log('No retention labels resolved. Check RETENTION_LABELS or RETENTION_LABEL_PREFIXES.');
    return { maxThreads, scanned: 0, offenders: 0, retentionLabelCount: 0 };
  }

  // Query threads that have ANY retention label
  const q = buildRetentionAnyQuery_(retention.names);

  let scanned = 0;
  let offenders = 0;
  const samples = [];
  const sampleLimit = 20;

  let pageToken = undefined;
  const pageSize = 100; // keep modest; threads.get adds calls

  while (scanned < maxThreads) {
    const resp = Gmail.Users.Threads.list('me', {
      q,
      maxResults: Math.min(pageSize, maxThreads - scanned),
      pageToken,
      fields: 'threads(id),nextPageToken'
    });

    const threads = resp.threads || [];
    if (!threads.length) break;

    for (const t of threads) {
      scanned++;

      const threadId = t.id;

      // Fetch minimal metadata; labelIds are on messages
      const meta = Gmail.Users.Threads.get('me', threadId, {
        format: 'metadata',
        fields: 'messages(labelIds)'
      });

      const firstMsg = (meta.messages && meta.messages.length) ? meta.messages[0] : null;
      const labelIds = (firstMsg && firstMsg.labelIds) ? firstMsg.labelIds : [];

      // Count retention labelIds present
      let count = 0;
      let foundIds = [];
      for (const rid of retention.ids) {
        if (labelIds.indexOf(rid) !== -1) {
          count++;
          foundIds.push(rid);
          if (count > 1) break;
        }
      }

      if (count > 1) {
        offenders++;
        if (samples.length < sampleLimit) {
          samples.push({ threadId, retentionLabelIdsFound: foundIds.join(',') });
        }
      }

      if (scanned >= maxThreads) break;
    }

    pageToken = resp.nextPageToken;
    if (!pageToken) break;
  }

  Logger.log('Retention labels considered: %s', retention.names.length);
  Logger.log('Threads scanned (with any retention label): %s', scanned);
  Logger.log('Threads with >1 retention flag: %s', offenders);

  if (samples.length) {
    Logger.log('--- Sample offenders (threadId + found retention labelIds) ---');
    samples.forEach((s, i) =>
      Logger.log('#%s threadId=%s foundRetentionLabelIds=%s', i + 1, s.threadId, s.retentionLabelIdsFound)
    );
  }

  return {
    retentionLabelCount: retention.names.length,
    maxThreads,
    scannedThreadsWithAnyRetentionFlag: scanned,
    offendingThreadCount: offenders
  };
}

/** Gmail API: list all labels (id + name). */
function listAllLabels_api_() {
  const resp = Gmail.Users.Labels.list('me', { fields: 'labels(id,name)' });
  return resp.labels || [];
}

/**
 * Resolve retention labels from existing config using Gmail API label inventory.
 * Priority:
 *  1) RETENTION_LABELS (explicit names)
 *  2) RETENTION_LABEL_PREFIXES (prefix match)
 */
function resolveRetentionLabelsFromConfig_api_(allLabels) {
  let names = [];
}


function testGmailApiAccess() {
  const r = Gmail.Users.Labels.list("me", { fields: "labels(id,name)" });
  Logger.log("Labels returned: %s", (r.labels || []).length);
}

/**
 * AUDIT ONLY — Gmail API ONLY (v2, collision-proof)
 * Counts threads that have >1 retention label.
 */
function countThreadsWithMultipleRetentionFlags_apiOnly_v2() {
  const maxThreads =
    (typeof MAX_THREADS !== 'undefined' && MAX_THREADS) ||
    (typeof MAX_THREADS_TO_PROCESS !== 'undefined' && MAX_THREADS_TO_PROCESS) ||
    (typeof MAX_THREAD_COUNT !== 'undefined' && MAX_THREAD_COUNT) ||
    2000;

  const allLabels = listAllLabels_api_v2_(); // [{id,name}]
  const retention = resolveRetentionLabelsFromConfig_api_v2_(allLabels); // {names:[], ids:[]}

  if (!retention || !retention.ids || retention.ids.length === 0) {
    Logger.log('No retention label IDs resolved. Check RETENTION_LABELS / RETENTION_LABEL_PREFIXES.');
    Logger.log('Resolved names=%s ids=%s', retention?.names?.length || 0, retention?.ids?.length || 0);
    return { maxThreads, scanned: 0, offenders: 0, retentionLabelCount: retention?.names?.length || 0 };
  }

  const q = buildRetentionAnyQuery_v2_(retention.names);

  let scanned = 0;
  let offenders = 0;
  const samples = [];
  const sampleLimit = 20;

  let pageToken = undefined;
  const pageSize = 100;

  while (scanned < maxThreads) {
    const resp = Gmail.Users.Threads.list('me', {
      q,
      maxResults: Math.min(pageSize, maxThreads - scanned),
      pageToken,
      fields: 'threads(id),nextPageToken'
    });

    const threads = resp.threads || [];
    if (threads.length === 0) break;

    for (const t of threads) {
      scanned++;
      const threadId = t.id;

      const meta = Gmail.Users.Threads.get('me', threadId, {
        format: 'metadata',
        fields: 'messages(labelIds)'
      });

      const firstMsg = (meta.messages && meta.messages.length) ? meta.messages[0] : null;
      const labelIds = (firstMsg && firstMsg.labelIds) ? firstMsg.labelIds : [];

      let count = 0;
      const found = [];

      for (const rid of retention.ids) {
        if (labelIds.indexOf(rid) !== -1) {
          count++;
          found.push(rid);
          if (count > 1) break;
        }
      }

      if (count > 1) {
        offenders++;
        if (samples.length < sampleLimit) samples.push({ threadId, foundRetentionLabelIds: found.join(',') });
      }

      if (scanned >= maxThreads) break;
    }

    pageToken = resp.nextPageToken;
    if (!pageToken) break;
  }

  Logger.log('Retention labels considered: %s', retention.names.length);
  Logger.log('Threads scanned (with any retention label): %s', scanned);
  Logger.log('Threads with >1 retention flag: %s', offenders);

  if (samples.length) {
    Logger.log('--- Sample offenders ---');
    samples.forEach((s, i) => Logger.log('#%s threadId=%s found=%s', i + 1, s.threadId, s.foundRetentionLabelIds));
  }

  return {
    retentionLabelCount: retention.names.length,
    maxThreads,
    scannedThreadsWithAnyRetentionFlag: scanned,
    offendingThreadCount: offenders
  };
}

/** Gmail API: list all labels (id + name). */
function listAllLabels_api_v2_() {
  const resp = Gmail.Users.Labels.list('me', { fields: 'labels(id,name)' });
  return resp.labels || [];
}

/**
 * Resolve retention labels using existing config:
 *  - RETENTION_LABELS (explicit label names), else
 *  - RETENTION_LABEL_PREFIXES (prefix match), else default ['Retention/']
 */
function resolveRetentionLabelsFromConfig_api_v2_(allLabels) {
  let names = [];

  if (typeof RETENTION_LABELS !== 'undefined' && Array.isArray(RETENTION_LABELS) && RETENTION_LABELS.length) {
    names = RETENTION_LABELS.slice();
  } else {
    const prefixes =
      (typeof RETENTION_LABEL_PREFIXES !== 'undefined' &&
        Array.isArray(RETENTION_LABEL_PREFIXES) &&
        RETENTION_LABEL_PREFIXES.length)
        ? RETENTION_LABEL_PREFIXES
        : ['Retention/'];

    names = allLabels
      .map(l => l.name)
      .filter(n => prefixes.some(p => n.startsWith(p)));
  }

  names = Array.from(new Set(names)).sort();

  const nameToId = new Map(allLabels.map(l => [l.name, l.id]));
  const ids = names.map(n => nameToId.get(n)).filter(Boolean);

  return { names, ids };
}

/** Build Gmail search query matching ANY retention label. */
function buildRetentionAnyQuery_v2_(labelNames) {
  const parts = labelNames.map(n => `label:"${String(n).replace(/"/g, '\\"')}"`);
  return `(${parts.join(' OR ')})`;
}


function mapLabelIdsToNames_forSamples() {
  const idsToResolve = [
    'Label_4948680976337317128',
    'Label_656003339321803808',
    'Label_1466038169373089231'
  ];

  const labels = Gmail.Users.Labels.list('me', { fields: 'labels(id,name)' }).labels || [];
  const idToName = new Map(labels.map(l => [l.id, l.name]));

  idsToResolve.forEach(id => {
    Logger.log('%s => %s', id, idToName.get(id) || 'NOT_FOUND');
  });

  return Object.fromEntries(idsToResolve.map(id => [id, idToName.get(id) || null]));
}


/**
 * Retention conflict fixer (Gmail API ONLY)
 *
 * Policy:
 *  1) HARD RULE: If Retention/Forever is present, KEEP it and REMOVE all other retention flags.
 *  2) Otherwise: KEEP the LONGEST retention flag per RETENTION_PRECEDENCE (top = longest), REMOVE the rest.
 *
 * Notes:
 *  - Uses Gmail Advanced Service (identifier: Gmail)
 *  - Does NOT use GmailApp (avoids GmailApp daily quota issues)
 *  - DRY_RUN defaults to true (recommended)
 *  - Naming: singular units (e.g., "Retention/7_year", not "Retention/7_years")
 */
function fixMultipleRetentionFlags_apiOnly_longestWins_v1() {
  const FOREVER_NAME = 'Retention/Forever';

  // ---- Resolve label name -> id via Gmail API ----
  const allLabels = (Gmail.Users.Labels.list('me', { fields: 'labels(id,name)' }).labels) || [];
  const nameToId = new Map(allLabels.map(l => [l.name, l.id]));

  const foreverId = nameToId.get(FOREVER_NAME);
  if (!foreverId) throw new Error(`Missing label: "${FOREVER_NAME}". Verify it exists exactly.`);

  // Resolve precedence list to ids (ignore any entries that don't exist yet)
  const precedence = RETENTION_PRECEDENCE
    .map(name => ({ name, id: nameToId.get(name) }))
    .filter(x => x.id);

  if (precedence.length < 2) {
    throw new Error('Retention precedence list resolved to <2 labels. Verify your label names exist.');
  }

  const retentionNames = precedence.map(x => x.name);

  // Query: threads that have ANY retention label
  const q = `(${retentionNames.map(n => `label:"${n.replace(/"/g, '\\"')}"`).join(' OR ')})`;

  // ---- Iterate threads ----
  let processed = 0;
  let fixed = 0;
  let pageToken = undefined;

  while (fixed < MAX_FIXES) {
    const resp = Gmail.Users.Threads.list('me', {
      q,
      maxResults: Math.min(100, MAX_FIXES - fixed),
      pageToken,
      fields: 'threads(id),nextPageToken'
    });

    const threads = resp.threads || [];
    if (!threads.length) break;

    for (const t of threads) {
      if (fixed >= MAX_FIXES) break;
      processed++;

      // Pull minimal metadata; labelIds exist on messages, not on threads.list results
      const meta = Gmail.Users.Threads.get('me', t.id, {
        format: 'metadata',
        fields: 'messages(labelIds)'
      });

      const firstMsg = (meta.messages && meta.messages.length) ? meta.messages[0] : null;
      const labelIds = (firstMsg && firstMsg.labelIds) ? firstMsg.labelIds : [];

      // Which retention labels are present on this thread?
      const present = precedence.filter(r => labelIds.indexOf(r.id) !== -1);
      if (present.length <= 1) continue;

      // HARD RULE: Forever wins, remove everything else
      const hasForever = labelIds.indexOf(foreverId) !== -1;
      let keep;
      let remove;

      if (hasForever) {
        keep = precedence.find(x => x.id === foreverId) || { name: FOREVER_NAME, id: foreverId };
        remove = present.filter(x => x.id !== foreverId);
      } else {
        // Longest-wins by precedence (first match in precedence order)
        keep = present[0];
        remove = present.slice(1);
      }

      Logger.log(
        'Thread %s retention conflict: present=%s | KEEP=%s | REMOVE=%s',
        t.id,
        present.map(x => x.name).join(' | '),
        keep.name,
        remove.map(x => x.name).join(' | ')
      );

      if (!DRY_RUN) {
        Gmail.Users.Threads.modify(
          { removeLabelIds: remove.map(x => x.id) },
          'me',
          t.id
        );
      }

      fixed++;
    }

    pageToken = resp.nextPageToken;
    if (!pageToken) break;
  }

  Logger.log('Done. DRY_RUN=%s processedThreads=%s fixedThreads=%s cap=%s', DRY_RUN, processed, fixed, MAX_FIXES);
  return { dryRun: DRY_RUN, processedThreads: processed, fixedThreads: fixed, cap: MAX_FIXES };
}


/**
 * Resumable retention conflict fixer (Gmail API only)
 *
 * Rules:
 *  - HARD RULE: if Retention/Forever present => keep Forever, remove other retention flags
 *  - Else: keep LONGEST per RETENTION_PRECEDENCE, remove the rest
 *
 * Resumes across runs using Script Properties.
 */
function fixMultipleRetentionFlags_apiOnly_longestWins_resumable_v2() {
  const PAGE_SIZE = 50;            // threads.list page size

  const FOREVER_NAME = "Retention/Forever";
  const PROP_KEY = "retention_conflict_fix_state_v2";

  // --- Load/initialize state ---
  const props = PropertiesService.getScriptProperties();
  const state = JSON.parse(props.getProperty(PROP_KEY) || "{}");
  let pageToken = state.pageToken || null;
  let totalFixed = state.totalFixed || 0;
  let totalScanned = state.totalScanned || 0;

  // --- Resolve label name -> id ---
  const allLabels = (Gmail.Users.Labels.list("me", { fields: "labels(id,name)" }).labels) || [];
  const nameToId = new Map(allLabels.map(l => [l.name, l.id]));

  const foreverId = nameToId.get(FOREVER_NAME);
  if (!foreverId) throw new Error(`Missing label: "${FOREVER_NAME}"`);

  const precedence = RETENTION_PRECEDENCE
    .map(name => ({ name, id: nameToId.get(name) }))
    .filter(x => x.id);

  if (precedence.length < 2) throw new Error("Precedence list resolved to <2 labels. Check names.");

  // Query threads that have ANY retention label
  const q = `(${precedence.map(x => `label:"${x.name.replace(/"/g, '\\"')}"`).join(" OR ")})`;

  let fixedThisRun = 0;
  let scannedThisRun = 0;

  while (fixedThisRun < MAX_FIXES_PER_RUN) {
    const resp = Gmail.Users.Threads.list("me", {
      q,
      maxResults: PAGE_SIZE,
      pageToken: pageToken || undefined,
      fields: "threads(id),nextPageToken"
    });

    const threads = resp.threads || [];
    if (!threads.length) {
      // done; clear state
      props.deleteProperty(PROP_KEY);
      Logger.log("No more threads in query. DONE. Total scanned=%s total fixed=%s", totalScanned, totalFixed);
      return { done: true, totalScanned, totalFixed };
    }

    for (const t of threads) {
      totalScanned++;
      scannedThisRun++;

      // Fetch minimal metadata for labelIds (on messages)
      const meta = Gmail.Users.Threads.get("me", t.id, {
        format: "metadata",
        fields: "messages(labelIds)"
      });

      const labelIds = meta.messages?.[0]?.labelIds || [];
      const present = precedence.filter(p => labelIds.includes(p.id));
      if (present.length <= 1) continue;

      const hasForever = labelIds.includes(foreverId);

      let remove;
      if (hasForever) {
        remove = present.filter(p => p.id !== foreverId);
      } else {
        // present is already in longest->shortest order because precedence is
        remove = present.slice(1);
      }

      Logger.log(
        'Thread %s retention conflict: present=%s | KEEP=%s | REMOVE=%s',
        t.id,
        present.map(x => x.name).join(" | "),
        hasForever ? FOREVER_NAME : present[0].name,
        remove.map(x => x.name).join(" | ")
      );

      if (!DRY_RUN) {
        Gmail.Users.Threads.modify(
          { removeLabelIds: remove.map(x => x.id) },
          "me",
          t.id
        );
      }

      totalFixed++;
      fixedThisRun++;

      if (fixedThisRun >= MAX_FIXES_PER_RUN) break;
    }

    pageToken = resp.nextPageToken || null;

    if (!pageToken) {
      // End reached; clear state
      props.deleteProperty(PROP_KEY);
      Logger.log("Reached end. DONE. Total scanned=%s total fixed=%s", totalScanned, totalFixed);
      return { done: true, totalScanned, totalFixed };
    }
  }

  // --- Save state for next run ---
  props.setProperty(
    PROP_KEY,
    JSON.stringify({ pageToken, totalFixed, totalScanned })
  );

  Logger.log(
    "PAUSED (resumable). DRY_RUN=%s scannedThisRun=%s fixedThisRun=%s totals: scanned=%s fixed=%s nextPageToken=%s",
    DRY_RUN, scannedThisRun, fixedThisRun, totalScanned, totalFixed, pageToken
  );

  return { done: false, dryRun: DRY_RUN, scannedThisRun, fixedThisRun, totalScanned, totalFixed };
}


function diagRetentionLabelsMissing() {
  const all = Gmail.Users.Labels.list("me", { fields: "labels(id,name)" }).labels || [];
  const nameToId = new Map(all.map(l => [l.name, l.id]));

  const wanted = (typeof RETENTION_LABELS !== "undefined" && Array.isArray(RETENTION_LABELS))
    ? RETENTION_LABELS
    : (CONFIG && CONFIG.RETENTION_LABELS) ? CONFIG.RETENTION_LABELS : [];

  const missing = wanted.filter(n => !nameToId.get(n));

  Logger.log("Wanted retention labels: %s", wanted.join(" | "));
  Logger.log("Missing retention labels: %s", missing.length ? missing.join(" | ") : "(none)");

  // Also show near-matches (common culprit: underscore vs dash, pluralization, spaces)
  const existingNames = all.map(l => l.name);
  for (const m of missing) {
    const mNorm = m.toLowerCase().replace(/[\s_\-]/g, "");
    const near = existingNames.filter(e =>
      e.toLowerCase().replace(/[\s_\-]/g, "") === mNorm
    );
    if (near.length) Logger.log('Near-match for "%s": %s', m, near.join(" | "));
  }

  return { missing };
}


function withRetries_(fn, opts) {
  const o = Object.assign({
    retries: 7,
    baseMs: 800,
    maxMs: 20000,
    label: "api_call",
    log: true
  }, opts || {});

  let lastErr;
  for (let attempt = 0; attempt <= o.retries; attempt++) {
    try {
      const r = fn();
      if (r === null || typeof r === "undefined") {
        throw new Error("Null/undefined API response");
      }
      return r;
    } catch (e) {
      lastErr = e;

      const jitter = Math.floor(Math.random() * 250);
      const backoff = Math.min(o.maxMs, o.baseMs * Math.pow(2, attempt)) + jitter;

      if (o.log) {
        Logger.log(
          'Retryable failure [%s] attempt=%s/%s backoffMs=%s err=%s',
          o.label, attempt + 1, o.retries + 1, backoff, (e && e.message) ? e.message : String(e)
        );
      }

      // Don’t sleep after final attempt
      if (attempt < o.retries) Utilities.sleep(backoff);
    }
  }
  throw lastErr;
}


function cleanParams_(obj) {
  const out = {};
  Object.keys(obj || {}).forEach(k => {
    const v = obj[k];
    if (v !== null && typeof v !== "undefined") out[k] = v;
  });
  return out;
}


function threadsList_(params, label) {
  const cleaned = cleanParams_(params);

  return withRetries_(
    () => Gmail.Users.Threads.list("me", cleaned),
    { label: label || "Threads.list", retries: 7, baseMs: 800, maxMs: 20000, log: true }
  );
}


function getThreadLabelIdsUnion_(threadMeta) {
  const msgs = (threadMeta && threadMeta.messages) ? threadMeta.messages : [];
  const set = new Set();
  for (const m of msgs) {
    const ids = m.labelIds || [];
    for (const id of ids) set.add(id);
  }
  return Array.from(set);
}


function diag_threads_list_minimal() {
  const resp = Gmail.Users.Threads.list("me", {
    q: "in:anywhere",
    maxResults: 1,
    fields: "threads(id),nextPageToken"
  });
  Logger.log("Threads.list typeof=%s", typeof resp);
  Logger.log("Threads.list JSON=%s", JSON.stringify(resp));
}


function diag_missing_source_labels() {
  const labels = Gmail.Users.Labels.list("me", { fields: "labels(id,name)" }).labels || [];
  const names = new Set(labels.map(l => l.name));

  const missing = [];
  for (const r of RETENTION_RULES) {
    const s = String(r.sourceLabel).trim().replace(/\/+$/, "");
    if (!names.has(s)) missing.push(s);
  }

  Logger.log("Missing source labels count=%s", missing.length);
  missing.slice(0, 200).forEach(n => Logger.log("MISSING: %s", n));
  return missing;
}



/***************************************
 * Category Retention Purge (Dry Run)
 * - Enforces retention by Gmail category
 * - Deletes (moves to Trash) aged threads
 * - Skips anything "retention-labeled"
 * - Designed to run on a time-driven trigger
 ****************************************/

// ====== CONFIG ======
const DIAG_PREFIX = "CATEGORY_RETENTION";

// Safety limits to avoid timeouts / runaway deletes.
const MAX_THREADS_PER_RULE_PER_RUN = 400;  // Keep conservative; can raise later after stability.
const MAX_TOTAL_THREADS_PER_RUN = 1200;    // Hard cap across all rules.
const USE_BATCH_TRASH = true;              // Uses GmailApp.moveThreadsToTrash in batches.

// Optional: label candidates for server export (does not export).
const SERVER_EXPORT_LABEL = "ServerExport/Candidate"; // create in Gmail if you want this
const APPLY_SERVER_EXPORT_LABEL = true;

// If true, skip deleting any thread that has ANY label starting with "Retention/".
const SKIP_IF_ANY_RETENTION_LABEL = true;

// Additional “never delete” protections
const NEVER_DELETE_QUERY_SUFFIX = [
  "-is:starred",
  "-in:spam",
  "-in:trash"
  // Add more if desired, e.g. "-label:Review"
].join(" ");

// Retention label prefix
const RETENTION_PREFIX = "Retention/";

// ====== CATEGORY RULES ======
const CATEGORY_RULES = [
  // category, retentionDays, delete, serverArchivePolicy
  { category: "social",     retentionDays: 7,   delete: true,  serverArchive: "never" },
  { category: "forums",     retentionDays: 30,  delete: true,  serverArchive: "never" },
  { category: "updates",    retentionDays: 90,  delete: true,  serverArchive: "only_if_labeled" },
  { category: "promotions", retentionDays: 180, delete: true,  serverArchive: "never" },  // unless upgraded => handled by retention label
  { category: "primary",    retentionDays: null,delete: false, serverArchive: "only_if_labeled" }
];

// ====== ENTRYPOINT ======
function purgeByCategoryRetentionPolicy() {
  const started = new Date();
  Logger.log(`${DIAG_PREFIX}: purgeByCategoryRetentionPolicy() started`);
  Logger.log(`${DIAG_PREFIX}: DRY_RUN=${DRY_RUN}`);
  Logger.log(`${DIAG_PREFIX}: MAX_THREADS_PER_RULE_PER_RUN=${MAX_THREADS_PER_RULE_PER_RUN}, MAX_TOTAL_THREADS_PER_RUN=${MAX_TOTAL_THREADS_PER_RUN}`);

  // Preload retention labels if needed
  const retentionLabelNames = SKIP_IF_ANY_RETENTION_LABEL ? getAllUserLabelNamesWithPrefix_(RETENTION_PREFIX) : [];
  if (SKIP_IF_ANY_RETENTION_LABEL) {
    Logger.log(`${DIAG_PREFIX}: Found ${retentionLabelNames.length} retention labels with prefix "${RETENTION_PREFIX}"`);
  }

  // Optional server export label handle
  const serverExportLabel = (APPLY_SERVER_EXPORT_LABEL)
    ? getOrCreateLabel_(SERVER_EXPORT_LABEL)
    : null;

  let totalCandidates = 0;
  let totalDeleted = 0;
  let totalServerTagged = 0;

  for (const rule of CATEGORY_RULES) {
    // Primary: no auto delete
    if (!rule.delete || !rule.retentionDays) {
      Logger.log(`${DIAG_PREFIX}: Rule category=${rule.category}: delete disabled (retentionDays=${rule.retentionDays})`);
      continue;
    }

    // Query:
    // - category:<x>
    // - older_than:<Nd>
    // - never-delete suffix
    // - AND exclude threads already retention-labeled via label:-Retention/* not possible,
    //   so we do retention label exclusion in code.
    const q = `category:${rule.category} older_than:${rule.retentionDays}d ${NEVER_DELETE_QUERY_SUFFIX}`;
    Logger.log(`${DIAG_PREFIX}: Searching: ${q}`);

    const threads = GmailApp.search(q, 0, MAX_THREADS_PER_RULE_PER_RUN);
    Logger.log(`${DIAG_PREFIX}: category=${rule.category}: found ${threads.length} candidate threads (pre-retention-exclusion)`);

    // Enforce global cap
    if (totalCandidates >= MAX_TOTAL_THREADS_PER_RUN) {
      Logger.log(`${DIAG_PREFIX}: Global cap reached (totalCandidates=${totalCandidates}). Stopping.`);
      break;
    }

    // Filter out any retention-labeled threads
    const filtered = SKIP_IF_ANY_RETENTION_LABEL
      ? threads.filter(t => !threadHasAnyRetentionLabel_(t, retentionLabelNames))
      : threads;

    const cappedFiltered = filtered.slice(0, Math.max(0, MAX_TOTAL_THREADS_PER_RUN - totalCandidates));

    Logger.log(`${DIAG_PREFIX}: category=${rule.category}: ${cappedFiltered.length} threads remain after retention-label exclusion + global cap`);

    totalCandidates += cappedFiltered.length;

    // Optional: tag for server export when policy says "only if labeled"
    // Interpretation:
    // - We tag these candidates to export ONLY if they are retention-labeled.
    // - But note: we excluded retention-labeled threads from deletion. So for "only_if_labeled",
    //   server tagging typically happens elsewhere when you export.
    // Practical alternative:
    // - Tag *all* category:updates aged candidates (even if not retention-labeled) as "ServerExport/Candidate"
    //   if you want later review/export. Below does that only for Updates and only_if_labeled policies is ambiguous,
    //   so we implement a conservative interpretation: tag ONLY if retention-labeled (which we excluded).
    //
    // If you want tagging of non-retention-labeled Updates for later export/review, say so and I’ll flip logic.
    if (APPLY_SERVER_EXPORT_LABEL && serverExportLabel && rule.serverArchive === "only_if_labeled") {
      // Conservative: tag nothing here because we're excluding retention-labeled threads from this deletion set.
      // Leave as-is; server export tagging should occur in your export pipeline.
    }

    // Delete (move to trash)
    if (cappedFiltered.length === 0) continue;

    if (DRY_RUN) {
      Logger.log(`${DIAG_PREFIX}: DRY_RUN: Would trash ${cappedFiltered.length} threads for category=${rule.category}`);
      continue;
    }

    const deletedCount = trashThreads_(cappedFiltered);
    totalDeleted += deletedCount;

    Logger.log(`${DIAG_PREFIX}: Trashed ${deletedCount} threads for category=${rule.category}`);
  }

  const elapsedMs = new Date().getTime() - started.getTime();
  Logger.log(`${DIAG_PREFIX}: Done. totalCandidates=${totalCandidates}, totalDeleted=${totalDeleted}, totalServerTagged=${totalServerTagged}, elapsedMs=${elapsedMs}`);
}

// ====== HELPERS ======

function getAllUserLabelNamesWithPrefix_(prefix) {
  const labels = GmailApp.getUserLabels();
  return labels
    .map(l => l.getName())
    .filter(name => name.startsWith(prefix));
}

function threadHasAnyRetentionLabel_(thread, retentionLabelNames) {
  // Fast path: thread labels are usually few; compare by name
  const names = thread.getLabels().map(l => l.getName());
  for (const n of names) {
    // If you want ALL Retention/* to protect, this is enough:
    if (n.startsWith(RETENTION_PREFIX)) return true;

    // If you only want to protect specific retention labels, use retentionLabelNames set instead:
    // if (retentionLabelNames.includes(n)) return true;
  }
  return false;
}

function trashThreads_(threads) {
  if (!threads || threads.length === 0) return 0;

  if (USE_BATCH_TRASH) {
    // Batch to reduce API overhead
    const BATCH = 100;
    for (let i = 0; i < threads.length; i += BATCH) {
      const chunk = threads.slice(i, i + BATCH);
      GmailApp.moveThreadsToTrash(chunk);
    }
    return threads.length;
  } else {
    // Slow path
    threads.forEach(t => t.moveToTrash());
    return threads.length;
  }
}

function getOrCreateLabel_(name) {
  let label = GmailApp.getUserLabelByName(name);
  if (!label) label = GmailApp.createLabel(name);
  return label;
}



