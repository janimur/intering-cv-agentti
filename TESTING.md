# Manuaalitestaus — intering CV-agentti

Tämän testin ajaa Jani (tai vastaava tarkastaja) ennen luovutusta interingille
tai uuden iteraation jälkeen. Käy läpi koko putki omilla materiaaleilla.

## Esivalmistelut

1. `.env`-tiedosto repon juuressa, jossa:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ADMIN_TOKEN=<satunnainen-merkkijono>
   ```

2. CV-PDF saatavilla (esim. `tmp/Interim Manager CV - Jani Muuronen 1_2026.pdf`)

3. LinkedIn-profiili saatavilla joko tekstinä tai PDF:nä

## Vaihe 1: Käynnistys

```bash
docker compose up --build -d
docker compose logs -f backend  # eri terminaalissa, seuraa lokeja
```

Avaa selain: http://localhost/

**Tarkista**:
- [ ] GDPR-banneri näkyy heti
- [ ] Header näyttää "intering · CV-agentti" logon

## Vaihe 2: Smoke test

```bash
bash scripts/smoke_test.sh
```

**Tarkista**:
- [ ] Kaikki tarkistukset OK
- [ ] Exit-koodi 0

## Vaihe 3: Hyväksy GDPR ja avaa LandingPage

**Tarkista**:
- [ ] Hyväksy → modaali sulkeutuu
- [ ] Hero näkyy: iso otsikko vasemmalla, 4 värillistä korttia oikealla
- [ ] "Kolme vaihetta valmiiseen profiiliin" -osio näkyy
- [ ] Footer alhaalla

## Vaihe 4: Lataa materiaali

Klikkaa "Aloita" → UploadPage.

**Tarkista**:
- [ ] Wizard-stepperi näkyy headerissa, "Lataa" korostettuna
- [ ] Drag-and-drop CV-PDF onnistuu
- [ ] LinkedIn-PDF ja teksti molemmat valittavissa
- [ ] "Lataa ja jatka" toimii

## Vaihe 5: Positiointikartoitus

**Tarkista**:
- [ ] "Aja kartoittaja" käynnistää spinnerin
- [ ] Spinneri kestää 30–90 sek
- [ ] Positiointidokumentti näkyy editoitavissa kentissä
- [ ] Persoona (kartoittajan tuottama positioning_summary) tuntuu järkevältä
- [ ] Muokkaa sävyä → "Tallenna muutokset" → "Muutokset tallennettu" -viesti
- [ ] "Jatka kirjoittajiin" toimii

## Vaihe 6: Kirjoittajat

**Tarkista per kirjoittaja**:
- [ ] LinkedIn: "Aja" → tulos näkyy. Headline lyhyt, About 1500–2000 merkkiä.
- [ ] CV: "Aja" → tulos näkyy. "Lataa PDF" lataa toimivan PDF:n.
- [ ] Intering: "Aja" → tulos näkyy. Hook 4-osaisessa pipe-formaatissa.
- [ ] Iteroi LinkedIn lisäohjeella "lyhennä About 200 merkkiä" → uusi versio

## Vaihe 7: Tulokset

**Tarkista**:
- [ ] LinkedIn-tekstit näkyvät kokonaan
- [ ] CV-rakenne näkyy + "Lataa PDF" -painike toimii
- [ ] Intering-osiot näkyvät 5 vaaditulla avaimella
- [ ] "Aloita alusta" tyhjentää session ja palaa LandingPagelle

## Vaihe 8: Admin (jos ADMIN_TOKEN asetettu)

Avaa: `http://localhost/?admin=<token>`

**Tarkista**:
- [ ] 4 promptia näkyy textareassa
- [ ] Muokkaa kartoittaja-promptia, "Tallenna" → ● Muokattu -merkki
- [ ] Aja kartoittaja uudestaan eri profiililla → muutos näkyy outputissa
- [ ] "Palauta oletukseen" → ○ Oletus -merkki, alkuperäinen sisältö palautuu
- [ ] "Poistu admin-tilasta" → palaa normaalinäkymään

## Vaihe 9: Sammutus

```bash
docker compose down
```

**Tarkista**:
- [ ] Kaikki kontit sammuvat siististi

## Havainnot

Kirjaa tähän mahdolliset ongelmat, bugit tai parannusehdotukset:

| Vaihe | Havainto | Vakavuus |
|---|---|---|
| | | |
