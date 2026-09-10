import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useEffect } from 'react';
import { OutputPage } from '../../pages/OutputPage';
import { SessionProvider, useSession } from '../../store/SessionContext';
import { sampleLinkedIn, sampleCv, sampleIntering, sampleWorkflow } from '../fixtures';
import type { LinkedInOutput, CVDocument, InteringOutput } from '../../types/api';

vi.mock('../../api/client', () => ({
  api: {
    fetchGdpr: vi.fn().mockResolvedValue({ content: 'GDPR' }),
    runPositioning: vi.fn(),
    uploadFiles: vi.fn(),
    runWriter: vi.fn(),
    iterateWriter: vi.fn(),
    downloadCvPdf: vi.fn(),
    updatePositioning: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    detail: string;
    constructor(status: number, detail: string) {
      super(detail);
      this.status = status;
      this.detail = detail;
    }
  },
}));

import { api } from '../../api/client';

interface SessionState {
  sessionId?: string;
  linkedinOutput?: LinkedInOutput | null;
  cvOutput?: CVDocument | null;
  interingOutput?: InteringOutput | null;
}

function makeWrapper(state: SessionState = {}) {
  function StateSetter({ children }: { children: ReactNode }) {
    const ctx = useSession();
    useEffect(() => {
      if (state.sessionId !== undefined) ctx.setSessionId(state.sessionId);
      ctx.setWorkflow(sampleWorkflow);
      if (state.linkedinOutput !== undefined) ctx.setLinkedinOutput(state.linkedinOutput);
      if (state.cvOutput !== undefined) ctx.setCvOutput(state.cvOutput);
      if (state.interingOutput !== undefined) ctx.setInteringOutput(state.interingOutput);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return <>{children}</>;
  }

  return function WrapperWithState({ children }: { children: ReactNode }) {
    return (
      <SessionProvider>
        <StateSetter>{children}</StateSetter>
      </SessionProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OutputPage', () => {
  it('ilman outputeja näyttää "Ei tuloksia"-viestin', async () => {
    render(<OutputPage onRestart={vi.fn()} />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Ei tuloksia/i)).toBeInTheDocument();
    });
  });

  it('LinkedIn-output renderöi section', async () => {
    render(
      <OutputPage onRestart={vi.fn()} />,
      { wrapper: makeWrapper({ linkedinOutput: sampleLinkedIn }) }
    );
    await waitFor(() => {
      expect(screen.getByText('LinkedIn')).toBeInTheDocument();
      expect(screen.getByText(sampleLinkedIn.headline)).toBeInTheDocument();
    });
  });

  it('CV-output renderöi section', async () => {
    render(
      <OutputPage onRestart={vi.fn()} />,
      { wrapper: makeWrapper({ sessionId: 'sid', cvOutput: sampleCv }) }
    );
    await waitFor(() => {
      expect(screen.getByText('CV')).toBeInTheDocument();
      expect(screen.getByText('Testi Henkilö')).toBeInTheDocument();
    });
  });

  it('CV-output näyttää "Lataa PDF"-painikkeen', async () => {
    render(
      <OutputPage onRestart={vi.fn()} />,
      { wrapper: makeWrapper({ sessionId: 'sid', cvOutput: sampleCv }) }
    );
    await waitFor(() => {
      expect(screen.getByText('Lataa PDF')).toBeInTheDocument();
    });
  });

  it('Intering-output renderöi section', async () => {
    render(
      <OutputPage onRestart={vi.fn()} />,
      { wrapper: makeWrapper({ interingOutput: sampleIntering }) }
    );
    await waitFor(() => {
      expect(screen.getByText('Intering')).toBeInTheDocument();
      expect(screen.getByText(sampleIntering.hook)).toBeInTheDocument();
    });
  });

  it('Intering-output näyttää profile_sections-avaimet', async () => {
    render(
      <OutputPage onRestart={vi.fn()} />,
      { wrapper: makeWrapper({ interingOutput: sampleIntering }) }
    );
    await waitFor(() => {
      expect(screen.getByText('Kuka minä olen?')).toBeInTheDocument();
    });
  });

  it('"Aloita alusta" kutsuu resetSession ja onRestart', async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();

    render(<OutputPage onRestart={onRestart} />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getAllByText('Aloita alusta'));

    await user.click(screen.getAllByText('Aloita alusta')[0]);
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it('"Lataa PDF" kutsuu api.downloadCvPdf', async () => {
    const user = userEvent.setup();
    vi.mocked(api.downloadCvPdf).mockResolvedValue(
      new Blob(['%PDF'], { type: 'application/pdf' })
    );
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:url');
    global.URL.revokeObjectURL = vi.fn();

    render(
      <OutputPage onRestart={vi.fn()} />,
      { wrapper: makeWrapper({ sessionId: 'sid', cvOutput: sampleCv }) }
    );

    await waitFor(() => screen.getByText('Lataa PDF'));
    await user.click(screen.getByText('Lataa PDF'));

    await waitFor(() => {
      expect(api.downloadCvPdf).toHaveBeenCalledWith('sid');
    });
  });
});
