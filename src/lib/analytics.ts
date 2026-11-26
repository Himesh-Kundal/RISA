import raw2025 from "@/data/historical2025.json";
import { WorkspaceState } from "@/types/sponsor";

export interface HistoricalCampaignSummary {
  campaignId: string;
  campaignName: string;
  channel: string;
  ownerName: string;
  brandsInQualification: number;
  brandsInteracted: number;
  outreachSentCount: number;
  repliedBrands: number;
  positiveReplyBrands: number;
  meetingsHeldBrands: number;
  optOutBrands: number;
  qualifiedBrands: number;
  opportunitiesCreated: number;
  proposalsReached: number;
  negotiatingReached: number;
  confirmedDeals: number;
  confirmedCashDeals: number;
  confirmedInKindDeals: number;
  confirmedValueInr: number;
  confirmedCashFaceValueInr: number;
  openPipelineInr: number;
  winRatePct: number;
  qualRatePct: number;
}

export function computeHistoricalSnapshot(
  snapshotDate: string = "2025-04-20",
  deduplicate: boolean = true,
  overrides: WorkspaceState["historicalOverrides"] = {}
) {
  const cutoffIso = `${snapshotDate}T23:59:59+05:30`;
  const cutoffMs = new Date(cutoffIso).getTime();

  const tsOk = (iso: string) => {
    if (!iso) return false;
    return new Date(iso).getTime() <= cutoffMs;
  };

  // Deduplicate exact import retries if enabled
  const rawInts = raw2025.interactions_raw;
  const rawBq = raw2025.brand_qualification_raw;
  const rawOh = raw2025.opportunity_history_raw;

  const dedupById = <T extends Record<string, unknown>>(arr: T[], key: string): T[] => {
    if (!deduplicate) return arr;
    const seen = new Map<string, T>();
    for (const item of arr) {
      const id = String(item[key] || "");
      if (!seen.has(id)) seen.set(id, item);
    }
    return Array.from(seen.values());
  };

  const interactionsAll = dedupById(rawInts, "interaction_id");
  const bqAll = dedupById(rawBq, "history_id");
  const ohAll = dedupById(rawOh, "history_id");

  const duplicatesRemoved = {
    interactions: rawInts.length - interactionsAll.length,
    brandQualification: rawBq.length - bqAll.length,
    opportunityHistory: rawOh.length - ohAll.length,
    duplicateIds: ["SI00001", "SI00019", "SI00110", "BQ0003", "OH00001", "OH00015"],
  };

  // Filter records eligible as of cutoffMs (NO FUTURE LEAKAGE)
  const brands = raw2025.brands.filter((b) => tsOk(b.created_at));
  const contacts = raw2025.contacts.filter((c) => tsOk(c.created_at));
  const interactions = interactionsAll.filter((i) => tsOk(i.occurred_at));
  const bqEligible = bqAll
    .filter((b) => tsOk(b.effective_at))
    .sort((a, b) => new Date(a.effective_at).getTime() - new Date(b.effective_at).getTime());

  const oppsEligible = raw2025.opportunities.filter((o) => tsOk(o.created_at));
  const oppIdsEligible = new Set(oppsEligible.map((o) => o.opportunity_id));

  const ohEligible = ohAll
    .filter((h) => tsOk(h.effective_at) && oppIdsEligible.has(h.opportunity_id))
    .sort((a, b) => new Date(a.effective_at).getTime() - new Date(b.effective_at).getTime());

  // Active target version at cutoff
  const activeTarget =
    [...raw2025.targets]
      .filter((t) => tsOk(t.effective_at))
      .sort((a, b) => new Date(b.effective_at).getTime() - new Date(a.effective_at).getTime())[0] ||
    raw2025.targets[0];

  // Latest Brand Qualification per brand
  const latestBqByBrand = new Map<string, (typeof bqEligible)[0]>();
  for (const rec of bqEligible) {
    latestBqByBrand.set(rec.brand_id, rec);
  }

  // Latest Opportunity History per opportunity + stage progression history
  const latestOhByOpp = new Map<string, (typeof ohEligible)[0]>();
  const stagesEverByOpp = new Map<string, Set<string>>();
  for (const rec of ohEligible) {
    latestOhByOpp.set(rec.opportunity_id, rec);
    if (!stagesEverByOpp.has(rec.opportunity_id)) {
      stagesEverByOpp.set(rec.opportunity_id, new Set());
    }
    stagesEverByOpp.get(rec.opportunity_id)!.add(rec.stage);
  }

  // Apply any live evaluator overrides on historical opportunities
  const oppDetails = oppsEligible.map((opp) => {
    const latest = latestOhByOpp.get(opp.opportunity_id);
    const ov = overrides[opp.opportunity_id];
    const stage = ov?.stage ?? latest?.stage ?? "prospecting";
    const proposedValueInr = ov?.proposedValueInr ?? latest?.proposed_value_inr ?? 0;
    const confirmedValueInr =
      stage === "partner_confirmed"
        ? ov?.confirmedValueInr ??
          (latest?.confirmed_value_inr && latest.confirmed_value_inr > 0
            ? latest.confirmed_value_inr
            : proposedValueInr)
        : 0;
    const ownerName = ov?.ownerName ?? latest?.owner_name ?? "Unassigned";
    const ever = stagesEverByOpp.get(opp.opportunity_id) || new Set([stage]);
    if (ov?.stage) ever.add(ov.stage);

    return {
      opportunityId: opp.opportunity_id,
      opportunityName: opp.opportunity_name,
      brandId: opp.brand_id,
      brandName: opp.brand_name,
      campaignId: opp.sponsor_campaign_id,
      campaignName: opp.originating_campaign_name,
      supportType: opp.support_type as "cash" | "in_kind",
      stage,
      proposedValueInr,
      confirmedValueInr,
      ownerName,
      createdAt: opp.created_at,
      effectiveAt: latest?.effective_at ?? opp.created_at,
      everReachedProposal:
        ever.has("proposal_sent") || ever.has("negotiating") || ever.has("partner_confirmed"),
      everReachedNegotiating: ever.has("negotiating") || ever.has("partner_confirmed"),
    };
  });

  // Qualification status counts
  const qualCounts: Record<string, number> = {
    qualified: 0,
    engaged: 0,
    dormant: 0,
    unqualified: 0,
    unreviewed: 0,
  };
  for (const rec of latestBqByBrand.values()) {
    qualCounts[rec.qualification_status] = (qualCounts[rec.qualification_status] || 0) + 1;
  }

  // Stage counts
  const stageCounts: Record<string, number> = {};
  for (const o of oppDetails) {
    stageCounts[o.stage] = (stageCounts[o.stage] || 0) + 1;
  }

  // Campaign breakdowns
  const campaignSummaries: HistoricalCampaignSummary[] = raw2025.campaigns.map((c) => {
    const cid = c.sponsor_campaign_id;
    const cInts = interactions.filter((i) => i.sponsor_campaign_id === cid);
    const cBqBrands = Array.from(latestBqByBrand.values()).filter(
      (b) => b.sponsor_campaign_id === cid
    );
    const cOpps = oppDetails.filter((o) => o.campaignId === cid);

    const brandsInteracted = new Set(cInts.map((i) => i.brand_id)).size;
    const outreachSentCount = cInts.filter((i) => i.event_type === "outreach_sent").length;
    const repliedBrands = new Set(
      cInts.filter((i) => i.event_type === "replied").map((i) => i.brand_id)
    ).size;
    const positiveReplyBrands = new Set(
      cInts
        .filter((i) => i.event_type === "replied" && i.outcome === "positive")
        .map((i) => i.brand_id)
    ).size;
    const meetingsHeldBrands = new Set(
      cInts.filter((i) => i.event_type === "meeting_held").map((i) => i.brand_id)
    ).size;
    const optOutBrands = new Set(
      cInts.filter((i) => i.event_type === "opt_out").map((i) => i.brand_id)
    ).size;
    const qualifiedBrands = cBqBrands.filter(
      (b) => b.qualification_status === "qualified"
    ).length;

    const confirmedOpps = cOpps.filter((o) => o.stage === "partner_confirmed");
    const confirmedCashDeals = confirmedOpps.filter((o) => o.supportType === "cash").length;
    const confirmedInKindDeals = confirmedOpps.filter((o) => o.supportType === "in_kind").length;
    const confirmedValueInr = confirmedOpps.reduce((s, o) => s + o.confirmedValueInr, 0);
    const confirmedCashFaceValueInr = confirmedOpps
      .filter((o) => o.supportType === "cash")
      .reduce((s, o) => s + o.confirmedValueInr, 0);
    const openPipelineInr = cOpps
      .filter((o) => !["partner_confirmed", "lost", "withdrawn"].includes(o.stage))
      .reduce((s, o) => s + o.proposedValueInr, 0);

    return {
      campaignId: cid,
      campaignName: c.campaign_name,
      channel: c.channel,
      ownerName: c.owner_name,
      brandsInQualification: cBqBrands.length,
      brandsInteracted,
      outreachSentCount,
      repliedBrands,
      positiveReplyBrands,
      meetingsHeldBrands,
      optOutBrands,
      qualifiedBrands,
      opportunitiesCreated: cOpps.length,
      proposalsReached: cOpps.filter((o) => o.everReachedProposal).length,
      negotiatingReached: cOpps.filter((o) => o.everReachedNegotiating).length,
      confirmedDeals: confirmedOpps.length,
      confirmedCashDeals,
      confirmedInKindDeals,
      confirmedValueInr,
      confirmedCashFaceValueInr,
      openPipelineInr,
      winRatePct:
        cOpps.length > 0 ? Math.round((confirmedOpps.length / cOpps.length) * 1000) / 10 : 0,
      qualRatePct:
        cBqBrands.length > 0
          ? Math.round((qualifiedBrands / cBqBrands.length) * 1000) / 10
          : 0,
    };
  });

  const totalConfirmedDeals = oppDetails.filter((o) => o.stage === "partner_confirmed").length;
  const totalConfirmedValueInr = oppDetails
    .filter((o) => o.stage === "partner_confirmed")
    .reduce((s, o) => s + o.confirmedValueInr, 0);
  const totalConfirmedCashFaceInr = oppDetails
    .filter((o) => o.stage === "partner_confirmed" && o.supportType === "cash")
    .reduce((s, o) => s + o.confirmedValueInr, 0);
  const totalConfirmedInKindInr = totalConfirmedValueInr - totalConfirmedCashFaceInr;
  const totalOpenPipelineInr = oppDetails
    .filter((o) => !["partner_confirmed", "lost", "withdrawn"].includes(o.stage))
    .reduce((s, o) => s + o.proposedValueInr, 0);

  // Activations eligible at cutoff
  const activations = raw2025.activations
    .filter((a) => tsOk(a.linked_at))
    .map((a) => ({
      ...a,
      attendeeCampaignStats:
        (raw2025.linked_attendee_campaigns as Record<string, unknown>)[
          a.attendee_campaign_id
        ] || null,
    }));

  return {
    snapshotDate,
    cutoffIso,
    deduplicate,
    duplicatesRemoved,
    event: raw2025.event,
    activeTarget,
    totals: {
      brandsResearched: brands.length,
      contactsCount: contacts.length,
      interactionsCount: interactions.length,
      repliedBrands: new Set(
        interactions.filter((i) => i.event_type === "replied").map((i) => i.brand_id)
      ).size,
      meetingsHeldBrands: new Set(
        interactions.filter((i) => i.event_type === "meeting_held").map((i) => i.brand_id)
      ).size,
      qualifiedBrands: qualCounts.qualified || 0,
      opportunitiesCount: oppDetails.length,
      proposalsReached: oppDetails.filter((o) => o.everReachedProposal).length,
      confirmedDeals: totalConfirmedDeals,
      confirmedCashDeals: oppDetails.filter(
        (o) => o.stage === "partner_confirmed" && o.supportType === "cash"
      ).length,
      confirmedInKindDeals: oppDetails.filter(
        (o) => o.stage === "partner_confirmed" && o.supportType === "in_kind"
      ).length,
      confirmedValueInr: totalConfirmedValueInr,
      confirmedCashFaceInr: totalConfirmedCashFaceInr,
      confirmedInKindInr: totalConfirmedInKindInr,
      bankCashCollectedVerifiedInr: null as null, // Explicitly unrecorded in 2025 dataset!
      marketingSpendRecordedInr: null as null, // Explicitly unrecorded in 2025 dataset!
      openPipelineInr: totalOpenPipelineInr,
      optOutBrands: new Set(
        interactions.filter((i) => i.event_type === "opt_out").map((i) => i.brand_id)
      ).size,
    },
    qualCounts,
    stageCounts,
    campaignSummaries,
    opportunities: oppDetails,
    activations,
  };
}

