"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "@/lib/store";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SectionCard from "./SectionCard";
import AddSectionModal from "./AddSectionModal";
import AddEntryModal from "./AddEntryModal";
import FlatListView from "./FlatListView";
import type { EssentialSection, EssentialEntry, Contributor, Project } from "@/types";

function isPMRole(contributor: Contributor | null): boolean {
  if (!contributor?.role?.name) return false;
  const name = contributor.role.name.toLowerCase();
  return name.includes("project manager") || name.includes("product manager");
}

function matchesSearch(query: string, ...texts: Array<string | null | undefined>): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return texts.some((t) => t?.toLowerCase().includes(q));
}

interface SortableSectionProps {
  section: EssentialSection;
  isPM: boolean;
  searchQuery: string;
  visibleEntries: EssentialEntry[];
  onEditSection: (s: EssentialSection) => void;
  onDeleteSection: (id: string) => void;
  onAddEntry: (sectionId: string) => void;
  onEditEntry: (e: EssentialEntry) => void;
  onDeleteEntry: (id: string, sectionId: string) => void;
}

function SortableSection({ section, ...rest }: SortableSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}>
      <SectionCard
        section={section}
        dragHandleProps={rest.isPM ? { ...attributes, ...listeners } : undefined}
        {...rest}
      />
    </div>
  );
}

interface Props {
  initialSections: EssentialSection[];
  contributors: Contributor[];
  projects: Project[];
}

