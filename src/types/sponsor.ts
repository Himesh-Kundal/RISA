export type CampaignStatus = "scaling" | "active" | "pivot_required" | "stopped";

export type DealStage2026 =
  | "prospecting"
  | "conversation"
  | "proposal_sent"
  | "signed"
  | "invoiced"
  | "cash_collected"
  | "lost";

export type BillingRail =
  | "vendor_bridge_5d"
  | "razorpay_instant"
  | "direct_erp_45d";

export interface Campaign2026 {
  id: string;
  rank: number;
  name: string;
  shortName: string;
  betType: "double_down" | "selective_bet" | "automated" | "baseline" | "deprioritized";
  channel: string;
  owner: string;
  budgetAllocatedInr: number;
  budgetSpentInr: number;
  targetCashBaseInr: number;
  targetCashStretchInr: number;
  prospectsTarget: number;
  prospectsReached: number;
  conversationsHeld: number;
  proposalsSent: number;
  status: CampaignStatus;
  timelineWeeks: string;
  criticalVariable: string;
  biggestRisk: string;
  leadingIndicatorName: string;
  leadingIndicatorValue: string;
  scaleThreshold: string;
  changeThreshold: string;
  stopThreshold: string;
  nextAdaptationAction: string;
  prioritization: {
    cashImpact: number; // 1-10
    preFestVelocity: number; // 1-10
    confidence: number; // 0-1
    effortWeeks: number;
    score: number;
  };
}

export interface Deal2026 {
  id: string;
  brandName: string;
  segment: "A_Tech_Whale" | "B_Consumer_CAC" | "C_D2C_Exclusivity" | "D_SelfServe_Booth";
  categoryVertical: string;
  campaignId: string;
  owner: string;
  contactName: string;
  contactRole: string;
  stage: DealStage2026;
  supportType: "cash" | "in_kind";
  proposedInr: number;
  signedInr: number;
  cashCollectedInr: number;
  billingRail: BillingRail;
  earlyWireIncentiveApplied: boolean;
  campusPassQuestLive: boolean;
  categoryExclusiveLocked: boolean;
  daysInCurrentStage: number;
  expectedClearanceDate: string; // YYYY-MM-DD
  notes: string;
  updatedAt: string;
}

export interface ExecutionTask {
  id: string;
  title: string;
  description: string;
  campaignId: string;
  dealId?: string;
  owner: string;
  priority: "P0_Critical" | "P1_High" | "P2_Normal";
  status: "todo" | "in_progress" | "done";
  dueDate: string;
  createdBy: "team" | "ai_copilot";
  createdAt: string;
}

export interface WorkspaceConstraints {
  city: string;
  festivalName: string;
  festivalStartDate: string; // 2026-04-12
  currentSprintDate: string; // 2026-03-08 (D-35)
  totalBudgetCapInr: number; // 350000
  maxPhysicalStalls: number; // 38
  salesTeamHeadcount: number; // 5
  baseTargetCashInr: number; // 8100000
  stretchTargetCashInr: number; // 13200000
}

export interface HistoricalOverride {
  opportunityId: string;
  stage?: string;
  proposedValueInr?: number;
  confirmedValueInr?: number;
  ownerName?: string;
  updatedAt: string;
}

export interface WorkspaceState {
  workspaceKey: string;
  constraints: WorkspaceConstraints;
  campaigns2026: Campaign2026[];
  deals2026: Deal2026[];
  tasks: ExecutionTask[];
  historicalOverrides: Record<string, HistoricalOverride>;
  updatedAt: string;
}

export interface CopilotActionProposal {
  id: string;
  type:
    | "create_task"
    | "update_deal_stage"
    | "reallocate_budget"
    | "update_campaign_status"
    | "switch_billing_rail";
  label: string;
  rationale: string;
  payload: Record<string, unknown>;
}
