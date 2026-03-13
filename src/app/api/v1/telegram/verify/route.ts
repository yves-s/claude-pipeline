import { createServiceClient } from "@/lib/supabase/service";
import { success, error, unauthorized, notFound } from "@/lib/api/error-response";

export async function POST(request: Request) {
  try {
    // Verify bot secret
    const authHeader = request.headers.get("authorization");
    const botSecret = process.env.TELEGRAM_BOT_SECRET;

    if (!botSecret || authHeader !== `Bearer ${botSecret}`) {
      return unauthorized("Invalid bot secret");
    }

    const body = await request.json();
    const { code, telegram_user_id, telegram_username } = body;

    if (!code || !telegram_user_id) {
      return error(
        "VALIDATION_ERROR",
        "code and telegram_user_id are required",
        400
      );
    }

    const supabase = createServiceClient();

    // Find valid auth code (not expired)
    const { data: authCode, error: codeError } = await supabase
      .from("telegram_auth_codes")
      .select("*")
      .eq("code", code)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!authCode || codeError) return notFound("Invalid or expired code");

    // Check if this telegram_user_id is already linked to another user
    const { data: existingTg, error: existError } = await supabase
      .from("telegram_connections")
      .select("id")
      .eq("telegram_user_id", telegram_user_id)
      .single();

    // If we got an error other than PGRST116 (no rows), it's a real error
    if (existError && existError.code !== "PGRST116") {
      return error("DB_ERROR", existError.message, 500);
    }

    if (existingTg) {
      return error(
        "TELEGRAM_ALREADY_LINKED",
        "This Telegram account is already linked to another user",
        409
      );
    }

    // Create connection
    const { error: insertError } = await supabase
      .from("telegram_connections")
      .insert({
        user_id: authCode.user_id,
        telegram_user_id: Number(telegram_user_id),
        telegram_username: telegram_username || null,
      });

    if (insertError) return error("DB_ERROR", insertError.message, 500);

    // Clean up auth code
    await supabase
      .from("telegram_auth_codes")
      .delete()
      .eq("id", authCode.id);

    return success({ connected: true, user_id: authCode.user_id });
  } catch (err) {
    console.error("Telegram verify crashed:", err);
    return error(
      "INTERNAL_ERROR",
      err instanceof Error ? err.message : "Unknown error",
      500
    );
  }
}