export default function EssentialsClient({ initialSections, contributors, projects }: Props) {
  const [sections, setSections] = useState<EssentialSection[]>(initialSections);
  const [projectFilter, setProjectFilter] = useState<string>(projects[0]?.id ?? "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"grouped" | "flat">("grouped");
  const [editingSection, setEditingSection] = useState<EssentialSection | null | "new">(null);
  const [addingEntryToSection, setAddingEntryToSection] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<EssentialEntry | null>(null);
  const [seeding, setSeeding] = useState(false);

  const contributor = useAuthStore((s) => s.contributor);
  const isPM = isPMRole(contributor);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Filter sections by project
  const projectSections = useMemo(
    () => sections.filter((s) => projectFilter === "all" || s.project_id === projectFilter)
      .sort((a, b) => a.position - b.position),
    [sections, projectFilter]
  );

  // Filter entries by search
  const getVisibleEntries = (section: EssentialSection): EssentialEntry[] => {
    const entries = section.entries ?? [];
    if (!searchQuery) return [...entries].sort((a, b) => a.position - b.position);
    return entries.filter((e) =>
      matchesSearch(searchQuery, e.label, e.value_text, e.note, section.title)
    ).sort((a, b) => a.position - b.position);
  };

  // Sections visible in search
  const visibleSections = searchQuery
    ? projectSections.filter((s) => getVisibleEntries(s).length > 0 || matchesSearch(searchQuery, s.title))
    : projectSections;

  const totalResults = searchQuery
    ? visibleSections.reduce((acc, s) => acc + getVisibleEntries(s).length, 0)
    : null;

  // Drag end — reorder sections
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sections, oldIndex, newIndex);
    setSections(reordered);

    // Persist positions
    await Promise.allSettled(
      reordered.map((s, i) =>
        fetch(`/api/essentials/sections/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: i }),
        })
      )
    );
  }

  function handleSectionSaved(section: EssentialSection) {
    setSections((prev) => {
      const exists = prev.find((s) => s.id === section.id);
      if (exists) return prev.map((s) => s.id === section.id ? { ...s, ...section } : s);
      return [...prev, { ...section, entries: [] }];
    });
    setEditingSection(null);
  }

  function handleEntrySaved(entry: EssentialEntry) {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== entry.section_id) return s;
        const entries = s.entries ?? [];
        const exists = entries.find((e) => e.id === entry.id);
        return {
          ...s,
          entries: exists
            ? entries.map((e) => e.id === entry.id ? entry : e)
            : [...entries, entry],
        };
      })
    );
    setAddingEntryToSection(null);
    setEditingEntry(null);
  }

  function handleDeleteSection(id: string) {
    fetch(`/api/essentials/sections/${id}`, { method: "DELETE" }).then(() => {
      setSections((prev) => prev.filter((s) => s.id !== id));
    });
  }

  function handleDeleteEntry(entryId: string, sectionId: string) {
    fetch(`/api/essentials/entries/${entryId}`, { method: "DELETE" }).then(() => {
      setSections((prev) =>
        prev.map((s) =>
          s.id !== sectionId ? s : { ...s, entries: (s.entries ?? []).filter((e) => e.id !== entryId) }
        )
      );
    });
  }

  async function handleSeedTemplate() {
    if (!projectFilter || projectFilter === "all") {
      alert("Select a specific project first to apply the template.");
      return;
    }
    setSeeding(true);
    const res = await fetch("/api/essentials/seed-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectFilter, created_by: contributor?.id }),
    });
    const json = await res.json();
    if (json.ok) {
      // Refresh page
      window.location.reload();
    } else {
      alert(json.error ?? "Failed to apply template.");
    }
    setSeeding(false);
  }

  const noSectionsForProject = projectSections.length === 0;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Essentials</h1>
          <p className="text-sm text-gray-500 mt-0.5">Team reference hub — links, rules, credentials, and more</p>
        </div>
        {isPM && (
          <button
            onClick={() => setEditingSection("new")}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 flex items-center gap-2 self-start sm:self-auto"
          >
            <span>+</span> Add Section
          </button>
        )}
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-2">
        {projects.length > 1 && (
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}

        <div className="flex-1 min-w-[200px] max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search labels, values, notes..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(["grouped", "flat"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${view === v ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Search results count */}
      {searchQuery && (
        <p className="text-xs text-gray-500">
          {totalResults === 0 ? "No results found." : `${totalResults} result${totalResults !== 1 ? "s" : ""} found`}
        </p>
      )}

      {/* Empty state with template seed */}
      {noSectionsForProject && !searchQuery && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-400 text-sm mb-3">No essentials sections yet for this project.</p>
          {isPM && (
            <button
              onClick={handleSeedTemplate}
              disabled={seeding || projectFilter === "all"}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-40"
            >
              {seeding ? "Applying template…" : "Apply Essentials Template"}
            </button>
          )}
        </div>
      )}

      {/* Grouped view */}
      {view === "grouped" && !noSectionsForProject && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {visibleSections.map((s) => (
                <SortableSection
                  key={s.id}
                  section={s}
                  isPM={isPM}
                  searchQuery={searchQuery}
                  visibleEntries={getVisibleEntries(s)}
                  onEditSection={setEditingSection}
                  onDeleteSection={handleDeleteSection}
                  onAddEntry={(id) => setAddingEntryToSection(id)}
                  onEditEntry={(e) => { setEditingEntry(e); setAddingEntryToSection(e.section_id); }}
                  onDeleteEntry={handleDeleteEntry}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Flat view */}
      {view === "flat" && (
        <FlatListView sections={sections} projects={projects} projectFilter={projectFilter} />
      )}

      {/* Modals */}
      {editingSection !== null && (
        <AddSectionModal
          section={editingSection !== "new" ? editingSection : null}
          projectId={projectFilter !== "all" ? projectFilter : projects[0]?.id ?? ""}
          contributorId={contributor?.id}
          onSaved={handleSectionSaved}
          onClose={() => setEditingSection(null)}
        />
      )}
      {addingEntryToSection && (
        <AddEntryModal
          entry={editingEntry}
          sectionId={addingEntryToSection}
          projectId={sections.find((s) => s.id === addingEntryToSection)?.project_id ?? projectFilter}
          contributorId={contributor?.id}
          onSaved={handleEntrySaved}
          onClose={() => { setAddingEntryToSection(null); setEditingEntry(null); }}
        />
      )}
    </div>
  );
}
