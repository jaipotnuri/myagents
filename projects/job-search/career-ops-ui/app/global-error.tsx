"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
          <p className="text-sm text-slate-400">{error.message}</p>
          <button
            onClick={reset}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
