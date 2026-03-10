"use client";

import dynamic from "next/dynamic";
import type { Ticket, Project, WorkspaceMember } from "@/lib/types";

const Board = dynamic(() => import("./board").then((m) => m.Board), {
  ssr: false,
});

interface BoardClientProps {
  initialTickets: Ticket[];
  workspaceId: string;
  workspaceSlug: string;
  projects: Project[];
  members: WorkspaceMember[];
}

export function BoardClient({
  initialTickets,
  workspaceId,
  workspaceSlug,
  projects,
  members,
}: BoardClientProps) {
  return (
    <Board
      initialTickets={initialTickets}
      workspaceId={workspaceId}
      workspaceSlug={workspaceSlug}
      projects={projects}
      members={members}
    />
  );
}
