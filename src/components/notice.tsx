export function Notice({ notice }: { notice: string }) {
  if (!notice) return null;
  return (
    <p className="mb-4 rounded-2xl bg-moss px-4 py-3 text-sm font-semibold text-pine" role="status">
      {notice}
    </p>
  );
}
