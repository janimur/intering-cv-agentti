import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type {
  PositioningDocument,
  LinkedInOutput,
  CVDocument,
  InteringOutput,
  WriterType,
} from "../types/api";

type LoadingKey = "positioning" | WriterType | "pdf" | "upload";

interface SessionState {
  sessionId: string | null;
  positioning: PositioningDocument | null;
  linkedinOutput: LinkedInOutput | null;
  cvOutput: CVDocument | null;
  interingOutput: InteringOutput | null;
  cvTextPreview: string;
  linkedinAvailable: boolean;
  isLoading: Record<LoadingKey, boolean>;
  errors: Record<string, string | null>;
  gdprAccepted: boolean;
}

interface SessionContextValue extends SessionState {
  setSessionId: (id: string | null) => void;
  setPositioning: (doc: PositioningDocument | null) => void;
  setLinkedinOutput: (out: LinkedInOutput | null) => void;
  setCvOutput: (out: CVDocument | null) => void;
  setInteringOutput: (out: InteringOutput | null) => void;
  setCvTextPreview: (text: string) => void;
  setLinkedinAvailable: (available: boolean) => void;
  setLoading: (key: LoadingKey, value: boolean) => void;
  setError: (key: string, value: string | null) => void;
  acceptGdpr: () => void;
  resetSession: () => void;
}

// Persistoidaan localStorage:een VAIN GDPR-hyväksyntä jotta käyttäjän
// ei tarvitse hyväksyä uudestaan jokaisella latauksella. Kaikki muu data
// (sessionId, output:t, positioning) on aina muistissa ja nollautuu kun
// sivu ladataan — tämä pitää frontendin synkassa backendin in-memory-
// session kanssa, joka katoaa palvelimen uudelleenkäynnistyksessä.
const GDPR_KEY = "intering_gdpr_accepted";

const initialState: SessionState = {
  sessionId: null,
  positioning: null,
  linkedinOutput: null,
  cvOutput: null,
  interingOutput: null,
  cvTextPreview: "",
  linkedinAvailable: false,
  isLoading: {
    positioning: false,
    linkedin: false,
    cv: false,
    intering: false,
    pdf: false,
    upload: false,
  },
  errors: {},
  gdprAccepted: false,
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(() => ({
    ...initialState,
    gdprAccepted: localStorage.getItem(GDPR_KEY) === "1",
  }));

  useEffect(() => {
    if (state.gdprAccepted) {
      localStorage.setItem(GDPR_KEY, "1");
    }
  }, [state.gdprAccepted]);

  const value: SessionContextValue = {
    ...state,
    setSessionId: (id) => setState((s) => ({ ...s, sessionId: id })),
    setPositioning: (doc) => setState((s) => ({ ...s, positioning: doc })),
    setLinkedinOutput: (out) =>
      setState((s) => ({ ...s, linkedinOutput: out })),
    setCvOutput: (out) => setState((s) => ({ ...s, cvOutput: out })),
    setInteringOutput: (out) =>
      setState((s) => ({ ...s, interingOutput: out })),
    setCvTextPreview: (text) =>
      setState((s) => ({ ...s, cvTextPreview: text })),
    setLinkedinAvailable: (available) =>
      setState((s) => ({ ...s, linkedinAvailable: available })),
    setLoading: (key, value) =>
      setState((s) => ({
        ...s,
        isLoading: { ...s.isLoading, [key]: value },
      })),
    setError: (key, value) =>
      setState((s) => ({ ...s, errors: { ...s.errors, [key]: value } })),
    acceptGdpr: () => setState((s) => ({ ...s, gdprAccepted: true })),
    resetSession: () => {
      // Säilytä gdpr-hyväksyntä, nollaa kaikki muu
      setState({ ...initialState, gdprAccepted: state.gdprAccepted });
    },
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
