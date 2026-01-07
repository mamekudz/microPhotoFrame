# Nginx PHP Server Setup für microPhotoFrame

**Port: 890**

## Voraussetzungen

- Nginx installiert (z.B. unter `C:\nginx`)
- PHP 7 mit PHP-FPM installiert (z.B. unter `C:\php7`)
- PHP Extension `php_zip` aktiviert

**Hinweis**: 
- Apache/PHP läuft auf Port **889**
- Nginx/PHP läuft auf Port **890**
- Node.js Express läuft auf Port **891**

## Installation

### 1. PHP-FPM Konfiguration

1. Öffnen Sie die PHP-FPM-Konfigurationsdatei (normalerweise `C:\php7\php-fpm.conf` oder `C:\php7\etc\php-fpm.conf`)

2. Stellen Sie sicher, dass PHP-FPM auf Port 9000 läuft:
   ```
   listen = 127.0.0.1:9000
   ```

3. Stellen Sie sicher, dass folgende Extensions aktiviert sind in `php.ini`:
   ```
   extension=zip
   ```

4. Setzen Sie folgende Werte in `php.ini`:
   ```
   upload_max_filesize = 500M
   post_max_size = 500M
   max_execution_time = 3600
   memory_limit = 512M
   ```

### 2. Nginx-Konfiguration

1. Öffnen Sie die Nginx-Hauptkonfigurationsdatei `C:\nginx\conf\nginx.conf`

2. Fügen Sie am Ende der `http`-Sektion folgende Zeile hinzu:
   ```
   include "C:/Projects/microPhotoFrame/nginx/microPhotoFrame.conf";
   ```
   (Passen Sie den Pfad an Ihre Installation an)

3. **WICHTIG**: Wenn bereits eine `nginx.conf` existiert, benennen Sie sie um:
   ```
   C:\nginx\conf\nginx.conf -> C:\nginx\conf\nginx.conf.backup
   ```

4. Passen Sie in `nginx/microPhotoFrame.conf` folgende Pfade an:
   - `root`: Pfad zu Ihrem microPhotoFrame-Verzeichnis (Standard: `C:/Projects/microPhotoFrame`)
   - `access_log` und `error_log`: Pfade zu Ihren Log-Verzeichnissen
   - `fastcgi_pass`: Port für PHP-FPM (Standard: `127.0.0.1:9000`)

### 3. PHP-CGI starten

**Hinweis**: Unter Windows wird PHP-CGI anstelle von PHP-FPM verwendet.

1. **Option 1: Batch-Skript verwenden** (empfohlen)
   ```
   nginx\START_PHP_CGI.bat
   ```

2. **Option 2: Manuell starten**
   Öffnen Sie eine Eingabeaufforderung und führen Sie aus:
   ```
   C:\php7\php-cgi.exe -b 127.0.0.1:9000 -c C:\php7\php.ini
   ```
   **Wichtig**: Lassen Sie dieses Fenster geöffnet, damit PHP-CGI läuft.

3. **SQL Server Extension deaktivieren** (optional, um Warnungen zu vermeiden)
   Falls Sie eine Warnung über `sqlsrv_74_ts_x86` sehen, können Sie diese Extension in `php.ini` auskommentieren:
   ```
   ;extension = sqlsrv_74_ts_x86
   ;extension = pdo_sqlsrv_74_ts_x86
   ```
   Diese Extensions werden für microPhotoFrame nicht benötigt.

### 4. Nginx starten

1. Öffnen Sie eine Eingabeaufforderung

2. Testen Sie die Konfiguration:
   ```
   C:\nginx\nginx.exe -t
   ```

3. Starten Sie Nginx:
   ```
   C:\nginx\nginx.exe
   ```

4. Prüfen Sie, ob der Server läuft:
   ```
   C:\nginx\nginx.exe -s reload
   ```

### 5. Testen

Öffnen Sie in Ihrem Browser:
```
http://localhost:890
```

## Fehlerbehebung

- **Port bereits belegt**: Ändern Sie den Port in `nginx/microPhotoFrame.conf` von `889` auf einen anderen Port
- **PHP-FPM wird nicht erreicht**: Prüfen Sie, ob PHP-FPM läuft und auf Port 9000 hört
- **403 Forbidden**: Prüfen Sie die Berechtigungen für das Root-Verzeichnis
- **500 Internal Server Error**: Prüfen Sie die Nginx Error Logs unter `C:\nginx\logs\microPhotoFrame_error.log`
- **502 Bad Gateway**: Prüfen Sie, ob PHP-FPM läuft und auf dem konfigurierten Port hört

## Routing-Logik

Die Nginx-Konfiguration implementiert die gleiche Routing-Logik wie IIS:

1. **Statische Dateien** (favicon.ico, /models/, .ink, .json, etc.) werden direkt serviert
2. **URLs mit Query-String** (`?action=...`) werden an `php/microPhotoFrame.php` weitergeleitet
3. **Alle anderen URLs** werden an `php/microPhotoFrame.php` weitergeleitet, das dann `index.html` serviert, wenn keine Query-String vorhanden ist

Dies stellt sicher, dass die `index.html` und der gesamte Client bei allen Servern identisch sind.

