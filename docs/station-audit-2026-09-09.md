# Stations- und Gruppenprüfung vom 9. September 2026

Alle **68 bespielbaren Stellwerke** aus der offiziellen SimRail-Stationsliste sind im EDR vorhanden. Ihre **20 Unterstationen** sind jetzt vollständig den **12 Stationsgruppen** zugeordnet. Neun Unterstationen wurden bei dieser Prüfung ergänzt. Der vollständige Fahrplan enthält insgesamt 338 unterschiedliche Punkte, einschließlich Haltepunkten und Zielen außerhalb des bespielbaren Netzes.

## Quellen und Methode

- Offizielle Stationslisten: [DE1](https://panel.simrail.eu:8084/stations-open?serverCode=de1), [INT9](https://panel.simrail.eu:8084/stations-open?serverCode=int9).
- Vollständige offizielle Fahrpläne: [DE1](https://api.simrail.eu:8082/api/getAllTimetables?serverCode=de1), [INT9](https://api.simrail.eu:8082/api/getAllTimetables?serverCode=int9), jeweils 1.973 Züge.
- Zusätzlicher Abgleich mit dem [offiziellen EDR-Fahrplan](https://api.simrail.eu:8082/api/getEDRTimetables?serverCode=de1) und der [offiziellen EDR-Ansicht Koluszki](https://panel.simrail.eu:8093/?stationId=1803&serverCode=de1).
- Gruppenzugehörigkeit folgt dem Feld `supervisedBy` des vollständigen Fahrplans und den numerischen `pointId`-Werten. Gleiche Namensanfänge reichen nicht als Gruppennachweis: Łazy, Łazy Ła und Łazy Łc bleiben beispielsweise getrennte Stellwerke.
- Richtungen beziehen sich auf die bestehende Stellpult-Ausrichtung. Ergänzte Unterstationen behalten die entsprechenden äußeren Streckenäste ihrer Stellwerksgruppe. Grundlage sind die bestehenden Pultzuordnungen, die tatsächliche Fahrplanfolge und die Stellwerksbilder aus der offiziellen Stations-API, zum Beispiel [Dąbrowa Górnicza Ząbkowice](https://api.simrail.eu:8083/Thumbnails/Stations/dz1m.jpg), [Sosnowiec Kazimierz](https://api.simrail.eu:8083/Thumbnails/Stations/skz1m.jpg), [Łódź Żabieniec](https://api.simrail.eu:8083/Thumbnails/Stations/LZ1m.jpg) und [Płyćwia](https://api.simrail.eu:8083/Thumbnails/Stations/pl1m.jpg).

Der [gespeicherte Prüfdatenbestand](../backend/test/fixtures/station-audit-2026-09-09.json) enthält alle 68 Stellwerke, alle 338 beobachteten Punktnamen, die 20 offiziellen Unterstationszuordnungen, 669 unterschiedliche Nachbar-/Strecken-/Ein-Ausfahrt-Kombinationen und 13 ausgewählte Zugfahrpläne. Er enthält keine Spielerkonten oder Zugangsdaten. Die Quelladressen und SHA-256-Prüfsummen der beiden vollständigen Fahrplanabrufe sind ebenfalls gespeichert.

## Vollständige Stationsgruppen

| Stellwerk | Zugeordnete Unterstationen | Änderung dieser Prüfung |
| --- | --- | --- |
| Dąbrowa Górnicza Ząbkowice | DZA (735), GTB (736) | Beide in die Gruppe aufgenommen |
| Koluszki | PZS R145 (1806), PZS R154 (1807) | Eigene Richtungszuordnungen ergänzt |
| Łazy | Łazy Ł11 (2373) | Ergänzt |
| Łazy Ła | Łazy Grupa Węglarkowa ŁGW (2372) | Ergänzt |
| Łódź Kaliska | PZS R219-R227 (5703) | Schreibweise an API angepasst |
| Łódź Widzew | PZS R3 (2458) | Ergänzt |
| Łódź Żabieniec | GT (2464) | Ergänzt |
| Łowicz Główny | PZS R1 (5522), PZS R12 (5523), PZS R24-R31 (5524) | Bestätigt |
| Płyćwia | GT (3252) | Ergänzt |
| Skierniewice | GT 201-208 (3878), M PZS (3880), P PZS (3881), S PZS (3892) | Bestätigt |
| Sosnowiec Główny | Sosnowiec Gł. pzs R52 (3991) | Bestätigt |
| Sosnowiec Kazimierz | PZS SKZ1 (4004), PZS SKZ2 (4005) | Beide ergänzt |

Die übrigen 56 bespielbaren Stellwerke haben im geprüften vollständigen Fahrplan keine weiteren über `supervisedBy` zugeordneten Unterstationen. Der Prüfdatenbestand führt auch diese Stellwerke einzeln auf. Nicht bespielbare Nachbarbahnhöfe und Haltepunkte bleiben als Gleisziele erhalten; sie werden nicht wegen eines ähnlichen Namens in eine Stellwerksgruppe verschoben.

## Korrekturen an Gleiszielen

`line` bezeichnet in den geprüften SimRail-Daten die vom aktuellen Punkt **abgehende** Strecke. Die Einfahrt verwendet daher die Strecke des vorherigen Punktes, die Ausfahrt die Strecke des aktuellen Punktes. Die bisherige Zuordnung war um einen Punkt verschoben.

Beleg: Zug 21250 fährt Stare Grudze (15) → Łowicz Przedmieście (532) → Łowicz Główny (3). In Łowicz Przedmieście lautet das Ausfahrziel deshalb **Łowicz Główny, Strecke 532, oben**, nicht Strecke 3. Zug 12251 bestätigt die Gegenrichtung: Łowicz Główny (532) → Łowicz Przedmieście (15); hier ist 532 die Einfahrstrecke.

Weitere behobene Lücken:

- Eigene Richtungsprofile für Koluszki PZS R145/R154 und die neun ergänzten Unterstationen.
- Fehlende Zwischen- bzw. direkte Ziele bei Tunel, Płyćwia/Rogów, Łódź Chojny und Warszawa Włochy.
- Interne Nachbarpunkte einer Gruppe werden ausgeblendet; die tatsächliche äußere Ein-/Ausfahrt bleibt am jeweiligen Gruppenpunkt erhalten.
- Umfahrungszüge ohne Halt am Hauptpunkt bleiben genau einmal mit allen durchfahrenen Unterstationen sichtbar. Beispiel 3720: Rokiciny → Koluszki PZS R154 → Koluszki PZS R145 → Gałkówek.
- Gleiche Zielnamen auf unterschiedlichen Strecken werden nicht mehr als identische Einträge zusammengefasst.
- Alle registrierten Unterstationen lassen sich auch einzeln über die API abrufen. Ein ungültiger alter `DGZ`-Eintrag mit undefinierter Stationsnummer wurde entfernt.

## Prüfung und Grenzen

Für beide vollständigen Fahrpläne wurden die echten gruppierten Backend-Antworten erzeugt: **34.410 Zugzeilen**, **40.652 zugehörige Stationspunkte** und **68.820 äußere Ein-/Ausfahrten**. Kein erwarteter Gruppenpunkt ging verloren, kein Zug wurde durch das Zusammenführen doppelt angezeigt und jedes vorkommende äußere Nachbarziel hatte eine Richtungszuordnung. Die 669 unterschiedlichen Kombinationen umfassen zusätzlich interne Verbindungen für die Einzelansicht.

Die gespeicherten Regressionstests prüfen Stationsvollständigkeit, Gruppen, Richtungsabdeckung, Umfahrungen, Einzelabrufe und die Streckenwechsel in beiden Fahrtrichtungen. Frontendtests prüfen die sichtbaren Pfeile, Streckennummern und die Unterscheidung gleicher Ziele auf unterschiedlichen Strecken.

Ergebnis: **7 Backendtests und 98 Frontendtests in 15 Testsuiten bestanden**, beide TypeScript-Prüfungen erfolgreich. Im vorhandenen Tooltip-Test erscheint weiterhin eine `findDOMNode`-Deprecation-Warnung der Tooltip-Bibliothek; die neuen Gruppen-/Zieltests laufen ohne diese Warnung.

Ausführen: im Verzeichnis `backend` mit `npm test`; im Verzeichnis `frontend` mit `CI=true npm test -- --watchAll=false --runInBand` (unter PowerShell die Umgebungsvariable vorher setzen). Beide Projekte lassen sich zusätzlich mit `npx tsc --noEmit` prüfen.

Die Vollständigkeit gilt für die abgerufenen Stations- und Fahrplandaten vom 9. September 2026. Sie belegt die Abdeckung des aktuellen Fahrplans, nicht jede denkbare Sonderfahrt oder eine signalgenaue Neuvermessung aller Stellpulte. Neue Serverinhalte müssen erneut gegen die Stationsliste und `supervisedBy` geprüft werden. Diese Arbeit ändert die lokale Projektversion; ein Deployment ist nicht Teil der Prüfung.
