# Self-evaluation — intering CV-agentti, vaihe 1 (promptit)

Päivämäärä: 2026-05-05
Testihenkilö: Jani Muuronen
Iteraatio: v3 (LinkedIn-tekstin syöttäminen tuotantokäytön mukaiseksi inputiksi)

## 1. Olisiko Jani itse valmis lähettämään tämän LinkedIn-Aboutin asiakkaalle?

Kyllä, ja edellisiin iteraatioihin verrattuna tämä versio on ratkaisevasti parempi: kirjoittaja sai inputtina Janin nykyisen LinkedIn-profiilin, ja tuotettu versio tunnistettavasti **säilyttää Janin äänen** mutta tekee siitä myyvemmän interim-toimeksiantoja varten.

Vahva esimerkki Janin äänen säilymisestä: "Sama kaava ei toistu joka yrityksessä, mutta operaattorin ote toistuu." Tämä on Janin särmikästä tyyliä — ei geneeristä myyntipuhetta. Vastaavasti operaattori-framing on näyttöä, ei väitettä: "Otan linjavastuun, teen päätökset ja vastaan numeroista — en kirjoita raporttia ja jätä toteutusta muille."

Vertailu Janin nykyiseen LinkedIniin osoittaa selkeitä parannuksia: nykyinen About on englanniksi, käyttää ➤ ja ★ -symboleja sekä geneeristä "When growth stalls..." -koukkua. Uusi versio on suomeksi (vastaa intering-vaatimusta), aloittaa kovalla numerolla ("Skaalasin... €2,5M:stä €25M:ään"), ei käytä symboleja ja päättyy konkreettiseen tilannelistalla varustettuun yhteydenottopyyntöön sähköposti mukana.

Heikko kohta: About on 2127 merkkiä, 127 yli tavoitteen 2000. Sisältö on tiukka eikä ilmeistä karsittavaa ole — mutta evaluate.py raportoi varoituksen ja Janin halutessa lähettää LinkedIn-Aboutin täysin rajan sisälle, yksi pieni tiivistys on edessä.

## 2. Erottuuko CV interim-CV:nä?

Kyllä. CV-output ei muuttunut merkittävästi LinkedIn-inputin lisäämisestä — se on jo aiemman iteraation laatua. Title on edelleen "B2B-palveluyritysten kasvun skaalaaja | Interim COO/CCO/CEO" (vakityö-CV ei korosta interim-statusta otsikossa), positioning_summary on toimeksiantokeskeinen, ja key_results on tilannetyyppikohtainen.

LinkedIn-input vahvisti hieman positiointia ("B2B-palveluyritykset" sai etusijan "IT-palveluyritysten" sijaan), mikä on linjassa LinkedIn-headlinen "B2B-palveluyrityksille" -muotoilun kanssa. CV pysyi 5 roolissa kaikilla 2+ mitattavalla tuloksella, vanha tekninen ura yhdistelmälauseena certifications-osiossa.

## 3. Onko positiointidokumentti tarpeeksi terävä?

On, ja LinkedIn-inputin lisäys teki siitä **olennaisesti rikkaamman** kuin pelkän CV:n + baselinen pohjalta. Konkreettiset parannukset:

- **Tone-kuvaus**: kartoittaja tunnisti LinkedIn-postauksista (mm. AI-keskustelut, Risto Murto -kommentti) Janin äänen: "rohkeasti eri mieltä, käytännönläheinen, hieman särmikäs, operaattorin ääni — ei advisor-pehmeyttä". Tätä signaalia ei tullut CV:stä.
- **Uusi target_situation**: "Avainhenkilön äkillinen lähtö kasvuyrityksessä — väliaikainen linjavastuu samalla kun vakirekrytointi etenee". Tämä tuli LinkedInin "Open to work"-merkinnästä ja Featured-osion sanavalinnoista.
- **Konkretisoitunut nearshore/offshore**: "rakentanut suomalais-vietnamilaisia toimintamalleja (Reactron, Tekai), tietää käytännössä mihin kiviin törmätään". Maantieteellinen yksityiskohta tuli LinkedInin Experience-osiosta.
- **Hienovaraisemmat exclusions**: "Ei senior advisor -tyyppistä titteliä", "Ei ylimyydä Augmented Reality / Zibra -taustaa pääprofiilissa". Tarkemmat rajaukset jotka heijastavat Janin omia painotuksia.

Tämä on selkeä validointi sille että LinkedIn-input pitää olla tuotantoputken osa — ei optionaali kustannustavoite.

