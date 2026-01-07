# Apache PHP Server Setup für microPhotoFrame

**Port: 889**

## Voraussetzungen

- Apache 2.4 installiert (z.B. unter `C:\Apache24`)
- PHP 7 installiert (z.B. unter `C:\php7`)
- PHP Extension `php_zip` aktiviert

**Hinweis**: 
- Apache/PHP läuft auf Port **889**
- Nginx/PHP läuft auf Port **890**
- Node.js Express läuft auf Port **891**

## Installation

### 1. Apache-Konfiguration

1. Öffnen Sie die Apache-Konfigurationsdatei `C:\Apache24\conf\httpd.conf`

2. **Stellen Sie sicher, dass PHP bereits konfiguriert ist** (falls nicht, fügen Sie hinzu):
   ```
   LoadModule php7_module "C:/php7/php7apache2_4.dll"
   PHPIniDir "C:/php7"
   ```
   (Passen Sie die Pfade an Ihre PHP-Installation an)

3. Fügen Sie am Ende der Datei folgende Zeile hinzu:
   ```
   Include "C:/Projects/microPhotoFrame/apache/httpd-microPhotoFrame.conf"
   ```
   (Passen Sie den Pfad an Ihre Installation an)

4. **WICHTIG**: Wenn bereits eine `httpd.conf` existiert, benennen Sie sie um:
   ```
   C:\Apache24\conf\httpd.conf -> C:\Apache24\conf\httpd.conf.backup
   ```

5. Passen Sie in `apache/httpd-microPhotoFrame.conf` folgende Pfade an:
   - `DocumentRoot`: Pfad zu Ihrem microPhotoFrame-Verzeichnis (Standard: `C:/Projects/microPhotoFrame`)
   - `ErrorLog` und `CustomLog`: Pfade zu Ihren Log-Verzeichnissen

### 2. PHP-Konfiguration

1. Öffnen Sie `C:\php7\php.ini`

2. Stellen Sie sicher, dass folgende Extensions aktiviert sind:
   ```
   extension=zip
   ```

3. Setzen Sie folgende Werte:
   ```
   upload_max_filesize = 500M
   post_max_size = 500M
   max_execution_time = 3600
   memory_limit = 512M
   ```

### 3. .htaccess

Die `.htaccess` Datei liegt bereits im Root-Verzeichnis des Projekts.

**WICHTIG**: Wenn bereits eine `.htaccess` existiert, benennen Sie sie um:
```
.htaccess -> .htaccess.backup
```

### 4. Apache starten

1. Öffnen Sie eine Administrator-Eingabeaufforderung

2. Starten Sie Apache:
   ```
   C:\Apache24\bin\httpd.exe -k start
   ```

3. Prüfen Sie, ob der Server läuft:
   ```
   C:\Apache24\bin\httpd.exe -k restart
   ```

### 5. Testen

Öffnen Sie in Ihrem Browser:
```
http://localhost:889
```

## Fehlerbehebung

- **Port bereits belegt**: Ändern Sie den Port in `apache/httpd-microPhotoFrame.conf` von `889` auf einen anderen Port
- **PHP wird nicht geladen**: Prüfen Sie den Pfad zu `php7apache2_4.dll` in der Konfiguration
- **403 Forbidden**: Prüfen Sie die Berechtigungen im `<Directory>` Block
- **500 Internal Server Error**: Prüfen Sie die Apache Error Logs unter `C:\Apache24\logs\microPhotoFrame_error.log`

## Nginx Alternative

Falls Sie Nginx verwenden möchten, finden Sie die Konfiguration in `nginx/microPhotoFrame.conf`.

