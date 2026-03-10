"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TaskEvent } from "@/lib/types";

const ACTIVITY_WINDOW_MS = 60_000; // 60 seconds

interface AgentActivity {
  agent_type: string;
  event_type: string;
  created_at: string;
}

/**
 * Tracks which tickets have recent agent activity (events within last 60s).
 * Subscribes to Supabase Realtime INSERT events on task_events.
 */
export function useAgentActivity(workspaceId: string) {
  // Map of ticket_id → latest activity
  const [activityMap, setActivityMap] = useState<
    Map<string, AgentActivity>
  >(new Map());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isActive = useCallback(
    (ticketId: string) => {
      const activity = activityMap.get(ticketId);
      if (!activity) return false;
      return (
        Date.now() - new Date(activity.created_at).getTime() <
        ACTIVITY_WINDOW_MS
      );
    },
    [activityMap]
  );

  const getActivity = useCallback(
    (ticketId: string): AgentActivity | null => {
      const activity = activityMap.get(ticketId);
      if (!activity) return null;
      if (
        Date.now() - new Date(activity.created_at).getTime() >=
        ACTIVITY_WINDOW_MS
      ) {
        return null;
      }
      return activity;
    },
    [activityMap]
  );

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to new task_events
    const channel = supabase
      .channel("task-events-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_events",
        },
        (payload) => {
          const event = payload.new as TaskEvent;
          setActivityMap((prev) => {
            const next = new Map(prev);
            next.set(event.ticket_id, {
              agent_type: event.agent_type,
              event_type: event.event_type,
              created_at: event.created_at,
            });
            return next;
          });
        }
      )
      .subscribe();

    // Periodically clean up stale entries to trigger re-renders
    timerRef.current = setInterval(() => {
      setActivityMap((prev) => {
        const now = Date.now();
        let changed = false;
        const next = new Map(prev);
        for (const [ticketId, activity] of next) {
          if (
            now - new Date(activity.created_at).getTime() >=
            ACTIVITY_WINDOW_MS
          ) {
            next.delete(ticketId);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 10_000);

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [workspaceId]);

  return { isActive, getActivity };
}
