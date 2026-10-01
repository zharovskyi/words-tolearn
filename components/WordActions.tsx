"use client";

import { useState, useTransition } from "react";
import { deleteWord, retryEnrichment } from "@/actions/word-actions";

export default function WordActions({
  id,
  text,
  canRetry,
}: {
  id: string;
  text: string;
  canRetry: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Something went wrong");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
      {canRetry && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => retryEnrichment(id))}
          className="font-medium text-indigo-600 hover:underline disabled:opacity-60 dark:text-indigo-400"
        >
          {pending ? "Retrying…" : "Retry"}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Delete "${text}"? This cannot be undone.`)) {
            run(() => deleteWord(id));
          }
        }}
        className="text-zinc-500 hover:text-red-600 hover:underline disabled:opacity-60"
      >
        Delete
      </button>
      {error && (
        <span role="alert" className="text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
