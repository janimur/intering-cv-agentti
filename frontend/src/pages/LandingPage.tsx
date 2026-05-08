import { useSession } from "../store/SessionContext";

interface LandingPageProps {
  onStart: () => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  const { gdprAccepted } = useSession();

  return (
    <div className="text-center py-16">
      <h1 className="text-3xl font-semibold text-gray-900 mb-4">
        Intering CV-agentti
      </h1>
      <p className="text-gray-600 text-lg max-w-xl mx-auto mb-2">
        Lataa CV:si ja LinkedIn-profiilisi, niin agentti analysoi materiaalisi
        ja kirjoittaa sinulle viimeistellyn LinkedIn-profiilin, CV-dokumentin ja
        Intering-profiilin.
      </p>
      <p className="text-gray-500 text-sm mb-8">
        Prosessi kestää noin 2–4 minuuttia. Voit muokata tuloksia ennen
        julkaisemista.
      </p>
      <button
        onClick={onStart}
        disabled={!gdprAccepted}
        className="px-6 py-3 rounded bg-blue-600 hover:bg-blue-700 text-white text-base font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Aloita
      </button>
      {!gdprAccepted && (
        <p className="text-xs text-gray-400 mt-2">
          Hyväksy tietosuoja jatkaaksesi
        </p>
      )}
    </div>
  );
}
