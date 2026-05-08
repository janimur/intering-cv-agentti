import { useState } from "react";
import { SessionProvider, useSession } from "./store/SessionContext";
import { GdprBanner } from "./components/GdprBanner";
import { LandingPage } from "./pages/LandingPage";
import { UploadPage } from "./pages/UploadPage";
import { PositioningPage } from "./pages/PositioningPage";
import { WritersPage } from "./pages/WritersPage";
import { OutputPage } from "./pages/OutputPage";

type Step = "landing" | "upload" | "positioning" | "writers" | "output";

function AppContent() {
  const [step, setStep] = useState<Step>("landing");
  const { gdprAccepted } = useSession();

  return (
    <div className="min-h-screen bg-gray-50">
      {!gdprAccepted && <GdprBanner />}
      <main className="max-w-4xl mx-auto px-4 py-8">
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
