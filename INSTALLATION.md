# microPhotoFrame Server Installation

Dieses Projekt unterstützt vier Server-Implementierungen:

1. **IIS/ASP.NET** (Standard, Port 888)
2. **Apache/PHP** (Port 889)
3. **Nginx/PHP** (Port 890)
4. **Node.js Express** (Port 891) ✅ **Vollständig kompatibel mit ASP.NET**

## Schnellstart

### IIS/ASP.NET (Standard)

Siehe `docs/iis_aspx_server.md`

### Apache/PHP

1. Apache-Konfiguration einbinden:
   ```
   Include "C:/Projects/microPhotoFrame/apache/httpd-microPhotoFrame.conf"
   ```
   in `C:\Apache24\conf\httpd.conf` hinzufügen

2. Pfade in `apache/httpd-microPhotoFrame.conf` anpassen

3. Apache starten:
   ```
   C:\Apache24\bin\httpd.exe -k start
   ```

4. Testen: http://localhost:889

Siehe `docs/Apache_PHP_server.md` für Details.

### Nginx/PHP

1. Nginx-Konfiguration einbinden:
   ```
   include "C:/Projects/microPhotoFrame/nginx/microPhotoFrame.conf";
   ```
   in Nginx-Konfiguration hinzufügen

2. Pfade in `nginx/microPhotoFrame.conf` anpassen

3. Nginx starten

4. Testen: http://localhost:890

Siehe `docs/NGINX_PHP_server.md` für Details.

### Node.js Express

1. Dependencies installieren:
   ```bash
   cd node
   npm install
   ```

2. Server starten:
   ```bash
   npm start
   ```

3. Testen: http://localhost:891

Siehe `docs/NodeExpress_server.md` für Details.

## Wichtige Hinweise

- **Bestehende Konfigurationsdateien**: Wenn bereits `httpd.conf` oder `.htaccess` existieren, benennen Sie sie vorher um (z.B. `.backup`)
- **Pfade anpassen**: Alle Pfade in den Konfigurationsdateien müssen an Ihre Installation angepasst werden
- **Ports**: Standard-Ports können geändert werden:
  - IIS: 888 (in IIS-Konfiguration)
  - Apache/PHP: 889 (in `apache/httpd-microPhotoFrame.conf`)
  - Nginx/PHP: 890 (in `nginx/microPhotoFrame.conf`)
  - Node.js Express: 891 (in `node/server.js`)

## Verzeichnisstruktur

```
microPhotoFrame/
├── aspx/              # ASP.NET Server (IIS)
│   ├── microPhotoFrame.aspx
│   └── microPhotoFrame.cs
├── php/               # PHP Server
│   └── microPhotoFrame.php
├── node/              # Node.js Express Server
│   ├── server.js
│   └── package.json
├── apache/            # Apache Konfiguration
│   └── httpd-microPhotoFrame.conf
├── nginx/             # Nginx Konfiguration
│   └── microPhotoFrame.conf
├── .htaccess          # Apache .htaccess
└── web.config         # IIS Konfiguration
```

