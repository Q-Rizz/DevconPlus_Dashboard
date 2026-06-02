"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { calcScore, getRiskLevel } from "./RiskScoreBadge";
import RiskTable from "./RiskTable";
import RiskPanel from "./RiskPanel";
import RiskSummaryView from "./RiskSummaryView";
import type { Risk, Contributor, Project, RiskStatus } from "@/types";

interface Props {
  initialRisks: Risk[];
  projects: Project[];
  contributors: Contributor[];
}

const SELECT = "*, owner:contributors!owner_id(id,email,full_name,role_id,telegram_username,deleted_at,created_at), linked_task:tasks!linked_task_id(id,title)";

export default function RisksClient({ initialRisks, projects, contributors }: Props) {
  const supabase = useRef(createClient()).current;

  const [risks, setRisks] = useState<Risk[]>(initialRisks);
  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id ?? "");
  const [view, setView] = useState<"register" | "summary">("register");

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterScore, setFilterScore] = useState("");
  const [heatmapFilter, setHeatmapFilter] = useState<{ probability: string; impact: string } | null>(null);

  // Panel
  const [showPanel, setShowPanel] = useState(false);
  const [panelRisk, setPanelRisk] = useState<Risk | null>(null);
  const [panelMode, setPanelMode] = useState<"view" | "edit" | "add">("view");
  const [saving, setSaving] = useState(false);

  // Realtime
  useEffect(() => {
    if (!selectedProject) return;
    const channel = supabase
      .channel(`risks:${selectedProject}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "risks", filter: `project_id=eq.${selectedProject}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (payload: any) => {
          const { eventType, new: rec, old: oldRec } = payload;
          if (eventType === "INSERT" || eventType === "UPDATE") {
            const { data } = await supabase.from("risks").select(SELECT).eq("id", rec.id).single();
            if (data) {
              const risk = data as Risk;
              if (eventType === "INSERT") {
                setRisks(prev => [risk, ...prev]);
              } else {
                setRisks(prev => prev.map(r => r.id === risk.id ? risk : r));
                setPanelRisk(prev => prev?.id === risk.id ? risk : prev);
              }
            }
          } else if (eventType === "DELETE") {
            setRisks(prev => prev.filter(r => r.id !== oldRec.id));
            setPanelRisk(prev => {
              if (prev?.id === oldRec.id) { setShowPanel(false); return null; }
              return prev;
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedProject, supabase]);

  const projectRisks = risks.filter(r => r.project_id === selectedProject);

  const filtered = projectRisks.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      if (!r.title.toLowerCase().includes(q) && !(r.description ?? "").toLowerCase().includes(q)) return false;
    }
    if (filterCategory && r.category !== filterCategory) return false;
    if (filterStatus  && r.status   !== filterStatus)   return false;
    if (filterScore) {
      const lv = getRiskLevel(calcScore(r.probability, r.impact)).label;
      if (lv !== filterScore) return false;
    }
    if (heatmapFilter && (r.probability !== heatmapFilter.probability || r.impact !== heatmapFilter.impact)) return false;
    return true;
  });

  const hasFilters = !!(search || filterCategory || filterStatus || filterScore || heatmapFilter);

  function clearFilters() {
    setSearch(""); setFilterCategory(""); setFilterStatus(""); setFilterScore(""); setHeatmapFilter(null);
  }

  function handleHeatmapClick(probability: string, impact: string) {
    const same = heatmapFilter?.probability === probability && heatmapFilter?.impact === impact;
    setHeatmapFilter(same ? null : { probability, impact });
    setView("register");
  }

  function openAdd() { setPanelRisk(null); setPanelMode("add"); setShowPanel(true); }
  function openView(risk: Risk) { setPanelRisk(risk); setPanelMode("view"); setShowPanel(true); }
  function closePanel() { setShowPanel(false); }

  async function handleSave(data: Partial<Risk>) {
    setSaving(true);
    try {
      if (panelMode === "add") {
        await supabase.from("risks").insert({ ...data, project_id: selectedProject });
      } else if (panelMode === "edit" && panelRisk) {
        await supabase.from("risks").update(data).eq("id", panelRisk.id);
      }
      closePanel();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("risks").delete().eq("id", id);
    closePanel();
  }

  async function handleStatusChange(id: string, status: RiskStatus) {
    await supabase.from("risks").update({ status }).eq("id", id);
  }

  const filterSelect = "text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400/30 bg-white";

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50/30">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Risks</h1>
            <p className="text-xs text-gray-400 mt-0.5">Identify, track and mitigate project risks</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Project selector */}
            {projects.length > 1 && (
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className={filterSelect}
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}

            {/* View toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(["register", "summary"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                    view === v ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Add button */}
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Risk
            </button>
          </div>
        </div>
      </div>

      {view === "register" ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* ── Filters ── */}
          <div className="bg-white border-b border-gray-50 px-6 py-3 flex items-center gap-3 flex-wrap shrink-0">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search risks…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400/30 w-48"
              />
            </div>

            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={filterSelect}>
              <option value="">All Categories</option>
              {["Technical","Schedule","Resource","Scope","Quality","Dependency","Budget"].map(c => <option key={c}>{c}</option>)}
            </select>

            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={filterSelect}>
              <option value="">All Statuses</option>
              {["Open","Mitigating","Resolved","Accepted"].map(s => <option key={s}>{s}</option>)}
            </select>

            <select value={filterScore} onChange={e => setFilterScore(e.target.value)} className={filterSelect}>
              <option value="">All Severities</option>
              {["Critical","High","Medium","Low"].map(s => <option key={s}>{s}</option>)}
            </select>

            {heatmapFilter && (
              <button
                onClick={() => setHeatmapFilter(null)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors font-medium"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {heatmapFilter.probability} × {heatmapFilter.impact}
              </button>
            )}

            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Clear all
              </button>
            )}

            <span className="ml-auto text-xs text-gray-400">
              {filtered.length} risk{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* ── Table ── */}
          <div className="flex-1 overflow-y-auto">
            <RiskTable risks={filtered} onRowClick={openView} />
          </div>
        </div>
      ) : (
        <RiskSummaryView
          risks={projectRisks}
          activeFilter={heatmapFilter}
          onHeatmapClick={handleHeatmapClick}
        />
      )}

      {/* ── Slide-over panel ── */}
      {showPanel && (
        <RiskPanel
          risk={panelRisk}
          mode={panelMode}
          contributors={contributors}
          onClose={closePanel}
          onEdit={() => setPanelMode("edit")}
          onSave={handleSave}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          loading={saving}
        />
      )}
    </div>
  );
}
