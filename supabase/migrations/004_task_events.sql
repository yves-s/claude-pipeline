-- 004_task_events.sql
-- Agent events for pipeline integration & real-time agent status

-- =============================================================================
-- Task Events
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.task_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id   UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  project_id  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  agent_type  TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_events_ticket ON public.task_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_task_events_ticket_created ON public.task_events(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_events_created ON public.task_events(created_at DESC);

-- =============================================================================
-- RLS: Readable by workspace members, writable only via service role
-- =============================================================================
ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_events_select_member" ON public.task_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = task_events.ticket_id
      AND wm.user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- Writes go through the service role client (bypasses RLS).

-- =============================================================================
-- Enable Realtime on INSERT for task_events
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_events;
