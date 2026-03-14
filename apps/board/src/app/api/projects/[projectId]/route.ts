import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  success,
  error,
  unauthorized,
  notFound,
  validationError,
} from "@/lib/api/error-response";
import { updateProjectSchema } from "@/lib/validations/project";

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

    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    // Check for duplicate name in the same workspace if name is being changed
    if (parsed.data.name && parsed.data.name !== project.name) {
      const { data: conflicting } = await supabase
        .from("projects")
        .select("id")
        .eq("workspace_id", project.workspace_id)
        .eq("name", parsed.data.name)
        .neq("id", projectId)
        .single();

      if (conflicting) {
        return error(
          "CONFLICT",
          "A project with this name already exists",
          409
        );
      }
    }

    // Build update object with only defined fields
    const updateFields: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateFields.name = parsed.data.name;
    if (parsed.data.description !== undefined)
      updateFields.description = parsed.data.description;

    if (Object.keys(updateFields).length === 0) {
      return error("VALIDATION_ERROR", "No fields to update", 400);
    }

    // Update via user supabase client
    const { data: updatedProject, error: dbError } = await supabase
      .from("projects")
      .update(updateFields)
      .eq("id", projectId)
      .select("id, workspace_id, name, description, created_at, updated_at")
      .single();

    if (dbError) {
      return error("DB_ERROR", dbError.message, 500);
    }

    return success(updatedProject);
  } catch (err) {
    console.error("Project update crashed:", err);
    return error("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
}

export async function DELETE(
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

    // Parse request body for mode
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return error("INVALID_JSON", "Request body must be valid JSON", 400);
    }

    const { mode } = body as { mode?: string };

    if (mode !== "delete_tickets" && mode !== "unset_project") {
      return error(
        "VALIDATION_ERROR",
        "mode must be 'delete_tickets' or 'unset_project'",
        400
      );
    }

    // Count affected tickets
    const { count: ticketCount, error: countError } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    if (countError) {
      return error("DB_ERROR", countError.message, 500);
    }

    // Use service client for destructive operations (bypass RLS)
    const serviceClient = createServiceClient();

    if (mode === "delete_tickets") {
      const { error: ticketDeleteError } = await serviceClient
        .from("tickets")
        .delete()
        .eq("project_id", projectId);

      if (ticketDeleteError) {
        return error("DB_ERROR", ticketDeleteError.message, 500);
      }
    } else {
      // mode === "unset_project"
      const { error: ticketUpdateError } = await serviceClient
        .from("tickets")
        .update({ project_id: null })
        .eq("project_id", projectId);

      if (ticketUpdateError) {
        return error("DB_ERROR", ticketUpdateError.message, 500);
      }
    }

    // Delete the project
    const { error: projectDeleteError } = await serviceClient
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (projectDeleteError) {
      return error("DB_ERROR", projectDeleteError.message, 500);
    }

    return success({
      deleted: true,
      projectId,
      ticketsAffected: ticketCount ?? 0,
    });
  } catch (err) {
    console.error("Project delete crashed:", err);
    return error("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
}