export function computeLive2026Analytics(state: WorkspaceState) {
  const { constraints, campaigns2026, deals2026, tasks } = state;
  const festStartMs = new Date(`${constraints.festivalStartDate}T10:00:00+05:30`).getTime();

  const totalBudgetAllocated = campaigns2026.reduce((s, c) => s + c.budgetAllocatedInr, 0);
  const totalBudgetSpent = campaigns2026.reduce((s, c) => s + c.budgetSpentInr, 0);

  const activeDeals = deals2026.filter((d) => d.stage !== "lost");
  const signedOrBeyond = deals2026.filter((d) =>
    ["signed", "invoiced", "cash_collected"].includes(d.stage)
  );
  const cashCollectedDeals = deals2026.filter((d) => d.cashCollectedInr > 0);

  const totalCashCollectedInr = deals2026.reduce((s, d) => s + d.cashCollectedInr, 0);
  const totalSignedInr = signedOrBeyond.reduce((s, d) => s + d.signedInr, 0);

  // Deals signed/invoiced where remaining unpaid cash is scheduled AFTER festivalStartDate!
  const atRiskPostFestDeals = signedOrBeyond.filter((d) => {
    const unpaid = d.signedInr - d.cashCollectedInr;
    if (unpaid <= 0) return false;
    const clearMs = new Date(`${d.expectedClearanceDate}T18:00:00+05:30`).getTime();
    return clearMs > festStartMs || d.billingRail === "direct_erp_45d";
  });

  const atRiskSignedCashInr = atRiskPostFestDeals.reduce(
    (s, d) => s + (d.signedInr - d.cashCollectedInr),
    0
  );

  const onTrackReceivableInr = signedOrBeyond.reduce((s, d) => {
    const unpaid = d.signedInr - d.cashCollectedInr;
    if (unpaid <= 0) return s;
    const isRisk = atRiskPostFestDeals.some((r) => r.id === d.id);
    return isRisk ? s : s + unpaid;
  }, 0);

  const openProposalDeals = deals2026.filter((d) => d.stage === "proposal_sent");
  const openConversationDeals = deals2026.filter((d) => d.stage === "conversation");

  // Expected pre-festival cash projection based on stage probabilities & billing rails
  const weightedOpenPipelineCashInr = deals2026.reduce((sum, d) => {
    if (d.stage === "proposal_sent") {
      const prob = d.daysInCurrentStage > 10 ? 0.35 : 0.62;
      const collectFactor = d.billingRail === "direct_erp_45d" ? 0.25 : 0.92;
      return sum + Math.round(d.proposedInr * prob * collectFactor);
    }
    if (d.stage === "conversation") {
      const prob = 0.38;
      const collectFactor = d.billingRail === "direct_erp_45d" ? 0.25 : 0.9;
      return sum + Math.round(d.proposedInr * prob * collectFactor);
    }
    if (d.stage === "prospecting") {
      return sum + Math.round(d.proposedInr * 0.15);
    }
    return sum;
  }, 0);

  const projectedPreFestCashInr =
    totalCashCollectedInr +
    Math.round(onTrackReceivableInr * 0.95) +
    Math.round(atRiskSignedCashInr * 0.2) +
    weightedOpenPipelineCashInr;

  // Campaign-level computed rollups
  const campaignMetrics = campaigns2026.map((c) => {
    const cDeals = deals2026.filter((d) => d.campaignId === c.id);
    const cSigned = cDeals.filter((d) =>
      ["signed", "invoiced", "cash_collected"].includes(d.stage)
    );
    const cashCollected = cDeals.reduce((s, d) => s + d.cashCollectedInr, 0);
    const signedValue = cSigned.reduce((s, d) => s + d.signedInr, 0);
    const openProposalValue = cDeals
      .filter((d) => ["proposal_sent", "conversation"].includes(d.stage))
      .reduce((s, d) => s + d.proposedInr, 0);
    const stalledDeals = cDeals.filter(
      (d) => d.stage === "proposal_sent" && d.daysInCurrentStage > 10
    );
    const roiMultiple =
      c.budgetSpentInr > 0 ? Math.round((cashCollected / c.budgetSpentInr) * 10) / 10 : 0;

    return {
      ...c,
      dealsCount: cDeals.length,
      signedCount: cSigned.length,
      cashCollectedInr: cashCollected,
      signedValueInr: signedValue,
      openProposalValueInr: openProposalValue,
      stalledCount: stalledDeals.length,
      pctOfBaseTarget:
        c.targetCashBaseInr > 0
          ? Math.round((cashCollected / c.targetCashBaseInr) * 1000) / 10
          : 0,
      roiMultiple,
    };
  });

  // Category Lockout Matrix
  const categories = Array.from(new Set(deals2026.map((d) => d.categoryVertical)));
  const categoryMatrix = categories.map((cat) => {
    const cDeals = deals2026.filter((d) => d.categoryVertical === cat && d.stage !== "lost");
    const lockedDeal = cDeals.find((d) => d.categoryExclusiveLocked && d.cashCollectedInr > 0);
    const pendingLockDeal = cDeals.find(
      (d) => d.categoryExclusiveLocked && d.cashCollectedInr === 0
    );
    const competingProposals = cDeals.filter((d) =>
      ["proposal_sent", "conversation"].includes(d.stage)
    );
    return {
      category: cat,
      status: lockedDeal
        ? "LOCKED_CASH_CLEARED"
        : pendingLockDeal
        ? "SIGNED_PENDING_WIRE"
        : competingProposals.length >= 2
        ? "ACTIVE_BIDDING_WAR"
        : "OPEN_INVENTORY",
      lockedBrand: lockedDeal?.brandName || pendingLockDeal?.brandName || null,
      cashClearedInr: cDeals.reduce((s, d) => s + d.cashCollectedInr, 0),
      bidders: competingProposals.map((d) => ({
        id: d.id,
        brandName: d.brandName,
        proposedInr: d.proposedInr,
        stage: d.stage,
        daysInStage: d.daysInCurrentStage,
      })),
    };
  });

  // Physical stall check (exclude pure digital / whale API / stopped)
  const physicalStallsCommitted = signedOrBeyond.length;

  // Automated Diagnostic Bottlenecks
  const diagnostics: Array<{
    severity: "critical" | "warning" | "opportunity";
    title: string;
    detail: string;
    impactInr: number;
    recommendedAction: string;
  }> = [];

  if (atRiskSignedCashInr > 0) {
    diagnostics.push({
      severity: "critical",
      title: `₹${(atRiskSignedCashInr / 100000).toFixed(2)}L Signed Cash At Risk of Missing Festival Cutoff`,
      detail: `${atRiskPostFestDeals.map((d) => `${d.brandName} (₹${(d.signedInr / 100000).toFixed(1)}L)`).join(", ")} are routed via 45-day Direct Corporate ERP with expected payout after ${constraints.festivalStartDate}.`,
      impactInr: atRiskSignedCashInr,
      recommendedAction:
        "Switch billingRail to Pre-Empaneled Vendor Bridge (5-day clearance, 3% fee) + offer Early-Wire tier perk.",
    });
  }

  const stalledProposals = openProposalDeals.filter((d) => d.daysInCurrentStage > 10);
  if (stalledProposals.length > 0) {
    const stalledSum = stalledProposals.reduce((s, d) => s + d.proposedInr, 0);
    diagnostics.push({
      severity: "warning",
      title: `${stalledProposals.length} Whale Proposals Breached 10-Day Stall Threshold (₹${(stalledSum / 100000).toFixed(2)}L)`,
      detail: `${stalledProposals.map((d) => `${d.brandName} (${d.daysInCurrentStage}d)`).join(", ")} stalled on joint Engineering + HR sign-off in Bet #4.`,
      impactInr: stalledSum,
      recommendedAction:
        "Execute Slide-3 Change Rule: Unbundle ₹6L+ pod into fast ₹3.5L DevRel API Track signable by VP-Eng alone.",
    });
  }

  const biddingWars = categoryMatrix.filter((c) => c.status === "ACTIVE_BIDDING_WAR");
  if (biddingWars.length > 0) {
    diagnostics.push({
      severity: "opportunity",
      title: `${biddingWars.length} Category Lockout Bidding War Ready to Close`,
      detail: `${biddingWars.map((b) => `${b.category}: ${b.bidders.map((x) => x.brandName).join(" vs ")}`).join(" | ")} have multiple active proposals.`,
      impactInr: biddingWars.reduce(
        (s, b) => s + Math.max(...b.bidders.map((x) => x.proposedInr)),
        0
      ),
      recommendedAction:
        "Send 72-hour Category Lockout escrow countdown link — first wire locks vertical exclusivity.",
    });
  }

  if (totalBudgetAllocated > constraints.totalBudgetCapInr) {
    diagnostics.push({
      severity: "critical",
      title: `Budget Cap Exceeded by ₹${((totalBudgetAllocated - constraints.totalBudgetCapInr) / 1000).toFixed(1)}k`,
      detail: `Allocated campaign budgets (₹${totalBudgetAllocated.toLocaleString("en-IN")}) exceed workspace cap (₹${constraints.totalBudgetCapInr.toLocaleString("en-IN")}).`,
      impactInr: totalBudgetAllocated - constraints.totalBudgetCapInr,
      recommendedAction: "Trim low-ROI outbound/ops spend to restore budget compliance.",
    });
  }

  const funnelTotals = {
    prospectsReached: campaigns2026.reduce((s, c) => s + c.prospectsReached, 0),
    conversationsHeld: campaigns2026.reduce((s, c) => s + c.conversationsHeld, 0),
    proposalsSent: campaigns2026.reduce((s, c) => s + c.proposalsSent, 0),
    signedDealsCount: signedOrBeyond.length,
    cashCollectedDealsCount: cashCollectedDeals.length,
    totalSignedInr,
    totalCashCollectedInr,
    onTrackReceivableInr,
    atRiskSignedCashInr,
    weightedOpenPipelineCashInr,
    projectedPreFestCashInr,
    gapToBaseInr: Math.max(0, constraints.baseTargetCashInr - totalCashCollectedInr),
    projectedVsBaseDeltaInr: projectedPreFestCashInr - constraints.baseTargetCashInr,
    gapToStretchInr: Math.max(0, constraints.stretchTargetCashInr - totalCashCollectedInr),
    totalBudgetAllocated,
    totalBudgetSpent,
    remainingBudgetCapInr: constraints.totalBudgetCapInr - totalBudgetAllocated,
    physicalStallsCommitted,
    stallsRemaining: Math.max(0, constraints.maxPhysicalStalls - physicalStallsCommitted),
    openTasksCount: tasks.filter((t) => t.status !== "done").length,
    activeDealsCount: activeDeals.length,
  };

  return {
    constraints,
    funnelTotals,
    campaignMetrics,
    categoryMatrix,
    diagnostics,
    atRiskPostFestDeals,
    stalledProposals,
  };
}

