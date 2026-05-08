import type { PositioningDocument } from "../types/api";

interface PositioningEditorProps {
  positioning: PositioningDocument;
  onChange: (doc: PositioningDocument) => void;
}

interface StringListEditorProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}

function StringListEditor({ label, items, onChange }: StringListEditorProps) {
  const updateItem = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  const addItem = () => onChange([...items, ""]);

  const removeItem = (index: number) =>
    onChange(items.filter((_, i) => i !== index));

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 mb-1">
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            onClick={() => removeItem(i)}
            className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-red-100 text-gray-600 hover:text-red-700"
          >
            Poista
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 mt-1"
      >
        + Lisaa
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
        <h3 className="text-lg font-medium text-gray-900 mb-3">Positiointi</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Paakulmavi (primary angle)
          </label>
          <textarea
            value={pos.primary_angle}
            onChange={(e) => update("positioning.primary_angle", e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
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
          label="Erottautumistekijat (differentiators)"
          items={pos.differentiators}
          onChange={(v) => update("positioning.differentiators", v)}
        />
      </section>

      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Paatarina (flagship story)
        </h3>
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
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
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
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
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
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Avainviestit</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            One-liner
          </label>
          <textarea
            value={key_messages.one_liner}
            onChange={(e) => update("key_messages.one_liner", e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
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
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <StringListEditor
          label="Todistuspisteet (proof points)"
          items={key_messages.proof_points}
          onChange={(v) => update("key_messages.proof_points", v)}
        />
      </section>

      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
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
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
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
