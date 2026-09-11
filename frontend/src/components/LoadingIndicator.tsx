export function LoadingIndicator({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm">
      <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />
      {label}
    </span>
  );
}
