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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Tietosuoja ja tietojen käsittely
          </h2>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {loading ? (
            <p className="text-gray-600">Ladataan...</p>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
              {content}
            </pre>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={acceptGdpr}
            className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            Hyväksyn
          </button>
        </div>
      </div>
    </div>
  );
}
