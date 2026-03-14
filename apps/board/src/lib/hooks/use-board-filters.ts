"use client";

import { useState, useEffect, useCallback } from "react";
import type { TicketStatus, TicketPriority } from "@/lib/constants";

export interface BoardFilterState {
  statuses: TicketStatus[];
  priorities: TicketPriority[];
  projectIds: string[];
  assigneeIds: string[];
  sortBy: "created_at" | "priority" | "number" | "due_date";
  sortDir: "asc" | "desc";
  groupByProject: boolean;
  search: string;
  /** Project IDs (or "none") that are collapsed in the grouped board view */
  collapsedGroups: string[];
}

export const DEFAULT_FILTERS: BoardFilterState = {
  statuses: [],
  priorities: [],
  projectIds: [],
  assigneeIds: [],
  sortBy: "created_at",
  sortDir: "desc",
  groupByProject: false,
  search: "",
  collapsedGroups: [],
};

function storageKey(slug: string) {
  return `board-filters-${slug}`;
}

export function useBoardFilters(workspaceSlug: string) {
  const [filters, setFilters] = useState<BoardFilterState>(DEFAULT_FILTERS);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(workspaceSlug));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BoardFilterState>;
        setFilters({ ...DEFAULT_FILTERS, ...parsed });
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, [workspaceSlug]);

  const updateFilters = useCallback(
    (next: BoardFilterState) => {
      setFilters(next);
      try {
        const { search, ...persist } = next;
        localStorage.setItem(storageKey(workspaceSlug), JSON.stringify(persist));
      } catch {
        // ignore
      }
    },
    [workspaceSlug]
  );

  const toggleGroupCollapsed = useCallback(
    (groupKey: string) => {
      setFilters((prev) => {
        const collapsed = prev.collapsedGroups.includes(groupKey)
          ? prev.collapsedGroups.filter((k) => k !== groupKey)
          : [...prev.collapsedGroups, groupKey];
        const next = { ...prev, collapsedGroups: collapsed };
        try {
          const { search, ...persist } = next;
          localStorage.setItem(storageKey(workspaceSlug), JSON.stringify(persist));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [workspaceSlug]
  );

  return { filters, updateFilters, toggleGroupCollapsed, hydrated };
}
