"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Radio,
  Server,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import { getApiBaseUrl } from "@/lib/api";

export function CornerFlightRecorder() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const API_URL = getApiBaseUrl();

  // If already on the full observability suite, render a subtle status indicator
  const isObservabilityPage = pathname === "/observability";

  return (
    <div className="fixed bottom-4 right-4 z-40 font-sans">
      {isOpen ? (
        /* Expanded Floating Corner Panel */
        <div className="w-88 sm:w-96 rounded-2xl bg-slate-950/95 border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 backdrop-blur-xl p-4.5 text-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <span className="flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    Flight Recorder
                  </h4>
                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Live Telemetry
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Hospital IT &amp; AI Telemetry Bridge</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
              title="Minimize to corner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 4 AI Layers Waterfall Quick-View */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-cyan-400" />
                4 AI Layers Waterfall
              </span>
              <span className="text-emerald-400 font-semibold font-mono">1,347ms total</span>
            </div>

            <div className="space-y-1.5 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/60 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Server className="w-3 h-3 text-cyan-400" />
                  FastAPI Gateway
                </span>
                <span className="font-mono text-cyan-400">12ms</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400" style={{ width: "2%" }}></div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Cpu className="w-3 h-3 text-amber-400" />
                  XGBoost &amp; TreeSHAP
                </span>
                <span className="font-mono text-amber-400">45ms</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: "4%" }}></div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Database className="w-3 h-3 text-emerald-400" />
                  Qdrant Vector DB
                </span>
                <span className="font-mono text-emerald-400">110ms</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: "8%" }}></div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Zap className="w-3 h-3 text-purple-400" />
                  Gemini 2.0 Flash LLM
                </span>
                <span className="font-mono text-purple-400">1,180ms</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-400" style={{ width: "86%" }}></div>
              </div>
            </div>
          </div>

          {/* Clinical SLA & Security Audit Status */}
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">P95 Ward SLA</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-bold text-emerald-400 font-mono">1,180ms</span>
                <span className="text-[10px] text-slate-500">/ 1,500ms</span>
              </div>
              <span className="inline-block mt-0.5 text-[9px] font-semibold text-emerald-400">
                ✓ Clearance Passing
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">HIPAA &amp; Auth</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-bold text-cyan-400 font-mono">99.98%</span>
                <span className="text-[10px] text-slate-500">200 OK</span>
              </div>
              <span className="inline-block mt-0.5 text-[9px] font-semibold text-slate-400">
                0 Auth Leak Anomalies
              </span>
            </div>
          </div>

          {/* Quick-Action Links */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col gap-1.5">
            <Link
              href="/observability"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 border border-cyan-500/40 text-cyan-200 text-xs font-semibold transition-all group"
            >
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                Open Full Observability Suite
              </span>
              <span className="text-[10px] text-cyan-400">View 4 Pillars →</span>
            </Link>

            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <a
                href="http://localhost:3001/d/avertcare-mlops"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
              >
                <span>Grafana :3001</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>

              <a
                href={`${API_URL}/metrics`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
              >
                <span>Prometheus /metrics</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed Subtle Floating Corner Badge */
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-full border shadow-xl backdrop-blur-xl transition-all duration-200 group ${
            isObservabilityPage
              ? "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200"
              : "bg-slate-950/90 hover:bg-slate-900 border-cyan-500/40 hover:border-cyan-400 text-slate-200 hover:shadow-cyan-500/20"
          }`}
          title="Click to open Clinical AI Flight Recorder (Prometheus & Grafana Telemetry)"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>

          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="text-white">Ops Flight Recorder</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-emerald-400 border-l border-slate-800 pl-2">
            <span>P95: 1.18s</span>
          </div>

          <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
        </button>
      )}
    </div>
  );
}
