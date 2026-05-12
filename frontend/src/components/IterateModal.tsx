import { useState } from "react";
import type { WriterType, IteratePayload } from "../types/api";
import { api, ApiError } from "../api/client";
import { useSession } from "../store/SessionContext";
import type {
  LinkedInOutput,
  CVDocument,
  InteringOutput,
} from "../types/api";

interface IterateModalProps {
  writerType: WriterType;
  onClose: () => void;
  onDone: (result: LinkedInOutput | CVDocument | InteringOutput) => void;
}

export function IterateModal({
  writerType,
  onClose,
  onDone,
}: IterateModalProps) {
  const { sessionId, setLoading, setError } = useSession();
  const [note, setNote] = useState("");
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    if (!sessionId || !note.trim()) return;
    setRunning(true);
    setLoading(writerType, true);
    setError(writerType, null);
    try {
      const payload: IteratePayload = { note: note.trim() };
      const result = await api.iterateWriter(sessionId, writerType, payload);
      onDone(result as LinkedInOutput | CVDocument | InteringOutput);
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : "Virhe iteroinnissa";
      setError(writerType, msg);
    } finally {
      setRunning(false);
      setLoading(writerType, false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2>Iteroi tulosta</h2>
        </div>
        <div className="px-6 py-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lisäohjeet
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Esim: kirjoita About-teksti särmikkäämmin"
            rows={4}
            className="input-field"
            disabled={running}
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} disabled={running} className="btn-secondary">
            Sulje
          </button>
          <button
            onClick={handleRun}
            disabled={running || !note.trim()}
            className="btn-primary"
          >
            {running ? "Ajetaan..." : "Aja uudelleen"}
          </button>
        </div>
      </div>
    </div>
  );
}
