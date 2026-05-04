# Intering CV-agentti — handover Claude Codelle

## Projektin lyhyt kuvaus

Rakennetaan AI-agentti joka auttaa intering-yhteisön (suomalainen interim-johtajien yhteisö) jäseniä kirjoittamaan myyvempi LinkedIn-profiili, CV ja intering.fi-profiili. Agentti positioi jäsenen interim-markkinaan sopivasti — interim-CV eroaa olennaisesti tavallisesta CV:stä koska ostaja etsii ratkaisijaa tilanteeseen, ei pitkän linjan työntekijää.

Omistaja: Intering-yhteisö (yritys sen takana). Toimittaja: Jani Muuronen (Muuronen Advisory). Tämä on **toimitusprojekti**, ei jatkuva oma palvelu — kaikki rakennetaan niin että se voidaan luovuttaa interingille.

## Tämän vaiheen tavoite

**Tekninen prototyyppi promptien tasolla.** Ei vielä frontendiä eikä backendiä. Tavoite on saada agenttilogiikka ja promptit toimimaan niin hyvin että lopputulos on näytettävää tasoa intering-perustajalle. Vasta sen jälkeen rakennetaan tekninen kuori (FastAPI + React).

Logiikka tällä lähestymistavalla: **promptien laatu ratkaisee onko tuote hyvä vai huono**, ei tekninen toteutus. Sama lähestymistapa kuin Spark-projektissa — promptit ja evaluointi ensin, tuotantokoodi sitten.

## Arkkitehtuurin pääpäätökset (jo tehty, älä kyseenalaista)

- **Kaksivaiheinen agentti**: vaihe 1 = kartoittaja (positiointi), vaihe 2 = kirjoittaja (kolme outputtia)
- **Output**: kolme erillistä asiaa samasta positiointidokumentista
  1. LinkedIn-tekstit (Headline, About, Experience-osiot) copy-paste-muodossa
  2. CV PDF-muodossa (HTML-template + Playwright)
  3. Intering.fi-profiilitekstit (hook, tuotekortit, osiot) copy-paste-muodossa
- **Datan syöttö**: jäsen syöttää CV:n joko copy-paste tekstinä tai LinkedInin "Save to PDF" -tiedostona. Ei LinkedIn-API-integraatiota.
- **Datan elinkaari**: sessio muistissa, ei levyllä. Mitään ei säilytetä.
- **Kieli**: suomi only ensimmäisessä versiossa
- **Hostaus**: Hetzner Helsinki tai UpCloud, FastAPI-backend + Vite/React-frontend, Caddy reverse proxy
- **Autentikointi**: magic link sähköpostiin, sallitut jäsenet Google Sheetsissä (ei tämän vaiheen scope)
- **LLM**: Claude API. Kartoittajalle ja viimeistelylle Sonnet 4.5 riittää, kirjoitusvaiheen vaativampiin osiin Opus 4.7

## Mitä Claude Coden pitää nyt tuottaa

### 1. Promptit (tärkein osa)

Kirjoita `prompts/`-hakemistoon seuraavat tiedostot:

- `prompts/kartoittaja_system.md` — system prompt vaiheen 1 agentille
- `prompts/kirjoittaja_linkedin_system.md` — system prompt LinkedIn-tekstien kirjoittamiseen
- `prompts/kirjoittaja_cv_system.md` — system prompt CV:n kirjoittamiseen
- `prompts/kirjoittaja_intering_system.md` — system prompt intering-profiilitekstien kirjoittamiseen

#### Kartoittaja-promptin vaatimukset

Kartoittajan tehtävä on selvittää **interim-positiointikulma** ennen kuin yhtään tekstiä kirjoitetaan. Sen on oltava sisäänrakennettuna asiantuntemus interim-markkinasta — ei geneerinen "kerro itsestäsi"-haastattelu.

Promptin pitää sisältää:

- Tieto siitä mitä suomalaiset interim-ostajat etsivät (toimitusjohtajat, hallitukset, omistajat, PE-talot, perheyritykset, kasvuyritykset)
- Tyypilliset interim-kulmat: käännejohtaja, kasvun skaalaaja, integraatio-osaaja, kriisinhoitaja, prosessisaneeraaja, exit-valmistelija, uuden vaiheen rakentaja
- SPIN-tyyppinen kysymysrakenne (Situation, Problem, Implication, Need-payoff) sovellettuna jäsenen oman tarinan kaivamiseen
- Aktiivinen "10x-tarinan" etsiminen — mikä on jäsenen vahvin mitattava saavutus
- Erottautumistekijöiden kaivaminen: mitä jäsen tekee paremmin/eri tavalla kuin geneerinen interim-johtaja

Kartoittajan **output on strukturoitu JSON-dokumentti** seuraavalla skemalla:

