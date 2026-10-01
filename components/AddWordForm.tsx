"use client";

import { useActionState, useState, useTransition } from "react";
import { addWord, restoreWord } from "@/actions/word-actions";

type FormState = {
  error?: string;
  notice?: string;
  text?: string;
  archivedId?: string;
};

async function submit(_prev: FormState, formData: FormData): Promise<FormState> {
  const text = String(formData.get("word") ?? "");
  const result = await addWord(text);
  if (!result.ok) return { error: result.error, text, archivedId: result.archivedId };
  if (result.enrichment === "FAILED") {
    return {
      notice: `"${text.trim()}" was saved, but AI could not generate the translation (${result.error}).`,
    };
  }
  if (result.correctedFrom) {
    return { notice: `Spelling corrected: "${result.correctedFrom}" → "${result.text}".` };
  }
  return {};
}

export default function AddWordForm() {
  const [state, action, pending] = useActionState(submit, {});
  const [restoring, startRestore] = useTransition();
  const [restored, setRestored] = useState<string | null>(null);

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="word"
          type="text"
          required
          maxLength={100}
          autoComplete="off"
          defaultValue={state.text}
          disabled={pending}
          placeholder="Add a word or phrase, e.g. run out of"
          aria-label="English word or phrase"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "Generating…" : "Add word"}
        </button>
      </div>
      {pending && (
        <p role="status" className="text-sm text-zinc-500">
          Asking AI for the translation and example sentences…
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.archivedId && restored !== state.archivedId && (
        <button
          type="button"
          disabled={restoring}
          onClick={() => {
            const id = state.archivedId!;
            startRestore(async () => {
              const result = await restoreWord(id);
              if (result.ok) setRestored(id);
            });
          }}
          className="self-start text-sm font-medium text-indigo-600 hover:underline disabled:opacity-60 dark:text-indigo-400"
        >
          Restore it to your learning list
        </button>
      )}
      {state.archivedId && restored === state.archivedId && (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          Restored. It is back in your list at level 0.
        </p>
      )}
      {state.notice && (
        <p role="status" className="text-sm text-amber-600 dark:text-amber-400">
          {state.notice}
        </p>
      )}
    </form>
  );
}
