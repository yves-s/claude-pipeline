"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Project, ApiKey } from "@/lib/types";

interface ProjectSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  workspaceId: string;
  boardUrl: string;
  apiKey: ApiKey | null;
  plaintextKey: string | null;
  onRegenerateKey: () => Promise<string | null>;
}

export function ProjectSetupDialog({
  open,
  onOpenChange,
  project,
  workspaceId,
  boardUrl,
  apiKey,
  plaintextKey,
  onRegenerateKey,
}: ProjectSetupDialogProps) {
  const [copied, setCopied] = useState<"cli" | "json" | null>(null);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [currentPlaintextKey, setCurrentPlaintextKey] = useState(plaintextKey);
  const [manualOpen, setManualOpen] = useState(false);

  const displayKey = currentPlaintextKey
    ? currentPlaintextKey
    : apiKey
      ? `${apiKey.key_prefix}...****`
      : "Generating...";

  const cliCommand = `/setup-pipeline \\
  --board ${boardUrl} \\
  --key ${displayKey} \\
  --project ${project.id}`;

  const jsonConfig = JSON.stringify(
    {
      pipeline: {
        project_id: project.id,
        project_name: project.name,
        workspace_id: workspaceId,
        api_url: boardUrl,
        api_key: displayKey,
      },
    },
    null,
    2
  );

  async function copyToClipboard(text: string, type: "cli" | "json") {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    const newKey = await onRegenerateKey();
    if (newKey) setCurrentPlaintextKey(newKey);
    setRegenerating(false);
    setShowRegenConfirm(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect &ldquo;{project.name}&rdquo;</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Option 1: CLI Command */}
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <p className="text-sm font-medium">
                Run this in your project terminal:
              </p>
              <div className="relative">
                <pre className="text-xs bg-background rounded p-3 overflow-x-auto">
                  {cliCommand}
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-7 w-7"
                  onClick={() => copyToClipboard(cliCommand, "cli")}
                >
                  {copied === "cli" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Option 2: Manual JSON (collapsible) */}
            <Collapsible open={manualOpen} onOpenChange={setManualOpen}>
              <CollapsibleTrigger className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                {manualOpen ? "\u25BE" : "\u25B8"} Manual: add to project.json
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="relative">
                  <pre className="text-xs bg-muted rounded p-3 overflow-x-auto">
                    {jsonConfig}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7"
                    onClick={() => copyToClipboard(jsonConfig, "json")}
                  >
                    {copied === "json" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* API Key management */}
            <div className="border-t pt-3 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                API Key: <code className="text-xs">{apiKey?.key_prefix ?? "\u2014"}...****</code>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRegenConfirm(true)}
                disabled={regenerating}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${regenerating ? "animate-spin" : ""}`} />
                Regenerate Key
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Later
            </Button>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirmation */}
      <AlertDialog open={showRegenConfirm} onOpenChange={setShowRegenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Regenerate API Key?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>The current key will be revoked immediately. After regenerating:</p>
                <ul className="list-disc pl-4 space-y-1 text-sm">
                  <li>All connected projects need the new key</li>
                  <li>
                    Run{" "}
                    <code className="text-xs">/setup-pipeline --board ... --key &lt;new-key&gt;</code>{" "}
                    in each project
                  </li>
                  <li>
                    Or replace <code className="text-xs">api_key</code> in{" "}
                    <code className="text-xs">project.json</code> manually
                  </li>
                  <li>Restart VPS worker if active</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegenerate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Regenerate Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
