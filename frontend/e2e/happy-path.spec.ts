import { test, expect } from '@playwright/test';

// Yksi happy path: GDPR → upload → positioning → writers → output → PDF
test('käyttäjä käy koko wizardin läpi onnistuneesti', async ({ page }) => {
  const sessionId = 'e2e-test-session';

  // Nollaa GDPR-hyväksyntä ennen sivun latausta jotta banneri näkyy
  await page.addInitScript(() => {
    localStorage.removeItem('intering_gdpr_accepted');
  });

  // Mockaa kaikki /api/-pyynnöt
  await page.route('**/api/gdpr', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: '# Tietosuojaseloste\n\nMock-sisältö.' }),
    })
  );

  await page.route('**/api/upload', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: sessionId,
        cv_text_preview: 'CV-teksti...',
        linkedin_available: true,
      }),
    })
  );

  await page.route('**/api/positioning', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        positioning: {
          primary_angle: 'Testaaja',
          target_buyers: ['CEO'],
          target_situations: ['Skaalaus'],
          differentiators: ['Operaattori'],
        },
        evidence: {
          flagship_story: {
            context: 'Yritys X',
            action: 'Skaalasin',
            result_quantified: '€2M → €20M',
          },
          supporting_results: [],
          expertise_areas: ['GTM'],
        },
        key_messages: {
          one_liner: 'Skaalaaja',
          elevator_pitch: 'Olen operaattori.',
          proof_points: ['€2M → €20M', '10x', '200 konsulttia'],
        },
        preferences: { tone: 'Suora', exclusions: [] },
      }),
    })
  );

  await page.route('**/api/writers/linkedin', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        headline: 'Interim CEO | Skaalaaja',
        about: 'Mock About -teksti'.repeat(50),
        experience: [
          {
            role: 'Interim CEO',
            company: 'Yritys X',
            context: 'Skaalaus',
            achievements: ['10x kasvu', 'P&L €25M', '200 konsulttia'],
          },
        ],
      }),
    })
  );

  await page.route('**/api/writers/cv', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        header: {
          name: 'Testi Henkilö',
          title: 'Interim CEO',
          contact: { email: 't@e.com', phone: null, location: null, linkedin: null },
        },
        positioning_summary: 'Operaattori, ei konsultti.',
        key_results: ['€2M → €20M', '10x', '200 konsulttia'],
        expertise: ['GTM'],
        experience: [
          {
            role: 'CEO',
            company: 'X',
            period: '1/2020 – 1/2024',
            context: 'Skaalaus.',
            results: ['10x kasvu', 'P&L €25M'],
          },
        ],
        education: [],
        certifications: [],
      }),
    })
  );

  await page.route('**/api/writers/intering', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        hook: 'Skaalaaja | IT | €5–€30M | Operaattori',
        product_cards: ['Kortti 1.', 'Kortti 2.'],
        profile_sections: {
          'Kuka minä olen?': 'Olen operaattori.',
          'Miksi juuri minä olen timanttinen interim?': 'Tehnyt itse.',
          'Tehtävät joihin sovin parhaiten': 'Skaalaus, GTM.',
          'Aikaisempi kokemus': 'B2B-palveluyritykset.',
          'Aikaisempi Interim-kokemus': '10 vuotta.',
        },
      }),
    })
  );

  await page.route('**/api/cv/pdf', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      body: Buffer.from('%PDF-1.4 mock pdf bytes'),
    })
  );

  // Vaihe 1: avaa sivu, hyväksy GDPR
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: /tietosuoja/i })).toBeVisible();
  await page.getByRole('button', { name: 'Hyväksyn' }).click();

  // Vaihe 2: LandingPage → Aloita
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Myyvempi CV');
  // Käytä ensimmäistä "Aloita"-painiketta (hero-section)
  const aloitaButtons = page.getByRole('button', { name: 'Aloita' });
  await aloitaButtons.first().click();

  // Vaihe 3: UploadPage — lataa fake-tiedosto
  await expect(page.getByRole('heading', { level: 1, name: /lataa cv/i })).toBeVisible();
  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.first().setInputFiles({
    name: 'cv.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 mock cv'),
  });
  await page.getByRole('button', { name: /lataa ja jatka/i }).click();

  // Vaihe 4: PositioningPage — aja kartoittaja
  await expect(page.getByRole('heading', { level: 1, name: /positiointikartoitus/i })).toBeVisible();
  // Klikkaa "Aja kartoittaja" -painiketta (voi olla useita — otetaan ensimmäinen enabled)
  await page.getByRole('button', { name: /aja kartoittaja/i }).first().click();

  // Odota että positiointidokumentti renderöityy (PositioningEditor latautuu)
  await expect(page.getByText(/positiointikulma/i)).toBeVisible({ timeout: 10000 });

  // Jatka kirjoittajiin
  await page.getByRole('button', { name: /jatka kirjoittajiin/i }).click();

  // Vaihe 5: WritersPage — aja LinkedIn-kirjoittaja
  await expect(page.getByRole('heading', { level: 1, name: /kirjoittajat/i })).toBeVisible();
  // LinkedIn-kortti: etsi h3:sta "LinkedIn" ja klikkaa sen containerin "Aja"-painiketta
  const linkedInCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: 'LinkedIn' }) }).first();
  await linkedInCard.getByRole('button', { name: 'Aja' }).click();

  // Odota että LinkedIn-headline näkyy
  await expect(page.getByText('Interim CEO | Skaalaaja')).toBeVisible({ timeout: 10000 });

  // Jatka katsomaan tulokset
  await page.getByRole('button', { name: /jatka katselmaan tulokset/i }).click();

  // Vaihe 6: OutputPage — tulokset näkyvät
  await expect(page.getByRole('heading', { level: 1, name: /tulokset/i })).toBeVisible();
  await expect(page.getByText('Interim CEO | Skaalaaja').first()).toBeVisible();
});
