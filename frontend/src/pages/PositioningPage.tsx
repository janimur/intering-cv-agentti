import { useState } from "react";
import { api, ApiError } from "../api/client";
import { useSession } from "../store/SessionContext";
import { PositioningEditor } from "../components/PositioningEditor";
import { SpinnerOverlay } from "../components/SpinnerOverlay";
import type { PositioningDocument } from "../types/api";

interface PositioningPageProps {
  onBack: () => void;
  onContinue: () => void;
}

export function PositioningPage({ onBack, onContinue }: PositioningPageProps) {
  const {
    sessionId,
    positioning,
    setPositioning,
    isLoading,
    setLoading,
    setError,
    errors,
  } = useSession();

  const [localDoc, setLocalDoc] = useState<PositioningDocument | null>(
    positioning
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isRunning = isLoading.positioning;
  const error = errors.positioning;

  const handleRun = async () => {
    if (!sessionId) return;
    setLoading("positioning", true);
    setError("positioning", null);
    setSaveSuccess(false);
    try {
      const result = await api.runPositioning(sessionId);
      setPositioning(result);
      setLocalDoc(result);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.detail : "Kartoittajan ajo epäonnistui";
      setError("positioning", msg);
    } finally {
      setLoading("positioning", false);
    }
  };

  const handleSave = async () => {
    if (!sessionId || !localDoc) return;
    setLoading("positioning", true);
    setError("positioning", null);
    setSaveSuccess(false);
    try {
      const result = await api.updatePositioning(sessionId, localDoc);
      setPositioning(result);
      setLocalDoc(result);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.detail : "Tallentaminen epäonnistui";
      setError("positioning", msg);
    } finally {
      setLoading("positioning", false);
    }
  };

  return (
    <div>
      <SpinnerOverlay
        visible={isRunning}
        message="Kartoittaja analysoi materiaalia, tämä kestää 30–60 sekuntia..."
      />

      <h1 className="mb-2">Positiointikartoitus</h1>
      <p className="text-gray-600 mb-8">
        Kartoittaja analysoi materiaalisi ja ehdottaa interim-positioinnin.
        Voit muokata tuloksia ennen kuin jatkat kirjoittajiin.
      </p>

      {error && (
        <p className="text-sm text-danger mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {!localDoc && !isRunning && (
        <div className="card text-center py-12 mb-6">
          <p className="text-gray-600 mb-6">
            Klikkaa alla aloittaaksesi kartoituksen.
            Tämä kestää noin 30–60 sekuntia.
          </p>
          <button onClick={handleRun} className="btn-primary text-base px-6 py-3">
            Aja kartoittaja
          </button>
        </div>
      )}

      {localDoc && (
        <div className="card mb-6">
          <PositioningEditor
            positioning={localDoc}
            onChange={setLocalDoc}
          />
        </div>
      )}

      {saveSuccess && (
        <p className="text-sm text-green-700 mb-4 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Muutokset tallennettu
        </p>
      )}

      <div className="flex gap-3 flex-wrap">
        <button onClick={onBack} disabled={isRunning} className="btn-secondary">
          Takaisin
        </button>

        {localDoc && (
          <>
            <button onClick={handleSave} disabled={isRunning} className="btn-secondary">
              Tallenna muutokset
            </button>
            <button onClick={onContinue} disabled={isRunning} className="btn-primary">
              Jatka kirjoittajiin
            </button>
          </>
        )}

        {!localDoc && (
          <button onClick={handleRun} disabled={isRunning} className="btn-primary">
            Aja kartoittaja
          </button>
        )}
      </div>
    </div>
  );
}
