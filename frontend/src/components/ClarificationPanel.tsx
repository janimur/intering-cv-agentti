import { useState } from "react";
import type { AnswerDisposition, ClarificationQuestion } from "../types/api";

export function ClarificationPanel({ question, disabled, onAnswer, onFinish }: {
  question: ClarificationQuestion; disabled: boolean;
  onAnswer: (text: string, disposition: AnswerDisposition) => Promise<void>;
  onFinish: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <section className="card mb-6 border-intering-200" aria-label="Tarkentava kysymys">
      <p className="text-sm font-medium text-intering-500 mb-2">Täydennetään kuvaa sinusta</p>
      <label htmlFor="clarification-answer" className="block text-lg font-semibold mb-3">{question.text}</label>
      <p className="text-sm text-gray-600 mb-4">Kerro omin sanoin. Vastauksesi auttaa kuvaamaan sekä osaamistasi että tapaasi toimia. Älä kirjoita salassa pidettäviä tietoja: voit ohittaa aiheen julkaisematta vastaustasi.</p>
      <textarea id="clarification-answer" value={text} onChange={(e) => setText(e.target.value)} rows={5} className="input-field" disabled={disabled} />
      <div className="flex flex-wrap gap-3 mt-4">
        <button className="btn-primary" disabled={disabled || !text.trim()} onClick={() => void onAnswer(text.trim(), "answered")}>Vastaa ja jatka</button>
        <button className="btn-secondary" disabled={disabled} onClick={() => void onAnswer("", "skipped")}>Ohita kysymys</button>
        <button className="btn-secondary" disabled={disabled} onClick={() => void onAnswer("", "confidential")}>En voi julkaista tätä tietoa</button>
      </div>
      <button className="text-sm text-gray-600 underline mt-5" disabled={disabled} onClick={onFinish}>Siirry yhteenvetoon nykyisillä tiedoilla</button>
    </section>
  );
}
