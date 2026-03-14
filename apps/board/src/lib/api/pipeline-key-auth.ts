import { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

interface PipelineKeyAuthResult {
  workspace_id: string | null;
  error: string | null;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Validates pipeline auth via X-Pipeline-Key header.
 * Key format: adp_<hex> (same as Bearer auth, but read from dedicated header).
 */
export async function validatePipelineKey(
  request: Request
): Promise<PipelineKeyAuthResult> {
  const key = request.headers.get("X-Pipeline-Key");

  if (!key?.startsWith("adp_")) {
    return { workspace_id: null, error: "Missing or invalid X-Pipeline-Key" };
  }

  const keyHash = sha256(key);

  const supabase = createServiceClient();
  const { data: apiKey, error } = await supabase
    .from("api_keys")
    .select("id, workspace_id, revoked_at")
    .eq("key_hash", keyHash)
    .single();

  if (error || !apiKey) {
    return { workspace_id: null, error: "Invalid API key" };
  }

  if (apiKey.revoked_at) {
    return { workspace_id: null, error: "API key has been revoked" };
  }

  // Update last_used_at (fire and forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then();

  return { workspace_id: apiKey.workspace_id, error: null };
}
