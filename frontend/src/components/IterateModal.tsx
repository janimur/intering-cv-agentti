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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Iteroi tulosta</h2>
        </div>
        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lisaohjeet
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Esim: kirjoita About-teksti sarmikkaammin"
            rows={4}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            disabled={running}
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={running}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm"
          >
            Sulje
          </button>
          <button
            onClick={handleRun}
            disabled={running || !note.trim()}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
          >
            {running ? "Ajetaan..." : "Aja uudelleen"}
          </button>
        </div>
      </div>
    </div>
  );
}
