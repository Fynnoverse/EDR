# OSRM und Map auf fynnovation.com

Diese Konfiguration passt zum bestehenden Host-Nginx und den Verzeichnissen
`~/SimRail/edr` und `~/SimRail/map-v2`. `nginx/nginx.conf` ist ein altes
Beispiel mit `example.com` und wird von diesem Compose-Stack nicht verwendet.

| Dienst | Host-Adresse |
| --- | --- |
| frontend | 127.0.0.1:9080 |
| backend | 127.0.0.1:9081 |
| map | 127.0.0.1:9082 |
| osrm | 127.0.0.1:9083 |

## Buildfehler beheben und starten

Der alte Build scheiterte an 404-Antworten fuer Debian-Pakete waehrend
`apt-get upgrade` im OSRM-Image. Der neue Build installiert nur benoetigte
Werkzeuge in einer separaten Debian-Bookworm-Stufe. Im OSRM-Image laufen
keine APT-Befehle. Die OSRM-Version bleibt fuer Datenerzeugung und Betrieb
identisch. Ein Docker-Daemon innerhalb des Containers ist nicht erforderlich.

Nach Uebertragung bzw. Commit und Push der geaenderten Dateien:

```bash
cd ~/SimRail/edr
git pull --ff-only
docker compose config --quiet
docker compose build --pull osrm
docker compose up -d osrm backend
docker compose logs --tail=100 osrm
```

Die bestehende `.env` mit `STEAM_API_KEY` behalten. Das Backend bekommt
`OSRM_API_URL=http://osrm:5000/`. Seine Aktualisierung ist dafuer erforderlich.
Der erste Build laedt Polen herunter und verarbeitet die Eisenbahndaten.
Das benoetigt Zeit, RAM und Plattenplatz. Es werden bis zu 1000 Wegpunkte pro
Route akzeptiert. OSM-Routen sind keine verbindlichen SimRail-Fahrstrassen.

## Vorhandenen Nginx ergaenzen

Die Datei `nginx/map-locations.conf` ist ein Snippet fuer einen Serverblock,
keine vollstaendige Nginx-Konfiguration. Auf dem Server installieren:

```bash
cd ~/SimRail/edr
sudo install -D -m 644 nginx/map-locations.conf /etc/nginx/snippets/simrail-map-locations.conf
```

Im vorhandenen HTTPS-Serverblock mit
`server_name map.edr.fynnovation.com;` diese Zeile ergaenzen:

```nginx
include /etc/nginx/snippets/simrail-map-locations.conf;
```

Bereits vorhandene `location /routing/`- oder `location /api/`-Bloecke im selben
Serverblock durch das Snippet ersetzen, damit keine doppelten Locations entstehen.
Zertifikate und die bestehende `location /` zu `http://127.0.0.1:9082` behalten.
Die EDR-Domain bleibt unveraendert. Keine zusaetzliche Routing-Domain erforderlich.
Die abschliessenden Slashes in `proxy_pass` entfernen `/api/` bzw. `/routing/`.

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -i 'http://127.0.0.1:9083/route/v1/train/19.02,50.26;19.10,50.30?overview=full&geometries=geojson'
curl -i 'https://map.edr.fynnovation.com/routing/route/v1/train/19.02,50.26;19.10,50.30?overview=full&geometries=geojson'
curl -i 'https://map.edr.fynnovation.com/api/servers'
```

Die Routing-Antwort muss JSON enthalten; erfolgreiche Routen haben `code: Ok`.
`NoRoute` bedeutet, dass der Dienst erreichbar ist, aber keine Route zwischen
den Punkten gefunden hat. Ein HTML-404 spricht fuer die falsche Nginx-Location;
502 fuer einen nicht erreichbaren Container. Auf der Map danach Retry route
waehlen oder den Zug erneut auswaehlen. Die Map muss `/routing` als Routing-URL
verwenden (im lokalen Dockerfile bereits gesetzt); sonst neu bauen.

Quellen: [OSRM](https://github.com/Project-OSRM/osrm-backend/tree/v5.27.1)
und [Nginx proxy_pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).
