import { LoadingIndicator } from "../components/LoadingIndicator";
import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { PromptItem } from "../types/api";

const FRIENDLY_NAMES: Record<string, string> = {
  kartoittaja_system: "Kartoittaja",
  kirjoittaja_linkedin_system: "LinkedIn-kirjoittaja",
  kirjoittaja_cv_system: "CV-kirjoittaja",
  kirjoittaja_intering_system: "Intering-kirjoittaja",
  yhteiset_saannot: "Yhteiset säännöt",
  kartoituksen_ohje: "Kartoituksen ohje",
  kartoituksen_analyysi: "Kartoituksen analyysi",
  suomalainen_interim_markkina: "Suomalainen interim-markkina",
  tyypilliset_interim_positiointikulmat: "Tyypilliset interim-positiointikulmat",
};

export function AdminPage() {
  const [prompts, setPrompts] = useState<PromptItem[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingName, setSavingName] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    api.admin
      .listPrompts()
      .then((items) => {
        setPrompts(items);
        const d: Record<string, string> = {};
        items.forEach((p) => (d[p.name] = p.content));
        setDrafts(d);
      })
      .catch((err) => {
        const msg = err instanceof ApiError ? err.detail : "Lataus epaonnistui";
        setGlobalError(msg);
      });
  }, []);

  const setDraft = (name: string, content: string) =>
    setDrafts((s) => ({ ...s, [name]: content }));

  const handleSave = async (name: string) => {
    setSavingName(name);
    setStatus((s) => ({ ...s, [name]: "" }));
    try {
      const updated = await api.admin.updatePrompt(name, drafts[name]);
      setPrompts((items) =>
        items?.map((p) => (p.name === name ? updated : p)) ?? null
      );
      setStatus((s) => ({ ...s, [name]: "Tallennettu" }));
      setTimeout(() => setStatus((s) => ({ ...s, [name]: "" })), 3000);
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : "Tallennus epaonnistui";
      setStatus((s) => ({ ...s, [name]: `Virhe: ${msg}` }));
    } finally {
      setSavingName(null);
    }
  };

  const handleReset = async (name: string) => {
    if (!confirm("Palautetaanko prompti oletukseen? Muokkaukset katoavat.")) return;
    setSavingName(name);
    try {
      const reset = await api.admin.resetPrompt(name);
      setPrompts((items) =>
        items?.map((p) => (p.name === name ? reset : p)) ?? null
      );
      setDrafts((s) => ({ ...s, [name]: reset.content }));
      setStatus((s) => ({ ...s, [name]: "Palautettu oletukseen" }));
      setTimeout(() => setStatus((s) => ({ ...s, [name]: "" })), 3000);
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : "Palautus epaonnistui";
      setStatus((s) => ({ ...s, [name]: `Virhe: ${msg}` }));
    } finally {
      setSavingName(null);
    }
  };

  if (globalError) {
    return (
      <div>
        <h1 className="mb-4">Admin: Promptit</h1>
        <p className="text-danger bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {globalError}
        </p>
      </div>
    );
  }

  if (!prompts) {
    return (
      <div>
        <h1 className="mb-4">Admin: Promptit</h1>
        <LoadingIndicator label="Ladataan ohjeita…" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2">Admin: Promptit</h1>
      <p className="text-gray-600 mb-8">
        Muokkaa promptteja ilman koodimuutoksia. Tallennetut muutokset tulevat
        voimaan seuraavassa ajossa. Muokkaukset säilyvät palvelimen
        uudelleenkäynnistyksissä erillään git-historiasta. Muokattu tiedosto
        data/prompts-kansiossa ohittaa prompts-kansion oletuksen. Myös tiedoston
        suora päivitys vaikuttaa seuraavaan ajoon.
      </p>

      <div className="space-y-8">
        {prompts.map((p) => {
          const isDirty = drafts[p.name] !== p.content;
          const isSaving = savingName === p.name;
          return (
            <div key={p.name} className="card">
              <div className="flex items-baseline justify-between gap-4 mb-4">
                <div>
                  <h2 className="mb-1">{FRIENDLY_NAMES[p.name] ?? p.name}</h2>
                  <p className="text-xs text-gray-500">
                    {p.is_overlay ? (
                      <span className="text-teal-600 font-medium">
                        Muokattu (overlay)
                      </span>
                    ) : (
                      <span>Oletus (git)</span>
                    )}
                    {" · "}
                    {drafts[p.name]?.length ?? 0} merkkia
                  </p>
                </div>
                <div className="flex gap-2">
                  {p.is_overlay && (
                    <button
                      onClick={() => handleReset(p.name)}
                      disabled={isSaving}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      Palauta oletukseen
                    </button>
                  )}
                  <button
                    onClick={() => handleSave(p.name)}
                    disabled={!isDirty || isSaving}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    {isSaving ? <LoadingIndicator label="Tallennetaan…" /> : "Tallenna"}
                  </button>
                </div>
              </div>
              <textarea
                value={drafts[p.name] ?? ""}
                onChange={(e) => setDraft(p.name, e.target.value)}
                rows={20}
                spellCheck={false}
                className="input-field font-mono text-xs leading-relaxed"
                style={{ tabSize: 2 }}
              />
              {status[p.name] && (
                <p
                  className={`text-xs mt-2 ${
                    status[p.name].startsWith("Virhe")
                      ? "text-danger"
                      : "text-teal-600"
                  }`}
                >
                  {status[p.name]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
