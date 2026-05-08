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
  onContinue: () => void;
}

export function WritersPage({ onBack, onContinue }: WritersPageProps) {
  const {
    linkedinOutput,
    cvOutput,
    interingOutput,
    setLinkedinOutput,
    setCvOutput,
    setInteringOutput,
    errors,
  } = useSession();

  const hasAnyOutput =
    linkedinOutput !== null || cvOutput !== null || interingOutput !== null;

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
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">Kirjoittajat</h1>
      <p className="text-gray-500 text-sm mb-6">
        Aja kirjoittajat haluamassasi järjestyksessä. Voit iteroida tuloksia
        ennen jatkamista.
      </p>

      {pdfError && (
        <p className="text-sm text-red-600 mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">
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
        <button
          onClick={onBack}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
        >
          Takaisin
        </button>
        {hasAnyOutput && (
          <button
            onClick={onContinue}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
          >
            Jatka katselmaan tulokset
          </button>
        )}
      </div>
    </div>
  );
}
