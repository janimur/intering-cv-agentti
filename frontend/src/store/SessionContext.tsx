import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
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

  // Pidetään tuoreimman state:n referenssi ref:issä jotta resetSession voi
  // lukea gdprAccepted:n ilman että callback on luotava uudelleen joka
  // state-muutoksella. Tämä on tärkeä — ilman tätä setter-funktiot
  // luotaisiin uudelleen joka renderillä, mikä rikkoisi useEffect-hookit
  // joissa setter on dependency-listassa (ääretön re-render).
  const stateRef = useRef(state);
  stateRef.current = state;

  const setSessionId = useCallback(
    (id: string | null) => setState((s) => ({ ...s, sessionId: id })),
    []
  );
  const setPositioning = useCallback(
    (doc: PositioningDocument | null) =>
      setState((s) => ({ ...s, positioning: doc })),
    []
  );
  const setLinkedinOutput = useCallback(
    (out: LinkedInOutput | null) =>
      setState((s) => ({ ...s, linkedinOutput: out })),
    []
  );
  const setCvOutput = useCallback(
    (out: CVDocument | null) => setState((s) => ({ ...s, cvOutput: out })),
    []
  );
  const setInteringOutput = useCallback(
    (out: InteringOutput | null) =>
      setState((s) => ({ ...s, interingOutput: out })),
    []
  );
  const setCvTextPreview = useCallback(
    (text: string) => setState((s) => ({ ...s, cvTextPreview: text })),
    []
  );
  const setLinkedinAvailable = useCallback(
    (available: boolean) =>
      setState((s) => ({ ...s, linkedinAvailable: available })),
    []
  );
  const setLoading = useCallback(
    (key: LoadingKey, value: boolean) =>
      setState((s) => ({
        ...s,
        isLoading: { ...s.isLoading, [key]: value },
      })),
    []
  );
  const setError = useCallback(
    (key: string, value: string | null) =>
      setState((s) => ({ ...s, errors: { ...s.errors, [key]: value } })),
    []
  );
  const acceptGdpr = useCallback(
    () => setState((s) => ({ ...s, gdprAccepted: true })),
    []
  );
  const resetSession = useCallback(() => {
    setState({ ...initialState, gdprAccepted: stateRef.current.gdprAccepted });
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      setSessionId,
      setPositioning,
      setLinkedinOutput,
      setCvOutput,
      setInteringOutput,
      setCvTextPreview,
      setLinkedinAvailable,
      setLoading,
      setError,
      acceptGdpr,
      resetSession,
    }),
    [
      state,
      setSessionId,
      setPositioning,
      setLinkedinOutput,
      setCvOutput,
      setInteringOutput,
      setCvTextPreview,
      setLinkedinAvailable,
      setLoading,
      setError,
      acceptGdpr,
      resetSession,
    ]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
