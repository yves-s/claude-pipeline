import { validatePipelineKey } from "@/lib/api/pipeline-key-auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  success,
  error,
  unauthorized,
  notFound,
  validationError,
} from "@/lib/api/error-response";
import { updateTicketSchema } from "@/lib/validations/ticket";

async function getTicketByNumber(workspaceId: string, number: number) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("tickets")
    .select("*, project:projects(*)")
    .eq("workspace_id", workspaceId)
    .eq("number", number)
    .single();
  return data;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;
  const ticketNumber = parseInt(number);

  if (isNaN(ticketNumber)) return notFound("Invalid ticket number");

  const auth = await validatePipelineKey(request);
  if (auth.error) return unauthorized(auth.error);

  const ticket = await getTicketByNumber(auth.workspace_id!, ticketNumber);
  if (!ticket) return notFound("Ticket not found");

  return success(ticket);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;
  const ticketNumber = parseInt(number);

  if (isNaN(ticketNumber)) return notFound("Invalid ticket number");

  const auth = await validatePipelineKey(request);
  if (auth.error) return unauthorized(auth.error);

  const ticket = await getTicketByNumber(auth.workspace_id!, ticketNumber);
  if (!ticket) return notFound("Ticket not found");

  const body = await request.json();
  const parsed = updateTicketSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = createServiceClient();
  const { data: updated, error: dbError } = await supabase
    .from("tickets")
    .update(parsed.data)
    .eq("id", ticket.id)
    .select("*, project:projects(*)")
    .single();

  if (dbError) return error("DB_ERROR", dbError.message, 500);

  return success(updated);
}
