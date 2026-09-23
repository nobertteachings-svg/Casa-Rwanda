type Props = {
  message: string;
  onRetry?: () => void;
};

/** Reusable error + retry block for admin pages (usability). */
export default function ErrorBanner({ message, onRetry }: Props) {
  return (
    <div className="error-banner" role="alert">
      <p className="error">{message}</p>
      {onRetry && (
        <button type="button" className="retry-btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
