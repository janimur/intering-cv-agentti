# Intering CV-agentti

Itsenäinen selainohjelma interim-johtajan positiointiin sekä CV:n, LinkedIn-tekstien ja intering.fi-profiilin kirjoittamiseen.

## Käyttäjän polku

1. Lataa CV PDF:nä ja halutessasi LinkedIn tekstinä tai PDF:nä.
2. Kartoittaja analysoi aineiston automaattisesti ja kysyy yhden tarpeellisen tarkennuksen kerrallaan. Se täydentää näyttöjä, toimeksiantotoiveita, rajauksia, henkilön omaa ääntä ja interim-työtapaa.
3. Vastaa, ohita kysymys tai merkitse aihe luottamukselliseksi. Luottamukselliseksi tai ohitetuksi merkityn kysymyksen vastaustekstiä ei lähetetä mallille eikä säilytetä. Älä syötä salassa pidettäviä tietoja. Kartoituksen voi lopettaa nykyisillä tiedoilla milloin tahansa.
4. Tarkista ja muokkaa positiointia ja täydentävää profiilia. Hyväksy tiedot ennen kirjoittamista.
5. Valitse haluamasi kirjoittajat vapaassa järjestyksessä. Iteroi tekstejä palautteella, kopioi tulokset tai lataa CV PDF:nä.

Kaikki esittelytekstit kirjoitetaan minä-muodossa. Todennetut laadulliset tulokset kelpaavat; rooleja ei pudoteta puuttuvien numerotulosten vuoksi. Puuttuva lippulaiva ja tyhjät näyttölistat ovat sallittuja.

Työtä ei tallenneta myöhempää jatkamista varten. Selain pitää istuntotunnuksen ja tulokset vain muistissa; sivun lataaminen uudelleen tai sulkeminen hävittää jatkomahdollisuuden. Palvelimen istunnot ovat muistissa prosessin eliniän (ei automaattista vanhenemista). GDPR-hyväksyntä tallennetaan selaimeen. Käyttäjämateriaaleja tai vastauksia ei kirjoiteta metriikkatietokantaan. Metriikat ja ylläpidon promptimuutokset säilyvät levyllä.

## Arkkitehtuuri ja myöhempi integraatio

- `src/schemas.py`: Pydantic-sopimukset positioinnille, profiilille, kysymyksille ja kirjoittajille.
- `src/kartoittaja.py`: alkuanalyysi ja täydentävä kartoituskutsu Anthropic-työkaluilla.
- `src/kirjoittajat.py`: kirjoittaminen ja palautteen käsittely, myös nykyinen tuotos ensimmäiseen iteraatioon.
- `backend/app/workflow.py`: frontendistä riippumattomat tilasiirtymät ja hyväksyntä.
- `backend/app/sessions.py`: atomisesti päivittyvä muistivarasto, snapshot-luvut ja revision tarkistus.
- `backend/app/api/`: FastAPI-reitit, PDF ja admin.
- `frontend/`: React + TypeScript + Tailwind; käyttöliittymän voi korvata saman API:n päälle.
- `prompts/`: ajantasaiset, tiedostoista koostettavat ohjeet.

FastAPI OpenAPI-sopimus on käynnissä olevan palvelimen `/docs`- ja `/openapi.json`-osoitteissa. Istuntopyynnöt käyttävät `X-Session-ID`-otsaketta (upload palauttaa satunnaisen tunnuksen). Tässä vaiheessa ei ole jäsenkirjautumista eikä pysyvää tallennusta. Aja backend yhdellä worker-prosessilla: prosessien välillä ei ole jaettua istuntovarastoa.

### Kartoitus-API

| Reitti | Sisältö |
|---|---|
| `GET /api/positioning` | Nykyinen WorkflowState |
| `POST /api/positioning` | `{revision}` käynnistää alkuanalyysin ja täydentävän kartoituksen |
| `POST /api/positioning/answers` | `{revision, question_id, text, disposition}`; disposition on answered, skipped tai confidential |
| `POST /api/positioning/finish` | `{revision}` siirtyy tarkistukseen |
| `PATCH /api/positioning` | `{revision, positioning, profile}` muokkaa yhteenvetoa |
| `POST /api/positioning/approve` | `{revision}` hyväksyy nykyiset tiedot |
| `POST /api/writers/{linkedin,cv,intering}` | `{revision}` kirjoittaa hyväksytyistä tiedoista |
| `POST /api/writers/{type}/iterate` | `{revision, note, target_field?}` iteroi nykyistä tuotosta |
| `GET /api/cv/pdf` | Ajantasainen hyväksytty CV PDF:nä |

