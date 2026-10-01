import Link from "next/link";
import { connection } from "next/server";
import WordActions from "@/components/WordActions";
import AddWordForm from "@/components/AddWordForm";
import { prisma } from "@/lib/db";
import { todayIn } from "@/lib/srs/dates";
import { canRetryEnrichment } from "@/lib/words";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export default async function Home() {
  await connection();
  const today = todayIn();
  const words = await prisma.word.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: { examples: { orderBy: { position: "asc" } } },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:py-16">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Add a word</h1>
        <p className="text-zinc-500">
          Add an English word or phrase. AI adds the Ukrainian translation and
          example sentences, and the word enters your review schedule.
        </p>
      </header>

      <nav>
        <Link
          href="/review"
          className="inline-block rounded-lg border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
        >
          Start review →
        </Link>
      </nav>

      <AddWordForm />

      <section aria-labelledby="words-heading" className="flex flex-col gap-4">
        <h2 id="words-heading" className="text-lg font-medium">
          Your words{" "}
          <span className="text-zinc-500">({words.length})</span>
        </h2>

        {words.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-zinc-500 dark:border-zinc-700">
            No words yet. Add your first one above.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {words.map((word) => (
              <li
                key={word.id}
                className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-xl font-semibold">{word.text}</h3>
                  {word.dueDate && (
                    <span className="text-sm text-zinc-500">
                      {word.dueDate <= today
                        ? "Review: today"
                        : `Next review: ${formatDate(word.dueDate)}`}{" "}
                      · Level {word.level}
                    </span>
                  )}
                </div>

                {word.enrichment === "READY" ? (
                  <>
                    <p className="text-lg text-indigo-600 dark:text-indigo-400">
                      {word.translation}
                    </p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                      {word.examples.map((e) => (
                        <li key={e.id}>{e.sentence}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {word.enrichment === "FAILED"
                      ? `Translation unavailable: ${word.enrichmentError ?? "AI request failed"}`
                      : "Generating translation…"}
                  </p>
                )}

                <WordActions
                  id={word.id}
                  text={word.text}
                  canRetry={canRetryEnrichment(word)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
