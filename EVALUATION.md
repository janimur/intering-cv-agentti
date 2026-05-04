# Self-evaluation — intering CV-agentti, vaihe 1 (promptit)

Päivämäärä: 2026-05-04
Testihenkilö: Jani Muuronen

## 1. Olisiko Jani itse valmis lähettämään tämän LinkedIn-Aboutin asiakkaalle?

Melkein — ei aivan sellaisenaan. About on 2024 merkkiä, 24 merkkiä yli tavoitteen 2000 (evaluate.py raportoi VAROITUS). Se ei ole kriittinen ongelma, mutta kertoo promptin hieman löysästä otteesta pituuden hallinnassa.

Vahva kohta: aloitus on napakka ja konkreettinen — "Kasvatin Witted Megacorpissa alihankintakonsultointiliiketoiminnan €2.5M:stä €25M:ään viidessä vuodessa kannattavasti — täydellä P&L-vastuulla CEO/GM-roolissa, en konsulttina." Ensimmäinen lause tekee työn: numero, aikaväli, rooli, erottautuminen. Oikea tapa aloittaa.

Heikko kohta: kolmas kappale (Wittedin lippulaivakeissi) toistaa ensimmäisen kappaleen sisältöä eri sanoilla. "Otin alihankintaliiketoiminnan vastuulleni €2.5M tasolla, määrittelin ydinprosessit..." — tämä ei tuo uutta, se on kierros tuttuun. Lisäksi "Erottaudun siinä, että yhdistän..." -aloitus on klassinen heikkous: itsearviointi toimii paremmin näyttönä kuin väitteenä.

Toimenpide: lyhennetään Wittedin lippulaivakeissi-kappale puoleen ja poistetaan "Erottaudun siinä, että..." -aloitus. Yhden prompti-kierroksen asia.

## 2. Erottuuko CV interim-CV:nä?

Kyllä, selvästi. Kolme rakenteellista signaalia erottaa sen vakityö-CV:stä:

Ensinnäkin roolit ovat lyhyitä ja niissä on eksplisiittinen "Interim"-nimike: "Interim COO @ Tekai Oy (10/2024 – 5/2025)", "Interim COO @ Reactron Technologies Oy (5/2024 – 10/2024)". Vakityö-CV ei yleensä korosta roolin väliaikaisuutta otsikossa.

Toiseksi positioning_summary on selkeästi toimeksiantokeskeinen: "Rakennan operatiiviset selkärangat spin-offeille, vien sijoituskierrokset maaliin ja rakennan datavetoiset myyntiorganisaatiot kun skaalaus ei onnistu." Tämä on myyntipuhe toimeksiantajakunnalle, ei kuvaus pitkäaikaisesta työnhausta.

Kolmanneksi key_results -lista on tilannetyyppikohtainen: "Tekai-spin-offin operatiivinen selkäranka käyttöön alle 6 kuukaudessa", "Due diligence -asiat suljettu 2 viikossa". Lyhyet, mitattavat projektisuoritukset — interim-logiikka, ei vuosivastuun kertyminen.

Vakityö-haku olisi korostanut pitkää tenure-aikaa (Witted 2018–2024 on selkeä), tiimikokoa ja organisaatiotason kehitystä. Tässä CV:ssä Witted-rooli on yksi viiden joukossa eikä hallitse rakennetta.

## 3. Onko positiointidokumentti tarpeeksi terävä?

On, ja se on vaiheen 1 selkein onnistuminen. Kolme arvioitavaa ulottuvuutta:

target_situations on poikkeuksellisen käyttökelpoinen. Viisi konkreettista tilannetyyppiä — skaalaus €2–30M, nearshore/offshore-käyttöönotto, spin-offin selkäranka 6kk, investor readiness, datavetoinen myyntimoottori — ovat toimeksiantolähtöisiä, ei kompetenssikuvauksia. Kirjoittaja voi suoraan rakentaa näistä tilannetyyppikohtaisia kappaleita.

