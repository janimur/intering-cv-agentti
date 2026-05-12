import { useSession } from "../store/SessionContext";

interface LandingPageProps {
  onStart: () => void;
}

function HeroIllustration() {
  return (
    <div className="relative w-full max-w-md mx-auto md:mx-0">
      <div className="grid grid-cols-2 gap-4">
        {/* Oranssi kortti — ylä-vasen */}
        <div className="bg-accent-orange rounded-3xl aspect-[4/5] p-6 flex flex-col justify-between shadow-card transform rotate-[-2deg]">
          <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
            </svg>
          </div>
          <p className="text-white font-heading font-bold text-lg leading-tight">
            Sinun<br />tarinasi
          </p>
        </div>

        {/* Keltainen kortti — ylä-oikea, pieni offset */}
        <div className="bg-accent-yellow rounded-3xl aspect-[4/5] p-6 flex flex-col justify-between shadow-card transform rotate-[2deg] mt-8">
          <div className="w-12 h-12 rounded-full bg-white/40 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <p className="text-white font-heading font-bold text-lg leading-tight">
            Mitattavat<br />tulokset
          </p>
        </div>

        {/* Tumma sininen kortti — ala-vasen */}
        <div className="bg-intering-500 rounded-3xl aspect-[4/5] p-6 flex flex-col justify-between shadow-card transform rotate-[2deg] -mt-4">
          <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p className="text-white font-heading font-bold text-lg leading-tight">
            Valmis<br />CV
          </p>
        </div>

        {/* Turkoosi kortti — ala-oikea */}
        <div className="bg-teal-500 rounded-3xl aspect-[4/5] p-6 flex flex-col justify-between shadow-card transform rotate-[-2deg] mt-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <p className="text-white font-heading font-bold text-lg leading-tight">
            LinkedIn<br />ja intering
          </p>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Lataa materiaali",
    text: "CV ja LinkedIn-profiili. Materiaalit käsitellään muistissa, mitään ei tallenneta.",
  },
  {
    n: "02",
    title: "Tarkista positiointi",
    text: "Kartoittaja analysoi profiilisi ja ehdottaa interim-positioinnin. Muokkaa vapaasti.",
  },
  {
    n: "03",
    title: "Aja kirjoittajat",
    text: "LinkedIn-tekstit, CV PDF:nä ja intering.fi-profiilitekstit. Iteroi tarpeen mukaan.",
  },
];

export function LandingPage({ onStart }: LandingPageProps) {
  const { gdprAccepted } = useSession();

  return (
    <>
      {/* HERO */}
      <section className="hero-bg">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Vasen: otsikko + CTA */}
            <div>
              <h1 className="text-hero mb-6">
                Myyvempi CV{" "}
                <span className="text-intering-500">interim-toimeksiantoihin</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-700 mb-4 max-w-xl">
                Agentti analysoi materiaalisi ja kirjoittaa LinkedIn-profiilin,
                CV:n ja intering.fi-profiilin jotka erottuvat interim-markkinassa.
              </p>
              <p className="text-base text-gray-500 mb-8 max-w-xl">
                Prosessi kestää noin 2–4 minuuttia. Voit iteroida tuloksia
                ennen kuin julkaiset ne.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={onStart}
                  disabled={!gdprAccepted}
                  className="btn-primary text-base px-7 py-3.5"
                >
                  Aloita
                </button>
                <a
                  href="https://www.intering.fi/mit-on-interim-johtajuus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-teal text-base px-7 py-3.5"
                >
                  Mitä on interim?
                </a>
              </div>
              {!gdprAccepted && (
                <p className="text-xs text-gray-400 mt-3">
                  Hyväksy tietosuoja jatkaaksesi
                </p>
              )}
            </div>

            {/* Oikea: kuvitukset */}
            <div className="order-first lg:order-last">
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* VAIHEET */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="max-w-2xl mb-12">
            <p className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-3">
              Miten se toimii
            </p>
            <h2 className="mb-4">Kolme vaihetta valmiiseen profiiliin</h2>
            <p className="text-lg text-gray-600">
              Lataa materiaalit kerran ja agentti vastaa loput. Sinä päätät miltä
              lopputulos näyttää.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div key={step.n} className="card hover:shadow-card-hover transition-shadow">
                <div className="font-heading font-bold text-3xl text-intering-500 mb-4">
                  {step.n}
                </div>
                <h3 className="mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA -palkki */}
      <section className="bg-intering-500">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="text-white mb-2">Valmiina aloittamaan?</h2>
              <p className="text-intering-100">
                Sinulla on materiaali ja agentti tekee loput. 2–4 minuutissa.
              </p>
            </div>
            <button
              onClick={onStart}
              disabled={!gdprAccepted}
              className="bg-white text-intering-500 hover:bg-gray-50 active:bg-gray-100 font-semibold px-7 py-3.5 rounded-lg shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-base"
            >
              Aloita
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
