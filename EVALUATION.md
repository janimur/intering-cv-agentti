# Self-evaluation — intering CV-agentti, vaihe 1 (promptit)

Päivämäärä: 2026-05-05
Testihenkilö: Jani Muuronen
Iteraatio: v2 (LinkedIn-prompti tiukennettu, CV-prompti tarkennettu, CV-malli vaihdettu Sonnetista Opus 4.7:ään)

## 1. Olisiko Jani itse valmis lähettämään tämän LinkedIn-Aboutin asiakkaalle?

Kyllä. About on 2000 merkkiä tasan, ei toistoa, ei itsearviointi-aloituksia, ei jargonia.

Vahva kohta: avauskoukku tekee työn ensimmäisellä lauseella — "€2.5M → €25M viidessä vuodessa, kannattavasti, täydellä P&L-vastuulla. Tämän tein Witted Megacorpissa CEO/GM-roolissa alihankintakonsultointiliiketoiminnalle — en konsulttina, vaan linjajohdossa." Numero, aikaväli, rooli, erottautuminen yhdessä ankkurissa.

Vahva kohta toinen: kappaleet ovat täydentäviä, eivät toistavia. Avauskappale tekee väitteen, "Mitä teen" -kappale konkretisoi tilannetyypit, "Vahvin näyttö" -kappale laajentaa Witted-keissin yksityiskohdiksi (prosessit, hinnoittelu, neuvottelut, AI-koulutus) jotka eivät esiinny avauksessa. Erottautumistekijät esitetään näyttönä ("Rakennan konkreettiset järjestelmät — CRM-ERP-integraatiot, KPI-dashboardit, prosessit — enkä jätä Excel-mallia ja lähde"), ei väitteenä. Loppu sulkeutuu konkreettiseen toimintakutsuun: "Mitä etsin: 4–12 kuukauden interim-toimeksiantoja CEO/COO/CCO-roolissa..." + sähköposti ja puhelin.

Heikoin kohta tässä versiossa: "Tekninen tausta (ohjelmistoarkkitehti Tieto, Wipro, Saraware) yhdistettynä yli kymmenen vuoden P&L-johtamiseen tarkoittaa, että puhun samaa kieltä sekä teknisen tiimin että hallituksen kanssa." -lause on toimiva mutta voisi olla terävämpi — "puhun samaa kieltä" on kliseen rajoilla. Yksi pieni iteraatio voisi parantaa, mutta tämä ei estä lähetystä.

## 2. Erottuuko CV interim-CV:nä?

Kyllä, selvästi. Neljä signaalia:

Ensinnäkin nimikkeet ja jaksot ovat eksplisiittisesti interim: "Interim COO @ Tekai/Reactron (5/2024–5/2025)", "Interim CCO @ Taskmill (9/2025–12/2025)". Kaikki uusimmat roolit ovat alle 12 kuukauden mittaisia ja "Interim"-etuliite on otsikossa. Vakityö-CV ei korosta roolin väliaikaisuutta.

Toiseksi positioning_summary on toimeksiantokeskeinen: "Skaalaan IT- ja tech-enabled palveluyrityksiä täydellä P&L-vastuulla. Kasvatin Witted Megacorpin alihankintaliiketoiminnan €2.5M:stä €25M:ään viidessä vuodessa CEO/GM-roolissa — en konsulttina, vaan linjajohdossa. Rakennan operatiiviset selkärangat spin-offeille, vien sijoituskierrokset maaliin ja rakennan datavetoiset myyntiorganisaatiot kun skaalaus ei onnistu." Tämä on myyntipuhe ostajalle, ei kuvaus pitkän linjan työnhausta.

Kolmanneksi key_results on tilannetyyppikohtainen ja aikasidonnainen: "spin-offin operatiivinen selkäranka käyttöön alle 6 kuukaudessa", "DD-asiat suljettu 2 viikossa". Lyhyitä, määrällisiä projektisuoritteita.

Neljänneksi vanhempi tekninen ura on tiivistetty `certifications`-osion yhdistelmälauseeseen: "Aiempi tekninen tausta (2005–2014): ohjelmistoarkkitehti ja pääprojektipäällikkö (yli 150 osallistujaa) GSM-verkkoelementtien kehityksessä — Tieto, Wipro, Saraware, Crelint, Houston Inc., Citrus Solutions; AR-yrittäjä Zibra Oy (2012–2020)." Tämä on rakenteellinen valinta joka erottaa interim-CV:n vakityö-CV:stä — vakityö-CV listaisi nämä omiksi rivikseen kronologisesti.

## 3. Onko positiointidokumentti tarpeeksi terävä?

On, ja se on edelleen vaiheen 1 selkein onnistuminen. Positiointidokumenttia ei tarvinnut iteroida — kartoittaja-prompti tuotti kerralla käyttökelpoisen lähtökohdan.

