"use client";

import React, { useState, useEffect } from "react";
import { KeyIcon, LockOpenIcon } from "@heroicons/react/24/outline";

// This must match the backend model 'models/selectors.py'
interface Selectors {
  id?: string; // from beanie
  post_container: string;
  author_selector: string;
  content_selector: string;
  like_button: string;
  comment_button: string;
  comment_textbox: string;
  comment_post_button: string;
}

const defaultSelectors: Selectors = {
  post_container: "div.feed-shared-update-v2",
  author_selector:
    ".update-components-actor__single-line-truncate span[aria-hidden='true']",
  content_selector: ".update-components-update-v2__commentary",
  like_button: "button.react-button__trigger",
  comment_button: "button.comment-button",
  comment_textbox: "div.ql-editor[contenteditable='true']",
  comment_post_button: "button.comments-comment-box__submit-button--cr",
};

type FormState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

export default function AdminPage() {
  const [apiKey, setApiKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectors, setSelectors] = useState<Selectors>(defaultSelectors);
  const [formState, setFormState] = useState<FormState>({
    status: "idle",
    message: "",
  });

  // Fetch selectors once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchSelectors();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSelectors = async () => {
    setFormState({ status: "loading", message: "Fetching selectors..." });
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND}/admin/selectors`,
        {
          headers: { "X-API-Key": apiKey },
        }
      );
      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? "Authentication failed. Bad API Key?"
            : "Failed to fetch selectors."
        );
      }
      const data: Selectors = await res.json();
      setSelectors(data);
      setFormState({
        status: "success",
        message: "Selectors loaded from database.",
      });
    } catch (err: any) {
      console.error(err);
      setFormState({ status: "error", message: err.message });
      setIsAuthenticated(false); // De-auth on failure
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState({ status: "loading", message: "Saving selectors..." });
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND}/admin/selectors`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify(selectors),
        }
      );
      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? "Authentication failed."
            : "Failed to save selectors."
        );
      }
      const data = await res.json();
      setSelectors(data);
      setFormState({
        status: "success",
        message: "Selectors saved successfully!",
      });
    } catch (err: any) {
      console.error(err);
      setFormState({ status: "error", message: err.message });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectors({
      ...selectors,
      [e.target.name]: e.target.value,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="rounded-lg bg-white p-8 shadow">
            <KeyIcon className="mx-auto h-12 w-auto text-indigo-600" />
            <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
              Admin Access
            </h2>
            <form
              className="mt-6 space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                setIsAuthenticated(true);
              }}
            >
              <div>
                <label
                  htmlFor="apiKey"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Admin API Key
                </label>
                <div className="mt-2">
                  <input
                    id="apiKey"
                    name="apiKey"
                    type="password"
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <LockOpenIcon className="mr-2 h-5 w-5" />
                Unlock
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- Authenticated Admin Panel ---
  return (
    <div className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow">
      <h2 className="text-xl font-semibold text-gray-900">
        Admin Panel: Update Selectors
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Update the CSS selectors used by the automation agent. When the agent
        runs, it will fetch these values from the database.
      </p>

      <form onSubmit={handleSave} className="mt-8 space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* We map over the object keys to create the form dynamically */}
          {Object.keys(defaultSelectors).map((key) => (
            <div key={key}>
              <label
                htmlFor={key}
                className="block text-sm font-medium capitalize leading-6 text-gray-900"
              >
                {key.replace(/_/g, " ")}
              </label>
              <input
                type="text"
                name={key}
                id={key}
                className="mt-2 block w-full rounded-md border-0 py-1.5 font-mono text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:leading-6"
                value={selectors[key as keyof Selectors]}
                onChange={handleChange}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6">
          {formState.status !== "idle" && (
            <span
              className={`text-sm ${
                formState.status === "success"
                  ? "text-green-600"
                  : formState.status === "error"
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              {formState.message}
            </span>
          )}
          <button
            type="submit"
            disabled={formState.status === "loading"}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-400"
          >
            {formState.status === "loading" ? "Saving..." : "Save Selectors"}
          </button>
        </div>
      </form>
    </div>
  );
}