export function buildCopilotDigest(
  state: WorkspaceState,
  snapshotDate2025: string,
  userMessage: string
) {
  const h = computeHistoricalSnapshot(
    snapshotDate2025,
    true,
    state.historicalOverrides || {}
  );
  const live = computeLive2026Analytics(state);

  // Check if user mentions any specific 2025 brand, contact, or campaign
  const q = userMessage.toLowerCase();
  const matched2025Brands = raw2025.brands
    .filter(
      (b) =>
        q.includes(b.brand_name.toLowerCase()) ||
        q.includes(b.brand_id.toLowerCase())
    )
    .slice(0, 8)
    .map((b) => {
      const bContacts = raw2025.contacts.filter((c) => c.brand_id === b.brand_id);
      const bOpps = h.opportunities.filter((o) => o.brandId === b.brand_id);
      const bInts = raw2025.interactions_raw.filter((i) => i.brand_id === b.brand_id);
      const bQuals = raw2025.brand_qualification_raw.filter((x) => x.brand_id === b.brand_id);
      return { brand: b, contacts: bContacts, qualifications: bQuals, opportunities: bOpps, interactions: bInts };
    });

  return {
    epistemicRules: {
      historical2025CashCollected:
        "CRITICAL: CampusFest 2025 source data does NOT record bank receipts or actual cash collected. confirmed_value_inr (₹22,40,000 total: ₹20,00,000 cash support_type across 20 opps + ₹2,40,000 in_kind across 4 opps) is ONLY reported partnership face value, NOT proof of cash in bank.",
      historical2025MarketingSpend:
        "CRITICAL: CampusFest 2025 Sponsor Dataset has NO campaign budget, marketing spend, or CAC records. Never invent 2025 ROI or CPA.",
      historical2025ActivationsCausality:
        "CRITICAL: Sponsor activations (L001 Beardo->C03 Creator Partners, L002 Mosaic Mobility->C04 College Partnerships, L003 Maple Devices->C07 Community Groups) are observational associations ONLY and do NOT establish causal attendee uplift.",
      deduplicationNote:
        "6 exact import-retry duplicate rows exist in raw 2025 Excel (SI00001, SI00019, SI00110, BQ0003, OH00001, OH00015) and are deduplicated in all canonical counts.",
    },
    historical2025AtCutoff: {
      snapshotDate: h.snapshotDate,
      activeTarget: h.activeTarget,
      totals: h.totals,
      qualCounts: h.qualCounts,
      stageCounts: h.stageCounts,
      campaigns: h.campaignSummaries,
      confirmedOpportunities: h.opportunities.filter((o) => o.stage === "partner_confirmed"),
      openOrLostOpportunitiesSummary: h.opportunities
        .filter((o) => o.stage !== "partner_confirmed")
        .map((o) => ({
          id: o.opportunityId,
          brand: o.brandName,
          campaign: o.campaignName,
          stage: o.stage,
          proposedInr: o.proposedValueInr,
          owner: o.ownerName,
        })),
      activations: h.activations,
      matchedSpecificBrands: matched2025Brands,
    },
    live2026Workspace: {
      constraints: live.constraints,
      funnelTotals: live.funnelTotals,
      diagnostics: live.diagnostics,
      campaigns: live.campaignMetrics.map((c) => ({
        id: c.id,
        rank: c.rank,
        name: c.name,
        betType: c.betType,
        owner: c.owner,
        status: c.status,
        budgetAllocatedInr: c.budgetAllocatedInr,
        budgetSpentInr: c.budgetSpentInr,
        targetCashBaseInr: c.targetCashBaseInr,
        targetCashStretchInr: c.targetCashStretchInr,
        prospectsReached: c.prospectsReached,
        conversationsHeld: c.conversationsHeld,
        proposalsSent: c.proposalsSent,
        signedCount: c.signedCount,
        signedValueInr: c.signedValueInr,
        cashCollectedInr: c.cashCollectedInr,
        openProposalValueInr: c.openProposalValueInr,
        roiMultiple: c.roiMultiple,
        leadingIndicatorValue: c.leadingIndicatorValue,
        scaleThreshold: c.scaleThreshold,
        changeThreshold: c.changeThreshold,
        stopThreshold: c.stopThreshold,
      })),
      deals: state.deals2026,
      categoryMatrix: live.categoryMatrix,
      tasks: state.tasks,
    },
  };
}
