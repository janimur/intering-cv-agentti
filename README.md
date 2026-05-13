# Intering CV-agentti

Suomalaisen interim-johtajien yhteisön (intering) jäsenille tarkoitettu AI-agentti, joka auttaa kirjoittamaan myyvempiä LinkedIn-profiileja, CV:itä ja intering.fi-profiileja interim-toimeksiantoja varten.

Tämä on **vaiheen 1 prototyyppi**: agenttilogiikka ja promptit toimivat komentoriviltä ajettavina ajoskripteinä. Vaihe 2 (FastAPI + React-frontend) tulee tämän jälkeen.

## Arkkitehtuuri

Kaksivaiheinen agentti:

1. **Kartoittaja** (`src/kartoittaja.py`) — analysoi jäsenen materiaalin ja tuottaa strukturoidun positiointidokumentin (`PositioningDocument`)
2. **Kirjoittajat** (`src/kirjoittajat.py`) — kolme erillistä agenttia jotka käyttävät positiointidokumenttia tekstien tuottamiseen:
   - LinkedIn-kirjoittaja (Headline, About, Experience)
   - CV-kirjoittaja (strukturoitu JSON HTML/PDF-renderöintiä varten)
   - Intering-kirjoittaja (hook, tuotekortit, profiilin osiot)

Kaikki strukturoitu output kulkee Anthropic `tool_use`-mekanismin läpi. Output validoidaan Pydanticilla.

## Käynnistys Docker Composella

Ensimmäinen käynnistys (rakentaa kontit):
```bash
docker compose up --build -d
```

Avaa selain osoitteeseen http://localhost.

Logien seuranta:
```bash
docker compose logs -f backend
```

Smoke test (palvelut oltava käynnissä):
```bash
bash scripts/smoke_test.sh
```

Pysäytys:
```bash
docker compose down
```

Frontend-koodin muutos vaatii konttien uudelleenrakentamisen:
```bash
docker compose up --build -d
```

Vaatii .env-tiedoston repon juuressa jossa on ANTHROPIC_API_KEY.

## Asennus

