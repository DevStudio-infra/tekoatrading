#!/usr/bin/env node

/**
 * Trade Monitoring Script
 *
 * This script helps you monitor LLM trading decisions vs actual Capital.com executions
 * Run this to see real-time trading activity and verify your bot is actually trading
 */

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const LOG_FILE = path.join(__dirname, "../logs/trade-verification.log");

console.log("🔍 TRADE VERIFICATION MONITOR");
console.log("============================");
console.log(`📁 Log file: ${LOG_FILE}`);
console.log("");

// Check if log file exists
if (!fs.existsSync(LOG_FILE)) {
  console.log("⚠️  Log file does not exist yet. Start your trading bot to generate logs.");
  console.log("");
  console.log("💡 The log file will be created when the first trading decision is made.");
  process.exit(0);
}

// Show file size and last modified
const stats = fs.statSync(LOG_FILE);
console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
console.log(`🕐 Last modified: ${stats.mtime.toLocaleString()}`);
console.log("");

// Show last 20 lines
console.log("📋 RECENT ACTIVITY (Last 20 lines):");
console.log("=====================================");

try {
  // Use tail command on Unix-like systems, or read file on Windows
  if (process.platform === "win32") {
    // Windows - read last lines manually
    const content = fs.readFileSync(LOG_FILE, "utf8");
    const lines = content.split("\n").filter((line) => line.trim());
    const lastLines = lines.slice(-20);
    lastLines.forEach((line) => console.log(line));
  } else {
    // Unix-like systems - use tail
    exec(`tail -20 "${LOG_FILE}"`, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Error reading log file:", error);
        return;
      }
      console.log(stdout);
    });
  }
} catch (error) {
  console.error("❌ Error reading log file:", error);
}

console.log("");
console.log("🔄 REAL-TIME MONITORING:");
console.log("========================");
console.log("To monitor in real-time, use one of these commands:");
console.log("");

if (process.platform === "win32") {
  console.log(`Windows PowerShell:`);
  console.log(`Get-Content "${LOG_FILE}" -Wait -Tail 10`);
  console.log("");
  console.log(`Windows Command Prompt:`);
  console.log(`powershell "Get-Content '${LOG_FILE}' -Wait -Tail 10"`);
} else {
  console.log(`Unix/Linux/macOS:`);
  console.log(`tail -f "${LOG_FILE}"`);
}

console.log("");
console.log("🎯 WHAT TO LOOK FOR:");
console.log("====================");
console.log("🧠 LLM DECISION - Shows when AI decides to trade");
console.log("✅ CAPITAL.COM EXECUTION - Shows actual trades on Capital.com");
console.log("❌ TRADE FAILED - Shows when trades are rejected");
console.log("");
console.log("💡 TIP: Compare the LLM decisions with Capital.com executions");
console.log("   to verify your bot is actually trading for real!");
