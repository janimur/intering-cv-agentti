import { useState } from "react";

interface CopyFieldProps {
  label: string;
  text: string;
  multiline?: boolean;
}

export function CopyField({ label, text, multiline = false }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <button
          onClick={handleCopy}
          className="text-xs px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
        >
          {copied ? "Kopioitu" : "Kopioi"}
        </button>
      </div>
      {multiline ? (
        <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded p-3 font-sans leading-relaxed">
          {text}
        </pre>
      ) : (
        <div className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded p-3">
          {text}
        </div>
      )}
    </div>
  );
}
