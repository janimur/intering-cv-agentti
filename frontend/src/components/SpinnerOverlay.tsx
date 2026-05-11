interface SpinnerOverlayProps {
  visible: boolean;
  message?: string;
}

export function SpinnerOverlay({ visible, message }: SpinnerOverlayProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-white bg-opacity-80">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        {message && (
          <p className="text-gray-700 text-sm text-center max-w-xs">{message}</p>
        )}
      </div>
    </div>
  );
}
