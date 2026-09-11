# Testipalvelin

Palvelin `212.147.236.61` on Ubuntu 24.04. Intering käyttää Dockeria ja Composea;
samalla koneella Spark toimii omana systemd-palvelunaan Nginxin takana.

## Asennetut asetukset

- Docker Engine ja Compose plugin Dockerin virallisesta apt-repositorystä.
- Interingin tiedostot: `/opt/intering`; ylläpito rootin SSH-yhteydellä.
- GitHubin käyttäjä: `intering-deploy`, ei Docker-ryhmää. SSH-avain sallii vain
  `sudo -n /usr/local/sbin/intering-deploy` -komennon. Kotihakemisto ja SSH-asetukset
  ovat rootin omistuksessa.
  `.ssh` ja `authorized_keys` ovat ryhmän `intering-deploy` luettavissa
  (750 ja 640), jotta sshd voi tarkistaa avaimen käyttäjän oikeuksilla.
- Nginx: `/etc/nginx/sites-available/intering`, linkki `sites-enabled`-hakemistossa.
- Osoite: `https://212.147.236.61`, koko sivusto ja API Basic Auth -suojattuja.
  Salasanatiiviste on `/etc/nginx/intering.htpasswd` (root:www-data, 640).
- Nginx ohjaa sovellukseen `127.0.0.1:8081`. Konttien portteja ei avata verkkoon.
- HTTP ohjaa HTTPS:ään; vain ACME-varmennuspolku palvellaan suoraan hakemistosta
  `/var/www/intering-acme`.
- Nginxin asetusten alkuperäinen kopio: `/opt/intering/backups/nginx-sites-before`.

## IP-varmenteen uusiminen

Interingillä on oma Certbot-asennus `/opt/intering/bin/certbot` (uv tool), oma
konfiguraatio `/opt/intering/letsencrypt`, työhakemisto `/opt/intering/acme-work`
ja lokit `/opt/intering/acme-logs`. Tämä ei käytä Sparkin Certbot-asetuksia.

Varmenne on `intering-ip`, Let's Encryptin lyhytikäinen IP-varmenne.
`intering-cert-renew.timer` tarkistaa uusimisen kahdesti päivässä. Palvelu
`intering-cert-renew.service` suorittaa uusimisen ja onnistuneen uusimisen jälkeen
`nginx -t` sekä `systemctl reload nginx`.

Ylläpidon tarkistukset:

```sh
systemctl status intering-cert-renew.timer
journalctl -u intering-cert-renew.service
/opt/intering/bin/certbot certificates --config-dir /opt/intering/letsencrypt
```

Sparkin verkkotunnus on `spark.muuronen.fi`, backend `127.0.0.1:8000` ja
systemd-palvelu `spark-backend`. Julkaisuskriptin ei tule muuttaa näitä.

## Ensimmäinen julkaisu

Palvelimen valmistelu ei tarkoita sovelluksen julkaisua. Ennen ensimmäistä
julkaisua varmista GitHubin salaisuudet, palvelimen `.env`, tuotannon Compose ja
julkaisuskripti sekä imagepakettien lukuoikeudet ohjeen [README.md](README.md)
mukaisesti. Sovelluksen käynnistämiseen asti kirjautunut pyyntö voi palauttaa 502.

Testitunnuksia, API-avaimia tai SSH:n yksityisavainta ei tallenneta tähän repoon.