Vaatii Python 3.11+ ja [uv](https://docs.astral.sh/uv/).

```bash
uv sync
```

Luo `.env`-tiedosto projektin juureen:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Syötteen rakenne

Tuotantoputki ottaa vastaan:

| Syöte | Pakollinen? | Lähde |
|---|---|---|
| CV-teksti | Pakollinen | PDF-lataus → `src/pdf_reader.py` purkaa tekstiksi |
| LinkedIn-profiili | Optionaali | Frontend-tekstikenttä (paste) tai LinkedIn-PDF-lataus |
| Baseline (perustiedot) | Vain testikäyttö | `tests/fixtures/<henkilo>_baseline.md`, kytketään `USE_BASELINE=1` |

LinkedIn-input rikastuttaa positiointia merkittävästi (jäsenen oma ääni, painopisteet, "Mitä etsin"). Ristiriitatilanteissa kartoittaja luottaa CV:hen.

## Käyttö (komentorivi)

Aja vaiheet järjestyksessä:

```bash
# 1. Kartoittaja → tests/output/positioning.json
uv run python tests/test_kartoittaja.py

# 2. Kolme kirjoittajaa → tests/output/{linkedin,cv,intering}.json
uv run python tests/test_kirjoittajat.py

# 3. Evaluointi (12 kriteeriä, exit 1 jos joku epäonnistuu)
uv run python evaluate.py
```

Tällä hetkellä testihenkilönä on Jani Muuronen. Toinen testihenkilö vaatii uuden CV-PDF:n `tmp/`-hakemistoon ja oman LinkedIn-tekstin `tests/fixtures/jani_linkedin.md`-tiedostoon (tai `tmp/linkedin/*.pdf`).

## Mallivalinnat

| Komponentti | Malli | Konfiguraatio |
|---|---|---|
| Kartoittaja | `claude-opus-4-7` | adaptive thinking (`output_config.effort: "high"`), temperature 1.0 |
| LinkedIn-kirjoittaja | `claude-opus-4-7` | temperature 1.0 (Opus + thinking ei tue muita arvoja) |
| CV-kirjoittaja | `claude-opus-4-7` | sama |
| Intering-kirjoittaja | `claude-opus-4-7` | sama |

**Miksi Opus kaikkialla**: aiempi iterointi osoitti että Sonnet 4.5 ei noudattanut tarkkaa "mitattava tulos" -määritelmää CV-pinossa. Opus tiivistää vanhat roolit yhdistelmälauseiksi prompti-ohjeen mukaisesti, Sonnet jätti vajaita rooleja experienceen.

## Repon rakenne

```
intering/
├── README.md                # tämä tiedosto
├── HANDOVER.md              # alkuperäinen toimeksianto Janilta
├── EVALUATION.md            # self-evaluation, päivittyy iteraatioilla
├── pyproject.toml           # uv-projekti
├── .env.example             # ANTHROPIC_API_KEY=
├── evaluate.py              # 12-kriteerin evaluointiskripti
├── prompts/                 # koko logiikan ydin
│   ├── kartoittaja_system.md
│   ├── kirjoittaja_linkedin_system.md
│   ├── kirjoittaja_cv_system.md
│   └── kirjoittaja_intering_system.md
├── src/
│   ├── schemas.py           # Pydantic-mallit (PositioningDocument, CVDocument, ...)
│   ├── pdf_reader.py        # pdfplumber-pohjainen tekstinkaivu
│   ├── kartoittaja.py       # vaiheen 1 agentti
│   └── kirjoittajat.py      # vaiheen 2 agentit (yhteinen _run_writer)
└── tests/
    ├── _inputs.py           # LinkedIn-syötteen lataus (paste tai PDF)
    ├── fixtures/            # gitignored testimateriaali
    ├── output/              # gitignored ajojen tuotokset
    ├── test_kartoittaja.py  # ajoskripti
    └── test_kirjoittajat.py # ajoskripti
```

## Promptien ydinperiaatteet

Yhteiset säännöt kaikille kirjoittajille:

- **Kielletyt sanat**: synergia, stakeholder, leverage, drive, skaalata (konsulttimielessä — operaattori-muodot kuten "skaalasin" sallittuja)
- **Ei jargonia**: ei "kokenut johtaja", "intohimoinen ammattilainen" tms.
- **Mitattavat tulokset etusijalla**: numerot, prosentit, eurot, aikamääreet
- **Operaattori-framing**: aktiivit verbit ("rakensin", "skaalasin"), ei "auttoi/tuki/osallistui"
- **Suomi**: kaikki output suomeksi, vakiintuneet englanninkieliset termit (P&L, GTM, ICP, CRM, CEO/COO/CCO) säilyvät

## Evaluointi

`evaluate.py` tarkistaa 12 kriteeriä:

1. Kartoittaja-JSON validi
2. Kaikki kentät täytetty
3. Flagship story sisältää numeron
4. LinkedIn-headline ≤ 220 merkkiä
5. LinkedIn-about 1500–2000 merkkiä (tavoite, ei ehdoton)
6. LinkedIn ei sisällä kiellettyjä sanoja
7. CV-JSON validi
8. CV: jokaisella experience-roolilla ≥ 2 mitattavaa tulosta
9. CV ei sisällä kiellettyjä sanoja
10. Intering-hook 4-osaisessa pipe-formaatissa
11. Intering ei sisällä kiellettyjä sanoja
12. Ei emoji-merkkejä missään output-tiedostossa

Exit-koodi `0` jos kaikki OK (varoitukset sallitaan), `1` jos vähintään yksi epäonnistuu.

## Testien ajaminen

Backend-yksikkötestit ja API-testit (nopeita, ei tee oikeita LLM-kutsuja):
```bash
uv run pytest tests/unit tests/api
```

Frontend-yksikkötestit:
```bash
cd frontend && npm test
```

Manuaaliset integraatio-ajot (tekevät oikeita Anthropic-kutsuja, vaatii ANTHROPIC_API_KEY):
```bash
uv run python tests/test_kartoittaja.py
uv run python tests/test_kirjoittajat.py
uv run python evaluate.py
```

### Pre-commit hook

Repossa on git-hook (`.githooks/pre-commit`) joka ajaa kaikki yksikkö- ja API-testit automaattisesti ennen jokaista committia. Kytke se päälle kerran kloonauksen jälkeen:

```bash
git config core.hooksPath .githooks
```

Jos joudut ohittamaan hookin poikkeustilanteessa, käytä `git commit --no-verify`.

## Admin-toiminnot

Promptit ovat muokattavissa selaimessa ilman koodimuutoksia. Aseta `.env`-
tiedostoon `ADMIN_TOKEN=<jokin-pitkä-satunnainen-merkkijono>` ja käynnistä
palvelu uudelleen. Avaa sitten selaimessa:

http://localhost/?admin=<jokin-pitkä-satunnainen-merkkijono>

Muokatut promptit tallentuvat `data/prompts/`-volumeen ja tulevat voimaan
välittömästi. "Palauta oletukseen" -painike poistaa overlay-tiedoston ja
seuraava lataus käyttää `prompts/`-hakemiston (git-versioitua) sisältöä.

## Tunnetut rajoitukset

- **About-pituus**: prompti ohjaa "alle 2000 merkkiä", mutta Opus 4.7 ylittää rajan ajoittain (ks. EVALUATION.md). Schema-tason `max_length` voisi pakottaa retryyn — ei toteutettu tässä vaiheessa.
- **Yksi testihenkilö**: kaikki iteroinnit on tehty Janin profiililla, jolla on poikkeuksellisen kvantifioitu lippulaivasaavutus (€2.5M → €25M). Toinen testihenkilö heikommilla numeroilla on pääriski.
- **Ei frontendia eikä backendia**: vaiheen 1 prototyyppi on komentoriviltä ajettava. Tuotantoversio (FastAPI + React) tulee vaiheessa 2.

## Vaiheen 2 muistilappu

Frontend-vaatimukset jotka tämän vaiheen koodi olettaa:

- CV-PDF-lataus
- LinkedIn-input: tekstikenttä (paste) **tai** LinkedIn-PDF-lataus (mahdollisesti molemmat)
- Magic link -kirjautuminen, sallitut jäsenet Google Sheetsissä
- Sessio muistissa, ei tallennusta levylle
- CV-JSON renderöidään PDF:ksi (HTML-template + Playwright)
