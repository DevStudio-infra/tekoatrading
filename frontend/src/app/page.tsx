"use client";

import { trpc } from "../lib/trpc";
import Link from "next/link";

export default function Home() {
  const { data: pingData, isLoading } = trpc.ping.useQuery();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold">Tekoa Trading</h1>
      <p className="mt-4 text-lg text-gray-600">AI-Powered Trading Platform</p>

      <div className="mt-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Backend Connection</h2>
        {isLoading ? (
          <p>Testing connection...</p>
        ) : (
          <p className="text-green-600">✓ Connected: {JSON.stringify(pingData)}</p>
        )}
      </div>

      <div className="mt-8 space-x-4">
        <Link
          href="/dashboard"
          className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/bots"
          className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors"
        >
          Manage Bots
        </Link>
      </div>
    </main>
  );
}
