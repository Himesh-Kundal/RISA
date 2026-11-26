import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceState } from "@/lib/mongodb";
import { buildCopilotDigest } from "@/lib/analytics";
import { enforceChatRateLimit } from "@/lib/rateLimit";
import { CopilotActionProposal } from "@/types/sponsor";

export const dynamic = "force-dynamic";

const MAX_USER_PROMPT_CHARS = 1200;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_INSTRUCTIONS = `You are SPONSOR-BOSS Copilot, an embedded AI Growth Analyst & Revenue Operations Copilot for CampusFest Sponsorship Growth (Challenge B: Maximize Sponsorship Cash Collected BEFORE the Festival).

You have live, deterministic access to TWO connected datasets supplied in LIVE_APPLICATION_DATA:
1. CampusFest 2025 Historical Source Dataset (from Sponsor Dataset.xlsx, evaluated at the selected IST snapshot cutoff with exact import-retry deduplication).
2. CampusFest 2026 Bengaluru Live Execution Workspace (real-time campaigns, deals, cash collected, billing rails, category lockouts, constraints, and tasks persisted in MongoDB).

STRICT GROUNDING & EPISTEMIC HONESTY RULES (NON-NEGOTIABLE):
1. NEVER invent or guess numbers. Use ONLY the exact metrics in LIVE_APPLICATION_DATA. If the user edited a deal, budget, constraint, or stage, reflect the UPDATED state immediately.
2. Tag key claims inline using short bracketed badges:
   - [Sourced 2025] for facts from CampusFest 2025 records
   - [Live 2026] for current 2026 workspace records
   - [Calculated] for derived ratios/projections
   - [Assumption] for strategic hypotheses/conversion estimates
   - [Insufficient Data] when the dataset cannot support a claim
3. CRITICAL 2025 DATASET LIMITATIONS — YOU MUST REFUSE UNSUPPORTED CLAIMS:
   - Bank Cash Collected in 2025: CampusFest 2025 records confirmed_value_inr (₹22,40,000 total = ₹20,00,000 cash support_type across 20 opps + ₹2,40,000 in_kind across 4 opps as of Apr 20), which is ONLY reported face value, NOT proof of bank receipt or cash collected. Always state this explicitly when asked about 2025 cash collected!
   - 2025 Marketing Spend / CAC / ROI: CampusFest 2025 Sponsor Dataset contains NO campaign spend or budget table. State [Insufficient Data] if asked for 2025 campaign spend, CPA, or ROI.
   - Sponsor Activations Causality: Activations L001 (Beardo -> C03 Creator Partners), L002 (Mosaic Mobility -> C04 College Partnerships), and L003 (Maple Devices -> C07 Community Groups) record observational associations ONLY and do NOT establish causal attendee uplift.
   - Missing External Info: If asked for personal phone numbers, private bank account numbers, competitor internal financials, or anything absent from LIVE_APPLICATION_DATA, clearly state what data is missing and cannot be answered.
4. CONNECT INSIGHTS TO EXECUTION:
   - Whenever you recommend a concrete operational step in the 2026 workspace (creating a follow-up task, switching a slow Direct ERP invoice like Razorpay D26-02 or Postman D26-03 to vendor_bridge_5d, unbundling a stalled proposal like Sarvam AI D26-04 or Groww D26-18, reallocating budget, or updating a campaign status), populate "proposedActions" with 1 to 3 crisp, ready-to-confirm action objects! The user will see a confirmation card to execute them.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object matching this exact schema (no markdown code fences around the outer JSON):
{
  "answerMarkdown": "Concise, sharp markdown response using bullet points, bold ₹ figures, and inline badges like [Sourced 2025], [Live 2026], [Calculated], [Assumption], or [Insufficient Data].",
  "confidenceNote": "One-sentence note stating what is backed by live records vs what is assumed or missing.",
  "proposedActions": [
    {
      "id": "act_1",
      "type": "create_task | switch_billing_rail | update_deal_stage | reallocate_budget | update_campaign_status",
      "label": "Short button-ready title (e.g., 'Switch Razorpay D26-02 to 5-Day Vendor Bridge')",
      "rationale": "Expected ₹ cash or velocity impact",
      "payload": {}
    }
  ]
}

Payload schemas by action type:
- create_task: { "title": string, "description": string, "campaignId": "B01"|"B02"|"B03"|"B04"|"B05"|"B00", "dealId"?: string, "owner": string, "priority": "P0_Critical"|"P1_High"|"P2_Normal", "dueDate": "YYYY-MM-DD" }
- switch_billing_rail: { "dealId": string, "billingRail": "vendor_bridge_5d"|"razorpay_instant", "expectedClearanceDate": "YYYY-MM-DD" }
- update_deal_stage: { "dealId": string, "stage": "conversation"|"proposal_sent"|"signed"|"invoiced"|"cash_collected"|"lost", "proposedInr"?: number }
- reallocate_budget: { "fromCampaignId": string, "toCampaignId": string, "amountInr": number }
- update_campaign_status: { "campaignId": string, "status": "scaling"|"active"|"pivot_required"|"stopped" }`;

