import type {
  WriterType,
  LinkedInOutput,
  CVDocument,
  InteringOutput,
} from "../types/api";
import { useSession } from "../store/SessionContext";
import { WriterCard } from "../components/WriterCard";

interface WritersPageProps {
  onBack: () => void;
  onRestart: () => void;
}

export function WritersPage({ onBack, onRestart }: WritersPageProps) {
  const {
    linkedinOutput,
    cvOutput,
    interingOutput,
    setLinkedinOutput,
    setCvOutput,
    setInteringOutput,
    errors,
    resetSession,
    isLoading,
  } = useSession();

  const busy = Object.values(isLoading).some(Boolean);

  const handleOutputChange = (
    type: WriterType,
    output: LinkedInOutput | CVDocument | InteringOutput
  ) => {
    if (type === "linkedin") setLinkedinOutput(output as LinkedInOutput);
    else if (type === "cv") setCvOutput(output as CVDocument);
    else if (type === "intering") setInteringOutput(output as InteringOutput);
  };

  const pdfError = errors.pdf;

  return (
    <div>
      <h1 className="mb-2">Kirjoittajat</h1>
      <p className="text-gray-600 mb-8">
        Valitse tarvitsemasi tekstit missä järjestyksessä tahansa. Voit tuottaa
        myös vain yhden materiaalin ja muokata sitä lisäohjeilla. Kopioi tekstit tästä näkymästä tai lataa CV PDF:nä.
      </p>

      {pdfError && (
        <p className="text-sm text-danger mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          PDF-virhe: {pdfError}
        </p>
      )}

      <div className="space-y-4 mb-6">
        <WriterCard
          type="linkedin"
          output={linkedinOutput}
          onOutputChange={handleOutputChange}
        />
        <WriterCard
          type="cv"
          output={cvOutput}
          onOutputChange={handleOutputChange}
        />
        <WriterCard
          type="intering"
          output={interingOutput}
          onOutputChange={handleOutputChange}
        />
      </div>

      <div className="flex gap-3 flex-wrap">
        <button onClick={onBack} className="btn-secondary">
          Takaisin
        </button>
        <button disabled={busy} onClick={() => { resetSession(); onRestart(); }} className="btn-secondary">
          Aloita alusta
        </button>
      </div>
    </div>
  );
}
