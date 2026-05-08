import { useSession } from "../store/SessionContext";
import { CopyField } from "../components/CopyField";
import { api, ApiError } from "../api/client";
import type { LinkedInOutput, CVDocument, InteringOutput } from "../types/api";

interface OutputPageProps {
  onRestart: () => void;
}

function LinkedInSection({ output }: { output: LinkedInOutput }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">LinkedIn</h2>
      <CopyField label="Otsikko (Headline)" text={output.headline} />
      <CopyField label="About" text={output.about} multiline />
      {output.experience.map((exp, i) => (
        <div key={i} className="mb-4">
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            {exp.role} — {exp.company}
          </h3>
          <CopyField label="Konteksti" text={exp.context} multiline />
          <div>
            <span className="text-sm font-medium text-gray-700">
              Saavutukset
            </span>
            {exp.achievements.map((ach, j) => (
              <CopyField key={j} label={`Saavutus ${j + 1}`} text={ach} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CvSection({
  output,
  sessionId,
  onPdfError,
}: {
  output: CVDocument;
  sessionId: string | null;
  onPdfError: (msg: string) => void;
}) {
  const handleDownload = async () => {
    if (!sessionId) return;
    try {
      const blob = await api.downloadCvPdf(sessionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cv.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.detail : "PDF-lataus epaonnistui";
      onPdfError(msg);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">CV</h2>
        <button
          onClick={handleDownload}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
        >
          Lataa PDF
        </button>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <p className="font-medium text-gray-900">{output.header.name}</p>
        <p className="text-gray-600">{output.header.title}</p>
        <p className="text-sm text-gray-500 mt-1">{output.header.contact.email}</p>
      </div>

      <CopyField
        label="Positiointiyhteenveto"
        text={output.positioning_summary}
        multiline
      />

      <div className="mb-4">
        <span className="text-sm font-medium text-gray-700">
          Avaintulokset ({output.key_results.length})
        </span>
        {output.key_results.map((r, i) => (
          <CopyField key={i} label={`Tulos ${i + 1}`} text={r} />
        ))}
      </div>

      <div className="mb-4">
        <span className="text-sm font-medium text-gray-700 block mb-2">
          Osaaminen ({output.expertise.length})
        </span>
        <div className="flex flex-wrap gap-2">
          {output.expertise.map((e, i) => (
            <span
              key={i}
              className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-1"
            >
              {e}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <span className="text-sm font-medium text-gray-700 block mb-2">
          Tyokokemus ({output.experience.length})
        </span>
        {output.experience.map((exp, i) => (
          <div
            key={i}
            className="border border-gray-200 rounded p-3 mb-2 bg-white"
          >
            <p className="font-medium text-sm">
              {exp.role} — {exp.company}
            </p>
            <p className="text-xs text-gray-500">{exp.period}</p>
            <p className="text-sm text-gray-600 mt-1">{exp.context}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function InteringSection({ output }: { output: InteringOutput }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Intering</h2>
      <CopyField label="Hook" text={output.hook} />
      {output.product_cards.map((card, i) => (
        <CopyField
          key={i}
          label={`Tuotekortti ${i + 1}`}
          text={card}
          multiline
        />
      ))}
      {Object.entries(output.profile_sections).map(([key, value]) => (
        <CopyField key={key} label={key} text={value} multiline />
      ))}
    </div>
  );
}

export function OutputPage({ onRestart }: OutputPageProps) {
  const { linkedinOutput, cvOutput, interingOutput, sessionId, resetSession, setError, errors } =
    useSession();

  const handleRestart = () => {
    resetSession();
    onRestart();
  };

  const pdfError = errors.pdf;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-gray-900">Tulokset</h1>
        <button
          onClick={handleRestart}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm"
        >
          Aloita alusta
        </button>
      </div>

      {pdfError && (
        <p className="text-sm text-red-600 mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">
          {pdfError}
        </p>
      )}

      {!linkedinOutput && !cvOutput && !interingOutput && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">Ei tuloksia. Palaa takaisin ja aja kirjoittajat.</p>
        </div>
      )}

      <div className="space-y-8">
        {linkedinOutput && <LinkedInSection output={linkedinOutput} />}

        {cvOutput && (
          <CvSection
            output={cvOutput}
            sessionId={sessionId}
            onPdfError={(msg) => setError("pdf", msg)}
          />
        )}

        {interingOutput && <InteringSection output={interingOutput} />}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={handleRestart}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
        >
          Aloita alusta
        </button>
      </div>
    </div>
  );
}
