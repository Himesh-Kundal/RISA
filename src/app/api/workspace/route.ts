import { NextRequest, NextResponse } from "next/server";
import {
  getWorkspaceState,
  resetWorkspaceState,
  saveWorkspaceState,
} from "@/lib/mongodb";
import {
  computeHistoricalSnapshot,
  computeLive2026Analytics,
} from "@/lib/analytics";
import {
  BillingRail,
  Campaign2026,
  CampaignStatus,
  Deal2026,
  DealStage2026,
  ExecutionTask,
} from "@/types/sponsor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const snapshotDate = searchParams.get("snapshotDate") || "2025-04-20";
  const dedup = searchParams.get("dedup") !== "false";

  const { state, storageMode } = await getWorkspaceState();
  const liveAnalytics = computeLive2026Analytics(state);
  const historical2025 = computeHistoricalSnapshot(
    snapshotDate,
    dedup,
    state.historicalOverrides || {}
  );

  return NextResponse.json({
    storageMode,
    state,
    liveAnalytics,
    historical2025,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload, snapshotDate = "2025-04-20", dedup = true } = body;

    if (action === "reset_workspace") {
      const { state, storageMode } = await resetWorkspaceState();
      return NextResponse.json({
        storageMode,
        state,
        liveAnalytics: computeLive2026Analytics(state),
        historical2025: computeHistoricalSnapshot(snapshotDate, dedup, {}),
      });
    }

    const { state } = await getWorkspaceState();

    switch (action) {
      case "update_deal": {
        const updatedDeal = payload as Partial<Deal2026> & { id: string };
        state.deals2026 = state.deals2026.map((d) => {
          if (d.id !== updatedDeal.id) return d;
          const next = { ...d, ...updatedDeal, updatedAt: new Date().toISOString() };
          // Keep signed & cash numbers consistent when stage changes if caller didn't explicitly override
          if (
            updatedDeal.stage === "cash_collected" &&
            updatedDeal.cashCollectedInr === undefined
          ) {
            const baseAmt = next.signedInr > 0 ? next.signedInr : next.proposedInr;
            next.signedInr = baseAmt;
            next.cashCollectedInr = baseAmt;
          } else if (
            (updatedDeal.stage === "signed" || updatedDeal.stage === "invoiced") &&
            updatedDeal.signedInr === undefined &&
            next.signedInr === 0
          ) {
            next.signedInr = next.proposedInr;
          } else if (updatedDeal.stage === "lost") {
            next.signedInr = 0;
            next.cashCollectedInr = 0;
            next.categoryExclusiveLocked = false;
          }
          return next;
        });
        break;
      }

      case "add_deal": {
        const d = payload as Omit<Deal2026, "id" | "updatedAt">;
        const newDeal: Deal2026 = {
          ...d,
          id: `D26-${String(state.deals2026.length + 1).padStart(2, "0")}-${Math.floor(
            100 + Math.random() * 900
          )}`,
          updatedAt: new Date().toISOString(),
        };
        state.deals2026 = [newDeal, ...state.deals2026];
        break;
      }

      case "update_campaign": {
        const cUpd = payload as Partial<Campaign2026> & { id: string };
        state.campaigns2026 = state.campaigns2026.map((c) =>
          c.id === cUpd.id ? { ...c, ...cUpd } : c
        );
        break;
      }

      case "add_task": {
        const t = payload as Omit<ExecutionTask, "id" | "createdAt">;
        const newTask: ExecutionTask = {
          ...t,
          id: `TSK-${String(state.tasks.length + 1).padStart(2, "0")}-${Math.floor(
            10 + Math.random() * 89
          )}`,
          createdAt: new Date().toISOString(),
        };
        state.tasks = [newTask, ...state.tasks];
        break;
      }

      case "update_task": {
        const tUpd = payload as Partial<ExecutionTask> & { id: string };
        state.tasks = state.tasks.map((t) => (t.id === tUpd.id ? { ...t, ...tUpd } : t));
        break;
      }

      case "update_constraints": {
        state.constraints = {
          ...state.constraints,
          ...(payload as Partial<typeof state.constraints>),
        };
        break;
      }

      case "update_historical_opp": {
        const { opportunityId, stage, proposedValueInr, confirmedValueInr, ownerName } =
          payload as {
            opportunityId: string;
            stage?: string;
            proposedValueInr?: number;
            confirmedValueInr?: number;
            ownerName?: string;
          };
        state.historicalOverrides = {
          ...(state.historicalOverrides || {}),
          [opportunityId]: {
            ...(state.historicalOverrides?.[opportunityId] || { opportunityId }),
            opportunityId,
            ...(stage !== undefined ? { stage } : {}),
            ...(proposedValueInr !== undefined ? { proposedValueInr } : {}),
            ...(confirmedValueInr !== undefined ? { confirmedValueInr } : {}),
            ...(ownerName !== undefined ? { ownerName } : {}),
            updatedAt: new Date().toISOString(),
          },
        };
        break;
      }

      case "execute_copilot_action": {
        const { type, actionPayload } = payload as {
          type: string;
          actionPayload: Record<string, unknown>;
        };

        if (type === "create_task") {
          const newTask: ExecutionTask = {
            id: `TSK-AI-${Math.floor(100 + Math.random() * 900)}`,
            title: String(actionPayload.title || "AI Recommended Action"),
            description: String(actionPayload.description || ""),
            campaignId: String(actionPayload.campaignId || "B01"),
            dealId: actionPayload.dealId ? String(actionPayload.dealId) : undefined,
            owner: String(actionPayload.owner || "Riya Kapoor"),
            priority:
              (actionPayload.priority as ExecutionTask["priority"]) || "P1_High",
            status: "todo",
            dueDate: String(actionPayload.dueDate || "2026-03-14"),
            createdBy: "ai_copilot",
            createdAt: new Date().toISOString(),
          };
          state.tasks = [newTask, ...state.tasks];
        } else if (type === "switch_billing_rail") {
          const dealId = String(actionPayload.dealId || "");
          const rail = (actionPayload.billingRail as BillingRail) || "vendor_bridge_5d";
          const nextClearDate = String(
            actionPayload.expectedClearanceDate || "2026-03-15"
          );
          state.deals2026 = state.deals2026.map((d) =>
            d.id === dealId
              ? {
                  ...d,
                  billingRail: rail,
                  expectedClearanceDate: nextClearDate,
                  earlyWireIncentiveApplied: true,
                  notes: `${d.notes} | [AI Executed]: Switched to ${rail} (clears ${nextClearDate}).`,
                  updatedAt: new Date().toISOString(),
                }
              : d
          );
        } else if (type === "update_deal_stage") {
          const dealId = String(actionPayload.dealId || "");
          const nextStage = (actionPayload.stage as DealStage2026) || "signed";
          const nextProposed = actionPayload.proposedInr
            ? Number(actionPayload.proposedInr)
            : undefined;
          state.deals2026 = state.deals2026.map((d) => {
            if (d.id !== dealId) return d;
            const prop = nextProposed ?? d.proposedInr;
            const signed = ["signed", "invoiced", "cash_collected"].includes(nextStage)
              ? prop
              : d.signedInr;
            const cash = nextStage === "cash_collected" ? signed : d.cashCollectedInr;
            return {
              ...d,
              stage: nextStage,
              proposedInr: prop,
              signedInr: signed,
              cashCollectedInr: cash,
              daysInCurrentStage: 0,
              updatedAt: new Date().toISOString(),
            };
          });
        } else if (type === "reallocate_budget") {
          const fromId = String(actionPayload.fromCampaignId || "");
          const toId = String(actionPayload.toCampaignId || "");
          const amount = Number(actionPayload.amountInr || 0);
          state.campaigns2026 = state.campaigns2026.map((c) => {
            if (c.id === fromId) {
              return {
                ...c,
                budgetAllocatedInr: Math.max(c.budgetSpentInr, c.budgetAllocatedInr - amount),
              };
            }
            if (c.id === toId) {
              return { ...c, budgetAllocatedInr: c.budgetAllocatedInr + amount };
            }
            return c;
          });
        } else if (type === "update_campaign_status") {
          const cid = String(actionPayload.campaignId || "");
          const status = (actionPayload.status as CampaignStatus) || "scaling";
          state.campaigns2026 = state.campaigns2026.map((c) =>
            c.id === cid ? { ...c, status } : c
          );
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const saved = await saveWorkspaceState(state);
    return NextResponse.json({
      storageMode: saved.storageMode,
      state: saved.state,
      liveAnalytics: computeLive2026Analytics(saved.state),
      historical2025: computeHistoricalSnapshot(
        snapshotDate,
        dedup,
        saved.state.historicalOverrides || {}
      ),
    });
  } catch (err) {
    console.error("Workspace POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
