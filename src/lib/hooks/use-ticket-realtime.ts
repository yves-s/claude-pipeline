"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Ticket } from "@/lib/types";

/**
 * Subscribes to Supabase Realtime postgres_changes on the tickets table.
 * Automatically applies INSERT / UPDATE / DELETE to local state.
 *
 * Deduplication:
 * - INSERT: skipped if ticket ID already exists in state
 * - UPDATE: always applied (server is source of truth)
 * - DELETE: safe no-op if ticket already removed
 */
export function useTicketRealtime(
  workspaceId: string,
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>
) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`tickets-realtime-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tickets",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const newTicket = payload.new as Ticket;
          setTickets((prev) => {
            if (prev.some((t) => t.id === newTicket.id)) return prev;
            return [newTicket, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const updated = payload.new as Ticket;
          setTickets((prev) => {
            const idx = prev.findIndex((t) => t.id === updated.id);
            if (idx === -1) return prev;
            const existing = prev[idx];
            // Preserve local project join if realtime payload lacks it
            const merged = {
              ...existing,
              ...updated,
              project: updated.project ?? existing.project,
            };
            const next = [...prev];
            next[idx] = merged;
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "tickets",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const id = (payload.old as { id: string }).id;
          setTickets((prev) => {
            const next = prev.filter((t) => t.id !== id);
            return next.length === prev.length ? prev : next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // setTickets from useState has stable identity
  }, [workspaceId, setTickets]);
}
