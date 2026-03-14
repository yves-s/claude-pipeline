import { createClient } from "@/lib/supabase/server";
import { success, error, unauthorized, notFound } from "@/lib/api/error-response";

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return unauthorized();

    const { data: connection } = await supabase
      .from("telegram_connections")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!connection) return notFound("No Telegram connection found");

    const { error: dbError } = await supabase
      .from("telegram_connections")
      .delete()
      .eq("user_id", user.id);

    if (dbError) return error("DB_ERROR", dbError.message, 500);

    return success({ disconnected: true });
  } catch (err) {
    console.error("Telegram disconnect crashed:", err);
    return error(
      "INTERNAL_ERROR",
      err instanceof Error ? err.message : "Unknown error",
      500
    );
  }
}
