import { createClient } from "@/lib/supabase/server";
import { success, error, unauthorized } from "@/lib/api/error-response";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return unauthorized();

    const { data: connection, error: dbError } = await supabase
      .from("telegram_connections")
      .select("id, telegram_username, connected_at")
      .eq("user_id", user.id)
      .single();

    // .single() returns PGRST116 error when no rows found, which is expected
    if (dbError && dbError.code !== "PGRST116") {
      console.error("Telegram status database error:", dbError);
      return error("DB_ERROR", dbError.message, 500);
    }

    return success({ connected: !!connection, connection: connection || null });
  } catch (err) {
    console.error("Telegram status check crashed:", err);
    return error(
      "INTERNAL_ERROR",
      err instanceof Error ? err.message : "Unknown error",
      500
    );
  }
}
