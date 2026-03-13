"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoveProjectDialog } from "./move-project-dialog";
import type { Project } from "@/lib/types";

interface ProjectsSettingsViewProps {
  projects: Project[];
  workspaceId: string;
  workspaceSlug: string;
}

export function ProjectsSettingsView({
  projects,
  workspaceId,
}: ProjectsSettingsViewProps) {
  const [projectsList, setProjectsList] = useState<Project[]>(projects);
  const [moveDialogProject, setMoveDialogProject] = useState<Project | null>(
    null
  );

  function handleMoved() {
    if (!moveDialogProject) return;
    setProjectsList((prev) => prev.filter((p) => p.id !== moveDialogProject.id));
    setMoveDialogProject(null);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>
            Manage projects in this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {projectsList.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">
              No projects found.
            </p>
          ) : (
            <ul className="divide-y">
              {projectsList.map((project) => (
                <li
                  key={project.id}
                  className="flex items-center gap-3 px-6 py-3"
                >
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium">{project.name}</span>
                    {project.description && (
                      <span className="text-xs text-muted-foreground">
                        {project.description}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMoveDialogProject(project)}
                  >
                    Move
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {moveDialogProject && (
        <MoveProjectDialog
          open={moveDialogProject !== null}
          onOpenChange={(open) => {
            if (!open) setMoveDialogProject(null);
          }}
          project={moveDialogProject}
          currentWorkspaceId={workspaceId}
          onMoved={handleMoved}
        />
      )}
    </>
  );
}