## 4. Mikä on heikoin lenkki?

Kaksi havaintoa, kumpikaan ei kriittinen:

**About-pituuden hallinta tiukassa ohjauksessa epäonnistuu.** Promptissa on eksplisiittinen ohje "lyhennä alle 2000 merkkiin ennen tool-kutsua", mutta Opus 4.7 ylittää rajaa silloin kun lähdedataa on enemmän (LinkedIn-iteraatiossa 2127 merkkiä, edellisessä 2000 tasan, sitä edellisessä 2024). Promptti-tason kontrolli ei riitä — jos pituusraja halutaan ehdoton, tarvitaan joko schema-tason `max_length=2000` (joka pakottaa retryyn validointivirheessä) tai post-processing-vaihe joka leikkaa About-tekstin.

**LinkedIn-kirjoittajan rooli "myyvempi versio nykyisestä" toimi, mutta ei vielä eksplisiittisesti dokumentoidu.** Kirjoittaja tuotti aidosti paremman version, mutta lopputuotteessa ei ole vertailua nykyiseen ("muutin X koska Y") joka auttaisi Janille perustelemaan iteraatiokeskustelun: minkä takia uusi avauskoukku, miksi mitä etsin -kappale on muutettu. Tämä voisi olla jatkokehitys: lisätä `LinkedInOutput`-skemaan optional `improvements_summary`-kenttä jossa kirjoittaja perustelee 3–5 isointa muutosehdotusta.

## Tekniset huomiot vaiheen 1 toteutuksesta

- **Kartoittaja**: Claude Opus 4.7 + adaptive thinking (`output_config.effort: "high"`) tuotti positioning-dokumentin jossa ei ollut yhtään tyhjää kenttää. LinkedIn-input rikastutti tone-kuvausta ja lisäsi target_situation-vaihtoehtoja merkittävästi.
- **API-rajoitukset thinking-tilassa**: Opus 4.7 + thinking ei tue `temperature`-parametria eikä `tool_choice={"type": "any"}`-pakotusta. Käytetään `tool_choice={"type": "auto"}` ja luotetaan promptin output-ohjeeseen.
- **Mallivalinta**: kaikki kolme kirjoittajaa Opus 4.7:llä. Iteraatiossa v2 vaihdettu CV-malli Sonnetista Opukseen, koska Sonnet ei noudattanut tarkennettua "mitattava tulos" -määritelmää.
- **Inputin rakenne**: tuotantokoodi (`run_kartoittaja`, `run_*_writer`) ottaa CV-tekstin pakollisena ja LinkedIn-tekstin optionaalisena. Baseline.md on testikäyttöä varten ja oletuksena pois — `USE_BASELINE=1` -ympäristömuuttuja kytkee sen päälle.
- **Lähteiden ristiriidat**: kartoittaja-prompti ohjaa luottamaan CV:hen kun lähteet ovat ristiriidassa. LinkedIn-input vaikuttaa painopisteisiin ja äänensävyyn, ei rooleihin tai vuosilukuihin.
- **LinkedInOutput.about**: schema ei aseta ylärajaa. Promptin "lyhennä alle 2000" -ohje pitää ~50–60 % ajoista. v3-iteraatiossa LinkedIn-input rikastutti syötteen niin että lopputuotos on 2127 merkkiä — yli rajan, mutta sisältö tiukka.
- **CVDocument.experience.results**: schema-tason `min_length=2` toimii pakottavasti yhdessä prompti-ohjeen kanssa. Vanhat roolit tiivistetään `certifications`-osion yhdistelmälauseeksi, ei jätetä experienceen täytettävinä riveinä.
- **evaluate.py**: 12 kriteeriä, exit-koodi 0 kun vain VAROITUS:ia. v3-iteraatio: 0 epäonnistunutta, 1 varoitus (About-pituus).
- **Kustannus**: kaikki kolme kirjoittajaa + kartoittaja Opus 4.7:llä, ja LinkedIn-input pidentää syötettä. Yksi täysi ajo Janin profiilille on edelleen alle €0.50 — toimitusprojektissa hyväksyttävä.
- **Iteraatiohistoria**: v1 (Sonnet-CV, ei LinkedIn): 1 VAROITUS About 2024. v2 (Opus-CV, ei LinkedIn): 0 VAROITUS, About 2000 tasan. v3 (Opus-CV + LinkedIn-input): 1 VAROITUS About 2127, mutta sisältö olennaisesti parempi (Janin oma ääni säilyy, tilannetyypit konkretisoituvat).
