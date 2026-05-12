interface SpinnerOverlayProps {
  visible: boolean;
  message?: string;
}

export function SpinnerOverlay({ visible, message }: SpinnerOverlayProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5">
        <div className="w-12 h-12 border-4 border-intering-100 border-t-intering-500 rounded-full animate-spin" />
        {message && (
          <p className="text-gray-700 text-sm text-center max-w-sm">{message}</p>
        )}
      </div>
    </div>
  );
}
