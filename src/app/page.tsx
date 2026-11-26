"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  AlertOctagon,
  Zap,
  Layers,
  CheckSquare,
  Database,
  RefreshCw,
  Plus,
  Lock,
  Flame,
  ArrowRight,
  Sliders,
  Bot,
  PanelRightClose,
  PanelRightOpen,
  IndianRupee,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import AiCopilot from "@/components/AiCopilot";
import Historical2025View from "@/components/Historical2025View";
import {
  BillingRail,
  CampaignStatus,
  CopilotActionProposal,
  Deal2026,
  DealStage2026,
  ExecutionTask,
  WorkspaceState,
} from "@/types/sponsor";

type ActiveTab = "command" | "bets" | "execution" | "audit2025";

function fmtLakhs(inr: number) {
  return `₹${(inr / 100000).toFixed(2)}L`;
}

export default function SponsorBossPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("command");
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [snapshotDate2025, setSnapshotDate2025] = useState("2025-04-20");
  const [dedup2025, setDedup2025] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storageMode, setStorageMode] = useState<string>("mongodb_atlas");
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [liveAnalytics, setLiveAnalytics] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [historical2025, setHistorical2025] = useState<any>(null);

  // Deal & Task Filters + Quick Add Forms
  const [dealStageFilter, setDealStageFilter] = useState<string>("ALL");
  const [dealCampaignFilter, setDealCampaignFilter] = useState<string>("ALL");
  const [showNewDealForm, setShowNewDealForm] = useState(false);
  const [newDeal, setNewDeal] = useState({
    brandName: "",
    segment: "B_Consumer_CAC" as Deal2026["segment"],
    categoryVertical: "Quick-Commerce",
    campaignId: "B01",
    owner: "Riya Kapoor",
    contactName: "",
    contactRole: "Head of Growth",
    stage: "proposal_sent" as DealStage2026,
    proposedInr: 300000,
    billingRail: "vendor_bridge_5d" as BillingRail,
  });

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskOwner, setNewTaskOwner] = useState("Riya Kapoor");
  const [newTaskCampaign, setNewTaskCampaign] = useState("B01");
  const [newTaskPriority, setNewTaskPriority] =
    useState<ExecutionTask["priority"]>("P1_High");

  const fetchAll = useCallback(
    async (snap = snapshotDate2025, dd = dedup2025) => {
      const res = await fetch(
        `/api/workspace?snapshotDate=${encodeURIComponent(snap)}&dedup=${dd}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setStorageMode(data.storageMode);
      setWorkspace(data.state);
      setLiveAnalytics(data.liveAnalytics);
      setHistorical2025(data.historical2025);
      setLoading(false);
    },
    [snapshotDate2025, dedup2025]
  );

  useEffect(() => {
    fetchAll(snapshotDate2025, dedup2025);
  }, [fetchAll, snapshotDate2025, dedup2025]);

  const mutateWorkspace = async (action: string, payload: unknown) => {
    setSaving(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          payload,
          snapshotDate: snapshotDate2025,
          dedup: dedup2025,
        }),
      });
      const data = await res.json();
      if (data.state) {
        setStorageMode(data.storageMode);
        setWorkspace(data.state);
        setLiveAnalytics(data.liveAnalytics);
        setHistorical2025(data.historical2025);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopilotAction = async (proposal: CopilotActionProposal) => {
    await mutateWorkspace("execute_copilot_action", {
      type: proposal.type,
      actionPayload: proposal.payload,
    });
  };

  if (loading || !workspace || !liveAnalytics || !historical2025) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-sm font-medium">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
          Initializing SPONSOR-BOSS Command Center & MongoDB Atlas...
        </div>
      </div>
    );
  }

  const ft = liveAnalytics.funnelTotals;
  const pctToBase = Math.min(
    100,
    Math.round((ft.totalCashCollectedInr / workspace.constraints.baseTargetCashInr) * 100)
  );
  const pctProjectedToBase = Math.min(
    140,
    Math.round(
      (ft.projectedPreFestCashInr / workspace.constraints.baseTargetCashInr) * 100
    )
  );

  const funnelChartData = [
    { stage: "Prospects", count: ft.prospectsReached, fill: "#64748b" },
    { stage: "Conversations", count: ft.conversationsHeld, fill: "#0ea5e9" },
    { stage: "Proposals", count: ft.proposalsSent, fill: "#6366f1" },
    { stage: "Signed Deals", count: ft.signedDealsCount, fill: "#8b5cf6" },
    { stage: "Cash Cleared", count: ft.cashCollectedDealsCount, fill: "#10b981" },
  ];

  const campCashChart = liveAnalytics.campaignMetrics
    .filter((c: { id: string }) => c.id !== "DEP01")
    .map(
      (c: {
        shortName: string;
        cashCollectedInr: number;
        targetCashBaseInr: number;
        openProposalValueInr: number;
      }) => ({
        name: c.shortName,
        Collected: Math.round((c.cashCollectedInr / 100000) * 100) / 100,
        BaseTarget: Math.round((c.targetCashBaseInr / 100000) * 100) / 100,
        OpenPipe: Math.round((c.openProposalValueInr / 100000) * 100) / 100,
      })
    );

  const filteredDeals = workspace.deals2026.filter((d) => {
    if (dealStageFilter !== "ALL" && d.stage !== dealStageFilter) return false;
    if (dealCampaignFilter !== "ALL" && d.campaignId !== dealCampaignFilter) return false;
    return true;
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      {/* Top Command Bar */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-5 py-2.5 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-500 font-extrabold text-sm shadow">
            SB
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold tracking-tight">
                SPONSOR-BOSS
              </h1>
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-300 border border-indigo-400/30">
                {workspace.constraints.city} · D-35 Pre-Fest
              </span>
              <span
                className={`rounded px-2 py-0.5 font-mono text-[10px] font-medium ${
                  storageMode === "mongodb_atlas"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {storageMode === "mongodb_atlas" ? "MongoDB Atlas Live" : "Local State"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Challenge B: Maximize Pre-Festival Cash Collected · Author: Himesh Kundal
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800">
          {[
            { id: "command", label: "1. Cash Command", icon: TrendingUp },
            { id: "bets", label: "2. Bets & Guardrails", icon: Layers },
            {
              id: "execution",
              label: `3. Deals & Tasks (${ft.openTasksCount})`,
              icon: CheckSquare,
            },
            { id: "audit2025", label: "4. 2025 Source Audit", icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {saving && (
            <span className="inline-flex items-center gap-1 text-[11px] text-indigo-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing...
            </span>
          )}
          <a
            href="/Himesh_Kundal_RISA_Growth_APM_Strategy.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-200 hover:bg-indigo-500/20"
          >
            3-Slide PDF ↗
          </a>
          <button
            type="button"
            onClick={() => mutateWorkspace("reset_workspace", {})}
            title="Restore initial clean demo data in MongoDB"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-3 w-3" /> Reset Demo
          </button>
          <button
            type="button"
            onClick={() => setCopilotOpen(!copilotOpen)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
          >
            <Bot className="h-3.5 w-3.5" />
            {copilotOpen ? (
              <>
                Hide Copilot <PanelRightClose className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                AI Copilot <PanelRightOpen className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Analytical & Execution Canvas */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === "audit2025" ? (
            <Historical2025View
              data={historical2025}
              snapshotDate={snapshotDate2025}
              dedup={dedup2025}
              onSnapshotChange={setSnapshotDate2025}
              onDedupToggle={setDedup2025}
              onMutateHistoricalOpp={(payload) =>
                mutateWorkspace("update_historical_opp", payload)
              }
            />
          ) : (
            <>
              {/* Global North-Star Cash Strip (Visible across 2026 tabs) */}
              <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-6">
                <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3.5 shadow-sm">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800">
                    <span>Bank Cash Cleared</span>
                    <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-emerald-950">
                    {fmtLakhs(ft.totalCashCollectedInr)}
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-emerald-200/70">
                    <div
                      className="h-1.5 rounded-full bg-emerald-600 transition-all"
                      style={{ width: `${pctToBase}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] font-medium text-emerald-700">
                    {pctToBase}% of {fmtLakhs(workspace.constraints.baseTargetCashInr)} Base ({ft.cashCollectedDealsCount} deals wired)
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-3.5 shadow-sm">
                  <div className="text-[11px] font-semibold text-indigo-800">
                    Projected Pre-Fest Cash
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-indigo-950">
                    {fmtLakhs(ft.projectedPreFestCashInr)}
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-indigo-700">
                    {pctProjectedToBase}% of Base · Stretch:{" "}
                    {fmtLakhs(workspace.constraints.stretchTargetCashInr)}
                  </div>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-sm">
                  <div className="text-[11px] font-semibold text-rose-800">
                    At-Risk Signed (Post-Fest ERP)
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-rose-700">
                    {fmtLakhs(ft.atRiskSignedCashInr)}
                  </div>
                  <div className="mt-1 text-[11px] text-rose-700">
                    {liveAnalytics.atRiskPostFestDeals.length} signed deals clearing &gt; Apr 12
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <div className="text-[11px] font-medium text-slate-500">
                    Total Signed Contracts
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-900">
                    {fmtLakhs(ft.totalSignedInr)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {ft.signedDealsCount} signed · +
                    {fmtLakhs(ft.weightedOpenPipelineCashInr)} weighted pipe
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <div className="text-[11px] font-medium text-slate-500">
                    Campaign Spend / Cap
                  </div>
                  <div className="mt-1 text-xl font-extrabold text-slate-900">
                    ₹{(ft.totalBudgetSpent / 1000).toFixed(0)}k{" "}
                    <span className="text-xs font-semibold text-slate-400">
                      / ₹{(workspace.constraints.totalBudgetCapInr / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-700 font-medium">
                    {(ft.totalCashCollectedInr / Math.max(1, ft.totalBudgetSpent)).toFixed(1)}x Cash-to-Spend ROI
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <div className="text-[11px] font-medium text-slate-500">
                    Quad Stall Capacity
                  </div>
                  <div className="mt-1 text-xl font-extrabold text-slate-900">
                    {ft.physicalStallsCommitted}{" "}
                    <span className="text-xs font-semibold text-slate-400">
                      / {workspace.constraints.maxPhysicalStalls} max
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {ft.stallsRemaining} physical slots open
                  </div>
                </div>
              </div>

              {/* TAB 1: COMMAND CENTER */}
              {activeTab === "command" && (
                <div className="space-y-5">
                  {/* Live Constraints Simulator */}
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <Sliders className="h-4 w-4 text-indigo-600" />
                        What-If Constraint Simulator (Edit & test real-time analytics + Copilot)
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5 text-slate-600">
                          Base Target (₹):
                          <input
                            type="number"
                            step={500000}
                            defaultValue={workspace.constraints.baseTargetCashInr}
                            onBlur={(e) =>
                              mutateWorkspace("update_constraints", {
                                baseTargetCashInr: Number(e.target.value),
                              })
                            }
                            className="w-28 rounded border border-slate-300 px-2 py-1 font-mono text-xs font-semibold text-slate-900"
                          />
                        </label>
                        <label className="flex items-center gap-1.5 text-slate-600">
                          Budget Cap (₹):
                          <input
                            type="number"
                            step={25000}
                            defaultValue={workspace.constraints.totalBudgetCapInr}
                            onBlur={(e) =>
                              mutateWorkspace("update_constraints", {
                                totalBudgetCapInr: Number(e.target.value),
                              })
                            }
                            className="w-24 rounded border border-slate-300 px-2 py-1 font-mono text-xs font-semibold text-slate-900"
                          />
                        </label>
                        <label className="flex items-center gap-1.5 text-slate-600">
                          Max Stalls:
                          <input
                            type="number"
                            defaultValue={workspace.constraints.maxPhysicalStalls}
                            onBlur={(e) =>
                              mutateWorkspace("update_constraints", {
                                maxPhysicalStalls: Number(e.target.value),
                              })
                            }
                            className="w-16 rounded border border-slate-300 px-2 py-1 font-mono text-xs font-semibold text-slate-900"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Automated Diagnostic Bottleneck Radar */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                        <AlertOctagon className="h-4 w-4 text-rose-600" />
                        Live Bottleneck Diagnostics & 1-Click Revenue Unlocks
                      </h2>
                      <span className="text-[11px] text-slate-500">
                        Auto-recomputed from deal cycle times & billing rails
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                      {liveAnalytics.diagnostics.map(
                        (
                          diag: {
                            severity: string;
                            title: string;
                            detail: string;
                            recommendedAction: string;
                          },
                          idx: number
                        ) => (
                          <div
                            key={idx}
                            className={`rounded-xl border p-3.5 flex flex-col justify-between ${
                              diag.severity === "critical"
                                ? "border-rose-200 bg-rose-50/70"
                                : diag.severity === "warning"
                                ? "border-amber-200 bg-amber-50/70"
                                : "border-indigo-200 bg-indigo-50/70"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                {diag.severity === "critical" ? (
                                  <Flame className="h-4 w-4 text-rose-600 shrink-0" />
                                ) : (
                                  <Zap className="h-4 w-4 text-indigo-600 shrink-0" />
                                )}
                                {diag.title}
                              </div>
                              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-700">
                                {diag.detail}
                              </p>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-medium text-slate-600">
                                {diag.recommendedAction}
                              </span>
                              {diag.severity === "critical" &&
                                liveAnalytics.atRiskPostFestDeals.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      for (const d of liveAnalytics.atRiskPostFestDeals) {
                                        await mutateWorkspace("update_deal", {
                                          id: d.id,
                                          billingRail: "vendor_bridge_5d",
                                          expectedClearanceDate: "2026-03-15",
                                          stage: "cash_collected",
                                        });
                                      }
                                    }}
                                    className="shrink-0 rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700 transition"
                                  >
                                    Bridge & Clear Now
                                  </button>
                                )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Charts Row: 6-Stage Funnel + Campaign Cash vs Target */}
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        2026 Sponsorship Conversion Funnel (Entity Count)
                      </h3>
                      <div className="mt-3 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={funnelChartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis
                              dataKey="stage"
                              type="category"
                              width={105}
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip />
                            <Bar dataKey="count" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                              {funnelChartData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-7">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Campaign Cash Collected vs Base Target & Open Pipe (₹ Lakhs)
                      </h3>
                      <div className="mt-3 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={campCashChart}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar
                              dataKey="Collected"
                              name="Cash Cleared (₹L)"
                              fill="#10b981"
                              radius={[4, 4, 0, 0]}
                              isAnimationActive={false}
                            />
                            <Bar
                              dataKey="OpenPipe"
                              name="Open Proposals (₹L)"
                              fill="#6366f1"
                              radius={[4, 4, 0, 0]}
                              isAnimationActive={false}
                            />
                            <Bar
                              dataKey="BaseTarget"
                              name="Base Target (₹L)"
                              fill="#cbd5e1"
                              radius={[4, 4, 0, 0]}
                              isAnimationActive={false}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Category Lockout Live Scarcity Matrix */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                          <Lock className="h-4 w-4 text-indigo-600" />
                          1-Per-Vertical Category Lockout Matrix (Flagship Mechanism)
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Exclusivity locks ONLY when upfront escrow cash clears our bank account — pitting category rivals to wire in &lt;7 days.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {liveAnalytics.categoryMatrix.map(
                        (cat: {
                          category: string;
                          status: string;
                          lockedBrand: string | null;
                          cashClearedInr: number;
                          bidders: Array<{
                            id: string;
                            brandName: string;
                            proposedInr: number;
                          }>;
                        }) => (
                          <div
                            key={cat.category}
                            className={`rounded-xl border p-3 ${
                              cat.status === "LOCKED_CASH_CLEARED"
                                ? "border-emerald-200 bg-emerald-50/40"
                                : cat.status === "ACTIVE_BIDDING_WAR"
                                ? "border-indigo-300 bg-indigo-50/60"
                                : "border-slate-200 bg-slate-50/50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-slate-900">
                                {cat.category}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                                  cat.status === "LOCKED_CASH_CLEARED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : cat.status === "ACTIVE_BIDDING_WAR"
                                    ? "bg-indigo-600 text-white"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {cat.status.replace(/_/g, " ")}
                              </span>
                            </div>

                            <div className="mt-2 text-xs text-slate-700">
                              {cat.lockedBrand ? (
                                <div>
                                  Holder: <strong>{cat.lockedBrand}</strong> ·{" "}
                                  <span className="font-mono text-emerald-700 font-semibold">
                                    {fmtLakhs(cat.cashClearedInr)} cleared
                                  </span>
                                </div>
                              ) : (
                                <div className="text-slate-500">
                                  Exclusivity unlocked · {fmtLakhs(cat.cashClearedInr)} non-excl
                                </div>
                              )}
                            </div>

                            {cat.bidders.length > 0 && (
                              <div className="mt-2 space-y-1 border-t border-slate-200/80 pt-2">
                                {cat.bidders.map((b) => (
                                  <div
                                    key={b.id}
                                    className="flex items-center justify-between text-[11px]"
                                  >
                                    <span className="font-medium text-slate-800">
                                      {b.brandName} ({fmtLakhs(b.proposedInr)})
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        mutateWorkspace("update_deal", {
                                          id: b.id,
                                          stage: "cash_collected",
                                          categoryExclusiveLocked: true,
                                          campusPassQuestLive: true,
                                        })
                                      }
                                      className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-indigo-700"
                                    >
                                      Wire & Lock
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: 5 BETS, PRIORITIZATION & SCALE/CHANGE/STOP GUARDRAILS */}
              {activeTab === "bets" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900">
                      CASH-RICE Strategy Portfolio & Live Scale / Pivot / Stop Guardrails
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Adjust budgets or campaign operating states below — changes persist to MongoDB and immediately recalculate remaining cap & Copilot recommendations.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    {liveAnalytics.campaignMetrics.map(
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (c: any) => (
                        <div
                          key={c.id}
                          className={`rounded-xl border bg-white p-4 shadow-sm ${
                            c.status === "stopped"
                              ? "border-slate-200 opacity-75"
                              : c.status === "pivot_required"
                              ? "border-amber-300"
                              : "border-slate-200"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                                  #{c.rank} · {c.id}
                                </span>
                                <h3 className="text-sm font-bold text-slate-900">
                                  {c.name}
                                </h3>
                                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                                  CASH-RICE Score: {c.prioritization.score}/100
                                </span>
                                <span className="text-xs text-slate-500">
                                  Owner: <strong>{c.owner}</strong> ({c.timelineWeeks})
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-600">
                                <strong>Critical Variable:</strong> {c.criticalVariable} ·{" "}
                                <span className="text-rose-700">
                                  <strong>Risk:</strong> {c.biggestRisk}
                                </span>
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-xs text-slate-500">Cash Cleared / Base</div>
                                <div className="font-mono text-sm font-extrabold text-emerald-700">
                                  {fmtLakhs(c.cashCollectedInr)} / {fmtLakhs(c.targetCashBaseInr)}
                                </div>
                              </div>

                              <select
                                value={c.status}
                                onChange={(e) =>
                                  mutateWorkspace("update_campaign", {
                                    id: c.id,
                                    status: e.target.value as CampaignStatus,
                                  })
                                }
                                className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold uppercase ${
                                  c.status === "scaling"
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                    : c.status === "pivot_required"
                                    ? "border-amber-300 bg-amber-50 text-amber-800"
                                    : c.status === "stopped"
                                    ? "border-rose-300 bg-rose-50 text-rose-800"
                                    : "border-blue-200 bg-blue-50 text-blue-800"
                                }`}
                              >
                                <option value="scaling">SCALING (Double Down)</option>
                                <option value="active">ACTIVE (On Track)</option>
                                <option value="pivot_required">PIVOT REQUIRED</option>
                                <option value="stopped">STOPPED / KILLED</option>
                              </select>
                            </div>
                          </div>

                          {/* Leading indicator + Thresholds Grid */}
                          <div className="mt-3 grid grid-cols-1 gap-2.5 rounded-lg bg-slate-50 p-3 text-[11px] md:grid-cols-4 border border-slate-200/70">
                            <div>
                              <div className="font-bold text-slate-700">
                                Live Leading Signal ({c.leadingIndicatorName})
                              </div>
                              <div className="mt-0.5 font-semibold text-indigo-700">
                                {c.leadingIndicatorValue}
                              </div>
                              <div className="mt-2 flex items-center gap-1.5">
                                <span className="text-slate-500">Budget (₹):</span>
                                <input
                                  type="number"
                                  step={5000}
                                  defaultValue={c.budgetAllocatedInr}
                                  onBlur={(e) =>
                                    mutateWorkspace("update_campaign", {
                                      id: c.id,
                                      budgetAllocatedInr: Number(e.target.value),
                                    })
                                  }
                                  className="w-24 rounded border border-slate-300 bg-white px-2 py-0.5 font-mono font-semibold text-slate-900"
                                />
                              </div>
                            </div>

                            <div className="border-l border-slate-200 pl-2.5">
                              <div className="font-bold text-emerald-800">SCALE Threshold</div>
                              <div className="mt-0.5 text-slate-600">{c.scaleThreshold}</div>
                            </div>

                            <div className="border-l border-slate-200 pl-2.5">
                              <div className="font-bold text-amber-800">CHANGE / PIVOT Rule</div>
                              <div className="mt-0.5 text-slate-600">{c.changeThreshold}</div>
                            </div>

                            <div className="border-l border-slate-200 pl-2.5">
                              <div className="font-bold text-rose-800">STOP / KILL Rule</div>
                              <div className="mt-0.5 text-slate-600">{c.stopThreshold}</div>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1 font-medium text-indigo-700">
                              <ArrowRight className="h-3.5 w-3.5" /> Next Action:{" "}
                              {c.nextAdaptationAction}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              Funnel: {c.prospectsReached} prosp → {c.conversationsHeld} conv →{" "}
                              {c.proposalsSent} prop → {c.signedCount} signed ({c.roiMultiple}x ROI)
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: DEALS & TASKS EXECUTION */}
              {activeTab === "execution" && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                  {/* Deal Pipeline Manager */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-8">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">
                          Sponsor Deals & Cash Clearance Ledger ({filteredDeals.length})
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          Update stage, billing rail, or cash collected — funnel & projections recalculate immediately.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={dealCampaignFilter}
                          onChange={(e) => setDealCampaignFilter(e.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="ALL">All Bets</option>
                          {workspace.campaigns2026.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.id} · {c.shortName}
                            </option>
                          ))}
                        </select>

                        <select
                          value={dealStageFilter}
                          onChange={(e) => setDealStageFilter(e.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="ALL">All Stages</option>
                          {[
                            "prospecting",
                            "conversation",
                            "proposal_sent",
                            "signed",
                            "invoiced",
                            "cash_collected",
                            "lost",
                          ].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => setShowNewDealForm(!showNewDealForm)}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Sponsor Deal
                        </button>
                      </div>
                    </div>

                    {showNewDealForm && (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newDeal.brandName.trim()) return;
                          const isCollected = newDeal.stage === "cash_collected";
                          const isSigned = ["signed", "invoiced", "cash_collected"].includes(
                            newDeal.stage
                          );
                          await mutateWorkspace("add_deal", {
                            ...newDeal,
                            supportType: "cash",
                            signedInr: isSigned ? newDeal.proposedInr : 0,
                            cashCollectedInr: isCollected ? newDeal.proposedInr : 0,
                            earlyWireIncentiveApplied: true,
                            campusPassQuestLive: isCollected,
                            categoryExclusiveLocked: false,
                            daysInCurrentStage: 1,
                            expectedClearanceDate: "2026-03-20",
                            notes: "Added via SPONSOR-BOSS Execution Console.",
                          });
                          setNewDeal({ ...newDeal, brandName: "", contactName: "" });
                          setShowNewDealForm(false);
                        }}
                        className="mb-4 grid grid-cols-2 gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-xs sm:grid-cols-4"
                      >
                        <input
                          required
                          placeholder="Brand Name (e.g. Swiggy Instamart)"
                          value={newDeal.brandName}
                          onChange={(e) =>
                            setNewDeal({ ...newDeal, brandName: e.target.value })
                          }
                          className="rounded border border-slate-300 px-2.5 py-1.5"
                        />
                        <input
                          placeholder="Category Vertical"
                          value={newDeal.categoryVertical}
                          onChange={(e) =>
                            setNewDeal({ ...newDeal, categoryVertical: e.target.value })
                          }
                          className="rounded border border-slate-300 px-2.5 py-1.5"
                        />
                        <select
                          value={newDeal.campaignId}
                          onChange={(e) =>
                            setNewDeal({ ...newDeal, campaignId: e.target.value })
                          }
                          className="rounded border border-slate-300 px-2 py-1.5 bg-white"
                        >
                          {workspace.campaigns2026.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.id} — {c.shortName}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step={25000}
                          value={newDeal.proposedInr}
                          onChange={(e) =>
                            setNewDeal({ ...newDeal, proposedInr: Number(e.target.value) })
                          }
                          className="rounded border border-slate-300 px-2.5 py-1.5 font-mono"
                        />
                        <select
                          value={newDeal.stage}
                          onChange={(e) =>
                            setNewDeal({
                              ...newDeal,
                              stage: e.target.value as DealStage2026,
                            })
                          }
                          className="rounded border border-slate-300 px-2 py-1.5 bg-white"
                        >
                          <option value="conversation">conversation</option>
                          <option value="proposal_sent">proposal_sent</option>
                          <option value="signed">signed</option>
                          <option value="cash_collected">cash_collected</option>
                        </select>
                        <select
                          value={newDeal.billingRail}
                          onChange={(e) =>
                            setNewDeal({
                              ...newDeal,
                              billingRail: e.target.value as BillingRail,
                            })
                          }
                          className="rounded border border-slate-300 px-2 py-1.5 bg-white"
                        >
                          <option value="vendor_bridge_5d">Vendor Bridge (5d)</option>
                          <option value="razorpay_instant">Razorpay Instant</option>
                          <option value="direct_erp_45d">Direct ERP (45d)</option>
                        </select>
                        <input
                          placeholder="Owner"
                          value={newDeal.owner}
                          onChange={(e) =>
                            setNewDeal({ ...newDeal, owner: e.target.value })
                          }
                          className="rounded border border-slate-300 px-2.5 py-1.5"
                        />
                        <button
                          type="submit"
                          className="rounded bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700"
                        >
                          Save Deal
                        </button>
                      </form>
                    )}

                    <div className="max-h-[540px] overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-white border-b border-slate-200 text-[11px] text-slate-500">
                          <tr>
                            <th className="pb-2">Brand / Category</th>
                            <th className="pb-2">Bet / Owner</th>
                            <th className="pb-2">Stage</th>
                            <th className="pb-2">Billing Rail</th>
                            <th className="pb-2 text-right">Proposed (₹)</th>
                            <th className="pb-2 text-right">Cash Cleared (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredDeals.map((d) => (
                            <tr key={d.id} className="hover:bg-slate-50">
                              <td className="py-2.5">
                                <div className="font-bold text-slate-900">{d.brandName}</div>
                                <div className="text-[10px] text-slate-500">
                                  {d.categoryVertical} · Clear: {d.expectedClearanceDate}
                                </div>
                              </td>
                              <td className="py-2.5">
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                                  {d.campaignId}
                                </span>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {d.owner}
                                </div>
                              </td>
                              <td className="py-2.5">
                                <select
                                  value={d.stage}
                                  onChange={(e) =>
                                    mutateWorkspace("update_deal", {
                                      id: d.id,
                                      stage: e.target.value as DealStage2026,
                                    })
                                  }
                                  className={`rounded border px-2 py-1 text-[11px] font-semibold ${
                                    d.stage === "cash_collected"
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                      : d.stage === "invoiced" || d.stage === "signed"
                                      ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                                      : "border-slate-300 bg-white text-slate-800"
                                  }`}
                                >
                                  {[
                                    "prospecting",
                                    "conversation",
                                    "proposal_sent",
                                    "signed",
                                    "invoiced",
                                    "cash_collected",
                                    "lost",
                                  ].map((st) => (
                                    <option key={st} value={st}>
                                      {st}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2.5">
                                <select
                                  value={d.billingRail}
                                  onChange={(e) =>
                                    mutateWorkspace("update_deal", {
                                      id: d.id,
                                      billingRail: e.target.value as BillingRail,
                                      expectedClearanceDate:
                                        e.target.value === "direct_erp_45d"
                                          ? "2026-04-18"
                                          : "2026-03-15",
                                    })
                                  }
                                  className={`rounded border px-2 py-1 text-[11px] ${
                                    d.billingRail === "direct_erp_45d"
                                      ? "border-rose-300 bg-rose-50 text-rose-800 font-semibold"
                                      : "border-slate-200 bg-white text-slate-700"
                                  }`}
                                >
                                  <option value="vendor_bridge_5d">Vendor Bridge (5d)</option>
                                  <option value="razorpay_instant">Razorpay Instant</option>
                                  <option value="direct_erp_45d">Direct ERP (45d Risk)</option>
                                </select>
                              </td>
                              <td className="py-2.5 text-right font-mono">
                                ₹{d.proposedInr.toLocaleString("en-IN")}
                              </td>
                              <td className="py-2.5 text-right">
                                <input
                                  type="number"
                                  step={25000}
                                  key={`${d.id}_${d.cashCollectedInr}`}
                                  defaultValue={d.cashCollectedInr}
                                  onBlur={(e) =>
                                    mutateWorkspace("update_deal", {
                                      id: d.id,
                                      cashCollectedInr: Number(e.target.value),
                                    })
                                  }
                                  className="w-24 rounded border border-slate-300 px-2 py-0.5 text-right font-mono text-xs font-bold text-emerald-700"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Team Tasks & Action Tracker */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-4 flex flex-col">
                    <h2 className="text-sm font-bold text-slate-900">
                      Team Execution Tasks & Deadlines ({workspace.tasks.length})
                    </h2>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Includes manual tasks and confirmed AI Copilot dispatches.
                    </p>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newTaskTitle.trim()) return;
                        await mutateWorkspace("add_task", {
                          title: newTaskTitle.trim(),
                          description: "Created from Execution Taskbar",
                          campaignId: newTaskCampaign,
                          owner: newTaskOwner,
                          priority: newTaskPriority,
                          status: "todo",
                          dueDate: "2026-03-14",
                          createdBy: "team",
                        });
                        setNewTaskTitle("");
                      }}
                      className="mb-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs"
                    >
                      <input
                        placeholder="New action item title..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5"
                      />
                      <div className="flex items-center gap-1.5">
                        <select
                          value={newTaskCampaign}
                          onChange={(e) => setNewTaskCampaign(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px]"
                        >
                          {workspace.campaigns2026.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.id}
                            </option>
                          ))}
                        </select>
                        <select
                          value={newTaskOwner}
                          onChange={(e) => setNewTaskOwner(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px]"
                        >
                          {["Riya Kapoor", "Kabir Shah", "Nisha Rao", "Meera Iyer"].map(
                            (o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            )
                          )}
                        </select>
                        <select
                          value={newTaskPriority}
                          onChange={(e) =>
                            setNewTaskPriority(
                              e.target.value as ExecutionTask["priority"]
                            )
                          }
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px]"
                        >
                          <option value="P0_Critical">P0</option>
                          <option value="P1_High">P1</option>
                          <option value="P2_Normal">P2</option>
                        </select>
                        <button
                          type="submit"
                          className="ml-auto rounded bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800"
                        >
                          + Add
                        </button>
                      </div>
                    </form>

                    <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[440px]">
                      {workspace.tasks.map((t) => (
                        <div
                          key={t.id}
                          className={`rounded-lg border p-3 text-xs ${
                            t.status === "done"
                              ? "border-slate-200 bg-slate-50 opacity-65"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-slate-900 leading-snug">
                              {t.title}
                            </div>
                            <select
                              value={t.status}
                              onChange={(e) =>
                                mutateWorkspace("update_task", {
                                  id: t.id,
                                  status: e.target.value,
                                })
                              }
                              className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-semibold"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Prog</option>
                              <option value="done">Done</option>
                            </select>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-600">{t.description}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span
                              className={`rounded px-1.5 py-0.5 font-bold ${
                                t.priority === "P0_Critical"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-indigo-100 text-indigo-800"
                              }`}
                            >
                              {t.priority}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">
                              {t.campaignId}
                            </span>
                            <span className="text-slate-500">
                              {t.owner} · Due {t.dueDate}
                            </span>
                            {t.createdBy === "ai_copilot" && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">
                                AI Copilot
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Right Embedded AI Growth Analyst & Copilot */}
        {copilotOpen && (
          <aside className="w-full max-w-[410px] shrink-0 h-full">
            <AiCopilot
              snapshotDate2025={snapshotDate2025}
              activeView={activeTab}
              onExecuteAction={handleCopilotAction}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
