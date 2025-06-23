"use client";

import React from "react";
import { motion } from "framer-motion";
import { MessageSquare, Lock, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AIAssistantPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-md mx-auto text-center">
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="p-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <MessageSquare className="h-16 w-16 text-muted-foreground/50" />
                <div className="absolute -top-1 -right-1 bg-background border-2 border-muted-foreground/20 rounded-full p-1">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2">AI Assistant</h1>

            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Coming Soon</span>
            </div>

            <p className="text-muted-foreground mb-6">
              Our AI-powered trading assistant is currently under development. Check back soon for intelligent trading insights and automated assistance.
            </p>

            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/dashboard">Return to Dashboard</Link>
              </Button>

              <Button variant="outline" asChild className="w-full">
                <Link href="/analytics">View Analytics Instead</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
