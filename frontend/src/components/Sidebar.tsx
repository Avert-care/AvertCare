"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  Users,
  Stethoscope,
  AlertTriangle,
  LogOut,
  Hospital,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Census Overview & KPIs",
    icon: LayoutDashboard,
  },
  {
    href: "/pending",
    label: "Ward Census",
    description: "Pending Discharges",
    icon: Users,
    badge: "Live Queue",
  },
  {
    href: "/analyze",
    label: "Analyze Chart",
    description: "ML & RAG Twin Prediction",
    icon: Stethoscope,
  },
  {
    href: "/alerts",
    label: "High-Risk Alerts",
    description: "Stratified Care Plans",
    icon: ShieldAlert,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-full lg:w-64 bg-slate-950/90 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col shrink-0 backdrop-blur-xl">
      {/* App Branding Header */}
      <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-xl shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-200">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-lg text-white">AvertCare</span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                EHR
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Ward Triage System</p>
          </div>
        </Link>
      </div>

      {/* Ward Status Indicator */}
      <div className="px-4 py-3 mx-4 my-3 rounded-lg bg-slate-900/70 border border-slate-800/70 flex items-center gap-2.5 text-xs text-slate-300">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <Hospital className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-medium text-slate-200">Endocrinology & Acute 4W</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? "bg-gradient-to-r from-cyan-600/20 to-blue-600/10 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                <div className="text-left">
                  <div className="leading-tight">{item.label}</div>
                  <div className="text-[11px] text-slate-400 font-normal">{item.description}</div>
                </div>
              </div>

              {item.badge && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Discreet Corner Observability Entry */}
      <div className="px-3 pt-2 pb-1 border-t border-slate-800/60 bg-slate-950/40">
        <Link
          href="/observability"
          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
            pathname === "/observability"
              ? "bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent hover:border-slate-800/60"
          }`}
          title="Clinical Decision Support Observability & Telemetry"
        >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Activity className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            </div>
            <div className="text-left">
              <div className="leading-tight font-semibold text-slate-300">Clinical AI Observability</div>
              <div className="text-[10px] text-slate-500">Prometheus • Grafana</div>
            </div>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 font-mono">
            P95 OK
          </span>
        </Link>
      </div>

      {/* Clinician Profile Footer */}
      <div className="p-4 border-t border-slate-800/70 bg-slate-950/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
              {user?.email ? user.email.slice(0, 2).toUpperCase() : "MD"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.email || "Attending Physician"}
              </p>
              <p className="text-[11px] text-slate-400 truncate">Clinical Staff</p>
            </div>
          </div>

          {user && (
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
