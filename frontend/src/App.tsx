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

function Header({ currentStep }: { currentStep: Step }) {
  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const showStepper = currentStep !== "landing";

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-heading font-semibold text-lg text-intering-500">
            Intering
          </span>
          <span className="text-sm text-gray-500">CV-agentti</span>
        </div>
        {showStepper && (
          <ol className="hidden md:flex items-center gap-2 text-xs">
            {STEPS.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2">
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full font-medium ${
                    i < stepIndex
                      ? "bg-intering-500 text-white"
                      : i === stepIndex
                      ? "bg-intering-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={
                    i === stepIndex
                      ? "text-gray-900 font-medium"
                      : "text-gray-500"
                  }
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="text-gray-300 mx-1">→</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </header>
  );
}

function AppContent() {
  const [step, setStep] = useState<Step>("landing");
  const { gdprAccepted } = useSession();

  return (
    <div className="min-h-screen bg-white">
      {!gdprAccepted && <GdprBanner />}
      <Header currentStep={step} />
      <main className="max-w-4xl mx-auto px-4 py-10">
        {step === "landing" && (
          <LandingPage onStart={() => setStep("upload")} />
        )}
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
