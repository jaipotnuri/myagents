export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-bold text-slate-300">Page not found</h2>
      <p className="text-sm text-slate-500">The page you are looking for does not exist.</p>
      <a
        href="/"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        Go to Dashboard
      </a>
    </div>
  );
}
