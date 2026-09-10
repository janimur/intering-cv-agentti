import { test, expect } from '@playwright/test';
import { sampleWorkflow, sampleCv, samplePositioning } from '../src/test/fixtures';
import type { WorkflowState } from '../src/types/api';

test('kartoitus, oma ääni, hyväksyntä ja pelkkä CV sekä vanhentuneen tekstin merkintä', async ({ page }, testInfo) => {
  let state: WorkflowState = { ...sampleWorkflow, status: 'uploaded', revision: 0, approved_revision: null, positioning: null };
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().method() === 'GET' || path === '/api/upload' ? {} : route.request().postDataJSON();
    let data: unknown;
    if (path === '/api/gdpr') data = { content: 'Tietosuojaseloste' };
    else if (path === '/api/upload') data = { session_id: 'sid', cv_text_preview: 'CV', linkedin_available: false };
    else if (path === '/api/positioning' && route.request().method() === 'GET') data = state;
    else if (path === '/api/positioning' && route.request().method() === 'POST') {
      expect(body.revision).toBe(0);
      state = { ...state, revision: 1, status: 'clarifying', positioning: samplePositioning, current_question: { id: 'q1', topic: 'voice', text: 'Miten aloitat toimeksiannon?' } }; data = state;
    } else if (path === '/api/positioning/answers') {
      expect(body.text).toBe('Kuuntelen tiimiä ennen päätöksiä.');
      state = { ...state, revision: 2, status: 'review', current_question: null, profile: { ...state.profile, voice_examples: [body.text] } }; data = state;
    } else if (path === '/api/positioning/approve') {
      expect(body.revision).toBe(state.revision);
      state = { ...state, revision: state.revision + 1, approved_revision: state.revision + 1, status: 'approved' }; data = state;
    } else if (path === '/api/positioning' && route.request().method() === 'PATCH') {
      state = { ...state, revision: state.revision + 1, approved_revision: null, status: 'review', profile: body.profile, positioning: body.positioning }; data = state;
    } else if (path === '/api/writers/cv') {
      expect(state.status).toBe('approved'); expect(body.revision).toBe(state.revision);
      data = { ...sampleCv, source_revision: state.revision };
    } else if (path === '/api/cv/pdf') {
      return route.fulfill({ contentType: 'application/pdf', body: Buffer.from('%PDF-1.4 mock') });
    } else throw new Error(`Unexpected API call: ${path}`);
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Hyväksyn', exact: true }).click();
  await page.getByRole('button', { name: 'Aloita', exact: true }).first().click();
  await page.locator('input[type=file]').first().setInputFiles({ name: 'cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 mock') });
  await page.getByRole('button', { name: 'Lataa ja jatka' }).click();
  await page.getByRole('button', { name: 'Aja kartoittaja' }).click();
  await page.getByLabel('Miten aloitat toimeksiannon?').fill('Kuuntelen tiimiä ennen päätöksiä.');
  await page.screenshot({ path: testInfo.outputPath('clarification.png'), fullPage: true });
  await page.getByRole('button', { name: 'Vastaa ja jatka' }).click();
  await expect(page.getByLabel(/Oma ääneni/)).toHaveValue('Kuuntelen tiimiä ennen päätöksiä.');
  await page.screenshot({ path: testInfo.outputPath('review.png'), fullPage: true });
  await expect(page.getByRole('button', { name: 'Jatka kirjoittajiin' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Hyväksy positiointi' }).click();
  await page.getByRole('button', { name: 'Jatka kirjoittajiin' }).click();
  const card = page.locator('.card').filter({ has: page.getByRole('heading', { name: 'CV', exact: true }) });
  await card.getByRole('button', { name: 'Aja', exact: true }).click();
  await expect(card.getByText('Testi Henkilö — Interim CEO')).toBeVisible();
  await page.getByRole('button', { name: 'Jatka katsomaan tulokset' }).click();
  await expect(page.getByRole('heading', { name: 'Tulokset', exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Lataa PDF' }).click();
  expect((await download).suggestedFilename()).toBe('cv.pdf');
  await page.getByRole('button', { name: 'Takaisin kirjoittajiin' }).click();
  await page.getByRole('button', { name: 'Takaisin', exact: true }).click();
  await page.getByLabel('Toivomani toimeksiannot').fill('Teollisuuden muutosjohtaminen');
  await page.getByRole('button', { name: 'Hyväksy positiointi' }).click();
  await page.getByRole('button', { name: 'Jatka kirjoittajiin' }).click();
  await expect(page.getByText(/Tämä teksti perustuu aiempiin tietoihin/)).toBeVisible();
  await expect(card.getByRole('button', { name: 'Lataa PDF' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Aloita', exact: true }).first()).toBeVisible();
});
