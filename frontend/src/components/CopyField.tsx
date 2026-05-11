interface TextFieldProps {
  label: string;
  text: string;
  multiline?: boolean;
}

/**
 * Tekstinäyttö label-otsikolla. Sisältö on valittavissa hiirellä ja
 * kopioitavissa selaimen omilla pikanäppäimillä — Kopioi-painiketta
 * ei tarvita.
 */
export function CopyField({ label, text, multiline = false }: TextFieldProps) {
  return (
    <div className="mb-4">
      <span className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </span>
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
