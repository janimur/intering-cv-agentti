import { LoadingIndicator } from "../components/LoadingIndicator";
import { OperationProgress } from "../components/OperationProgress";
import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { useSession } from "../store/SessionContext";
import { PositioningEditor } from "../components/PositioningEditor";
import { ClarificationPanel } from "../components/ClarificationPanel";
import type { MemberProfile, PositioningDocument, WorkflowState } from "../types/api";

const PROFILE_FIELDS: [keyof MemberProfile, string][] = [
  ["additional_facts", "Täydentävät tiedot ja näytöt"], ["corrections", "Korjaukset lähdemateriaaliin"],
  ["goals", "Toivomani toimeksiannot"], ["working_style", "Tapani toimia interim-roolissa"],
  ["voice_examples", "Oma ääneni — esimerkkejä omin sanoin"], ["exclusions", "Aiheet ja tiedot, joita ei saa käyttää"],
];

export function PositioningPage({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const { sessionId, workflow, setWorkflow, isLoading, setLoading, setError, errors } = useSession();
  const [draft, setDraft] = useState<{ positioning: PositioningDocument; profile: MemberProfile } | null>(null);
  const [notice, setNotice] = useState("");
  const busy = isLoading.positioning;
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setLoading("positioning", true);
    api.getPositioning(sessionId).then((state) => {
      if (!cancelled) { setWorkflow(state); setDraft(state.positioning ? { positioning: state.positioning, profile: state.profile } : null); }
    }).catch((err) => {
      if (!cancelled) setError("positioning", err instanceof ApiError ? err.detail : "Kartoituksen lataus epäonnistui.");
    }).finally(() => { if (!cancelled) setLoading("positioning", false); });
    return () => { cancelled = true; };
  }, [sessionId, setWorkflow, setLoading, setError]);

  const apply = (state: WorkflowState) => {
    setWorkflow(state);
    setDraft(state.positioning ? { positioning: state.positioning, profile: state.profile } : null);
  };
  const perform = async (action: () => Promise<WorkflowState>, message = "") => {
    if (!sessionId || busy) return;
    setLoading("positioning", true); setError("positioning", null); setNotice("");
    try { apply(await action()); setNotice(message); }
    catch (err) {
      setError("positioning", err instanceof ApiError ? err.detail : "Toiminto epäonnistui. Voit yrittää uudelleen.");
      if (err instanceof ApiError && err.status === 409) {
        try { apply(await api.getPositioning(sessionId)); } catch { /* alkuperäinen virhe jää näkyviin */ }
      }
    } finally { setLoading("positioning", false); }
  };
  const dirty = !!draft && (JSON.stringify(draft.positioning) !== JSON.stringify(workflow?.positioning) || JSON.stringify(draft.profile) !== JSON.stringify(workflow?.profile));
  const save = async () => {
    if (!sessionId || !workflow || !draft) return;
    await perform(() => api.updatePositioning(sessionId, workflow.revision, draft.positioning, draft.profile), "Muutokset päivitetty tähän istuntoon.");
  };
  const approve = async () => {
    if (!sessionId || !workflow || !draft) return;
    await perform(async () => {
      const current = dirty ? await api.updatePositioning(sessionId, workflow.revision, draft.positioning, draft.profile) : workflow;
      return api.approvePositioning(sessionId, current.revision);
    }, "Positiointi hyväksytty. Voit nyt valita haluamasi tekstit.");
  };

  return (
    <div>
      <h1 className="mb-2">Positiointikartoitus</h1>
      <p className="text-gray-600 mb-6">Analysoimme ensin materiaalisi. Sen jälkeen täydennämme tarvittaessa kokemustasi, tavoitteitasi ja omaa ääntäsi. Tarkistat yhteenvedon ennen tekstien kirjoittamista.</p>
      <p className="text-sm text-gray-500 mb-6">Työ säilyy vain tämän istunnon ajan. Sivun päivittäminen tai sulkeminen katkaisee työskentelyn.</p>
      {errors.positioning && <p role="alert" className="text-danger mb-4">{errors.positioning}</p>}
      <OperationProgress sessionId={sessionId} scope="positioning" />
      {notice && <p role="status" className="text-green-700 mb-4">{notice}</p>}
      {busy && !(workflow?.status === "clarifying" && workflow.current_question) && <div className="text-intering-500 mb-4"><LoadingIndicator label="Käsitellään kartoitusta…" /></div>}
      {!workflow && !busy && sessionId && <button className="btn-secondary mb-4" onClick={() => void perform(() => api.getPositioning(sessionId))}>Yritä latausta uudelleen</button>}
      {workflow?.status === "uploaded" && <div className="card mb-6"><button className="btn-primary" disabled={busy} onClick={() => void perform(() => api.runPositioning(sessionId!, workflow.revision))}>Aja kartoittaja</button></div>}
      {workflow?.status === "clarifying" && workflow.positioning && <section className="card mb-6"><h2 className="mb-2">Alustava havainto</h2><p className="font-medium mb-2">{workflow.positioning.positioning.primary_angle || "Täydennetään suuntaasi keskustelussa."}</p><p className="text-gray-600">{workflow.positioning.key_messages.elevator_pitch}</p><p className="text-sm text-gray-500 mt-3">Tämä on vielä ehdotus. Vastauksesi tarkentavat sitä ennen hyväksyntää.</p></section>}
      {workflow?.status === "clarifying" && workflow.current_question && <ClarificationPanel key={workflow.current_question.id} question={workflow.current_question} disabled={busy} onAnswer={(text, disposition) => perform(() => api.answerPositioning(sessionId!, workflow.revision, workflow.current_question!.id, text, disposition))} onFinish={() => void perform(() => api.finishPositioning(sessionId!, workflow.revision))} />}
      {workflow?.status === "clarifying" && !workflow.current_question && <button className="btn-secondary mb-4" disabled={busy} onClick={() => void perform(() => api.finishPositioning(sessionId!, workflow.revision))}>Siirry yhteenvetoon</button>}
      {!!workflow?.answers.length && <details className="card mb-6"><summary className="cursor-pointer font-medium">Keskustelun vastaukset ({workflow.answers.length})</summary><ol className="space-y-4 mt-4">{workflow.answers.map((answer, i) => <li key={`${answer.question_id}-${i}`}><p className="font-medium">{answer.question}</p><p className="whitespace-pre-wrap text-gray-600">{answer.disposition === "answered" ? answer.text : answer.disposition === "confidential" ? "Tietoa ei saa julkaista." : "Kysymys ohitettu."}</p></li>)}</ol></details>}
      {draft && workflow?.status !== "clarifying" && <fieldset disabled={busy} className="card mb-6">
        <h2 className="mb-2">Tarkista yhteenveto</h2><p className="text-sm text-gray-600 mb-6">Korjaa tulkinnat ja varmista, että tiedot saa käyttää teksteissä. Puuttuvia lukuja ei tarvitse täydentää.</p>
        <PositioningEditor positioning={draft.positioning} onChange={(positioning) => setDraft({ ...draft, positioning })} />
        <h3 className="mt-8 mb-4">Sinun kokemuksesi ja äänesi</h3>
        {PROFILE_FIELDS.map(([key, label]) => <div className="mb-4" key={key}><label htmlFor={`profile-${key}`} className="block text-sm font-medium mb-1">{label}</label><textarea id={`profile-${key}`} className="input-field" rows={3} value={draft.profile[key].join("\n")} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, [key]: e.target.value.split("\n") } })} /></div>)}
        <p className="text-sm text-gray-500">Yksi asia per rivi. Tyhjän kohdan voi jättää tyhjäksi.</p>
      </fieldset>}
      {workflow?.status === "approved" && !dirty && <p className="text-green-700 mb-4">Positiointi ja täydentävät tiedot on hyväksytty.</p>}
      {dirty && <p className="text-amber-700 mb-4">Sinulla on muutoksia. Niiden hyväksyminen edellyttää aiempien tekstien päivittämistä.</p>}
      <div className="flex flex-wrap gap-3">
        <button onClick={onBack} disabled={busy} className="btn-secondary">Takaisin</button>
        {draft && workflow?.status !== "clarifying" && <><button onClick={() => void save()} disabled={busy || !dirty} className="btn-secondary">Päivitä yhteenveto</button>{(workflow?.status !== "approved" || dirty) && <button onClick={() => void approve()} disabled={busy} className="btn-primary">Hyväksy positiointi</button>}</>}
        {workflow?.status === "approved" && !dirty && <button disabled={busy} onClick={onContinue} className="btn-primary">Jatka kirjoittajiin</button>}
      </div>
    </div>
  );
}