```json
{
  "positioning": {
    "primary_angle": "esim. 'B2B-palveluyritysten kasvun skaalaaja'",
    "target_buyers": ["toimitusjohtaja", "hallitus", "..."],
    "target_situations": ["10–50 hengen kasvuvaihe", "..."],
    "differentiators": ["operaattori-tausta, ei konsultti", "..."]
  },
  "evidence": {
    "flagship_story": {
      "context": "...",
      "action": "...",
      "result_quantified": "esim. 10x kasvu, €2.5M → €25M"
    },
    "supporting_results": [
      { "metric": "...", "value": "...", "context": "..." }
    ],
    "expertise_areas": ["data-driven sales", "GTM", "..."]
  },
  "key_messages": {
    "one_liner": "Yhden lauseen positiointi joka voisi olla LinkedIn-headlinen pohja",
    "elevator_pitch": "30 sekunnin esittely",
    "proof_points": ["mitattava 1", "mitattava 2", "mitattava 3"]
  },
  "preferences": {
    "tone": "esim. 'suora, ei jargonia'",
    "exclusions": ["asiat joita ei haluta tuoda esiin"]
  }
}
```

#### Kirjoittaja-promptien vaatimukset

Kaikki kolme kirjoittajaa saavat **inputtina** (1) kartoittajan JSON-dokumentin ja (2) jäsenen raakadatan (CV-teksti tai LinkedIn-PDF:n teksti).

**Yhteiset säännöt kaikille kirjoittajille:**

- Ei jargonia ("synergia", "stakeholder", "drive", "leverage", "skaalata" konsultti-mielessä)
- Ei engagement-baitia
- Ei emojia
- Ei poeettisia rivinvaihtoja
- Mitattavat tulokset etusijalla
- Operaattori-framing (tehnyt itse), ei konsultti-framing (auttanut tekemään)
- Sentence case otsikoissa, ei Title Case
- Suomi

**LinkedIn-kirjoittaja** tuottaa:
- Headline (maksimi 220 merkkiä, intering-positiointi näkyy)
- About (1500–2000 merkkiä, alku koukuttava, mitattavat tulokset, lopussa selkeä mitä etsii)
- Experience-osiot uusimmille rooleille (3–5 viimeisintä), jokaisessa: lyhyt kontekstilause + 3–5 mitattavaa saavutusta bullet-pisteinä

**CV-kirjoittaja** tuottaa strukturoidun JSONin jonka HTML-template renderöi:
```json
{
  "header": { "name": "...", "title": "...", "contact": {...} },
  "positioning_summary": "1–2 lausetta CV:n alkuun",
  "key_results": ["3–5 vahvinta mitattavaa tulosta"],
  "expertise": ["osaamisalueet ryhmiteltyinä"],
  "experience": [
    {
      "role": "...", "company": "...", "period": "...",
      "context": "1 lause", "results": ["mitattava 1", "..."]
    }
  ],
  "education": [...],
  "certifications": [...]
}
```

**Intering-kirjoittaja** tuottaa:
- Hook-rivi (intering.fi-profiilin pipe-formaatti, kts. esimerkki alla)
- 2–3 tuotekorttia (kuvaus mitä jäsen voi tehdä asiakkaalle, tilannelähtöisesti)
- Profiilin osiot (kokemus, vahvuudet, mitä etsii)

Hook-formaatti esimerkki: `Käännejohtaja | B2B-palvelut | 10–50 henkeä | Operaattori, ei konsultti`

### 2. Promptien testiajo

Tee `tests/`-hakemistoon:

- `tests/test_kartoittaja.py` — Python-skripti joka ajaa kartoittajan Anthropic API:lla. Input: testihenkilön perustiedot (käytä Janin omaa profiilia testimateriaalina, kts. alla). Output: JSON tulostuu ja tallennetaan `tests/output/positioning.json`.
- `tests/test_kirjoittajat.py` — lukee `positioning.json`:n ja CV-raakadatan, ajaa kaikki kolme kirjoittajaa rinnakkain, tallentaa outputit `tests/output/`-hakemistoon.

Käytä Claude APIa Anthropicin Python SDK:lla:
```python
from anthropic import Anthropic
client = Anthropic()
response = client.messages.create(
    model="claude-sonnet-4-5",  # tai claude-opus-4-7 vaativampaan
    max_tokens=4096,
    system=open("prompts/kartoittaja_system.md").read(),
    messages=[...]
)
```

API-avain ympäristömuuttujasta `ANTHROPIC_API_KEY`.

### 3. Testimateriaali

Käytä Janin omaa profiilia testikäyttäjänä — hän on itse intering-jäsen ja täydellinen testihenkilö. Avainfaktoja jotka kartoittaja saa kysymällä esiin:

