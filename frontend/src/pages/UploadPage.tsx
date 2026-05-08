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
      const msg = err instanceof ApiError ? err.detail : "Tiedostojen lataus epaonnistui";
      setError("upload", msg);
    } finally {
      setLoading("upload", false);
    }
  };

  return (
    <div>
      <SpinnerOverlay visible={isUploading} message="Luetaan tiedostoja..." />

      <h1 className="text-3xl font-semibold text-gray-900 mb-6">
        Lataa CV ja LinkedIn-profiili
      </h1>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <FileUpload
          label="CV (pakollinen)"
          onFileSelect={setCvFile}
          selectedFile={cvFile}
          required
        />

        <div className="mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            LinkedIn-tiedot (valinnainen)
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            Voit ladata LinkedIn-profiilin PDF:na tai liittaa tekstin alla
            olevaan kenttaan.
          </p>

          <FileUpload
            label="LinkedIn PDF (valinnainen)"
            onFileSelect={setLinkedinFile}
            selectedFile={linkedinFile}
          />

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              TAI liita LinkedIn-teksti tahan
            </label>
            <textarea
              value={linkedinText}
              onChange={(e) => setLinkedinText(e.target.value)}
              placeholder="Kopioi LinkedIn-profiilisi teksti tahan..."
              rows={8}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isUploading}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
        >
          Takaisin
        </button>
        <button
          onClick={handleUpload}
          disabled={!cvFile || isUploading}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
        >
          Lataa ja jatka
        </button>
      </div>
    </div>
  );
}
