"use client";

import { useEffect, useState } from "react";
import { EvaluationHistoryContainer } from "./evaluation-history-container";

export function ClientEvaluationWrapper() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <EvaluationHistoryContainer />;
}
