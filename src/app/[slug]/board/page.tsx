import { createClient } from "@/lib/supabase/server";
import { BoardHeader } from "@/components/board/board-header";
import { BoardClient } from "@/components/board/board-client";
import type { Ticket, Project, WorkspaceMember } from "@/lib/types";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .single();

  const tickets: Ticket[] = [];
  const projects: Project[] = [];
  const members: WorkspaceMember[] = [];

  if (workspace) {
    const [ticketsResult, projectsResult, membersResult] = await Promise.all([
      supabase
        .from("tickets")
        .select("*, project:projects(id, name, description, workspace_id, created_at, updated_at)")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("name"),
      supabase
        .from("workspace_members")
        .select("id, workspace_id, user_id, role, joined_at, user_email")
        .eq("workspace_id", workspace.id),
    ]);

    if (ticketsResult.data) tickets.push(...(ticketsResult.data as Ticket[]));
    if (projectsResult.data) projects.push(...(projectsResult.data as Project[]));
    if (membersResult.data) members.push(...(membersResult.data as WorkspaceMember[]));
  }

  return (
    <>
      <BoardHeader workspaceId={workspace?.id ?? ""} />
      <BoardClient
        initialTickets={tickets}
        workspaceId={workspace?.id ?? ""}
        workspaceSlug={slug}
        projects={projects}
        members={members}
      />
    </>
  );
}
