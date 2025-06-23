"use client";

import { trpc } from "../lib/trpc";

export default function Home() {
  const { data: pingData, isLoading } = trpc.ping.useQuery();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold">Tekoa Trading</h1>
      <p className="mt-4 text-lg text-gray-600">MVP in progress...</p>

      <div className="mt-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Backend Connection</h2>
        {isLoading ? (
          <p>Testing connection...</p>
        ) : (
          <p className="text-green-600">✓ Connected: {JSON.stringify(pingData)}</p>
        )}
      </div>
    </main>
  );
}
