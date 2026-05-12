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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
        {label}
      </h4>
      <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
        {children}
      </div>
    </div>
  );
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
      const msg = err instanceof ApiError ? err.detail : "Kirjoittajan ajo epäonnistui";
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
      const msg = err instanceof ApiError ? err.detail : "PDF-lataus epäonnistui";
      setError("pdf", msg);
    } finally {
      setLoading("pdf", false);
    }
  };

  const renderOutput = () => {
    if (!output) return null;

    if (type === "linkedin") {
      const li = output as LinkedInOutput;
      return (
        <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
          <Field label={`Headline (${li.headline.length} merkkiä)`}>
            {li.headline}
          </Field>
          <Field label={`About (${li.about.length} merkkiä)`}>
            {li.about}
          </Field>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Experience ({li.experience.length})
            </h4>
            <div className="space-y-3">
              {li.experience.map((exp, i) => (
                <div key={i} className="text-sm">
                  <p className="font-medium text-gray-900">
                    {exp.role} — {exp.company}
                  </p>
                  <p className="italic text-gray-600 mt-1">{exp.context}</p>
                  <ul className="list-disc pl-5 mt-1 text-gray-800 space-y-0.5">
                    {exp.achievements.map((a, j) => (
                      <li key={j}>{a}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (type === "cv") {
      const cv = output as CVDocument;
      return (
        <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
          <Field label="Otsikko">
            {cv.header.name} — {cv.header.title}
          </Field>
          <Field label="Positioning summary">
            {cv.positioning_summary}
          </Field>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Keskeiset tulokset
            </h4>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-0.5">
              {cv.key_results.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Osaamisalueet
            </h4>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-0.5">
              {cv.expertise.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Työkokemus ({cv.experience.length})
            </h4>
            <div className="space-y-3">
              {cv.experience.map((exp, i) => (
                <div key={i} className="text-sm">
                  <div className="flex justify-between items-baseline">
                    <p className="font-medium text-gray-900">
                      {exp.role} — {exp.company}
                    </p>
                    <p className="text-xs text-gray-500">{exp.period}</p>
                  </div>
                  <p className="italic text-gray-600 mt-1">{exp.context}</p>
                  <ul className="list-disc pl-5 mt-1 text-gray-800 space-y-0.5">
                    {exp.results.map((r, j) => (
                      <li key={j}>{r}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          {cv.education.length > 0 && (
            <Field label="Koulutus">
              {cv.education.join("\n")}
            </Field>
          )}
          {cv.certifications.length > 0 && (
            <Field label="Sertifioinnit ja muut">
              {cv.certifications.join("\n")}
            </Field>
          )}
        </div>
      );
    }

    if (type === "intering") {
      const int = output as InteringOutput;
      return (
        <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
          <Field label="Hook">{int.hook}</Field>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Tuotekortit ({int.product_cards.length})
            </h4>
            <div className="space-y-3">
              {int.product_cards.map((card, i) => (
                <div key={i} className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded p-3">
                  {card}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Profiilin osiot
            </h4>
            <div className="space-y-3">
              {Object.entries(int.profile_sections).map(([key, value]) => (
                <Field key={key} label={key}>
                  {value}
                </Field>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="card">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h3>{WRITER_LABELS[type]}</h3>
          <p className="text-sm text-gray-500 mt-1">{WRITER_DESCRIPTIONS[type]}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {!isRunning && (
            <button onClick={handleRun} className="btn-primary">
              {output ? "Aja uudelleen" : "Aja"}
            </button>
          )}

          {isRunning && (
            <div className="flex items-center gap-2 text-sm text-gray-500 px-3">
              <div className="w-4 h-4 border-2 border-intering-100 border-t-intering-500 rounded-full animate-spin" />
              Ajetaan...
            </div>
          )}

          {output && !isRunning && (
            <button onClick={() => setIterateOpen(true)} className="btn-secondary">
              Iteroi
            </button>
          )}

          {type === "cv" && output && !isRunning && (
            <button onClick={handleDownloadPdf} className="btn-secondary">
              Lataa PDF
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {renderOutput()}

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
