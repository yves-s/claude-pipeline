"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { TicketCard } from "./ticket-card";
import type { Ticket } from "@/lib/types";
import type { TicketStatus } from "@/lib/constants";

interface BoardColumnProps {
  status: TicketStatus;
  label: string;
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  isAgentActive?: (ticketId: string) => boolean;
  getAgentActivity?: (ticketId: string) => { agent_type: string; event_type: string } | null;
  groupByProject?: boolean;
}

const COLUMN_DOT: Record<TicketStatus, string> = {
  backlog: "bg-slate-400",
  ready_to_develop: "bg-sky-500",
  in_progress: "bg-amber-500",
  in_review: "bg-violet-500",
  done: "bg-emerald-500",
  cancelled: "bg-red-400",
};

interface ProjectGroup {
  projectId: string | null;
  projectName: string | null;
  tickets: Ticket[];
}

function buildProjectGroups(tickets: Ticket[]): ProjectGroup[] {
  const map = new Map<string, ProjectGroup>();

  for (const ticket of tickets) {
    const key = ticket.project_id ?? "none";
    if (!map.has(key)) {
      map.set(key, {
        projectId: ticket.project_id,
        projectName: ticket.project?.name ?? null,
        tickets: [],
      });
    }
    map.get(key)!.tickets.push(ticket);
  }

  // No-project group first, then alphabetical
  const noProject = map.get("none");
  const withProject = Array.from(map.values())
    .filter((g) => g.projectId !== null)
    .sort((a, b) => (a.projectName ?? "").localeCompare(b.projectName ?? ""));

  const result: ProjectGroup[] = [];
  if (noProject) result.push(noProject);
  result.push(...withProject);
  return result;
}

export function BoardColumn({
  status,
  label,
  tickets,
  onTicketClick,
  isAgentActive,
  getAgentActivity,
  groupByProject = false,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const groups = groupByProject ? buildProjectGroups(tickets) : null;

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1">
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full shrink-0",
            COLUMN_DOT[status] ?? "bg-slate-400"
          )}
        />
        <span className="text-sm font-medium">{label}</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-medium">
          {tickets.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 rounded-xl p-2 min-h-[200px] transition-colors",
          isOver
            ? "bg-primary/5 ring-1 ring-primary/20"
            : "bg-muted/50"
        )}
      >
        <SortableContext
          items={tickets.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {groupByProject && groups ? (
            groups.map((group, idx) => (
              <div key={group.projectId ?? "none"} className={cn(idx > 0 && "mt-1")}>
                {/* Project label separator */}
                <div className="flex items-center gap-2 px-1 py-1">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate max-w-[140px]">
                    {group.projectName ?? "No project"}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {group.tickets.map((ticket) => (
                  <div key={ticket.id} className="mt-2 first:mt-0">
                    <TicketCard
                      ticket={ticket}
                      onClick={onTicketClick}
                      agentActive={isAgentActive?.(ticket.id) ?? false}
                      agentActivity={getAgentActivity?.(ticket.id) ?? null}
                    />
                  </div>
                ))}
              </div>
            ))
          ) : (
            tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={onTicketClick}
                agentActive={isAgentActive?.(ticket.id) ?? false}
                agentActivity={getAgentActivity?.(ticket.id) ?? null}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
