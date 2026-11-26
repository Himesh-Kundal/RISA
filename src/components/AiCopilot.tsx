"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Play,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { CopilotActionProposal } from "@/types/sponsor";

interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  confidenceNote?: string;
  proposedActions?: CopilotActionProposal[];
  executedActionIds?: string[];
  modelUsed?: string;
}

interface AiCopilotProps {
  snapshotDate2025: string;
  activeView: string;
  onExecuteAction: (proposal: CopilotActionProposal) => Promise<void>;
}

const STARTER_PROMPTS = [
  {
    tag: "Diagnose + Execute",
    prompt:
      "Diagnose our biggest risk to hitting ₹81L pre-festival cash in 2026 and propose concrete actions I can confirm right now.",
  },
  {
    tag: "2025 Funnel Audit",
    prompt:
      "Compare warm/inbound campaigns vs cold outbound in CampusFest 2025. Why did we miss the 28-partnership revised target?",
  },
  {
    tag: "Uncertainty Trap #1",
    prompt:
      "In CampusFest 2025, exactly how much cash hit our bank account, and what was the marketing CAC of Brand Discovery Email?",
  },
  {
    tag: "Causality Trap #2",
    prompt:
      "How many incremental festival attendees did Beardo's sponsorship activation generate in 2025?",
  },
];

