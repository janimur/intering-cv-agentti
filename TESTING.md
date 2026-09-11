# Intering-sovelluksen testaus

## Automaattiset tarkistukset

- `uv run pytest tests/unit tests/api`: skeemat, snapshotit, revision-kilpailut, hyväksyntä, promptien päivitys ja mockatut API-kutsut. Ei maksullisia mallikutsuja.
- Frontend: `npm test` ja `npm run build` hakemistossa `frontend/`.
- Selainpolku: frontendin Playwright-testit, API vastaukset mockattuina.

## Manuaalinen koko polku

Käynnistä sovellus README:n mukaan ja käytä julkaisukelpoista testimateriaalia. Malliajot vaativat API-avaimen ja maksavat.

1. Hyväksy tietosuojailmoitus, lataa CV PDF:nä. Kokeile sekä ilman LinkedIniä että sen kanssa.
2. Aja kartoitus. Tarkista että analyysi perustuu materiaaliin, eikä puuttuvaa lippulaivaa tai numeroita keksitä.
3. Vastaa omin sanoin kysymykseen. Tarkista että seuraava kysymys hyödyntää aiempia tietoja ja kysyy vain yhtä aihetta kerrallaan. Tarkista myös interim-työtapa, tavoitteet ja ääni, jos CV ei kerro niistä.
4. Ohita aihe ja merkitse toinen luottamukselliseksi. Vastaustekstiä ei kirjata kummassakaan; aiheeseen ei palata. Älä syötä oikeita salaisuuksia.
5. Lopeta nykyisillä tiedoilla. Tarkista kaikki profiilin kentät ja positiointi. Korjaa vuosiluku, lisää tavoite ja rajaus, muokkaa sävyä. Hyväksy tiedot.
6. Valitse ensin pelkkä CV. Tarkista minä-muoto ja olennaisten roolien säilyminen, vaikka roolilla ei olisi numerotuloksia. PDF ei saa näyttää tyhjää tulososiota.
7. Iteroi ensimmäistä CV-versiota pyytämällä yhtä paikallista muutosta. Nykyinen tuotos pitää säilyä palautteen lähtökohtana.
8. Aja LinkedIn ja Intering haluamassasi järjestyksessä. Tarkista oman äänen, korjausten ja rajausten välittyminen kaikkiin kolmeen. Vastuun laajuutta ei saa esittää saavutuksena. Aikatauluja tai vastuuta ei saa keksiä.
9. Palaa kartoitukseen ja muuta tietoa. Vanha tuotos säilyy mutta näkyy vanhentuneena; hyväksyntä tarvitaan uudelleen, samoin kirjoittajan uudelleenajo. Vanhan CV:n PDF-lataus ja iterointi estetään.
10. Lataa sivu uudelleen: työtä ei voi jatkaa eikä henkilötietoja löydy localStoragesta tai sessionStoragesta. GDPR-hyväksyntä ja mahdollinen ylläpitotoken ovat erillisiä asetuksia.

## Promptien päivitys

1. Avaa admin asetetulla tokenilla. Kahdeksan moduulia näkyy ja aktiivinen lähde on selvä.
2. Päivitä yhteisiä sääntöjä. Seuraava kirjoittajakutsu käyttää muutosta; kartoituksen GET-vastauksen prompt_checksums muuttuu ajetulle roolille.
3. Palauta oletukseen. Muokkaa `prompts/yhteiset_saannot.md` tiedostona; seuraava kutsu käyttää uutta tiedostoa myös Dockerissa mountin kautta.
4. Huomaa, että admin-ohitus voittaa versionhallintatiedoston kunnes ohitus poistetaan.

## Laadun arviointi

Kokeile sekä runsasta numeronäyttöä että niukkaa lähtöaineistoa. Arvioi kysymysten tarpeellisuus, oman äänen tunnistettavuus, todennetut laadulliset tulokset ja rehellinen oman vastuun kuvaus. Pelkkä automaattisten testien läpäisy ei varmista mallin kirjoittaman tekstin laatua.

## Tausta-ajot ja yhteyskatkot

- Käynnistä kartoitus ja tarkista, että POST palauttaa 202 nopeasti. Seuraa GET-tilaa.
- Katkaise aloitusvastauksen vastaanotto ja toista sama pyyntö samalla Idempotency-Keyllä.
  Tunnisteen ja lopputuloksen pitää pysyä samoina; mallia kutsutaan vain kerran.
- Toista kirjoittaja/iterointi kesken ajon. Samansisältöinen pyyntö liittyy samaan työhön;
  eri sisältö ei saa korvata sitä tai saada toisen pyynnön tulosta.
- Katkaise verkko hetkeksi ja palauta yhteys. Pidempään katkettuaan käyttöliittymän
  uusi yritys jatkaa saman operaation hakua. Se ei generoi uutta tekstiä.
- Muuta kartoitusta kirjoittajan työn aikana: vanha tulos ei saa ylikirjoittaa uusia tietoja.
- Tarkista osapäivityksestä, että pois jätetyt korjaukset, oma ääni ja rajaukset säilyvät.
- `tests/api/test_operations.py` tarkistaa aidon 202/GET-sopimuksen; muut workflow-testit
  odottavat samaa protokollaa testiapurin kautta, jotta niiden sisältöväitteet säilyvät.
