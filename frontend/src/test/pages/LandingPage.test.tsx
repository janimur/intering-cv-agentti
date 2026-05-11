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
  it('renderöi otsikon', () => {
    render(<LandingPage onStart={vi.fn()} />, { wrapper: noGdprWrapper });
    expect(screen.getByText('Intering CV-agentti')).toBeInTheDocument();
  });

  it('renderöi "Aloita"-painikkeen', () => {
    render(<LandingPage onStart={vi.fn()} />, { wrapper: noGdprWrapper });
    expect(screen.getByText('Aloita')).toBeInTheDocument();
  });

  it('"Aloita"-painike on disabloitu kun gdprAccepted=false', () => {
    render(<LandingPage onStart={vi.fn()} />, { wrapper: noGdprWrapper });
    expect(screen.getByText('Aloita')).toBeDisabled();
  });

  it('"Aloita"-painike on enabloitu kun gdprAccepted=true', async () => {
    render(<LandingPage onStart={vi.fn()} />, { wrapper: gdprWrapper });
    await screen.findByRole('button', { name: 'Aloita' });
    expect(screen.getByText('Aloita')).not.toBeDisabled();
  });

  it('klikkaus kutsuu onStart-propin', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<LandingPage onStart={onStart} />, { wrapper: gdprWrapper });

    await screen.findByRole('button', { name: 'Aloita' });
    await user.click(screen.getByText('Aloita'));
    expect(onStart).toHaveBeenCalledOnce();
  });
});