`target_situations` on poikkeuksellisen käyttökelpoinen: viisi tilannetyyppiä (skaalaus €2–30M, nearshore/offshore-käyttöönotto, spin-offin selkäranka 6kk, investor readiness, datavetoinen myyntimoottori) ovat toimeksiantolähtöisiä, eivät kompetenssikuvauksia. Kirjoittajat saivat näistä suoraan rakennusaineksia.

`differentiators` on selkeä ja erottuva: "Operaattori täydellä P&L-vastuulla €25M tasolla — johti liiketoimintaa CEO/GM-roolissa, ei tehnyt suosituksia konsulttina." Konkreettinen väite, ei adjektiivilista.

`exclusions`-lista ohjaa tehokkaasti: "Ei käytetä 'auttoi', 'tuki', 'osallistui' -tyyppistä kieltä operatiivisissa rooleissa" näkyy lopputuloksissa — Aboutissa ja CV:ssä subjekti on Jani, verbit ovat aktiivimuodossa.

Ainoa kriitti: positioning käyttää substantiivia "skaalaaja", joka voi kuulostaa konsulttiverkostosanalta. Ei kielletty lista, mutta jatkoiteraatiossa voisi harkita aktiiviverbiä ("skaalaan") substantiivin sijaan otsikoissa.

## 4. Mikä on heikoin lenkki?

Tämän iteraation jälkeen heikointa lenkkiä on vaikea osoittaa — kaikki 12 evaluate.py-kriteeriä menevät OK ilman varoituksia. Suurin riski seuraavalle testihenkilölle:

**Kartoittajan ylivahvuus → riski toiselle testihenkilölle.** Kartoittaja toimii loistavasti Janin profiililla, mutta Janilla on poikkeuksellisen kvantifioitu lippulaivasaavutus (€2.5M → €25M). Jäsenelle, jolla on vähemmän selkeä numeronäyttö, kartoittaja saattaa joutua täyttämään `flagship_story.result_quantified` -kentän heikommilla luvuilla — ja kirjoittajat rakentavat tämän varaan. Tämä riski näkyy vasta kun ajetaan toista testihenkilöä.

**CV-promptin "tiivistä vanhat roolit" -ohje tukeutuu Opus 4.7:ään.** Aiempi iteraatio Sonnetilla osoitti, että sama prompti ei tuota samaa lopputulosta heikommalla mallilla — Sonnet jätti vajaita rooleja experienceen sen sijaan että tiivistäisi ne yhdistelmälauseiksi. Mallivalinta on osa promptisuunnittelua, ei erillinen päätös. Jatkossa tämä on muistettava jos kustannussyistä halutaan kokeilla halvempia malleja CV-pinoon.

## Tekniset huomiot vaiheen 1 toteutuksesta

- **Kartoittaja**: Claude Opus 4.7 + adaptive thinking (`output_config.effort: "high"`) tuotti positioning-dokumentin jossa ei ollut yhtään tyhjää kenttää. Adaptive thinking auttoi erityisesti differentiator-erottelussa.
- **API-rajoitukset thinking-tilassa**: Opus 4.7 + thinking ei tue `temperature`-parametria eikä `tool_choice={"type": "any"}`-pakotusta. Käytetään `tool_choice={"type": "auto"}` ja luotetaan promptin output-ohjeeseen — mallin yhteistyö toimi luotettavasti kaikilla testikerroilla.
- **Mallivalinta**: alkuperäinen suunnitelma käytti Sonnet 4.5:ttä CV-pinossa kustannussyistä. Iteraatiossa vaihdettu Opus 4.7:ään, koska Sonnet ei noudattanut tarkennettua "mitattava tulos" -määritelmää (jätti vajaita rooleja experiencessa). Opus tiivistää vanhat roolit certifications-osion yhdistelmälauseeksi prompti-ohjeen mukaisesti.
- **LinkedInOutput.about**: skema ei aseta ylärajaa, ainoastaan prompti. Iteraatiossa lisätty promptiin eksplisiittinen "lyhennä alle 2000 merkkiin ennen tool-kutsua" — Opus 4.7 noudatti rajaa täsmällisesti (2000 merkkiä tasan).
- **CVDocument.experience.results**: schema-tason `min_length=2` toimi pakottavasti. Yhdistettynä prompti-ohjeeseen "ei mitattavissa olevia rivejä → jätä rooli pois" tuottaa luonnollisen ratkaisun ilman geneerisiä fallback-rivejä.
- **evaluate.py**: 12 kriteeriä, exit-koodi 0 Janin testidatalla v2-iteraatiossa. Aiempi v1-iteraatio: 1 VAROITUS (about 2024 merkkiä). v2: 0 varoitusta.
- **Kiellettyjen sanojen regex**: `\bskaalata\b` ei osu sallittuihin muotoihin "skaalaaja", "skaalannut", "skaalasin" — toimii oikein.
- **Iteraatiokustannus**: kaikki kolme kirjoittajaa Opus 4.7:llä on noin 2× kalliimpi kuin Sonnet-CV-versio. Hyväksyttävä toimitusprojektissa, jossa promptien laatu määrää tuotteen laadun.
