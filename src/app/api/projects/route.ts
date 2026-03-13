import { validatePipelineKey } from "@/lib/api/pipeline-key-auth";
import { success, error, unauthorized } from "@/lib/api/error-response";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  try {
    const auth = await validatePipelineKey(request);
    if (auth.error) return unauthorized(auth.error);

    const workspaceId = auth.workspace_id!;
    const supabase = createServiceClient();

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, name")
      .eq("id", workspaceId)
      .single();

    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, description")
      .eq("workspace_id", workspaceId)
      .order("name");

    return success({
      workspace_id: workspace?.id,
      workspace_name: workspace?.name,
      projects: projects ?? [],
    });
  } catch (err) {
    return error("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
}
