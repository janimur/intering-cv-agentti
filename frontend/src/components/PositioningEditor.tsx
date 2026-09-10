import type { PositioningDocument } from "../types/api";

interface PositioningEditorProps {
  positioning: PositioningDocument;
  onChange: (doc: PositioningDocument) => void;
}

interface StringListEditorProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  maxItems?: number;
}

function StringListEditor({ label, items, onChange, maxItems }: StringListEditorProps) {
  const updateItem = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  const addItem = () => { if (!maxItems || items.length < maxItems) onChange([...items, ""]); };

  const removeItem = (index: number) =>
    onChange(items.filter((_, i) => i !== index));

  return (
    <div className="mb-4" role="group" aria-label={label}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 mb-1.5">
          <input
            type="text"
            aria-label={`${label} ${i + 1}`}
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            className="input-field flex-1 px-3 py-1.5"
          />
          <button
            onClick={() => removeItem(i)}
            className="text-xs px-3 py-1 rounded-lg text-gray-500 hover:text-danger hover:bg-red-50 transition-colors"
          >
            Poista
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        disabled={maxItems !== undefined && items.length >= maxItems}
        className="text-xs px-3 py-1.5 rounded-lg text-intering-500 hover:bg-intering-50 mt-1 transition-colors font-medium"
      >
        + Lisää
      </button>
    </div>
  );
}

export function PositioningEditor({
  positioning,
  onChange,
}: PositioningEditorProps) {
  const update = (path: string, value: unknown) => {
    const parts = path.split(".");
    const next = structuredClone(positioning) as unknown as Record<string, unknown>;
    let current = next;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
    onChange(next as unknown as PositioningDocument);
  };

  const { positioning: pos, evidence, key_messages, preferences } = positioning;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-4">Positiointi</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Positiointikulma (primary angle)
          </label>
          <textarea
            value={pos.primary_angle}
            onChange={(e) => update("positioning.primary_angle", e.target.value)}
            rows={3}
            className="input-field"
          />
        </div>
        <StringListEditor
          label="Kohdeostajaprofiili (target buyers)"
          items={pos.target_buyers}
          onChange={(v) => update("positioning.target_buyers", v)}
        />
        <StringListEditor
          label="Kohdetilanteet (target situations)"
          items={pos.target_situations}
          onChange={(v) => update("positioning.target_situations", v)}
        />
        <StringListEditor
          label="Erottautumistekijät (differentiators)"
          items={pos.differentiators}
          onChange={(v) => update("positioning.differentiators", v)}
        />
      </section>

      <section>
        <h3 className="mb-4">
          Päätarina (flagship story)
        </h3>
        {!evidence.flagship_story ? <div><p className="text-sm text-gray-600 mb-3">Päätarinaa ei ole vielä vahvistettu. Sen voi jättää puuttumaan.</p><button type="button" className="btn-secondary" onClick={() => update("evidence.flagship_story", { context: "", action: "", result_quantified: "" })}>Lisää päätarina</button></div> : <>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Konteksti
          </label>
          <textarea
            value={evidence.flagship_story.context}
            onChange={(e) =>
              update("evidence.flagship_story.context", e.target.value)
            }
            rows={2}
            className="input-field"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Toiminta
          </label>
          <textarea
            value={evidence.flagship_story.action}
            onChange={(e) =>
              update("evidence.flagship_story.action", e.target.value)
            }
            rows={2}
            className="input-field"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mitattava tulos
          </label>
          <textarea
            value={evidence.flagship_story.result_quantified}
            onChange={(e) =>
              update(
                "evidence.flagship_story.result_quantified",
                e.target.value
              )
            }
            rows={2}
            className="input-field"
          />
        </div>
        <button type="button" className="text-sm text-gray-600 underline" onClick={() => update("evidence.flagship_story", null)}>Poista päätarina</button>
        </>}
      </section>

      <section>
        <h3 className="mb-4">Tukevat näytöt ja osaaminen</h3>
        <p className="text-sm text-gray-600 mb-4">Myös laadullinen tulos kelpaa. Korjaa tai poista tieto, jota ei voi käyttää teksteissä.</p>
        {evidence.supporting_results.map((result, index) => (
          <fieldset key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
            <legend className="text-sm font-medium">Näyttö {index + 1}</legend>
            {([["metric", "Mittari tai tuloksen kuvaus"], ["value", "Tulos tai arvo"], ["context", "Tilanne ja oma osuus"]] as const).map(([key, label]) => (
              <label key={key} className="block text-sm mb-3">
                {label}
                <textarea className="input-field mt-1" rows={2} value={result[key]} onChange={(e) => update("evidence.supporting_results", evidence.supporting_results.map((item, i) => i === index ? { ...item, [key]: e.target.value } : item))} />
              </label>
            ))}
            <button type="button" className="text-sm text-gray-600 underline" onClick={() => update("evidence.supporting_results", evidence.supporting_results.filter((_, i) => i !== index))}>Poista näyttö</button>
          </fieldset>
        ))}
        <button type="button" className="btn-secondary mb-4" onClick={() => update("evidence.supporting_results", [...evidence.supporting_results, { metric: "", value: "", context: "" }])}>Lisää tukeva näyttö</button>
        <StringListEditor label="Osaamisalueet" items={evidence.expertise_areas} onChange={(items) => update("evidence.expertise_areas", items)} />
      </section>

      <section>
        <h3 className="mb-4">Avainviestit</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            One-liner
          </label>
          <textarea
            value={key_messages.one_liner}
            onChange={(e) => update("key_messages.one_liner", e.target.value)}
            rows={2}
            className="input-field"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hissipuhe (elevator pitch)
          </label>
          <textarea
            value={key_messages.elevator_pitch}
            onChange={(e) =>
              update("key_messages.elevator_pitch", e.target.value)
            }
            rows={4}
            className="input-field"
          />
        </div>
        <StringListEditor
          label="Todistuspisteet (proof points)"
          items={key_messages.proof_points}
          maxItems={5}
          onChange={(v) => update("key_messages.proof_points", v)}
        />
      </section>

      <section>
        <h3 className="mb-4">
          Asetukset
        </h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sävy (tone)
          </label>
          <input
            type="text"
            value={preferences.tone}
            onChange={(e) => update("preferences.tone", e.target.value)}
            className="input-field"
          />
        </div>
        <StringListEditor
          label="Poissuljettavat (exclusions)"
          items={preferences.exclusions}
          onChange={(v) => update("preferences.exclusions", v)}
        />
      </section>
    </div>
  );
}
