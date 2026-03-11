"use client";

import * as React from "react";
import { Search, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";
import type { TicketStatus } from "@/lib/constants";

interface CommandPaletteProps {
  workspaceId: string;
  workspaceSlug: string;
}

interface ResultItem {
  id: string;
  number: number;
  title: string;
  status: TicketStatus;
  priority: string;
  project: { name: string } | null;
}

interface RecentTicket {
  id: string;
  number: number;
  title: string;
}

const RECENT_KEY = (slug: string) => `recent-tickets-${slug}`;
const MAX_RECENT = 5;

function getRecentTickets(slug: string): RecentTicket[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY(slug));
    if (!raw) return [];
    return JSON.parse(raw) as RecentTicket[];
  } catch {
    return [];
  }
}

function addRecentTicket(slug: string, ticket: RecentTicket) {
  try {
    const existing = getRecentTickets(slug);
    const deduped = [ticket, ...existing.filter((t) => t.id !== ticket.id)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY(slug), JSON.stringify(deduped));
  } catch {
    // ignore localStorage errors
  }
}

export function CommandPalette({ workspaceId, workspaceSlug }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<ResultItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [recentTickets, setRecentTickets] = React.useState<RecentTicket[]>([]);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Cmd+K / Ctrl+K shortcut
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Custom event from sidebar
  React.useEffect(() => {
    const handler = () => setOpen(true);
    document.addEventListener("open-command-palette", handler);
    return () => document.removeEventListener("open-command-palette", handler);
  }, []);

  // Load recent tickets when opening
  React.useEffect(() => {
    if (open) {
      setRecentTickets(getRecentTickets(workspaceSlug));
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    }
  }, [open, workspaceSlug]);

  // Search with debounce
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const term = query.trim();
    if (!term) {
      setResults([]);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        let queryBuilder = supabase
          .from("tickets")
          .select("id, number, title, status, priority, project:projects(name)")
          .eq("workspace_id", workspaceId)
          .limit(15);

        const numberMatch = term.match(/^(?:T-|#)?(\d+)$/i);
        if (numberMatch) {
          queryBuilder = queryBuilder.eq("number", parseInt(numberMatch[1], 10));
        } else {
          queryBuilder = queryBuilder.or(
            `title.ilike.%${term}%,body.ilike.%${term}%`
          );
        }

        const { data } = await queryBuilder;
        setResults((data as unknown as ResultItem[]) ?? []);
        setActiveIndex(0);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, workspaceId]);

  function navigateToTicket(item: { id: string; number: number; title: string }) {
    addRecentTicket(workspaceSlug, { id: item.id, number: item.number, title: item.title });

    setOpen(false);

    if (pathname.startsWith(`/${workspaceSlug}/board`)) {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("open-ticket", { detail: { number: item.number } })
        );
      }, 250);
    } else {
      router.push(`/${workspaceSlug}/board?ticket=T-${item.number}`);
    }
  }

  // Keyboard navigation inside the palette — placed on the content wrapper
  // so it fires regardless of which child element has focus
  function handleKeyDown(e: React.KeyboardEvent) {
    const list = query.trim() ? results : recentTickets;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = list[activeIndex];
      if (item) navigateToTicket(item);
    }
  }

  const showResults = query.trim().length > 0;
  const listItems = showResults ? results : recentTickets;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[20%] translate-y-0 p-0 gap-0 overflow-hidden max-w-xl [&>button:last-child]:hidden"
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Search tickets</DialogTitle>
        {/* Search input */}
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickets..."
            className="h-11 flex-1 border-0 shadow-none focus-visible:ring-0 focus-visible:border-0 px-0 text-sm"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>

        {/* Results / recent */}
        {listItems.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-1.5">
            {!showResults && (
              <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
                Recent
              </div>
            )}
            {listItems.map((item, i) => {
              const isActive = i === activeIndex;
              const ticket = item as ResultItem;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm mx-1.5",
                    isActive && "bg-accent"
                  )}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => navigateToTicket(item)}
                >
                  <span className="text-xs text-muted-foreground font-mono w-10 shrink-0">
                    T-{item.number}
                  </span>
                  <span className="flex-1 truncate">{item.title}</span>
                  {showResults && ticket.status && (
                    <StatusBadge status={ticket.status} />
                  )}
                  {showResults && ticket.project?.name && (
                    <span className="text-xs text-muted-foreground truncate max-w-24">
                      {ticket.project.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state when searching */}
        {showResults && !loading && results.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            No tickets found for &ldquo;{query}&rdquo;
          </div>
        )}

        {/* Keyboard hint */}
        <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">↑↓</kbd>
          <span>navigate</span>
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">↵</kbd>
          <span>open</span>
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">esc</kbd>
          <span>close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
