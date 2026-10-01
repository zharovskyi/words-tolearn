"use client";

import { useState, useTransition } from "react";
import { reviewWord } from "@/actions/review-actions";

type Props = {
  id: string;
  text: string;
  translation: string;
  examples: string[];
  level: number;
  remaining: number;
};

export default function ReviewCard({
  id,
  text,
  translation,
  examples,
  level,
  remaining,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function answer(outcome: "REMEMBERED" | "FORGOT") {
    setError(null);
    startTransition(async () => {
      const result = await reviewWord(id, outcome);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>{remaining} left today</span>
        <span>Level {level}</span>
      </div>

      <h2 className="text-center text-3xl font-semibold sm:text-4xl">{text}</h2>

      {revealed ? (
        <div className="flex flex-col gap-3">
          <p className="text-center text-2xl text-indigo-600 dark:text-indigo-400">
            {translation}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            {examples.map((sentence) => (
              <li key={sentence}>{sentence}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {error && (
        <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {revealed ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => answer("FORGOT")}
            className="rounded-lg bg-red-600 px-4 py-3 font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
          >
            Forgot
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => answer("REMEMBERED")}
            className="rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            Remembered
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500"
        >
          Show answer
        </button>
      )}
    </div>
  );
}
