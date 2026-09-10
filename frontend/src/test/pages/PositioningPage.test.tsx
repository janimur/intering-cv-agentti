import { useEffect, type ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PositioningPage } from "../../pages/PositioningPage";
import { SessionProvider, useSession } from "../../store/SessionContext";
import { sampleWorkflow, samplePositioning } from "../fixtures";
import type { WorkflowState } from "../../types/api";

vi.mock("../../api/client", () => ({
  api: { getPositioning: vi.fn(), runPositioning: vi.fn(), answerPositioning: vi.fn(), finishPositioning: vi.fn(), updatePositioning: vi.fn(), approvePositioning: vi.fn() },
  ApiError: class extends Error { constructor(public status: number, public detail: string) { super(detail); } },
}));
import { api, ApiError } from "../../api/client";

function Session({ children }: { children: ReactNode }) {
  const { setSessionId } = useSession();
  useEffect(() => { setSessionId("sid"); }, [setSessionId]);
  return <>{children}</>;
}
function wrapper({ children }: { children: ReactNode }) { return <SessionProvider><Session>{children}</Session></SessionProvider>; }
const question = { id: "q1", topic: "voice", text: "Miten aloitat uuden toimeksiannon?" };
const clarifying: WorkflowState = { ...sampleWorkflow, status: "clarifying", revision: 1, approved_revision: null, current_question: question };
const review: WorkflowState = { ...sampleWorkflow, status: "review", revision: 2, approved_revision: null };
beforeEach(() => { vi.resetAllMocks(); });

describe("täydentävä kartoitus", () => {
  it("analysoi ensin ja lähettää omin sanoin annetun vastauksen aktiiviseen kysymykseen", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getPositioning).mockResolvedValue({ ...sampleWorkflow, status: "uploaded", positioning: null, revision: 0, approved_revision: null });
    vi.mocked(api.runPositioning).mockResolvedValue(clarifying);
    vi.mocked(api.answerPositioning).mockResolvedValue({ ...review, profile: { ...review.profile, voice_examples: ["Kuuntelen ensin tiimiä."] } });
    render(<PositioningPage onBack={vi.fn()} onContinue={vi.fn()} />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Aja kartoittaja" }));
    expect(api.runPositioning).toHaveBeenCalledWith("sid", 0);
    await user.type(await screen.findByLabelText(question.text), "Kuuntelen ensin tiimiä.");
    await user.click(screen.getByRole("button", { name: "Vastaa ja jatka" }));
    expect(api.answerPositioning).toHaveBeenCalledWith("sid", 1, "q1", "Kuuntelen ensin tiimiä.", "answered");
    expect(await screen.findByLabelText(/Oma ääneni/)).toHaveValue("Kuuntelen ensin tiimiä.");
    expect(screen.queryByRole("button", { name: "Jatka kirjoittajiin" })).not.toBeInTheDocument();
  });
  it("ei lähetä kirjoitettua salassa pidettävää tekstiä", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getPositioning).mockResolvedValue(clarifying);
    vi.mocked(api.answerPositioning).mockResolvedValue(review);
    render(<PositioningPage onBack={vi.fn()} onContinue={vi.fn()} />, { wrapper });
    await user.type(await screen.findByLabelText(question.text), "Salainen asiakkuus");
    await user.click(screen.getByRole("button", { name: "En voi julkaista tätä tietoa" }));
    expect(api.answerPositioning).toHaveBeenCalledWith("sid", 1, "q1", "", "confidential");
  });
  it("voi lopettaa kyselyn ja hyväksyä niukan näytön yhteenvedon", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getPositioning).mockResolvedValue(clarifying);
    const sparse = { ...review, positioning: { ...samplePositioning, evidence: { ...samplePositioning.evidence, flagship_story: null } } };
    vi.mocked(api.finishPositioning).mockResolvedValue(sparse);
    vi.mocked(api.approvePositioning).mockResolvedValue({ ...sparse, status: "approved", revision: 3, approved_revision: 3 });
    const onContinue = vi.fn();
    render(<PositioningPage onBack={vi.fn()} onContinue={onContinue} />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Siirry yhteenvetoon nykyisillä tiedoilla" }));
    expect(api.finishPositioning).toHaveBeenCalledWith("sid", 1);
    expect(await screen.findByText(/Päätarinaa ei ole vielä vahvistettu/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hyväksy positiointi" }));
    expect(api.approvePositioning).toHaveBeenCalledWith("sid", 2);
    await user.click(await screen.findByRole("button", { name: "Jatka kirjoittajiin" }));
    expect(onContinue).toHaveBeenCalledOnce();
  });
  it("päivittää käsin korjatut tiedot ennen hyväksyntää eikä hyväksy vanhaa versiota", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getPositioning).mockResolvedValue(review);
    const updated = { ...review, revision: 3, profile: { ...review.profile, corrections: ["Toimin COO:na."] } };
    vi.mocked(api.updatePositioning).mockResolvedValue(updated);
    vi.mocked(api.approvePositioning).mockResolvedValue({ ...updated, status: "approved", revision: 4, approved_revision: 4 });
    render(<PositioningPage onBack={vi.fn()} onContinue={vi.fn()} />, { wrapper });
    await user.type(await screen.findByLabelText("Korjaukset lähdemateriaaliin"), "Toimin COO:na.");
    await user.click(screen.getByRole("button", { name: "Hyväksy positiointi" }));
    await waitFor(() => expect(api.approvePositioning).toHaveBeenCalledWith("sid", 3));
    expect(api.updatePositioning).toHaveBeenCalledWith("sid", 2, samplePositioning, updated.profile);
  });
  it("virheessä säilyttää vastauksen uutta yritystä varten", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getPositioning).mockResolvedValue(clarifying);
    vi.mocked(api.answerPositioning).mockRejectedValue(new ApiError(502, "Mallikutsu epäonnistui"));
    render(<PositioningPage onBack={vi.fn()} onContinue={vi.fn()} />, { wrapper });
    await user.type(await screen.findByLabelText(question.text), "Kuuntelen.");
    await user.click(screen.getByRole("button", { name: "Vastaa ja jatka" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Mallikutsu epäonnistui");
    expect(screen.getByLabelText(question.text)).toHaveValue("Kuuntelen.");
  });
});
