# Tuotantojulkaisu GitHub Actionsista

Julkaisu on manuaalinen: **Actions → Deploy production → Run workflow → main**. Testit, lint, build ja Chromium-selainpolku ajetaan ennen kahta GHCR-imagea. Rakennetut imaget käynnistetään eristetyssä smoke-testissä ennen niiden lähettämistä rekisteriin; testissä tarkistetaan promptit, GDPR, web ja API ilman mallikutsuja. Palvelimelle lähetetään vain kuvien muuttumattomat SHA-256-digestit. Ei automaattista julkaisua pushista tai PR:stä.

Workflow-tiedoston pitää olla GitHub-repositorion oletushaarassa, jotta workflow_dispatch näkyy. Tämän projektin oletushaara on ollut `feature/integration-e2e`; ylläpitäjä siirtää sen `main`-haaraan vasta tarvittavien PR:ien yhdistämisen jälkeen. Workflow sallii julkaisun vain `main`-haarasta. Pelkkä tiedoston lisääminen feature-haaraan ei julkaise mitään.

## Tuotantorakenne

Palvelin: Ubuntu 24.04, Docker Engine ja Compose v2 -plugin. Nykyinen natiivi Nginx ja muut sovellukset säilyvät. Compose-projekti `intering` käyttää:

- Web: `127.0.0.1:8081` → kontin 8080. Staattiset tiedostot sisältyvät web-imageen; ei vanhaa frontend-dist-volumea.
- Backend: vain Compose-verkon 8000-portti, yksi worker muistissa olevia istuntoja varten. Ei host-porttia.
- `intering_metrics_data`: metriikat ja ylläpidon promptiohitukset. Uusi julkaisu tai rollback ei poista volumea.
- Promptien oletukset sisältyvät backend-imageen. Niiden muutos julkaistaan uutena imagena; admin-ohitukset päivittyvät ilman julkaisua ja säilyvät volumessa. Palauta ohitus oletukseen, jos haluat uuden imagen version voimaan.

Hostin Nginx ohjaa erillisen Intering-hostnamen osoitteeseen `http://127.0.0.1:8081`, välittää Host-, X-Forwarded-For- ja X-Forwarded-Proto-otsakkeet, sallii 20 MB lataukset ja vähintään 300 sekunnin proxy_read_timeoutin. TLS ja tämän vaiheen basic auth hallitaan hostin Nginxissä koko sivustolle API mukaan lukien. Älä avaa 8081-porttia julkiseen verkkoon. Hostin paikallinen 8000-portti jää nykyisen palvelun käyttöön.

## Ylläpitäjän ensimmäinen asennus

Seuraavat ovat palvelimen ylläpitäjän toimia, eivät workflow:n etäkomentoja:

1. Asenna Docker Engine ja nykyinen Compose v2 -plugin. Varmista `docker compose up --wait` ja `--wait-timeout` toimivat, ja portti 8081 on vapaa.
2. Luo hakemisto ja kopioi **tarkistetut** julkaisutiedostot rootina:

   ```bash
   install -d -o root -g root -m 755 /opt/intering
   install -o root -g root -m 644 compose.production.yml /opt/intering/compose.production.yml
   install -o root -g root -m 755 deploy/intering-deploy /usr/local/sbin/intering-deploy
   install -o root -g root -m 600 deploy/production.env.example /opt/intering/.env
   ```

3. Täytä `/opt/intering/.env`: `ANTHROPIC_API_KEY` ja satunnainen `ADMIN_TOKEN`. Tiedosto root:root 600. Älä siirrä avaimia GitHubiin; ne pysyvät palvelimella.
4. Luo rajattu SSH-käyttäjä `intering-deploy`, jolla ei ole Docker-ryhmää eikä yleistä sudo-oikeutta. Käyttäjän kotihakemisto ja `.ssh/authorized_keys` ovat ylläpitäjän hallinnassa. Salli sudoersissa vain tämä komento (tarkista `visudo -cf`):

   ```sudoers
   intering-deploy ALL=(root) NOPASSWD: /usr/local/sbin/intering-deploy ""
   ```

   `""` tarkoittaa, ettei komennolle sallita argumentteja. Skripti tarkistaa tämän myös itse.

5. Asenna workflow:n julkinen SSH-avain `authorized_keys`-tiedostoon rajoituksin:

   ```text
   restrict,command="sudo -n /usr/local/sbin/intering-deploy" ssh-ed25519 AAAA... github-actions-intering
   ```

   Älä anna tälle avaimelle shelliä, tiedostosiirtoa tai porttiohjauksia. Skripti ei käytä `SSH_ORIGINAL_COMMAND`-arvoa. Rajaa käyttäjä myös SSH-palvelimen asetuksissa tarvittaessa; kotihakemiston tai authorized_keys-tiedoston muokkausoikeus ei kuulu workflow-avaimelle.

