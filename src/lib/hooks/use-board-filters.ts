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
}

export const DEFAULT_FILTERS: BoardFilterState = {
  statuses: [],
  priorities: [],
  projectIds: [],
  assigneeIds: [],
  sortBy: "created_at",
  sortDir: "desc",
  groupByProject: false,
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
        localStorage.setItem(storageKey(workspaceSlug), JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [workspaceSlug]
  );

  return { filters, updateFilters, hydrated };
}
