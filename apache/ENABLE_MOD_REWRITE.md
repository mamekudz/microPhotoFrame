# mod_rewrite für Apache aktivieren

## Problem

Wenn Sie die Fehlermeldung sehen:
```
Invalid command 'RewriteEngine', perhaps misspelled or defined by a module not included
```

bedeutet das, dass das `mod_rewrite` Modul nicht aktiviert ist.

## Lösung

### 1. Öffnen Sie die Apache-Konfigurationsdatei

```
C:\Apache24\conf\httpd.conf
```

### 2. Suchen Sie nach der Zeile

```
#LoadModule rewrite_module modules/mod_rewrite.so
```

### 3. Entfernen Sie das `#` am Anfang der Zeile

Ändern Sie:
```
#LoadModule rewrite_module modules/mod_rewrite.so
```

zu:
```
LoadModule rewrite_module modules/mod_rewrite.so
```

### 4. Prüfen Sie, ob mod_rewrite aktiviert ist

Führen Sie aus:
```powershell
C:\Apache24\bin\httpd.exe -M | findstr rewrite
```

Wenn `rewrite_module` angezeigt wird, ist es aktiviert.

### 5. Apache neu starten

```powershell
C:\Apache24\bin\httpd.exe -k restart
```

## Alternative: mod_rewrite nicht benötigt

Falls Sie mod_rewrite nicht aktivieren können oder möchten, können Sie die API-Aufrufe direkt an `php/microPhotoFrame.php` richten:

```
http://localhost:889/php/microPhotoFrame.php?action=getShows
```

Die .htaccess wurde bereits angepasst, um mod_rewrite nur zu verwenden, wenn es verfügbar ist.

