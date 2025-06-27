"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Copy, BookOpen } from "lucide-react";
import { Button } from "../shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../shared/components/ui/card";
import { CreateStrategyDialog } from "./create-strategy-dialog";
import { EditStrategyDialog } from "./edit-strategy-dialog";
import { StrategyTemplateDialog } from "./strategy-template-dialog";
import { toast } from "sonner";
import { Badge } from "../shared/components/ui/badge";
import { trpc } from "../../lib/trpc";

interface Strategy {
  id: string;
  name: string;
  description: string | null;
  indicators?: any;
  parameters?: any;
  isActive: boolean;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export function StrategyList() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  const { data: strategies, isLoading, refetch } = trpc.strategies.getAll.useQuery();
  const deleteStrategyMutation = trpc.strategies.delete.useMutation();
  const duplicateStrategyMutation = trpc.strategies.duplicate.useMutation();

  const handleDelete = async (strategyId: string) => {
    try {
      await deleteStrategyMutation.mutateAsync({ id: strategyId });
      toast.success("Strategy deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete strategy");
    }
  };

  const handleDuplicate = async (strategy: Strategy) => {
    try {
      await duplicateStrategyMutation.mutateAsync({ id: strategy.id });
      toast.success("Strategy duplicated successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to duplicate strategy");
    }
  };

  const handleEdit = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setEditDialogOpen(true);
  };

  const handleTemplateCreated = () => {
    refetch();
    setTemplateDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading strategies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trading Strategies</h2>
          <p className="text-muted-foreground">Manage your trading strategies and indicators</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
            <BookOpen className="mr-2 h-4 w-4" />
            Use Template
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Strategy
          </Button>
        </div>
      </div>

      {strategies && strategies.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-center text-muted-foreground mb-4">
              No strategies created yet. Create your first strategy or start with a template.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
                <BookOpen className="mr-2 h-4 w-4" />
                Browse Templates
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Strategy
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {strategies?.map((strategy) => (
            <Card key={strategy.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{strategy.name}</CardTitle>
                    <CardDescription>{strategy.description || "No description"}</CardDescription>
                  </div>
                  <Badge variant={strategy.isActive ? "default" : "secondary"}>
                    {strategy.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Indicators: </span>
                    <span>{Object.keys(strategy.indicators || {}).length}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Parameters: </span>
                    <span>{Object.keys(strategy.parameters || {}).length}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Updated {new Date(strategy.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(strategy)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDuplicate(strategy)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(strategy.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateStrategyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          refetch();
          setCreateDialogOpen(false);
        }}
      />

      {selectedStrategy && (
        <EditStrategyDialog
          strategy={selectedStrategy}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={() => {
            refetch();
            setEditDialogOpen(false);
          }}
        />
      )}

      <StrategyTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onStrategyCreated={handleTemplateCreated}
      />
    </div>
  );
}
