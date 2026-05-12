import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { LandingPage } from '../../pages/LandingPage';
import { SessionProvider, useSession } from '../../store/SessionContext';
import { useEffect } from 'react';

function noGdprWrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

function GdprSetter({ children }: { children: ReactNode }) {
  const { acceptGdpr } = useSession();
  useEffect(() => {
    acceptGdpr();
  }, [acceptGdpr]);
  return <>{children}</>;
}

function gdprWrapper({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <GdprSetter>{children}</GdprSetter>
    </SessionProvider>
  );
}

describe('LandingPage', () => {
  it('renderöi pää-otsikon', () => {
    render(<LandingPage onStart={vi.fn()} />, { wrapper: noGdprWrapper });
    // Hero-otsikko renderöityy h1-elementtinä
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain('Myyvempi CV');
    expect(heading.textContent).toContain('interim-toimeksiantoihin');
  });

  it('renderöi useita "Aloita"-painikkeita (hero + CTA-palkki)', () => {
    render(<LandingPage onStart={vi.fn()} />, { wrapper: noGdprWrapper });
    const buttons = screen.getAllByRole('button', { name: 'Aloita' });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('"Aloita"-painikkeet ovat disabloituja kun gdprAccepted=false', () => {
    render(<LandingPage onStart={vi.fn()} />, { wrapper: noGdprWrapper });
    const buttons = screen.getAllByRole('button', { name: 'Aloita' });
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('"Aloita"-painikkeet ovat enabloituja kun gdprAccepted=true', async () => {
    render(<LandingPage onStart={vi.fn()} />, { wrapper: gdprWrapper });
    // GdprSetter triggeröi acceptGdpr useEffectissa — odotetaan että painikkeet on enabloitu
    await screen.findAllByRole('button', { name: 'Aloita' });
    const buttons = screen.getAllByRole('button', { name: 'Aloita' });
    buttons.forEach((btn) => expect(btn).not.toBeDisabled());
  });

  it('klikkaus kutsuu onStart-propin', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<LandingPage onStart={onStart} />, { wrapper: gdprWrapper });

    await screen.findAllByRole('button', { name: 'Aloita' });
    const buttons = screen.getAllByRole('button', { name: 'Aloita' });
    await user.click(buttons[0]);
    expect(onStart).toHaveBeenCalledOnce();
  });
});