Kartoitus palauttaa tilan uploaded → clarifying → review → approved, revisionin, approved_revisionin, positioinnin, profiilin, aktiivisen kysymyksen ja vastaushistorian. Kirjoittajan vastaus on tuotoksen JSON ja `source_revision`. `output_revisions` kertoo aiempien tuotosten lähtöversion. Lähtötietojen muutos peruu hyväksynnän ja vanhentaa tuotokset säilyttäen ne; ne täytyy kirjoittaa uudelleen. Myös iteraatio ja PDF tarkistavat ajantasaisuuden backendissä.

Jokainen mutaatio tarvitsee viimeksi palautetun revisionin. Myös hyväksyntä muuttaa revisionia. Vanha revision tai myöhässä valmistunut mallikutsu palauttaa 409 eikä ylikirjoita uutta tietoa. Virheellinen mallivastaus palauttaa 502 muuttamatta tilaa. Mallille menevät hyväksytty profiili, positiointi, alkuperäisaineisto ja vastatut julkiset tarkennukset. Profiilin korjaukset voittavat vanhat lähdetiedot.

## Käynnistys

Luo `.env`, jossa on `ANTHROPIC_API_KEY` ja haluttaessa `ADMIN_TOKEN`.

```bash
docker compose up --build -d
```

Avaa http://localhost. Pysäytä `docker compose down`. Frontend- ja Python-koodimuutokset tarvitsevat uuden buildin.

Paikallinen kehitys:

```bash
uv sync
uv run playwright install chromium
uv run uvicorn backend.app.main:app --reload
```

Toisessa terminaalissa `cd frontend`, `npm ci`, `npm run dev`.

## Promptien päivittäminen

Kahdeksan Markdown-moduulia:

- `yhteiset_saannot.md`: faktat, ääni, rajaukset ja yhteinen kirjoitustapa.
- `kartoituksen_ohje.md`: keskustelun kysymysten valinta ja profiilin täydentäminen.
- `suomalainen_interim_markkina.md`: ostajatilanteiden tausta.
- `tyypilliset_interim_positiointikulmat.md`: positioinnin viitekehys.
- `kartoittaja_system.md`: analyysi ja kenttien sisältö.
- `kirjoittaja_{linkedin,cv,intering}_system.md`: tuotekohtaiset ohjeet.

Muokkaa tiedostoa `prompts/`-hakemistossa. Seuraava mallikutsu lukee tiedostot uudelleen: koodimuutosta tai uudelleenkäynnistystä ei tarvita. Docker Compose liittää `./prompts:/app/prompts:ro`; ota tämä mount käyttöön kerran kontti uusimalla. JSON-työkalujen skeemat säilyvät Python-koodissa, eivät promptitiedostoissa.

Ylläpidossa (`http://localhost/?admin=<ADMIN_TOKEN>`) voit muokata kaikkia moduuleja. Adminin versio tallentuu `${DATA_DIR}/prompts/`-hakemistoon ja **ohittaa** saman nimisen versionhallintatiedoston. Käyttöliittymä näyttää aktiivisen lähteen. "Palauta oletukseen" poistaa tämän ohituksen. Jos tiedoston päivitys ei näy, tarkista ensin ohitus. `DATA_DIR` on Dockerissa `/data`, paikallisesti `data/`.

Kunkin roolin ohje koostetaan yhteisistä säännöistä, markkinataustasta, positiointikulmista ja rooliohjeesta; kartoittaja saa lisäksi keskusteluohjeen. Käytetyn koosteen SHA-256-tarkiste näkyy istunnon `prompt_checksums`-kentässä. Promptin muutos vaikuttaa seuraaviin ajoihin eikä kirjoita vanhoja tuotoksia automaattisesti uudelleen.

## Testaus

```bash
uv run pytest tests/unit tests/api
```

`cd frontend` ja `npm test`, `npm run build`. Mockatut testit eivät tee maksullisia mallikutsuja. Selainpolku: `npm run test:e2e` (katso frontend/package.json).

Manuaalinen laaduntarkistus: [TESTING.md](TESTING.md). `tests/test_kartoittaja.py` ja `tests/test_kirjoittajat.py` ovat erillisiä **maksullisia** CLI-ajoskriptejä, eivät sovelluksen hyväksyntäpolku. `uv run python evaluate.py` tarkistaa niiden tiedostotuotosten rakennetta. Numeron puuttuminen tai tulosten pieni määrä ei ole virhe; lähdeuskollisuus ja oma ääni vaativat myös ihmisen arvion.

Mallina on projektin nykyinen `claude-opus-4-7`. About-pituus on promptitavoite, ei tiukka skeemaraja. Oikeilla käyttäjämateriaaleilla tehtävä laadunvarmistus tarvitaan promptimuutosten jälkeen.
