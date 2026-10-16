# IIS und ASP.NET

1. IIS mit ASP.NET 4.x und .NET Extensibility aktivieren; Microsoft URL Rewrite installieren.
2. IIS-ZIP entpacken oder den IIS-EXE-Installer ausführen.
3. Eine IIS-Website mit dem Installationsverzeichnis als physischem Pfad anlegen, z. B. Port 888.
4. Einen Anwendungspool mit .NET CLR v4.0 und integrierter Pipeline verwenden.
5. Der Anwendungspool-Identität Leserechte auf die Anwendung und Schreibrechte auf `shows` geben. Den Ordner bei Bedarf vorher erstellen.
6. `web.config`, `aspx/microPhotoFrame.aspx`, `aspx/microPhotoFrame.cs` und `bin/Newtonsoft.Json.dll` müssen vorhanden sein.
7. Lokal `http://localhost:888` und anschließend die LAN-Adresse von einem zweiten Gerät prüfen.

Der Installer kopiert die Anwendung; er aktiviert IIS nicht und legt keine Website an. Vor Änderungen bestehende IIS-Konfiguration und Nutzerdaten sichern. HTTP 500.19 deutet häufig auf fehlendes URL Rewrite oder gesperrte Konfigurationsabschnitte hin. Bei Schreibfehlern die Rechte des Anwendungspools prüfen.
