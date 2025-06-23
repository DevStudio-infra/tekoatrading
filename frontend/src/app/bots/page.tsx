"use client";

import { useState } from "react";
import { trpc } from "../../lib/trpc";

export default function Bots() {
  const [newBotName, setNewBotName] = useState("");
  const [userId] = useState("demo-user-id"); // Mock user ID

  const { data: bots, refetch } = trpc.bots.list.useQuery({ userId });

  const createBot = trpc.bots.create.useMutation({
    onSuccess: () => {
      refetch();
      setNewBotName("");
    },
  });

  const toggleBot = trpc.bots.toggleActive.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleCreateBot = () => {
    if (newBotName.trim()) {
      createBot.mutate({
        name: newBotName,
        userId,
      });
    }
  };

  const handleToggleBot = (botId: string) => {
    toggleBot.mutate({ botId });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Trading Bots</h1>

        {/* Create Bot Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Bot</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newBotName}
              onChange={(e) => setNewBotName(e.target.value)}
              placeholder="Enter bot name"
              className="flex-1 p-2 border rounded-md"
            />
            <button
              onClick={handleCreateBot}
              disabled={createBot.isLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createBot.isLoading ? "Creating..." : "Create Bot"}
            </button>
          </div>
        </div>

        {/* Bots List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Your Bots</h2>
          </div>

          <div className="divide-y">
            {bots?.length ? (
              bots.map((bot: any) => (
                <div key={bot.id} className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{bot.name}</h3>
                    <p className="text-gray-600">
                      Status:{" "}
                      <span className={bot.isActive ? "text-green-600" : "text-red-600"}>
                        {bot.isActive ? "Active" : "Inactive"}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(bot.createdAt).toLocaleDateString()}
                    </p>
                    {bot.strategy && (
                      <p className="text-sm text-blue-600">Strategy: {bot.strategy.name}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleBot(bot.id)}
                      disabled={toggleBot.isLoading}
                      className={`px-4 py-2 rounded-md text-white ${
                        bot.isActive
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-green-600 hover:bg-green-700"
                      } disabled:opacity-50`}
                    >
                      {bot.isActive ? "Stop" : "Start"}
                    </button>

                    <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                      Configure
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                No bots created yet. Create your first bot above.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