6. Tarkista hostin SSH-ed25519-hostkey riippumattomasta ylläpitoyhteydestä. Tallenna pinned known_hosts-rivi GitHubiin; workflow ei luota ajonaikaiseen `ssh-keyscan`-tulokseen.
7. Luo Nginxin TLS/basic auth -vhost ja varmista muu palvelin toimii edelleen.

Compose-tiedoston ja privileged deploy-skriptin myöhemmät muutokset asentaa ylläpitäjä tarkistettuaan ne. Workflow voi vaihtaa vain imageparin, ei palvelimen komentoja tai asetuksia.

## GitHub-asetukset

Luo environment **production**, ja sinne secrets:

| Secret | Arvo |
|---|---|
| `DEPLOY_HOST` | Palvelimen SSH-hostname tai IP |
| `DEPLOY_USER` | `intering-deploy` |
| `DEPLOY_SSH_KEY` | Vain tälle julkaisulle varattu yksityinen ed25519-avain |
| `DEPLOY_KNOWN_HOSTS` | Tarkistettu SSH-hostkey-rivi tälle hostille |

Voit asettaa environmentille reviewer-hyväksynnän ja sallia vain `main`-haaran. Actionsin `GITHUB_TOKEN` saa imagejobissa `packages:write`; palvelin ei saa GitHub-tokenia.

Kuvat ovat `ghcr.io/janimur/intering-cv-agentti-backend` ja `ghcr.io/janimur/intering-cv-agentti-web`. Julkinen repo ei yksin takaa GHCR-pakettien julkisuutta: aja ensimmäinen workflow `deploy=false`-valinnalla (build/publish ilman palvelinmuutosta), aseta molempien pakettien visibility public niiden GitHub-asetuksissa ja aja sitten workflow uudelleen `deploy=true`. Vaihtoehtoisesti asenna palvelimen rootille erillinen read:packages-kirjautuminen. Skripti käyttää rootin Docker-konfiguraatiota. Workflow rakentaa linux/amd64-imaget; palvelimen arkkitehtuurin pitää vastata tätä.

## Etärajapinta ja rollback

SSH-avaimella ei anneta etäkomentoa. Stdin sisältää täsmälleen kaksi newline-päätteistä riviä:

```text
ghcr.io/janimur/intering-cv-agentti-backend@sha256:<64 pientä heksamerkkiä>
ghcr.io/janimur/intering-cv-agentti-web@sha256:<64 pientä heksamerkkiä>
```

Muut repositoriot, tagit, lisärivit ja argumentit hylätään. `flock` sarjoittaa julkaisut. Skripti lataa molemmat kuvat, käynnistää Composen ja odottaa konttien healthcheckit sekä webin kautta API:n health-vastauksen. Onnistuminen tallentaa `/opt/intering/releases/current.env`-imageparin ja aiemman parin `previous.env`-tiedostoon.

Jos käynnistys tai terveys epäonnistuu, nykyinen imagepari palautetaan automaattisesti. Ensimmäisen julkaisun epäonnistuessa uudet kontit poistetaan, mutta data-volume säilyy. Rollback-virhe ilmoitetaan selkeästi ja vaatii ylläpitäjää. Kuvat ja julkaisutiedostot kannattaa säilyttää; automaattista image prune -ajoa ei tehdä.

Manuaalinen rollback: ylläpitäjä lukee `previous.env`-tiedoston kaksi imagearvoa ja syöttää ne samalle rajatulle stdin-rajapinnalle. Älä `source`-suorita verkosta saatuja release-tiedostoja.

Jokainen backendin uudelleenkäynnistys katkaisee muistissa olevat käyttäjäistunnot, myös rollback. Tämä julkaisu ei sisällä pysyvän käyttäjädatan migraatioita.

## Paikalliset tarkistukset

```bash
bash -n deploy/intering-deploy
shellcheck deploy/intering-deploy
uv run pytest tests/unit tests/api
```

Dockerin ollessa käytettävissä validoi Compose esimerkkimuuttujilla kuten workflow:ssa, ja rakenna molemmat Dockerfilet. Todellinen GHCR/SSH-julkaisu tehdään vasta ylläpitäjän saatua hostin ja GitHub-asetukset valmiiksi.
