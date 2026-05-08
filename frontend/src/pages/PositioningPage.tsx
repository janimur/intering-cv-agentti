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

      <h1 className="text-3xl font-semibold text-gray-900 mb-2">
        Positiointikartoitus
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Kartoittaja analysoi CV:si ja LinkedIn-profiilisi ja rakentaa
        positiointidokumentin. Voit muokata tuloksia ennen kuin jatkat
        kirjoittajiin.
      </p>

      {error && (
        <p className="text-sm text-red-600 mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {!localDoc && !isRunning && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center mb-6">
          <p className="text-gray-600 mb-4">
            Aja kartoittaja analysoidaksesi materiaaliasi
          </p>
          <button
            onClick={handleRun}
            className="px-6 py-3 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Aja kartoittaja
          </button>
        </div>
      )}

      {localDoc && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <PositioningEditor
            positioning={localDoc}
            onChange={setLocalDoc}
          />
        </div>
      )}

      {saveSuccess && (
        <p className="text-sm text-green-700 mb-4 bg-green-50 border border-green-200 rounded px-3 py-2">
          Muutokset tallennettu
        </p>
      )}

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={onBack}
          disabled={isRunning}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
        >
          Takaisin
        </button>

        {localDoc && (
          <>
            <button
              onClick={handleSave}
              disabled={isRunning}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              Tallenna muutokset
            </button>
            <button
              onClick={onContinue}
              disabled={isRunning}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              Jatka kirjoittajiin
            </button>
          </>
        )}

        {!localDoc && (
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            Aja kartoittaja
          </button>
        )}
      </div>
    </div>
  );
}
