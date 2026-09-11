import { LoadingIndicator } from "./LoadingIndicator";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useSession } from "../store/SessionContext";

export function GdprBanner() {
  const { acceptGdpr } = useSession();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .fetchGdpr()
      .then((data) => setContent(data.content))
      .catch(() => setContent("Tietosuojaselosteen lataus epäonnistui."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full mx-4 flex flex-col max-h-[80vh]">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2>Tietosuoja ja tietojen käsittely</h2>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {loading ? (
            <LoadingIndicator label="Ladataan tietosuojaselostetta…" />
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
              {content}
            </pre>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={acceptGdpr} className="btn-primary">
            Hyväksyn
          </button>
        </div>
      </div>
    </div>
  );
}
