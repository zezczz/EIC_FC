export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-10">
      <div className="bg-muted h-8 w-48 animate-pulse rounded" />
      <div className="bg-muted h-40 w-full animate-pulse rounded-xl" />
      <div className="bg-muted h-40 w-full animate-pulse rounded-xl" />
    </main>
  );
}
