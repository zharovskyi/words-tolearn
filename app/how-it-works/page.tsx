import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How it works · Words to learn" };

const levels = [
  { level: "0", meaning: "New word", next: "Review today" },
  { level: "1", meaning: "Passed once", next: "+1 day" },
  { level: "2", meaning: "Passed twice", next: "+2 days" },
  { level: "3", meaning: "Getting familiar", next: "+14 days" },
  { level: "4", meaning: "Almost learned", next: "+60 days" },
];

const link = "font-medium text-indigo-600 hover:underline dark:text-indigo-400";

export default function HowItWorksPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:py-16">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">How it works</h1>
        <p className="text-zinc-500">
          Learn words with spaced repetition: you see each word again just
          before you would forget it.
        </p>
      </header>

      <ol className="flex flex-col gap-6">
        <li className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">1. Add a word</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Type an English word or phrase on the{" "}
            <Link href="/" className={link}>Add Word</Link> page. AI adds the
            Ukrainian translation and 2–3 example sentences. If AI fails, the
            word is still saved and you can press <b>Retry</b>.
          </p>
        </li>

        <li className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">2. Review every day</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Open <Link href="/review" className={link}>Review</Link> to see the
            words due today, one at a time. Try to recall the translation, press{" "}
            <b>Show answer</b>, then tell the app how it went.
          </p>
        </li>

        <li className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">3. Answer honestly</h2>
          <ul className="list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
            <li>
              <b>Remembered</b>: the word moves up one level and comes back
              later (see the table below).
            </li>
            <li>
              <b>Forgot</b>: the word goes back to level 0 and returns at the
              end of today&apos;s queue.
            </li>
          </ul>
        </li>
      </ol>

      <section aria-labelledby="schedule" className="flex flex-col gap-2">
        <h2 id="schedule" className="text-lg font-semibold">Review schedule</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2 font-medium">Level</th>
                <th className="px-4 py-2 font-medium">Meaning</th>
                <th className="px-4 py-2 font-medium">Shown again</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((row) => (
                <tr key={row.level} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-2 font-semibold">{row.level}</td>
                  <td className="px-4 py-2">{row.meaning}</td>
                  <td className="px-4 py-2">{row.next}</td>
                </tr>
              ))}
              <tr className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-4 py-2 font-semibold">Done</td>
                <td className="px-4 py-2">Remembered at level 4</td>
                <td className="px-4 py-2">Moves to the archive</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-zinc-500">
          The next date is counted from the day you review the word, even if
          you were late.
        </p>
      </section>

      <section aria-labelledby="rules" className="flex flex-col gap-2">
        <h2 id="rules" className="text-lg font-semibold">Good to know</h2>
        <ul className="list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
          <li>
            Only words due <b>today or earlier</b> appear in Review, the most
            overdue first. Once you answer <b>Remembered</b>, a word leaves
            today&apos;s queue.
          </li>
          <li>When nothing is due you will see &quot;All caught up!&quot; and the next review date.</li>
          <li>
            Already know a word? Press <b>Mark as learned</b> to move it to the{" "}
            <Link href="/archive" className={link}>Archive</Link>. You can
            restore it there at any time; it restarts from level 0.
          </li>
          <li>A word cannot be added twice, even if it is in the archive.</li>
          <li>Deleting a word removes it and its review history for good.</li>
        </ul>
      </section>
    </main>
  );
}
