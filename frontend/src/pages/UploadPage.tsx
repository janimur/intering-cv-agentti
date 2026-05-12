import { useState } from "react";
import { api, ApiError } from "../api/client";
import { useSession } from "../store/SessionContext";
import { FileUpload } from "../components/FileUpload";
import { SpinnerOverlay } from "../components/SpinnerOverlay";

interface UploadPageProps {
  onBack: () => void;
  onUploaded: () => void;
}

export function UploadPage({ onBack, onUploaded }: UploadPageProps) {
  const {
    setSessionId,
    setCvTextPreview,
    setLinkedinAvailable,
    isLoading,
    setLoading,
    setError,
    errors,
  } = useSession();

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [linkedinFile, setLinkedinFile] = useState<File | null>(null);
  const [linkedinText, setLinkedinText] = useState("");

  const isUploading = isLoading.upload;
  const error = errors.upload;

  const handleUpload = async () => {
    if (!cvFile) return;
    setLoading("upload", true);
    setError("upload", null);
    try {
      const result = await api.uploadFiles(cvFile, linkedinFile, linkedinText);
      setSessionId(result.session_id);
      setCvTextPreview(result.cv_text_preview);
      setLinkedinAvailable(result.linkedin_available);
      onUploaded();
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : "Tiedostojen lataus epäonnistui";
      setError("upload", msg);
    } finally {
      setLoading("upload", false);
    }
  };

  return (
    <div>
      <SpinnerOverlay visible={isUploading} message="Luetaan tiedostoja..." />

      <h1 className="mb-2">Lataa CV ja LinkedIn-profiili</h1>
      <p className="text-gray-600 mb-8">
        CV on pakollinen. LinkedIn-profiili tuo kartoittajalle lisää kontekstia
        ja oman äänensävysi.
      </p>

      <div className="card mb-6">
        <FileUpload
          label="CV (pakollinen)"
          onFileSelect={setCvFile}
          selectedFile={cvFile}
          required
        />

        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="mb-1">LinkedIn-tiedot</h3>
          <p className="text-sm text-gray-500 mb-4">
            Lataa LinkedIn-profiilin PDF tai liitä teksti suoraan.
          </p>

          <FileUpload
            label="LinkedIn PDF (valinnainen)"
            onFileSelect={setLinkedinFile}
            selectedFile={linkedinFile}
          />

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              tai liitä LinkedIn-teksti
            </label>
            <textarea
              value={linkedinText}
              onChange={(e) => setLinkedinText(e.target.value)}
              placeholder="Kopioi LinkedIn-profiilisi teksti tähän..."
              rows={8}
              className="input-field font-sans"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isUploading}
          className="btn-secondary"
        >
          Takaisin
        </button>
        <button
          onClick={handleUpload}
          disabled={!cvFile || isUploading}
          className="btn-primary"
        >
          Lataa ja jatka
        </button>
      </div>
    </div>
  );
}
