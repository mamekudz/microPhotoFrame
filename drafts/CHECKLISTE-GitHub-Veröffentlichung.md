# ENTWURF: Checkliste GitHub-Veröffentlichung (nichts vergessen)

Abhaken, wenn ihr live geht. Reihenfolge nur als Vorschlag.

## Repository & Inhalt

- [ ] **Lizenzentscheid** getroffen und `LICENSE` Datei im Root (korrekte SPDX-ID / vollständiger Text)
- [ ] **README** aktualisiert: Lizenz-Abschnitt + Link zu `LICENSE` (Text aus `README-Lizenz-Sektion-*.md` übernehmen)
- [ ] Optional: **`COMMERCIAL.md`** oder Sektion in README mit Kontakt für kommerzielle Anfragen
- [ ] **`.gitignore`** geprüft: keine Secrets, keine riesigen Binär-Blobs, keine personenbezogenen Testdaten
- [ ] **Keine Passwörter/Keys** in Historie (ggf. `git log` / Secret-Scan)
- [ ] **Drittanbieter-Lizenzen** der Abhängigkeiten erwähnt (Firmware-Libs, npm-Pakete) – kurz in README oder `NOTICE` / `THIRD_PARTY`

## Rechtliches & Kommunikation (mit Anwalt/Fachperson klären)

- [ ] Begriff **„privat“ vs. „nicht-kommerziell“** in der gewählten Lizenz konsistent
- [ ] **Marken:** `TRADEMARKS.md` oder README-Hinweis (Logo, Produktname)
- [ ] **Haftungsausschluss** wo üblich (README-Kurzform + Lizenztext)
- [ ] **Impressum/Datenschutz** falls ihr auf Seiten verlinkt, die personenbezogene Daten sammeln

## Technische Nachvollziehbarkeit

- [ ] **Build-Anleitung** Firmware (PlatformIO) geprüft auf frischem Rechner
- [ ] **Unterstützte Hardware** explizit (reTerminal, ggf. NeoFrame als „experimental“ bis stabil)
- [ ] **Bekannte Einschränkungen** kurz listen (Display-Größen, Server-Komponente, …)
- [ ] **Versionierung / Releases** – z. B. GitHub Releases mit Changelog

## Kommerzielles Angebot

- [ ] **Kontaktweg** funktioniert (E-Mail-Postfach oder Formular)
- [ ] **Intern:** Preisrahmen, was inkludiert ist, Muster-Vertrag (Entwurf)
- [ ] **OEM-Pitch** nach `OEM-Hersteller-Ansprech-Entwurf.md` vorbereitet, **nach** Referenz-Implementation

## NSIS / Installer im Repo (falls mit veröffentlicht)

- [ ] Prüfen, ob **NSIS-Binary-Baum** wirklich ins öffentliche Repo soll (Größe, Lizenz NSIS) – ggf. nur Skripte + Download-Hinweis
- [ ] Installer-Assets (Icons) **lizenziert** oder eigene Werke

## Nach der Veröffentlichung

- [ ] **Issue-Templates** / **Contributing** (optional) – Erwartungen an PRs
- [ ] **Security:** `SECURITY.md` mit Meldeweg für Schwachstellen (optional, aber professionell)

---

*Diese Liste ist ein Arbeitsmittel, kein Rechtsdokument.*