differentiators on selkeä ja erottuva. "Operaattori täydellä P&L-vastuulla €25M tasolla — johti liiketoimintaa, ei tehnyt suosituksia" on konkreettinen väite, ei adjektiivilista. "Toistuva näyttö sama tilannetyyppi useita kertoja" -kohta on erityisen hyvä, koska se tekee väitteen toistettavuudesta.

exclusions-lista ohjaa tehokkaasti. "Ei käytetä 'auttoi', 'tuki', 'osallistui' -tyyppistä kieltä" on täsmällinen ohjaus joka näkyy lopputuloksessa — CV:ssä ja Aboutissa subjekti on Jani, verbit ovat aktiivimuodossa.

Ainoa jäänyt heikkous: positioning.primary_angle alkaa sanalla "Skaalaan IT-palveluyrityksiä" mutta sisältää heti perään "skaalaaja" — positioning-dokumentti itse käyttää substantiivia "skaalaaja" joka on suomalainen konsulttiverkostosanahirviö. Se ei ole kielletty sana, mutta herättää kysymyksen onko se differentiator vai kategoria.

## 4. Mikä on heikoin lenkki?

CV:n Codemen-rooli (9/2017–2/2018). Se on kahdella lauseella hoidettu täyte-entry jossa ei ole yhtään mitattavaa tulosta: "Loin uusia ratkaisuja ja liiketoimintaa service design -menetelmillä" ja "Vein läpi mobiilisovelluskehitystä, voice user interface -toteutuksia...". Molemmat täyttävät schema-minimivaatimuksen (2 results), mutta eivät tuota mitään ostajalle relevanttia signaalia.

Ongelma on kaksiosainen: ensinnäkin kirjoittaja-prompti ei osaa tehdä strategista valintaa siitä, jätetäänkö heikko rooli pois vai käytetäänkö se kontrastiväittämänä ("ohjelmistokehittäjä-tausta on erottautumistekijäni, ei pääviesti"). Nyt se roikkuu dokumentissa ilman selitystä miksi se on siellä. Toiseksi schema ei salli tyhjää results-listaa, joten kirjoittaja joutuu keksimään merkityksettömiä täyterivejä välttääkseen validointivirheen.

Parannus vaatisi kahta asiaa: kirjoittaja-promptiin eksplisiittinen ohje "jos vanhemmasta roolista ei ole interim-relevanttia mitattavaa tulosta, jätä koko rooli pois tai kirjoita yksi lause kontrastiväittämänä" sekä schema-muutos jossa experience.results on min_length=1 mutta prompti ohjaa vahvasti vähintään 2:een vain relevantissa materiaalissa.

## Tekniset huomiot vaiheen 1 toteutuksesta

- Claude claude-opus-4-5 + extended thinking tuotti positioning-dokumentin jossa ei ollut yhtään tyhjää kenttää (evaluate.py: OK). Extended thinking auttoi erityisesti differentiator-erottelussa.
- LinkedInOutput.about: skema ei aseta ylärajaa merkkimäärälle, ainoastaan prompti. 2024 vs 2000 -ylitys osoittaa, että pelkällä "max 2000 merkkiä" -ohjeella malli ylittää rajan. Tarvitaan joko schema-tason max_length tai promptiin eksplisiittisempi laskuohje.
- CVDocument.experience.results: min_length=2 schemassa toimii oikein (kaikki roolit täyttivät ehdon), mutta pakottaa generoimaan heikkoa sisältöä hiljaisemmille rooleille.
- evaluate.py ajaa kaikki 12 kriteeriä, exit-koodi 0 Janin testidatalla (1 VAROITUS about-pituudesta).
- Emoji-tarkistus (unicodedata.category == "So") toimii oikein — kaikki neljä output-tiedostoa puhtaita.
- Kiellettyjen sanojen regex-logiikka: `\bskaalata\b` ei osuma (positioning-dokumentissa on "skaalaaja", "skaalaantunut" jne.), mikä on oikea käytös.
