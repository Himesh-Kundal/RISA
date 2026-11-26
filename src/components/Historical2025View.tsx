"use client";

import React, { useState } from "react";
import {
  Calendar,
  AlertTriangle,
  ShieldCheck,
  Database,
  Info,
  Edit3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { HistoricalCampaignSummary } from "@/lib/analytics";

interface HistoricalOpp {
  opportunityId: string;
  opportunityName: string;
  brandId: string;
  brandName: string;
  campaignId: string;
  campaignName: string;
  supportType: "cash" | "in_kind";
  stage: string;
  proposedValueInr: number;
  confirmedValueInr: number;
  ownerName: string;
  effectiveAt: string;
}

interface HistoricalDataProps {
  data: {
    snapshotDate: string;
    deduplicate: boolean;
    duplicatesRemoved: {
      interactions: number;
      brandQualification: number;
      opportunityHistory: number;
      duplicateIds: string[];
    };
    activeTarget: {
      qualified_brands_goal: number;
      confirmed_partnerships_goal: number;
      target_version: string;
      effective_at: string;
    };
    totals: {
      brandsResearched: number;
      contactsCount: number;
      interactionsCount: number;
      repliedBrands: number;
      meetingsHeldBrands: number;
      qualifiedBrands: number;
      opportunitiesCount: number;
      proposalsReached: number;
      confirmedDeals: number;
      confirmedCashDeals: number;
      confirmedInKindDeals: number;
      confirmedValueInr: number;
      confirmedCashFaceInr: number;
      confirmedInKindInr: number;
      openPipelineInr: number;
      optOutBrands: number;
    };
    campaignSummaries: HistoricalCampaignSummary[];
    opportunities: HistoricalOpp[];
    activations: Array<{
      activation_id: string;
      brand_name: string;
      opportunity_name: string;
      attendee_campaign_name: string;
      attendee_campaign_id: string;
      activation_note: string;
      linked_at: string;
      attendeeCampaignStats: {
        registrations: number;
        admitted_attendees: number;
      } | null;
    }>;
  };
  snapshotDate: string;
  dedup: boolean;
  onSnapshotChange: (date: string) => void;
  onDedupToggle: (next: boolean) => void;
  onMutateHistoricalOpp: (payload: {
    opportunityId: string;
    stage: string;
    confirmedValueInr?: number;
  }) => Promise<void>;
}

const KEY_DATES = [
  { label: "Launch (Jan 25)", date: "2025-01-25" },
  { label: "Mid-Campaign (Feb 28)", date: "2025-02-28" },
  { label: "Revised Plan (Mar 15)", date: "2025-03-15" },
  { label: "Pre-Fest Eve (Apr 11)", date: "2025-04-11" },
  { label: "Full Source Pack (Apr 20)", date: "2025-04-20" },
];

export default function Historical2025View({
  data,
  snapshotDate,
  dedup,
  onSnapshotChange,
  onDedupToggle,
  onMutateHistoricalOpp,
}: HistoricalDataProps) {
  const [filterCamp, setFilterCamp] = useState<string>("ALL");

  const chartData = data.campaignSummaries.map((c) => ({
    name: c.campaignId,
    label: c.campaignName,
    Qualified: c.qualifiedBrands,
    Opportunities: c.opportunitiesCreated,
    Confirmed: c.confirmedDeals,
    CashLakhs: Math.round((c.confirmedCashFaceValueInr / 100000) * 100) / 100,
    StrandedLakhs: Math.round((c.openPipelineInr / 100000) * 100) / 100,
  }));

  const filteredOpps =
    filterCamp === "ALL"
      ? data.opportunities
      : data.opportunities.filter((o) => o.campaignId === filterCamp);

  return (
    <div className="space-y-6">
      {/* IST Time-Travel & Data Hygiene Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                CampusFest 2025 Historical Source Audit (Point-in-Time IST Engine)
              </h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
                {data.activeTarget.target_version}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Evaluated strictly at <strong>{snapshotDate} 23:59:59+05:30</strong> — zero future stage or response leakage. Chatbot queries use this exact cutoff.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <input
                type="date"
                min="2025-01-15"
                max="2025-04-20"
                value={snapshotDate}
                onChange={(e) => onSnapshotChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => onDedupToggle(!dedup)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                dedup
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-300 bg-amber-50 text-amber-800"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {dedup ? "6 Import Retries Deduplicated" : "Raw Un-Deduplicated Mode"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {KEY_DATES.map((kd) => (
            <button
              key={kd.date}
              type="button"
              onClick={() => onSnapshotChange(kd.date)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                snapshotDate === kd.date
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {kd.label}
            </button>
          ))}
        </div>
      </div>

      {/* Epistemic Caveat Banner */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Cash Collected vs Face Value Trap
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
            Source records <strong>₹{(data.totals.confirmedValueInr / 100000).toFixed(2)}L</strong> confirmed face value (₹{(data.totals.confirmedCashFaceInr / 100000).toFixed(2)}L cash-type + ₹{(data.totals.confirmedInKindInr / 100000).toFixed(2)}L in-kind), <strong>NOT bank cash receipts</strong>. Spend/CAC is also unrecorded in 2025.
          </p>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
            <Info className="h-4 w-4 text-indigo-600" />
            96% Warm Win Rate vs 0% Cold Outbound
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-indigo-800">
            <strong>SC02 + SC04 + SC05</strong> (Warm/Inbound/Creator) closed <strong>24/25 opps (96%)</strong>. Meanwhile <strong>SC01 + SC03 + SC06</strong> (Cold Email/LinkedIn/Revival) touched 136 brands & 33 opps for <strong>0 deals (₹0)</strong> + ₹14.4L stranded!
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Forensic Hygiene Audit
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
            Exact retry IDs caught: <code className="text-[10px] bg-slate-100 px-1 rounded">SI00001, SI00019, SI00110, BQ0003, OH00001, OH00015</code>. Multi-opp collision caught on <strong>Beardo (A001)</strong>: O001 ₹2L won (Riya) vs O002 ₹30k lost (Nisha).
          </p>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="text-[11px] font-medium text-slate-500">Brands Researched</div>
          <div className="mt-1 text-xl font-extrabold text-slate-900">
            {data.totals.brandsResearched}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {data.totals.contactsCount} contacts · {data.totals.optOutBrands} opt-outs
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="text-[11px] font-medium text-slate-500">Meetings Held</div>
          <div className="mt-1 text-xl font-extrabold text-slate-900">
            {data.totals.meetingsHeldBrands}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            from {data.totals.repliedBrands} replying brands
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="text-[11px] font-medium text-slate-500">Qualified Brands</div>
          <div className="mt-1 text-xl font-extrabold text-emerald-700">
            {data.totals.qualifiedBrands}{" "}
            <span className="text-xs font-semibold text-slate-400">
              / {data.activeTarget.qualified_brands_goal} goal
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-emerald-600 font-medium">
            {data.totals.qualifiedBrands >= data.activeTarget.qualified_brands_goal
              ? "Target Achieved"
              : "Below Goal at Cutoff"}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="text-[11px] font-medium text-slate-500">Confirmed Deals</div>
          <div className="mt-1 text-xl font-extrabold text-indigo-700">
            {data.totals.confirmedDeals}{" "}
            <span className="text-xs font-semibold text-slate-400">
              / {data.activeTarget.confirmed_partnerships_goal} goal
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-amber-600 font-medium">
            {data.totals.confirmedCashDeals} cash · {data.totals.confirmedInKindDeals} in-kind
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="text-[11px] font-medium text-slate-500">Confirmed Cash Face</div>
          <div className="mt-1 text-xl font-extrabold text-slate-900">
            ₹{(data.totals.confirmedCashFaceInr / 100000).toFixed(2)}L
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            +₹{(data.totals.confirmedInKindInr / 100000).toFixed(2)}L in-kind (No bank proof)
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="text-[11px] font-medium text-slate-500">Stranded Open Pipe</div>
          <div className="mt-1 text-xl font-extrabold text-rose-600">
            ₹{(data.totals.openPipelineInr / 100000).toFixed(2)}L
          </div>
          <div className="mt-0.5 text-[11px] text-rose-600">
            Unclosed in cold channels
          </div>
        </div>
      </div>

      {/* Campaign Comparison Chart + Table */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            2025 Campaign Outcomes: Confirmed Cash Face vs Stranded Pipeline (₹ Lakhs)
          </h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="CashLakhs"
                  name="Confirmed Cash Face (₹L)"
                  fill="#4f46e5"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="StrandedLakhs"
                  name="Stranded Unclosed Pipe (₹L)"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-7 overflow-x-auto">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            2025 Campaign-by-Campaign Funnel Diagnostic
          </h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-slate-500">
                <th className="pb-2 font-semibold">Campaign</th>
                <th className="pb-2 font-semibold">Owner</th>
                <th className="pb-2 font-semibold text-right">Brands</th>
                <th className="pb-2 font-semibold text-right">Qual %</th>
                <th className="pb-2 font-semibold text-right">Opps</th>
                <th className="pb-2 font-semibold text-right">Won</th>
                <th className="pb-2 font-semibold text-right">Win %</th>
                <th className="pb-2 font-semibold text-right">Cash Face</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.campaignSummaries.map((c) => (
                <tr key={c.campaignId} className="hover:bg-slate-50">
                  <td className="py-2.5 font-medium text-slate-900">
                    <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                      {c.campaignId}
                    </span>
                    {c.campaignName}
                  </td>
                  <td className="py-2.5 text-slate-600">{c.ownerName}</td>
                  <td className="py-2.5 text-right font-mono">{c.brandsInQualification}</td>
                  <td className="py-2.5 text-right font-mono">{c.qualRatePct}%</td>
                  <td className="py-2.5 text-right font-mono">{c.opportunitiesCreated}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                    {c.confirmedDeals}
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                        c.winRatePct >= 80
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {c.winRatePct}%
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold text-indigo-700">
                    ₹{(c.confirmedCashFaceValueInr / 100000).toFixed(2)}L
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cross-dataset Sponsor Activations + Mutable Historical Opportunity Table */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Cross-Dataset Sponsor Activations (Non-Causal)
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Joined to Attendee Dataset (`C03, C04, C07`). Association only — does NOT prove visitor uplift.
          </p>
          <div className="mt-3 space-y-2.5">
            {data.activations.map((a) => (
              <div
                key={a.activation_id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>
                    {a.activation_id}: {a.brand_name}
                  </span>
                  <span className="font-mono text-[10px] text-indigo-700">
                    → {a.attendee_campaign_id} ({a.attendee_campaign_name})
                  </span>
                </div>
                {a.attendeeCampaignStats && (
                  <div className="mt-1 text-[11px] text-slate-600">
                    Attendee campaign total: {a.attendeeCampaignStats.registrations} regs ·{" "}
                    {a.attendeeCampaignStats.admitted_attendees} check-ins (Observational)
                  </div>
                )}
              </div>
            ))}
            {data.activations.length === 0 && (
              <div className="text-xs text-slate-400 italic">
                No activations linked as of {snapshotDate}.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
                2025 Opportunities Explorer & Live Evaluator Sandbox ({filteredOpps.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Change any 2025 opportunity stage below to test real-time recalculation & Copilot responsiveness!
              </p>
            </div>
            <select
              value={filterCamp}
              onChange={(e) => setFilterCamp(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
            >
              <option value="ALL">All 6 Campaigns</option>
              {data.campaignSummaries.map((c) => (
                <option key={c.campaignId} value={c.campaignId}>
                  {c.campaignId} — {c.campaignName}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-200 text-[11px] text-slate-500">
                <tr>
                  <th className="pb-2">ID / Brand</th>
                  <th className="pb-2">Campaign</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2 text-right">Proposed</th>
                  <th className="pb-2 text-right">Confirmed</th>
                  <th className="pb-2 pl-3">Stage (Editable)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOpps.map((o) => (
                  <tr key={o.opportunityId} className="hover:bg-slate-50">
                    <td className="py-2 font-medium text-slate-900">
                      <span className="mr-1 font-mono text-[10px] text-slate-500">
                        {o.opportunityId}
                      </span>
                      {o.brandName}
                    </td>
                    <td className="py-2 text-slate-600">{o.campaignName}</td>
                    <td className="py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          o.supportType === "cash"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {o.supportType}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono">
                      ₹{o.proposedValueInr.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-indigo-700">
                      ₹{o.confirmedValueInr.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 pl-3">
                      <select
                        value={o.stage}
                        onChange={(e) =>
                          onMutateHistoricalOpp({
                            opportunityId: o.opportunityId,
                            stage: e.target.value,
                          })
                        }
                        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800"
                      >
                        {[
                          "prospecting",
                          "contacted",
                          "proposal_sent",
                          "negotiating",
                          "partner_confirmed",
                          "lost",
                          "withdrawn",
                        ].map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
