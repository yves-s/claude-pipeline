"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, ExternalLink, Loader2, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TelegramConnection {
  telegram_username: string | null;
  connected_at: string;
}

export function TelegramStatusIndicator() {
  const [connected, setConnected] = useState(false);
  const [connection, setConnection] = useState<TelegramConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [connectData, setConnectData] = useState<{
    code: string;
    deepLink: string;
    expiresAt: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/telegram/status");
      if (!res.ok) {
        console.error("Telegram status check failed:", res.status);
        setLoading(false);
        return;
      }
      const json = await res.json();
      if (json.data) {
        setConnected(json.data.connected);
        setConnection(json.data.connection);
      }
    } catch (err) {
      console.error("Telegram status fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleConnect() {
    setActionLoading(true);
    try {
      const res = await fetch("/api/telegram/connect", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        console.error("Telegram connect failed:", json.error);
        return;
      }
      if (json.data) {
        setConnectData(json.data);
      }
    } catch (err) {
      console.error("Telegram connect error:", err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDisconnect() {
    setActionLoading(true);
    try {
      const res = await fetch("/api/telegram/disconnect", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        console.error("Telegram disconnect failed:", json.error);
        return;
      }
      if (json.data?.disconnected) {
        setConnected(false);
        setConnection(null);
        setDialogOpen(false);
      }
    } catch (err) {
      console.error("Telegram disconnect error:", err);
    } finally {
      setActionLoading(false);
    }
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setConnectData(null);
      // Refresh status when dialog closes — user may have completed linking via bot
      fetchStatus();
    }
  }

  if (loading) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            connected
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
              : "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
          )}
        >
          <Send className="h-3 w-3" />
          <span className="truncate">
            {connected ? "Telegram verbunden" : "Telegram verbinden"}
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {connected ? (
          <>
            <DialogHeader>
              <DialogTitle>Telegram verbunden</DialogTitle>
              <DialogDescription>
                {connection?.telegram_username
                  ? `Verbunden als @${connection.telegram_username}`
                  : "Dein Telegram-Account ist verknüpft."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
                Trennen
              </Button>
            </DialogFooter>
          </>
        ) : connectData ? (
          <>
            <DialogHeader>
              <DialogTitle>Telegram verbinden</DialogTitle>
              <DialogDescription>
                Klicke auf den Button, um den Bot zu öffnen. Die Verknüpfung
                passiert automatisch.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-lg bg-muted px-4 py-3 text-center w-full">
                <p className="text-xs text-muted-foreground mb-1">Dein Code</p>
                <p className="text-2xl font-mono font-bold tracking-widest">
                  {connectData.code}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gültig für 5 Minuten
                </p>
              </div>
              <Button asChild className="w-full">
                <a
                  href={connectData.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Send className="h-4 w-4" />
                  Telegram Bot öffnen
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Telegram verbinden</DialogTitle>
              <DialogDescription>
                Verknüpfe deinen Telegram-Account, um Tickets direkt über den
                Bot zu erstellen.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleConnect} disabled={actionLoading}>
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Code generieren
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