function formatGroundedMarkdown(md: string) {
  // Render inline badges & basic markdown cleanly without heavy external deps
  const lines = md.split("\n");
  return lines.map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;

    const isBullet = /^\s*[-*•]\s+/.test(line);
    const isNumbered = /^\s*\d+\.\s+/.test(line);
    const cleanLine = line.replace(/^\s*([-*•]|\d+\.)\s+/, "");

    const renderInline = (text: string) => {
      const tokenRegex =
        /(\[(?:Sourced 2025|Live 2026|Calculated|Assumption|Insufficient Data)[^\]]*\]|\*\*[^*]+\*\*|`[^`]+`)/g;
      const parts = text.split(tokenRegex);
      return parts.map((part, idx) => {
        if (!part) return null;
        if (part.startsWith("[Sourced 2025")) {
          return (
            <span
              key={idx}
              className="mx-0.5 inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-blue-800"
            >
              {part.slice(1, -1)}
            </span>
          );
        }
        if (part.startsWith("[Live 2026")) {
          return (
            <span
              key={idx}
              className="mx-0.5 inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-800"
            >
              {part.slice(1, -1)}
            </span>
          );
        }
        if (part.startsWith("[Calculated")) {
          return (
            <span
              key={idx}
              className="mx-0.5 inline-flex items-center rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-indigo-800"
            >
              {part.slice(1, -1)}
            </span>
          );
        }
        if (part.startsWith("[Assumption")) {
          return (
            <span
              key={idx}
              className="mx-0.5 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-800"
            >
              {part.slice(1, -1)}
            </span>
          );
        }
        if (part.startsWith("[Insufficient Data")) {
          return (
            <span
              key={idx}
              className="mx-0.5 inline-flex items-center rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-rose-800"
            >
              {part.slice(1, -1)}
            </span>
          );
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={idx} className="font-semibold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={idx}
              className="rounded bg-slate-200/80 px-1 py-0.5 font-mono text-[11px] text-slate-800"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      });
    };

    if (line.startsWith("### ") || line.startsWith("## ")) {
      return (
        <p key={i} className="mt-2 font-bold text-slate-900 text-xs uppercase tracking-wide">
          {renderInline(line.replace(/^#+\s+/, ""))}
        </p>
      );
    }

    if (isBullet || isNumbered) {
      return (
        <div key={i} className="flex items-start gap-2 pl-1 text-[13px] leading-relaxed text-slate-700">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
          <div>{renderInline(cleanLine)}</div>
        </div>
      );
    }

    return (
      <p key={i} className="text-[13px] leading-relaxed text-slate-700">
        {renderInline(line)}
      </p>
    );
  });
}

export default function AiCopilot({
  snapshotDate2025,
  activeView,
  onExecuteAction,
}: AiCopilotProps) {
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I am **SPONSOR-BOSS Copilot** `[Live 2026]` `[Sourced 2025]`. I read live MongoDB campaign/deal state and the deduplicated CampusFest 2025 dataset (IST cutoff: **" +
        snapshotDate2025 +
        "**).\n\n- Ask me to **diagnose bottlenecks**, **simulate budget/stage changes**, **audit 2025 channels**, or **create tasks / switch billing rails** with your confirmation.\n- I explicitly distinguish **sourced evidence** from **assumptions** and flag when data cannot support an answer.",
      confidenceNote:
        "Connected to live MongoDB Atlas workspace + CampusFest 2025 source records.",
      proposedActions: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  const sendPrompt = async (questionText?: string) => {
    const text = (questionText ?? input).trim();
    if (!text || loading) return;

    const userTurn: ChatTurn = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text,
    };

    const nextTurns = [...turns, userTurn];
    setTurns(nextTurns);
    if (!questionText) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextTurns
            .filter((t) => t.id !== "welcome")
            .map((t) => ({ role: t.role, content: t.content })),
          snapshotDate2025,
          activeView,
        }),
      });
      const data = await res.json();
      setTurns((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: data.answerMarkdown || "No response received.",
          confidenceNote: data.confidenceNote,
          proposedActions: data.proposedActions || [],
          executedActionIds: [],
          modelUsed: data.modelUsed,
        },
      ]);
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content:
            "**[Connection Error]** Unable to reach `/api/chat`. Check server logs.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (turnId: string, proposal: CopilotActionProposal) => {
    setExecutingId(`${turnId}_${proposal.id}`);
    try {
      await onExecuteAction(proposal);
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? {
                ...t,
                executedActionIds: [...(t.executedActionIds || []), proposal.id],
              }
            : t
        )
      );
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white border-l border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-400/40">
            <Bot className="h-4 w-4 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold tracking-tight">SPONSOR-BOSS Copilot</h2>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-400/30">
                Grounded
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Live MongoDB + 2025 Snapshot ({snapshotDate2025})
            </p>
          </div>
        </div>
        <Sparkles className="h-4 w-4 text-indigo-400" />
      </div>

      {/* Starter Workflow Chips */}
      <div className="border-b border-slate-100 bg-slate-50/90 px-3 py-2">
        <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <HelpCircle className="h-3 w-3" /> Test Workflows & Guardrails
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STARTER_PROMPTS.map((sp) => (
            <button
              key={sp.tag}
              type="button"
              disabled={loading}
              onClick={() => sendPrompt(sp.prompt)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition disabled:opacity-50"
            >
              {sp.tag}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {turns.map((turn) => (
          <div
            key={turn.id}
            className={`flex flex-col ${
              turn.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[94%] rounded-xl px-3.5 py-2.5 ${
                turn.role === "user"
                  ? "bg-indigo-600 text-white text-[13px]"
                  : "bg-slate-50 border border-slate-200/90 text-slate-800 space-y-1.5"
              }`}
            >
              {turn.role === "user" ? (
                <p className="leading-relaxed">{turn.content}</p>
              ) : (
                <>
                  <div className="space-y-1">{formatGroundedMarkdown(turn.content)}</div>

                  {turn.confidenceNote && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] text-slate-600 border border-slate-200/70">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-slate-500 mt-0.5" />
                      <span>{turn.confidenceNote}</span>
                    </div>
                  )}

                  {turn.proposedActions && turn.proposedActions.length > 0 && (
                    <div className="mt-2.5 space-y-2 pt-2 border-t border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                        Recommended Execution Actions (Requires Confirmation)
                      </div>
                      {turn.proposedActions.map((act) => {
                        const isDone = turn.executedActionIds?.includes(act.id);
                        const isBusy = executingId === `${turn.id}_${act.id}`;
                        return (
                          <div
                            key={act.id}
                            className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-semibold text-slate-900">
                                  {act.label}
                                </div>
                                <div className="mt-0.5 text-[11px] text-slate-600">
                                  {act.rationale}
                                </div>
                              </div>
                              {isDone ? (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Executed
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleConfirmAction(turn.id, act)}
                                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
                                >
                                  {isBusy ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Play className="h-3 w-3" />
                                  )}
                                  Confirm & Apply
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 w-fit">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
            Analyzing live campaign & funnel records...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendPrompt();
        }}
        className="border-t border-slate-200 bg-white p-3"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about bottlenecks, 2025 data, or tell Copilot to act..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-700 transition disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
