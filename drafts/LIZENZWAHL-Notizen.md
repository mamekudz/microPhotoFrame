# ENTWURF: Lizenzwahl – nur Orientierung

**Keine Rechtsberatung.** Entscheidung und Formulierung mit Fachanwalt für Softwarelizenzen.

## Ziele (zum Abgleich mit Anwalt)

- Öffentlicher Quellcode auf GitHub
- **Klare Grenze:** Hobby/Privat vs. kommerziell
- **Kommerzieller Hebel:** separate Lizenzverträge mit Herstellern / Unternehmen

## Typische Modelle (Kurz)

| Modell | Stärken | Typische Schwäche / Aufwand |
|--------|---------|-----------------------------|
| **AGPL-3.0** + kommerzielle Lizenz | Bekannt; Netzwerk-Nutzung oft „Copyleft“; Dual-Licensing üblich | Kommerzielle Kunden wollen oft **kein** AGPL für eingebettete Produkte → Verkauf von **kommerzieller** Lizenz |
| **PolyForm Noncommercial** (o. ä.) | Explizit „keine kommerzielle Nutzung“ ohne Zusatzvertrag | Weniger verbreitet als GPL-Familie; Text genau lesen |
| **MIT/Apache** + nur „Commercial on request“ | Einfach | **Kein** rechtlicher Hebel gegen kommerzielle Nutzung ohne Vertrag – nur Marken/Support |
| **BSL** (Business Source) | Zeitversetzte Open Source möglich | Aufwand/Erklärung höher |

## Begriffe schärfen

- **„Privat“** ist im Alltag mehrdeutig (Kleinunternehmer, Verein, Content mit Werbung). Oft klarer: **„nicht-kommerziell“** wie in der gewählten Lizenz definiert – oder **AGPL** statt vager Privat-Klausel.

## Dual-Licensing Workflow (grob)

1. Copyright-Hinweis in wichtigen Dateien / zentral `NOTICE`
2. Öffentlich: eine **OSS-Lizenz** (Datei `LICENSE`)
3. Kommerziell: **separater Vertrag** („Commercial License Agreement“) – nicht nur E-Mail-Satz

## Zu klären mit Anwalt

- Wer sind die **Rechteinhaber** (alle Mitwirkenden, CLA nötig?)
- **Patente** / Drittrechte an Bildern in Demos
- **Export** / Embargo (falls relevant)

---

*Ergebnis hier dokumentieren, sobald final:*

- Gewählte Lizenz: _______________________
- Kontakt kommerziell: ___________________
- Datum Entscheidung: ____________________
