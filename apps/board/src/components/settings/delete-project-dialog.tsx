"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/types";

type DeleteMode = "unset_project" | "delete_tickets";

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  workspaceId: string;
  onDeleted: () => void;
}

export function DeleteProjectDialog({
  open,
  onOpenChange,
  project,
  workspaceId: _workspaceId,
  onDeleted,
}: DeleteProjectDialogProps) {
  const [ticketCount, setTicketCount] = useState<number | null>(null);
  const [mode, setMode] = useState<DeleteMode>("unset_project");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setTicketCount(null);
    setMode("unset_project");
    setError(null);

    async function fetchTicketCount() {
      const supabase = createClient();
      const { count } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id);

      setTicketCount(count ?? 0);
    }

    fetchTicketCount();
  }, [open, project.id]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setMode("unset_project");
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleDelete() {
    if (isDeleting) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          body?.error?.message ?? "Failed to delete project. Please try again."
        );
        setIsDeleting(false);
        return;
      }

      onDeleted();
      handleOpenChange(false);
    } catch {
      setError("Network error. Please try again.");
      setIsDeleting(false);
    }
  }

  const ticketCountLabel =
    ticketCount === null
      ? "Loading…"
      : ticketCount === 1
        ? "This project has 1 ticket."
        : `This project has ${ticketCount} tickets.`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete project</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{project.name}&rdquo;? This
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{ticketCountLabel}</p>

          {ticketCount !== null && ticketCount > 0 && (
            <div className="space-y-1.5">
              <label
                htmlFor="delete-mode"
                className="text-sm font-medium leading-none"
              >
                What should happen to the tickets?
              </label>
              <select
                id="delete-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as DeleteMode)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="unset_project">
                  Keep tickets (unset project)
                </option>
                <option value="delete_tickets">Delete tickets</option>
              </select>
            </div>
          )}

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || ticketCount === null}
          >
            {isDeleting ? "Deleting…" : "Delete project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
