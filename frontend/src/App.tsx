import { useState } from "react";
import { SessionProvider, useSession } from "./store/SessionContext";
import { GdprBanner } from "./components/GdprBanner";
import { LandingPage } from "./pages/LandingPage";
import { UploadPage } from "./pages/UploadPage";
import { PositioningPage } from "./pages/PositioningPage";
import { WritersPage } from "./pages/WritersPage";
import { OutputPage } from "./pages/OutputPage";

type Step = "landing" | "upload" | "positioning" | "writers" | "output";

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Lataa" },
  { id: "positioning", label: "Positiointi" },
  { id: "writers", label: "Kirjoittajat" },
  { id: "output", label: "Tulokset" },
];

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          {/* Sateenkaarikäyrä intering.fi-tyyliin */}
          <path d="M4 20 Q 16 4 28 20" stroke="url(#g1)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="32" y2="0">
              <stop offset="0%" stopColor="#FF8B3D" />
              <stop offset="50%" stopColor="#F7C61F" />
              <stop offset="100%" stopColor="#00BCD4" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span className="font-heading font-bold text-intering-500 text-lg tracking-tight">
        intering<span className="text-gray-400 font-normal"> · CV-agentti</span>
      </span>
    </div>
  );
}

function Header({ currentStep, onLogoClick }: { currentStep: Step; onLogoClick: () => void }) {
  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const showStepper = currentStep !== "landing";

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <button onClick={onLogoClick} className="hover:opacity-80 transition-opacity">
          <Logo />
        </button>

        {showStepper && (
          <ol className="hidden md:flex items-center gap-1 text-sm">
            {STEPS.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2">
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                    i < stepIndex
                      ? "bg-intering-500 text-white"
                      : i === stepIndex
                      ? "bg-intering-500 text-white ring-4 ring-intering-100"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={
                    i === stepIndex
                      ? "text-gray-900 font-semibold"
                      : i < stepIndex
                      ? "text-gray-700"
                      : "text-gray-400"
                  }
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="text-gray-200 mx-2">―</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-100 mt-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          © Intering-yhteisö · CV-agentti
        </p>
        <p className="text-xs text-gray-400">
          Materiaalit käsitellään muistissa eikä mitään tallenneta pysyvästi.
        </p>
      </div>
    </footer>
  );
}

function AppContent() {
  const [step, setStep] = useState<Step>("landing");
  const { gdprAccepted } = useSession();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {!gdprAccepted && <GdprBanner />}
      <Header currentStep={step} onLogoClick={() => setStep("landing")} />

      <div className="flex-1 flex flex-col">
        {step === "landing" && (
          <LandingPage onStart={() => setStep("upload")} />
        )}
        {step !== "landing" && (
          <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 py-10 md:py-14">
            {step === "upload" && (
              <UploadPage
                onBack={() => setStep("landing")}
                onUploaded={() => setStep("positioning")}
              />
            )}
            {step === "positioning" && (
              <PositioningPage
                onBack={() => setStep("upload")}
                onContinue={() => setStep("writers")}
              />
            )}
            {step === "writers" && (
              <WritersPage
                onBack={() => setStep("positioning")}
                onContinue={() => setStep("output")}
              />
            )}
            {step === "output" && (
              <OutputPage onRestart={() => setStep("landing")} />
            )}
          </main>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}
