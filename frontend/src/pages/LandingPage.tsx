import { useSession } from "../store/SessionContext";

interface LandingPageProps {
  onStart: () => void;
}

const STEPS = [
  {
    title: "Lataa materiaali",
    text: "Lataa CV ja halutessasi LinkedIn-profiilisi teksti tai PDF.",
  },
  {
    title: "Tarkista positiointi",
    text: "Kartoittaja analysoi materiaalisi ja ehdottaa interim-positioinnin. Voit muokata sitä.",
  },
  {
    title: "Aja kirjoittajat",
    text: "Tuota LinkedIn-tekstit, CV PDF:nä ja intering.fi-profiilitekstit. Iteroi tarpeen mukaan.",
  },
];

export function LandingPage({ onStart }: LandingPageProps) {
  const { gdprAccepted } = useSession();

  return (
    <div className="py-8">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <p className="text-sm font-medium text-intering-500 uppercase tracking-wider mb-3">
          Intering-yhteisön jäsenille
        </p>
        <h1 className="mb-4">Myyvempi CV interim-toimeksiantoihin</h1>
        <p className="text-lg text-gray-600 mb-8">
          Agentti analysoi materiaalisi ja kirjoittaa LinkedIn-profiilin,
          CV:n ja intering.fi-profiilin jotka erottuvat interim-markkinassa.
        </p>
        <button
          onClick={onStart}
          disabled={!gdprAccepted}
          className="btn-primary text-base px-6 py-3"
        >
          Aloita
        </button>
        {!gdprAccepted && (
          <p className="text-xs text-gray-400 mt-3">
            Hyväksy tietosuoja jatkaaksesi
          </p>
        )}
      </div>

      {/* Vaiheet */}
      <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
        {STEPS.map((step, i) => (
          <div key={i} className="card">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-intering-50 text-intering-500 font-heading font-semibold mb-4">
              {i + 1}
            </div>
            <h3 className="mb-2">{step.title}</h3>
            <p className="text-sm text-gray-600">{step.text}</p>
          </div>
        ))}
      </div>

      {/* Aika ja luottamus */}
      <div className="text-center text-sm text-gray-500 mt-12 max-w-xl mx-auto">
        Prosessi kestää noin 2–4 minuuttia. Materiaalisi käsitellään muistissa
        eikä mitään tallenneta pysyvästi.
      </div>
    </div>
  );
}
