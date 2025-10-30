"use client";

import React, { useState, useEffect, useRef } from "react";
import { PlayIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";

// Define the structure of our log messages
interface LogEntry {
  id: number;
  type: "status" | "log" | "result" | "error" | "summary";
  message: string;
  author?: string;
  comment?: string;
  isDryRun?: boolean; // <-- FIX 1: Add isDryRun flag
}

export default function Home() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState("Idle. Waiting to connect...");
  const [isRunning, setIsRunning] = useState(false);
  const [cookieJson, setCookieJson] = useState("");
  const [autoComment, setAutoComment] = useState(true);
  const [autoLike, setAutoLike] = useState(true);
  const [maxPosts, setMaxPosts] = useState(5);

  const ws = useRef<WebSocket | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const logIdCounter = useRef(0);

  // Function to add a new log and scroll to bottom
  const addLog = (newLogData: Omit<LogEntry, "id">) => {
    logIdCounter.current += 1;
    // Ensure all logs have the isDryRun property, default to false
    const newLog: LogEntry = { isDryRun: false, ...newLogData, id: logIdCounter.current };
    setLogs((prevLogs) => [...prevLogs, newLog]);
  };

  // Auto-scroll to bottom of log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Effect to connect to the WebSocket on component mount
  useEffect(() => {
    const wsUrl = String(process.env.NEXT_PUBLIC_BACKEND_WS);
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setStatus("Connected. Ready to start.");
      console.log("WebSocket connected");
    };

    ws.current.onclose = () => {
      setStatus("Disconnected. Please refresh the page.");
      console.log("WebSocket disconnected");
      if (isRunning) {
        addLog({
          type: "error",
          message: "Connection to server lost. Please refresh.",
        });
        setIsRunning(false);
      }
    };

    ws.current.onerror = (err) => {
      console.error("WebSocket error:", err);
      setStatus("WebSocket connection error.");
    };

    // This is where we receive live updates from the backend
    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received data:", data);

        if (data.type === "status") {
          setStatus(data.message);
          addLog({ type: "status", message: data.message });

          if (data.message.includes("Agent run finished")) {
            setIsRunning(false);
          }
        } else if (data.type === "log") {
          addLog({ type: "log", message: data.message });
        } else if (data.type === "error") {
          addLog({ type: "error", message: data.message });
          setStatus(`Error: ${data.message}`);
          setIsRunning(false); // Stop on error
        } else if (data.type === "result" && data.log) {
          
          // --- FIX 2: Check for Dry Run ---
          const log = data.log;
          const isDryRun = !log.posted_to_linkedin; // Check if it was NOT posted
          const actionText = isDryRun ? "Generated (DRY RUN)" : "Successfully POSTED";

          addLog({
            type: "result",
            message: `${actionText} comment for ${log.post_author}'s post.`,
            author: log.post_author,
            comment: log.generated_comment,
            isDryRun: isDryRun, // Pass the flag to the log entry
          });
          // --- End of Fix ---

        } else if (data.type === "summary") {
          addLog({ type: "summary", message: data.message });
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    // Cleanup on unmount
    return () => {
      ws.current?.close();
    };

  }, []); // Your stable empty dependency array

  const startAgent = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      JSON.parse(cookieJson);
    } catch (err) {
      alert(
        "The provided Cookie JSON is invalid. Please check and paste it again."
      );
      return;
    }

    setIsRunning(true);
    setLogs([]); // Clear old logs
    logIdCounter.current = 0;
    setStatus("Agent starting...");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND}/agent/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            auto_comment: autoComment,
            auto_like: autoLike,
            max_posts_to_process: maxPosts,
            cookie_json: cookieJson,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.detail || "Failed to start agent");

      addLog({ type: "status", message: result.message });
    } catch (err: any) {
      console.error("Failed to start agent:", err);
      setStatus(`Error: ${err.message}`);
      addLog({
        type: "error",
        message: `Failed to start agent: ${err.message}`,
      });
      setIsRunning(false);
    }
  };

  // Helper to render log entries
  const renderLog = (log: LogEntry) => {
    switch (log.type) {
      case "status":
        return <span className="text-gray-400 italic">-- {log.message}</span>;
      case "log":
        return <span className="text-sky-400">{log.message}</span>;
      
      // --- FIX 3: Update Render Logic ---
      case "result":
        const isDryRun = log.isDryRun; // Use the flag from the log entry
        return (
          <div className={`rounded-md p-2 border-l-2 ${isDryRun ? 'border-blue-500 bg-blue-900/20' : 'border-green-500 bg-green-900/20'}`}>
            <span className={`font-semibold ${isDryRun ? 'text-blue-400' : 'text-green-400'}`}>
              {isDryRun ? 'Dry Run:' : 'Success:'}
            </span>
            <span className="text-gray-100"> {log.message}</span>
            {/* Also show the comment that was generated/posted */}
            <p className="whitespace-pre-wrap pl-4 font-sans text-sm text-gray-400 italic">"{log.comment}"</p>
          </div>
        );
      // --- End of Fix ---

      case "summary":
        return (
          <div className="rounded-md p-2 border-l-2 border-indigo-400 bg-indigo-900/20">
            <span className="font-semibold text-indigo-300">Summary:</span>
            <pre className="whitespace-pre-wrap pl-4 font-sans text-sm text-gray-200">
              {log.message}
            </pre>
          </div>
        );
      case "error":
        return (
          <span className="font-semibold text-red-400">
            Error: {log.message}
          </span>
        );
      default:
        return <span className="text-gray-100">{log.message}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning Box */}
      <div className="rounded-md border-l-4 border-yellow-400 bg-yellow-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon
              className="h-5 w-5 text-yellow-400"
              aria-hidden="true"
            />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <span className="font-medium text-yellow-800">
                Security & Usage Warning:
              </span>{" "}
              Your LinkedIn cookies are sensitive data. This app sends them to
              your local server for automation. Do not use this on a public
              computer. Automating your account is against LinkedIn's ToS and
              carries a risk of account restriction or banning. Use responsibly.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Controls */}
        <form onSubmit={startAgent} className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900">Controls</h2>
          <div className="mt-6 space-y-6">
            {/* Cookie Input */}
            <div>
              <label
                htmlFor="cookies"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                LinkedIn Cookie JSON
              </label>
              <textarea
                id="cookies"
                rows={8}
                className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 font-mono"
                placeholder="Paste your exported cookie JSON here..."
                value={cookieJson}
                onChange={(e) => setCookieJson(e.target.value)}
                disabled={isRunning}
                required
              />
            </div>

            {/* Settings */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="maxPosts"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Max Posts to Process
                </label>
                <input
                  type="number"
                  id="maxPosts"
                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  
                  // --- FIX 4: NaN fix ---
                  value={maxPosts} // This is correct
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    // This logic prevents NaN from ever being set in the state
                    if (isNaN(value)) {
                      setMaxPosts(1); // Default to 1 if input is empty or invalid
                    } else {
                      setMaxPosts(Math.min(Math.max(value, 1), 20)); // Clamp between 1 and 20
                    }
                  }}
                  // --- End of Fix ---

                  disabled={isRunning}
                  min="1"
                  max="20"
                />
              </div>
              <div className="flex flex-col justify-end space-y-4 pt-2">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={autoComment}
                    onChange={(e) => setAutoComment(e.target.checked)}
                    disabled={isRunning}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-4 peer-focus:ring-indigo-300"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    Auto-Comment
                  </span>
                </label>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={autoLike}
                    onChange={(e) => setAutoLike(e.target.checked)}
                    disabled={isRunning}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-4 peer-focus:ring-indigo-300"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    Auto-Like
                  </span>
                </label>
              </div>
            </div>

            {/* Start Button */}
            <button
              type="submit"
              disabled={isRunning || !cookieJson}
              className="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isRunning ? (
                <>
                  <svg
                    className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Running...
                </>
              ) : (
                <>
                  <PlayIcon className="-ml-1 mr-2 h-5 w-5" />
                  Start Agent
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Column: Live Log */}
        <div className="rounded-lg bg-gray-900 p-6 shadow">
          <h2 className="text-xl font-semibold text-white">
            Live Activity Log
          </h2>
          <div className="mt-4 h-96 overflow-y-auto rounded-md bg-black/50 p-4 font-mono text-sm ring-1 ring-inset ring-white/10">
            {logs.length === 0 && (
              <span className="text-gray-400">
                Agent output will appear here...
              </span>
            )}
            {logs.map((log) => (
              <div key={log.id} className="mb-1">
                {renderLog(log)}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}