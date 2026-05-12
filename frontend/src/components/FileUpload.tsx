import { useRef, useState } from "react";

interface FileUploadProps {
  label: string;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  accept?: string;
  required?: boolean;
}

export function FileUpload({
  label,
  onFileSelect,
  selectedFile,
  accept = "application/pdf",
  required = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragging
            ? "border-intering-500 bg-intering-50"
            : "border-gray-300 hover:border-intering-500 hover:bg-intering-50/30"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />
        {selectedFile ? (
          <div>
            <p className="text-sm font-medium text-intering-500">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-400 mt-1">Klikkaa vaihtaaksesi</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-700">
              Vedä tiedosto tähän tai klikkaa valitaksesi
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF</p>
          </>
        )}
      </div>
    </div>
  );
}
