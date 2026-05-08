import { useState } from "react";
import type {
  WriterType,
  LinkedInOutput,
  CVDocument,
  InteringOutput,
} from "../types/api";
import { api, ApiError } from "../api/client";
import { useSession } from "../store/SessionContext";
import { IterateModal } from "./IterateModal";

const WRITER_LABELS: Record<WriterType, string> = {
  linkedin: "LinkedIn",
  cv: "CV",
  intering: "Intering",
};

const WRITER_DESCRIPTIONS: Record<WriterType, string> = {
  linkedin: "Otsikko, About-teksti ja kokemuskuvaukset LinkedIn-profiiliin",
  cv: "Valmis CV-dokumentti PDF-muodossa",
  intering: "Hook, tuotekortit ja profiiliosiot Intering-profiiliin",
};

interface WriterCardProps {
  type: WriterType;
  output: LinkedInOutput | CVDocument | InteringOutput | null;
  onOutputChange: (
    type: WriterType,
    output: LinkedInOutput | CVDocument | InteringOutput
  ) => void;
}

export function WriterCard({ type, output, onOutputChange }: WriterCardProps) {
  const { sessionId, isLoading, errors, setLoading, setError } = useSession();
  const [iterateOpen, setIterateOpen] = useState(false);

  const isRunning = isLoading[type];
  const error = errors[type];

  const handleRun = async () => {
    if (!sessionId) return;
    setLoading(type, true);
    setError(type, null);
    try {
      const result = await api.runWriter(sessionId, type);
      onOutputChange(type, result as LinkedInOutput | CVDocument | InteringOutput);
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : "Kirjoittajan ajo epaonnistui";
      setError(type, msg);
    } finally {
      setLoading(type, false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!sessionId) return;
    setLoading("pdf", true);
    setError("pdf", null);
    try {
      const blob = await api.downloadCvPdf(sessionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cv.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : "PDF-lataus epaonnistui";
      setError("pdf", msg);
    } finally {
      setLoading("pdf", false);
    }
  };

  const renderSummary = () => {
    if (!output) return null;

    if (type === "linkedin") {
      const li = output as LinkedInOutput;
      return (
        <div className="text-sm text-gray-600 mt-2 space-y-1">
          <p>
            <span className="font-medium">Otsikko: </span>
            {li.headline}
          </p>
          <p>
            <span className="font-medium">About: </span>
            {li.about.slice(0, 120)}...
          </p>
          <p className="text-gray-400">
            {li.experience.length} kokemusta
          </p>
        </div>
      );
    }

    if (type === "cv") {
      const cv = output as CVDocument;
      return (
        <div className="text-sm text-gray-600 mt-2 space-y-1">
          <p>
            <span className="font-medium">{cv.header.name}</span> — {cv.header.title}
          </p>
          <p>{cv.positioning_summary.slice(0, 120)}...</p>
          <p className="text-gray-400">
            {cv.experience.length} tyokokemusta, {cv.education.length} koulutusta
          </p>
        </div>
      );
    }

    if (type === "intering") {
      const int = output as InteringOutput;
      return (
        <div className="text-sm text-gray-600 mt-2 space-y-1">
          <p>
            <span className="font-medium">Hook: </span>
            {int.hook.slice(0, 120)}
          </p>
          <p className="text-gray-400">
            {int.product_cards.length} tuotekorttia
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-lg font-medium text-gray-900">
        {WRITER_LABELS[type]}
      </h3>
      <p className="text-sm text-gray-500 mt-1">{WRITER_DESCRIPTIONS[type]}</p>

      {error && (
        <p className="text-sm text-red-600 mt-2 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {renderSummary()}

      <div className="mt-4 flex flex-wrap gap-2">
        {!isRunning && (
          <button
            onClick={handleRun}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            {output ? "Aja uudelleen" : "Aja"}
          </button>
        )}

        {isRunning && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            Ajetaan...
          </div>
        )}

        {output && !isRunning && (
          <button
            onClick={() => setIterateOpen(true)}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm"
          >
            Iteroi
          </button>
        )}

        {type === "cv" && output && !isRunning && (
          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm"
          >
            Lataa PDF
          </button>
        )}
      </div>

      {iterateOpen && (
        <IterateModal
          writerType={type}
          onClose={() => setIterateOpen(false)}
          onDone={(result) => {
            onOutputChange(type, result);
            setIterateOpen(false);
          }}
        />
      )}
    </div>
  );
}
