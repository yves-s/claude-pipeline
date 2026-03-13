import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  success,
  error,
  unauthorized,
  forbidden,
  notFound,
} from "@/lib/api/error-response";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return unauthorized();

    // Fetch the project (RLS ensures user can only see projects they have access to)
    const { data: project } = await supabase
      .from("projects")
      .select("id, workspace_id, name")
      .eq("id", projectId)
      .single();

    if (!project) return notFound("Project not found");

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return error("INVALID_JSON", "Request body must be valid JSON", 400);
    }

    const { target_workspace_id } = body as { target_workspace_id?: string };

    if (!target_workspace_id || typeof target_workspace_id !== "string") {
      return error(
        "VALIDATION_ERROR",
        "target_workspace_id is required",
        400
      );
    }

    if (!UUID_REGEX.test(target_workspace_id)) {
      return error(
        "VALIDATION_ERROR",
        "target_workspace_id must be a valid UUID",
        400
      );
    }

    // Check source and target are different
    if (project.workspace_id === target_workspace_id) {
      return error(
        "SAME_WORKSPACE",
        "Project is already in this workspace",
        400
      );
    }

    // Verify user is a member of the target workspace
    const { data: targetMember } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", target_workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!targetMember) return forbidden("Not a member of target workspace");

    // Check for name conflict in target workspace
    const { data: conflicting } = await supabase
      .from("projects")
      .select("id")
      .eq("workspace_id", target_workspace_id)
      .eq("name", project.name)
      .single();

    if (conflicting) {
      return error(
        "CONFLICT",
        "A project with this name already exists in the target workspace",
        409
      );
    }

    // Use service client to bypass RLS for cross-workspace updates
    const serviceClient = createServiceClient();

    // Move the project to the target workspace
    const { data: updatedProject, error: projectError } = await serviceClient
      .from("projects")
      .update({ workspace_id: target_workspace_id })
      .eq("id", projectId)
      .select("id, workspace_id, name, description, created_at, updated_at")
      .single();

    if (projectError) {
      return error("DB_ERROR", projectError.message, 500);
    }

    // Move all tickets belonging to this project to the target workspace
    const { error: ticketsError } = await serviceClient
      .from("tickets")
      .update({ workspace_id: target_workspace_id })
      .eq("project_id", projectId);

    if (ticketsError) {
      // Attempt to rollback the project move
      await serviceClient
        .from("projects")
        .update({ workspace_id: project.workspace_id })
        .eq("id", projectId);

      return error("DB_ERROR", ticketsError.message, 500);
    }

    return success({ project: updatedProject });
  } catch (err) {
    console.error("Project move crashed:", err);
    return error(
      "INTERNAL_ERROR",
      err instanceof Error ? err.message : "Unknown error",
      500
    );
  }
}
