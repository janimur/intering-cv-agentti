import { useSession } from "../store/SessionContext";
import { CopyField } from "../components/CopyField";
import { api, ApiError } from "../api/client";
import type { LinkedInOutput, CVDocument, InteringOutput } from "../types/api";

interface OutputPageProps {
  onRestart: () => void;
  onBack?: () => void;
}

function LinkedInSection({ output }: { output: LinkedInOutput }) {
  return (
    <div>
      <h2 className="mb-4">LinkedIn</h2>
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
  stale,
}: {
  output: CVDocument;
  sessionId: string | null;
  onPdfError: (msg: string) => void;
  stale: boolean;
}) {
  const handleDownload = async () => {
    if (!sessionId || stale) return;
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
        err instanceof ApiError ? err.detail : "PDF-lataus epäonnistui";
      onPdfError(msg);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2>CV</h2>
        <button onClick={handleDownload} disabled={stale} className="btn-primary">
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
        <span className="text-sm font-medium text-gray-700 block mb-2">
          Avaintulokset ({output.key_results.length})
        </span>
        <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1 bg-gray-50 border border-gray-200 rounded p-3">
          {output.key_results.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
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
          Työkokemus ({output.experience.length})
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
      <h2 className="mb-4">Intering</h2>
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

export function OutputPage({ onRestart, onBack }: OutputPageProps) {
  const { linkedinOutput, cvOutput, interingOutput, workflow, sessionId, resetSession, setError, errors } =
    useSession();

  const handleRestart = () => {
    resetSession();
    onRestart();
  };

  const pdfError = errors.pdf;
  const stale = (output: LinkedInOutput | CVDocument | InteringOutput) => workflow?.status !== "approved" || output.source_revision !== workflow.revision;
  const staleNotice = <p className="text-sm text-amber-700 mb-3">Teksti perustuu aiempiin tietoihin. Päivitä se kirjoittajissa ennen käyttöä.</p>;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <h1 className="mb-2">Tulokset</h1>
          <p className="text-gray-600">
            Kopioi tekstit suoraan LinkedIniin ja intering.fi-profiiliisi,
            lataa CV PDF:nä.
          </p>
        </div>
        <button onClick={handleRestart} className="btn-secondary">
          Aloita alusta
        </button>
      </div>

      {pdfError && (
        <p className="text-sm text-danger mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {pdfError}
        </p>
      )}

      {!linkedinOutput && !cvOutput && !interingOutput && (
        <div className="card text-center py-12">
          <p className="text-gray-500">Ei tuloksia. Palaa takaisin ja aja kirjoittajat.</p>
        </div>
      )}

      <div className="space-y-8">
        {linkedinOutput && <section>{stale(linkedinOutput) && staleNotice}<LinkedInSection output={linkedinOutput} /></section>}

        {cvOutput && (
          <section>
          {stale(cvOutput) && staleNotice}
          <CvSection
            output={cvOutput}
            sessionId={sessionId}
            onPdfError={(msg) => setError("pdf", msg)}
            stale={stale(cvOutput)}
          />
          </section>
        )}

        {interingOutput && <section>{stale(interingOutput) && staleNotice}<InteringSection output={interingOutput} /></section>}
      </div>

      <div className="mt-12 pt-6 border-t border-gray-200">
        {onBack && <button onClick={onBack} className="btn-secondary mr-3">Takaisin kirjoittajiin</button>}
        <button onClick={handleRestart} className="btn-secondary">
          Aloita alusta
        </button>
      </div>
    </div>
  );
}
