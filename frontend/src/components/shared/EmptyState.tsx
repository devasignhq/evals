interface Props {
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
      <div className="mb-2 text-base font-medium text-text-primary">{title}</div>
      {message && (
        <div className="mb-4 max-w-md text-sm text-text-secondary">{message}</div>
      )}
      {action}
    </div>
  );
}