- 15+ vuotta kokemusta tech-enabled service businesses, software/IT consulting, nearshore/offshore-mallit
- Lippulaivasaavutus: skaalannut alihankintaliiketoimintaa 10x (€2.5M → €25M), Witted Megacorp
- P&L-vastuu ~€25M tasolla
- Roolit: Muuronen Advisory Oy (perustaja), Boardlytic Oy (perustaja), Qaraton Technologies (advisor)
- Aiemmat: COO/Board Member Tekai Oy (11/2024–12/2025), Interim CCO/COO Reactron Technologies (5–11/2024)
- Ydinosaamiset: data-driven sales ja GTM, operatiivinen skaalaus, strategian toteutus, generatiivinen AI liiketoiminnassa
- HHJ-sertifiointi 2023
- Software developer -tausta (BSc Computer Engineering, Lapin AMK)
- Asuu Espoossa, suomi äidinkieli, työskentelee myös englanniksi
- Erottautuminen: operaattori-framing (tehnyt itse), ei konsultti-framing

Tallenna nämä `tests/fixtures/jani_baseline.md`-tiedostoon kartoittaja-testin lähtötilanteena. Kartoittaja-testi voi simuloida keskustelun tämän pohjalta.

### 4. Evaluointiskripti

Tee yksinkertainen `evaluate.py` joka tarkistaa output-tiedostot seuraavin kriteerein:

- Kartoittaja-JSON: skema validi, kaikki kentät täytetty, `flagship_story` sisältää mitattavan tuloksen
- LinkedIn-headline: maksimi 220 merkkiä
- LinkedIn-about: 1500–2000 merkkiä
- Ei kiellettyjä sanoja: ["synergia", "stakeholder", "leverage", "skaalata" konsultti-mielessä], emoji-merkit
- CV-JSON: skema validi, jokaisessa experience-roolissa vähintään 2 mitattavaa tulosta
- Intering-hook: pipe-formaatti, 4 osaa

Tulosta selkeä raportti: ✓/✗ jokaisesta kriteeristä.

## Repon rakenne

```
intering-cv-agentti/
├── README.md
├── HANDOVER.md          # tämä tiedosto
├── .env.example         # ANTHROPIC_API_KEY=
├── pyproject.toml       # uv-projekti, Python 3.11+
├── prompts/
│   ├── kartoittaja_system.md
│   ├── kirjoittaja_linkedin_system.md
│   ├── kirjoittaja_cv_system.md
│   └── kirjoittaja_intering_system.md
├── src/
│   ├── __init__.py
│   ├── kartoittaja.py   # vaihe 1 -agentti
│   ├── kirjoittajat.py  # vaihe 2 -agentit
│   └── schemas.py       # Pydantic-mallit JSON-skemoille
├── tests/
│   ├── fixtures/
│   │   └── jani_baseline.md
│   ├── test_kartoittaja.py
│   ├── test_kirjoittajat.py
│   └── output/          # .gitignore
└── evaluate.py
```

## Tekniset valinnat

- **Python 3.11+** ja `uv` paketinhallintaan
- **Anthropic Python SDK** (`anthropic`)
- **Pydantic v2** JSON-skemojen validointiin
- **python-dotenv** ympäristömuuttujille
- Ei vielä mitään frontendiä, tietokantaa, tai web-frameworkia

## Arvostele itse työn laatu seuraavin kriteerein

Kun olet ajanut promptit testimateriaalilla, vastaa itse näihin:

1. Olisiko Jani itse valmis lähettämään tämän LinkedIn-Aboutin asiakkaalle? Jos ei, miksi ei?
2. Erottuuko CV interim-CV:nä vai voisiko tämän olla vakityönhakija? Mistä se erottuu?
3. Onko positiointidokumentti tarpeeksi terävä että kirjoittajat voivat käyttää sitä — vai jääkö se geneeriseksi?
4. Mikä on heikoin lenkki tuotoksissa, ja mitä se vaatisi parantuakseen?

Tämä self-evaluation on osa toimitusta — Jani lukee sen ja iteroi promptit sen pohjalta.

## Mitä EI kuulu tähän vaiheeseen

- Frontend (React-UI tulee myöhemmin)
- Backend-API (FastAPI tulee myöhemmin)
- Magic link -kirjautuminen
- PDF-renderöinti (kirjoita CV-output JSONina, älä yritä renderöidä PDF:ää vielä)
- LinkedIn PDF-parserointi (lue jäsenen syöte tekstinä toistaiseksi)
- Hostaus, deployment, Docker
- Tietoturvatoteutus

## Aloitusjärjestys

1. Pystytä projektirakenne ja Pythonin riippuvuudet
2. Kirjoita `kartoittaja_system.md` — tämä on koko projektin tärkein artefakti, käytä siihen aikaa
3. Tee `test_kartoittaja.py` ja aja se Janin profiililla — iteroi kunnes JSON on terävää
4. Kirjoita kolme kirjoittaja-promptia
5. Tee `test_kirjoittajat.py` ja aja
6. Tee `evaluate.py` ja aja
7. Kirjoita self-evaluation README:hen tai erilliseen `EVALUATION.md`:hen

## Yhteyshenkilö

Jani Muuronen (jani@muuronen.fi tai vastaava). Kysy häneltä jos jokin tämän dokumentin osa on epäselvä, mutta älä kysy lupaa pieniin teknisiin valintoihin — etene ja tee.
