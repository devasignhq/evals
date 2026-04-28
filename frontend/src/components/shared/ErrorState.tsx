interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-[#7f1d1d] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm">
      <div className="text-fail font-mono">Error</div>
      <div className="text-text-secondary">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-md border border-border bg-elevated px-3 py-1 text-xs font-medium text-text-primary hover:border-primary"
        >
          Retry
        </button>
      )}
    </div>
  );
}
