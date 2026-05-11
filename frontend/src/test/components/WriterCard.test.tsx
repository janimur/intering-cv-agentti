import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useEffect } from 'react';
import { WriterCard } from '../../components/WriterCard';
import { SessionProvider, useSession } from '../../store/SessionContext';
import { sampleLinkedIn, sampleCv, sampleIntering } from '../fixtures';

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

// Luodaan wrapper-komponentit kerran moduulitasolla muistivuodon välttämiseksi
function SessionSetter({ children }: { children: ReactNode }) {
  const { setSessionId } = useSession();
  useEffect(() => {
    setSessionId('test-session');
  // setSessionId on stabiili referenssi, ei aiheuta uudelleenajoa
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{children}</>;
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionSetter>{children}</SessionSetter>
    </SessionProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WriterCard — aja-painike', () => {
  it('"Aja"-painike näkyy kun outputia ei ole', async () => {
    render(
      <Wrapper>
        <WriterCard type="linkedin" output={null} onOutputChange={vi.fn()} />
      </Wrapper>
    );
    await waitFor(() => {
      expect(screen.getByText('Aja')).toBeInTheDocument();
    });
  });

  it('"Aja"-painike kutsuu api.runWriter oikein', async () => {
    const user = userEvent.setup();
    vi.mocked(api.runWriter).mockResolvedValue(sampleLinkedIn);
    const onOutputChange = vi.fn();

    render(
      <Wrapper>
        <WriterCard type="linkedin" output={null} onOutputChange={onOutputChange} />
      </Wrapper>
    );

    await waitFor(() => screen.getByText('Aja'));
    await user.click(screen.getByText('Aja'));

    await waitFor(() => {
      expect(api.runWriter).toHaveBeenCalledWith('test-session', 'linkedin');
    });
  });

  it('"Aja uudelleen" näkyy kun output on olemassa', async () => {
    render(
      <Wrapper>
        <WriterCard type="linkedin" output={sampleLinkedIn} onOutputChange={vi.fn()} />
      </Wrapper>
    );
    await waitFor(() => {
      expect(screen.getByText('Aja uudelleen')).toBeInTheDocument();
    });
  });
});

describe('WriterCard — Iteroi-painike', () => {
  it('iteroi-painike avaa modaalin', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <WriterCard type="linkedin" output={sampleLinkedIn} onOutputChange={vi.fn()} />
      </Wrapper>
    );

    await waitFor(() => screen.getByText('Iteroi'));
    await user.click(screen.getByText('Iteroi'));

    expect(screen.getByText('Iteroi tulosta')).toBeInTheDocument();
  });
});

describe('WriterCard — LinkedIn-output', () => {
  it('näyttää headlinen', () => {
    render(
      <Wrapper>
        <WriterCard type="linkedin" output={sampleLinkedIn} onOutputChange={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText(sampleLinkedIn.headline)).toBeInTheDocument();
  });

  it('näyttää about-tekstin', () => {
    render(
      <Wrapper>
        <WriterCard type="linkedin" output={sampleLinkedIn} onOutputChange={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText(sampleLinkedIn.about)).toBeInTheDocument();
  });

  it('näyttää experience-saavutukset', () => {
    render(
      <Wrapper>
        <WriterCard type="linkedin" output={sampleLinkedIn} onOutputChange={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText('10x kasvu')).toBeInTheDocument();
    expect(screen.getByText('P&L €25M')).toBeInTheDocument();
  });
});

describe('WriterCard — CV-output', () => {
  it('näyttää nimen ja titlen', () => {
    render(
      <Wrapper>
        <WriterCard type="cv" output={sampleCv} onOutputChange={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText(/Testi Henkilö/)).toBeInTheDocument();
    // "Interim CEO" esiintyy otsikkokentässä ja experience-osiossa, käytetään getAllByText
    expect(screen.getAllByText(/Interim CEO/).length).toBeGreaterThan(0);
  });

  it('näyttää key_results', () => {
    render(
      <Wrapper>
        <WriterCard type="cv" output={sampleCv} onOutputChange={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText('€2M → €20M')).toBeInTheDocument();
    expect(screen.getByText('10x')).toBeInTheDocument();
  });

  it('näyttää experience-osion', () => {
    render(
      <Wrapper>
        <WriterCard type="cv" output={sampleCv} onOutputChange={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText(/Yritys X/)).toBeInTheDocument();
  });

  it('"Lataa PDF"-painike näkyy CV-tyypille kun output on', () => {
    render(
      <Wrapper>
        <WriterCard type="cv" output={sampleCv} onOutputChange={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText('Lataa PDF')).toBeInTheDocument();
  });

  it('"Lataa PDF" kutsuu api.downloadCvPdf', async () => {
    const user = userEvent.setup();
    vi.mocked(api.downloadCvPdf).mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));

    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:url');
    global.URL.revokeObjectURL = vi.fn();

    render(
      <Wrapper>
        <WriterCard type="cv" output={sampleCv} onOutputChange={vi.fn()} />
      </Wrapper>
    );

    await user.click(screen.getByText('Lataa PDF'));

    await waitFor(() => {
      expect(api.downloadCvPdf).toHaveBeenCalledWith('test-session');
    });
  });
});

describe('WriterCard — Intering-output', () => {
  it('näyttää hookin', () => {
    render(
      <Wrapper>
        <WriterCard type="intering" output={sampleIntering} onOutputChange={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText(sampleIntering.hook)).toBeInTheDocument();
  });

  it('näyttää tuotekortit', () => {
    render(
      <Wrapper>
        <WriterCard type="intering" output={sampleIntering} onOutputChange={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText('Kortti 1.')).toBeInTheDocument();
    expect(screen.getByText('Kortti 2.')).toBeInTheDocument();
  });

  it('näyttää profile_sections-avaimet', () => {
    render(
      <Wrapper>
        <WriterCard type="intering" output={sampleIntering} onOutputChange={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText('Kuka minä olen?')).toBeInTheDocument();
    expect(screen.getByText('Miksi juuri minä olen timanttinen interim?')).toBeInTheDocument();
  });
});
