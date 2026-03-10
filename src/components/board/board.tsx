"use client";

import { useState, useMemo, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { BOARD_COLUMNS } from "@/lib/constants";
import type { TicketStatus, TicketPriority } from "@/lib/constants";
import type { Ticket, Project, WorkspaceMember } from "@/lib/types";
import { BoardColumn } from "./board-column";
import { TicketCard } from "./ticket-card";
import { TicketDetailSheet } from "@/components/tickets/ticket-detail-sheet";
import { AgentPanel } from "./agent-panel";
import { useAgentActivity } from "@/lib/hooks/use-agent-activity";
import { BoardToolbar } from "./board-toolbar";
import { useBoardFilters } from "@/lib/hooks/use-board-filters";

const PRIORITY_ORDER: Record<TicketPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

interface BoardProps {
  initialTickets: Ticket[];
  workspaceId: string;
  workspaceSlug: string;
  projects: Project[];
  members: WorkspaceMember[];
}

export function Board({
  initialTickets,
  workspaceId,
  workspaceSlug,
  projects,
  members,
}: BoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { filters, updateFilters } = useBoardFilters(workspaceSlug);

  const ticketIds = useMemo(() => initialTickets.map((t) => t.id), [initialTickets]);

  // Open ticket from URL deeplink on mount
  useEffect(() => {
    const ticketParam = searchParams.get("ticket");
    if (ticketParam) {
      const num = parseInt(ticketParam.replace("T-", ""), 10);
      const ticket = tickets.find((t) => t.number === num);
      if (ticket) {
        setSelectedTicket(ticket);
        setSheetOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { isActive, getActivity, activeAgents } = useAgentActivity(workspaceId, ticketIds);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Apply filters + sort to the full ticket list
  const filteredTickets = useMemo(() => {
    let result = tickets;

    if (filters.statuses.length > 0) {
      result = result.filter((t) => filters.statuses.includes(t.status));
    }
    if (filters.priorities.length > 0) {
      result = result.filter((t) => filters.priorities.includes(t.priority));
    }
    if (filters.projectIds.length > 0) {
      result = result.filter((t) =>
        filters.projectIds.includes(t.project_id ?? "none")
      );
    }
    if (filters.assigneeIds.length > 0) {
      result = result.filter((t) =>
        filters.assigneeIds.includes(t.assignee_id ?? "none")
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (filters.sortBy) {
        case "created_at":
          cmp =
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime();
          break;
        case "priority":
          cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          break;
        case "number":
          cmp = a.number - b.number;
          break;
        case "due_date":
          if (!a.due_date && !b.due_date) cmp = 0;
          else if (!a.due_date) cmp = 1;
          else if (!b.due_date) cmp = -1;
          else
            cmp =
              new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
      }
      return filters.sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [tickets, filters]);

  // When status filter is active, hide filtered-out columns
  const visibleColumns = useMemo(() => {
    if (filters.statuses.length === 0) return BOARD_COLUMNS;
    return BOARD_COLUMNS.filter((col) => filters.statuses.includes(col.status));
  }, [filters.statuses]);

  function getTicketsForColumn(status: TicketStatus): Ticket[] {
    return filteredTickets.filter((t) => t.status === status);
  }

  function handleDragStart(event: DragStartEvent) {
    const ticket = tickets.find((t) => t.id === event.active.id);
    setActiveTicket(ticket ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTicket = tickets.find((t) => t.id === activeId);
    if (!activeTicket) return;

    // Determine the target column
    const targetStatus = BOARD_COLUMNS.find(
      (col) => col.status === overId
    )?.status;
    const overTicket = tickets.find((t) => t.id === overId);
    const targetCol = targetStatus ?? overTicket?.status;

    if (!targetCol || targetCol === activeTicket.status) return;

    setTickets((prev) =>
      prev.map((t) =>
        t.id === activeId ? { ...t, status: targetCol as TicketStatus } : t
      )
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTicket = tickets.find((t) => t.id === activeId);
    if (!activeTicket) return;

    // Update in DB
    const supabase = createClient();
    supabase
      .from("tickets")
      .update({ status: activeTicket.status })
      .eq("id", activeId)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to update ticket status:", error);
        }
      });

    // Handle reordering within same column
    if (activeId !== overId) {
      const overTicket = tickets.find((t) => t.id === overId);
      if (overTicket && overTicket.status === activeTicket.status) {
        setTickets((prev) => {
          const activeIndex = prev.findIndex((t) => t.id === activeId);
          const overIndex = prev.findIndex((t) => t.id === overId);
          return arrayMove(prev, activeIndex, overIndex);
        });
      }
    }
  }

  function handleTicketClick(ticket: Ticket) {
    setSelectedTicket(ticket);
    setSheetOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set("ticket", `T-${ticket.number}`);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) {
      setSelectedTicket(null);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("ticket");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  }

  function handleUpdated(updated: Ticket) {
    setTickets((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    setSelectedTicket(updated);
  }

  function handleDeleted(id: string) {
    setTickets((prev) => prev.filter((t) => t.id !== id));
    const params = new URLSearchParams(searchParams.toString());
    params.delete("ticket");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <>
      <AgentPanel
        activeAgents={activeAgents}
        tickets={tickets}
        onTicketClick={handleTicketClick}
      />
      <BoardToolbar
        filters={filters}
        onChange={updateFilters}
        projects={projects}
        members={members}
      />
      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full gap-4 p-6">
            {visibleColumns.map((col) => (
              <BoardColumn
                key={col.status}
                status={col.status}
                label={col.label}
                tickets={getTicketsForColumn(col.status)}
                onTicketClick={handleTicketClick}
                isAgentActive={isActive}
                getAgentActivity={getActivity}
                groupByProject={filters.groupByProject}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTicket && (
              <TicketCard
                ticket={activeTicket}
                onClick={() => {}}
                isDragOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <TicketDetailSheet
        ticket={selectedTicket}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </>
  );
}