async function callGemini(
  apiKey: string,
  model: string,
  contents: Array<{ role: string; parts: Array<{ text: string }> }>
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTIONS }],
      },
      contents,
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 2800,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${model} HTTP ${res.status}: ${errText.slice(0, 240)}`);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce server-side per-IP + global daily wallet rate limits BEFORE spending 1 token
    const clientIp =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "local-client";

    const rl = await enforceChatRateLimit(clientIp);
    const rlHeaders = {
      "X-RateLimit-Remaining-Minute": String(rl.remainingMinute),
      "X-RateLimit-Remaining-Hour": String(rl.remainingHour),
      "X-RateLimit-Remaining-Day": String(rl.remainingGlobalDay),
      ...(rl.retryAfterSec ? { "Retry-After": String(rl.retryAfterSec) } : {}),
    };

    if (!rl.allowed) {
      return NextResponse.json(
        {
          answerMarkdown: `**[Rate Limit Active]** ${rl.reason}`,
          confidenceNote:
            "Blocked prior to LLM invocation (0 tokens spent) to protect API quota.",
          proposedActions: [],
          rateLimited: true,
          remainingHour: rl.remainingHour,
        },
        { status: 429, headers: rlHeaders }
      );
    }

    const body = await req.json();
    const {
      messages = [] as ChatMessage[],
      snapshotDate2025 = "2025-04-20",
      activeView = "2026_live",
    } = body;

    const rawUserMsg =
      [...messages].reverse().find((m: ChatMessage) => m.role === "user")?.content || "";

    if (!rawUserMsg.trim()) {
      return NextResponse.json(
        {
          answerMarkdown: "Please enter a question about CampusFest sponsorship performance.",
          confidenceNote: "Empty query skipped (0 tokens spent).",
          proposedActions: [],
        },
        { status: 400, headers: rlHeaders }
      );
    }

    // Cap prompt length to prevent token-stuffing abuse
    const latestUserMsg = rawUserMsg.slice(0, MAX_USER_PROMPT_CHARS);

    const { state } = await getWorkspaceState();
    const digest = buildCopilotDigest(state, snapshotDate2025, latestUserMsg);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          answerMarkdown:
            "**[Configuration Needed]** `GEMINI_API_KEY` is not set in environment variables. Add it in `.env.local` or Vercel Project Settings to enable live Gemini analysis.",
          confidenceNote: "No LLM call executed.",
          proposedActions: [],
        },
        { status: 200, headers: rlHeaders }
      );
    }

    // Keep last 6 turns (capped in length) for follow-up continuity while staying ultra-frugal on tokens
    const recentHistory: ChatMessage[] = messages.slice(-6);
    const contents = recentHistory.map((m, idx) => {
      const isLatest = idx === recentHistory.length - 1 && m.role === "user";
      const safeContent = String(m.content || "").slice(0, MAX_USER_PROMPT_CHARS);
      const text = isLatest
        ? `ACTIVE_UI_TAB: ${activeView} | SELECTED_2025_SNAPSHOT_DATE: ${snapshotDate2025}\nLIVE_APPLICATION_DATA:\n${JSON.stringify(
            digest
          )}\n\nUSER_QUESTION:\n${latestUserMsg}`
        : safeContent;
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text }],
      };
    });

    // Primary model: gemini-3.8-flash (with automatic fallback to 3.8-flash-lite / 2.5-flash-lite)
    const candidateModels = Array.from(
      new Set([
        process.env.GEMINI_MODEL || "gemini-3.8-flash",
        "gemini-3.8-flash",
        "gemini-2.5-flash-lite",
      ])
    );

    let rawJsonText = "";
    let usedModel = candidateModels[0];
    let lastErr: unknown = null;

    for (const model of candidateModels) {
      try {
        usedModel = model;
        const data = await callGemini(apiKey, model, contents);
        rawJsonText =
          data?.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text || "")
            .join("") || "";
        if (rawJsonText) break;
      } catch (e) {
        lastErr = e;
        console.warn(`Fallback from ${model}:`, e);
      }
    }

    if (!rawJsonText) {
      throw lastErr || new Error("Empty response from Gemini");
    }

    let parsed: {
      answerMarkdown: string;
      confidenceNote?: string;
      proposedActions?: CopilotActionProposal[];
    };

    const cleaned = rawJsonText
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Recover answerMarkdown if output was truncated mid-JSON
      const match = cleaned.match(/"answerMarkdown"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"(?:confidenceNote|proposedActions)"|"$|$)/);
      if (match && match[1]) {
        const unescaped = match[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\t/g, "\t")
          .replace(/\\\\/g, "\\");
        parsed = {
          answerMarkdown: unescaped,
          confidenceNote: "Grounded in live workspace state (recovered from partial JSON).",
          proposedActions: [],
        };
      } else {
        parsed = {
          answerMarkdown: cleaned,
          confidenceNote: "Grounded in live workspace state.",
          proposedActions: [],
        };
      }
    }

    return NextResponse.json(
      {
        answerMarkdown: parsed.answerMarkdown || "No analysis generated.",
        confidenceNote:
          parsed.confidenceNote || "Grounded in current MongoDB & 2025 source records.",
        proposedActions: Array.isArray(parsed.proposedActions)
          ? parsed.proposedActions
          : [],
        modelUsed: usedModel,
        remainingHour: rl.remainingHour,
      },
      { status: 200, headers: rlHeaders }
    );
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      {
        answerMarkdown: `**[System Notice]** Copilot encountered an API error: \`${
          err instanceof Error ? err.message : "Unknown error"
        }\`. Please retry in a few seconds.`,
        confidenceNote: "Error handled gracefully.",
        proposedActions: [],
      },
      { status: 200 }
    );
  }
}
