import { connection } from "next/server";
import WordActions from "@/components/WordActions";
import { prisma } from "@/lib/db";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function ArchivePage() {
  await connection();
  const words = await prisma.word.findMany({
    where: { status: "ARCHIVED" },
    orderBy: { archivedAt: "desc" },
    include: { examples: { orderBy: { position: "asc" } } },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:py-16">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Archive</h1>
        <p className="text-zinc-500">
          Words you have learned. They no longer appear in reviews.
        </p>
      </header>

      {words.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-zinc-500 dark:border-zinc-700">
          Nothing archived yet. Words move here after the last review level or
          when you mark them as learned.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {words.map((word) => (
            <li
              key={word.id}
              className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-xl font-semibold">{word.text}</h2>
                <span className="text-sm text-zinc-500">
                  {word.archiveReason === "COMPLETED"
                    ? "Completed all levels"
                    : "Marked as learned"}
                  {word.archivedAt ? ` · ${formatDate(word.archivedAt)}` : ""}
                </span>
              </div>
              {word.translation && (
                <p className="text-lg text-indigo-600 dark:text-indigo-400">
                  {word.translation}
                </p>
              )}
              <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                {word.examples.map((e) => (
                  <li key={e.id}>{e.sentence}</li>
                ))}
              </ul>
              <WordActions id={word.id} text={word.text} archived />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
