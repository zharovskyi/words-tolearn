import { connection } from "next/server";
import ReviewCard from "@/components/ReviewCard";
import { dueQueue, nextDueDate } from "@/lib/srs/review";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export default async function ReviewPage() {
  await connection();
  const queue = await dueQueue();
  const current = queue[0];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Review</h1>

      {current ? (
        <ReviewCard
          key={current.id}
          id={current.id}
          text={current.text}
          translation={current.translation ?? ""}
          examples={current.examples.map((e) => e.sentence)}
          level={current.level}
          remaining={queue.length}
        />
      ) : (
        <AllCaughtUp next={await nextDueDate()} />
      )}
    </main>
  );
}

function AllCaughtUp({ next }: { next: string | null }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
      <p className="text-4xl" aria-hidden>
        🎉
      </p>
      <h2 className="text-2xl font-semibold">All caught up!</h2>
      <p className="text-zinc-500">
        {next
          ? `Nothing to review right now. Next review: ${formatDate(next)}.`
          : "Nothing to review right now. Add more words to keep learning."}
      </p>
    </div>
  );
}
