import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { type ReactNode } from 'react';
import { SessionProvider, useSession } from '../store/SessionContext';
import { samplePositioning } from './fixtures';

function wrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}


describe('SessionProvider', () => {
  it('renderöi childrenit', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current).toBeDefined();
  });

  it('alkutila: kaikki nullia tai falsea', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current.sessionId).toBeNull();
    expect(result.current.positioning).toBeNull();
    expect(result.current.linkedinOutput).toBeNull();
    expect(result.current.cvOutput).toBeNull();
    expect(result.current.interingOutput).toBeNull();
    expect(result.current.gdprAccepted).toBe(false);
    expect(result.current.cvTextPreview).toBe('');
    expect(result.current.linkedinAvailable).toBe(false);
    expect(result.current.isLoading.linkedin).toBe(false);
    expect(result.current.isLoading.cv).toBe(false);
    expect(result.current.isLoading.intering).toBe(false);
    expect(result.current.isLoading.positioning).toBe(false);
    expect(result.current.isLoading.pdf).toBe(false);
    expect(result.current.isLoading.upload).toBe(false);
  });

  it('setSessionId päivittää sessionId:n', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => {
      result.current.setSessionId('abc123');
    });
    expect(result.current.sessionId).toBe('abc123');
  });

  it('setPositioning päivittää positioning-tilan', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => {
      result.current.setPositioning(samplePositioning);
    });
    expect(result.current.positioning).toEqual(samplePositioning);
  });

  it('setLoading("linkedin", true) päivittää isLoading-objektia', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => {
      result.current.setLoading('linkedin', true);
    });
    expect(result.current.isLoading.linkedin).toBe(true);
    expect(result.current.isLoading.cv).toBe(false);
  });

  it('acceptGdpr asettaa gdprAccepted=true ja tallentaa localStorageen', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => {
      result.current.acceptGdpr();
    });
    expect(result.current.gdprAccepted).toBe(true);
    expect(localStorage.getItem('intering_gdpr_accepted')).toBe('1');
  });

  it('gdprAccepted ladataan localStoragesta jos asetettu', () => {
    localStorage.setItem('intering_gdpr_accepted', '1');
    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current.gdprAccepted).toBe(true);
  });

  it('resetSession nollaa kaiken paitsi gdprAccepted', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => {
      result.current.setSessionId('session-1');
      result.current.setPositioning(samplePositioning);
      result.current.acceptGdpr();
    });
    expect(result.current.sessionId).toBe('session-1');
    expect(result.current.gdprAccepted).toBe(true);

    act(() => {
      result.current.resetSession();
    });
    expect(result.current.sessionId).toBeNull();
    expect(result.current.positioning).toBeNull();
    expect(result.current.gdprAccepted).toBe(true);
  });
});

describe('useSession ilman Provideria', () => {
  it('heittää virheen', () => {
    expect(() => {
      renderHook(() => useSession());
    }).toThrow('useSession must be used within SessionProvider');
  });
});
