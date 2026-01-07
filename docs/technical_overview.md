
**English**

## Components of the µPhotoFrame Project

# Client
Users can manage (photo) shows and fill them with their own photos via a single-page application using any browser. Entire photo albums can be automatically processed here for the special characteristics of e-ink displays (colors, dithering, tone values) and uploaded. The image cropping for the respective landscape and portrait formats is done using local AI.

# Server
The microPhotoFrame server is available for various systems: IIS/C#, PHP/Apache/NGINX, or Node Express. A database server is not required, and user management is also not necessary or intended. Anyone who knows the host-channel URL can edit the shows and photos. Everything is kept as simple as possible.
Packages for the various servers can be created according to specifications using a Gulp script. Users can configure the type of server, and one server can also serve multiple host-channel URLs.

# Firmware
The firmware enters configuration mode when first turned on or after holding the forward and back buttons for more than 5 seconds. In this mode, users can configure the WiFi connection by selecting a WLAN connection with the erPhotoFrame. By selecting the WLAN, they automatically reach the configuration page. Here, not only the local WLAN (SSID, password) must be specified, with which the microPhotoFrame will later connect to the local WLAN, but also the host-channel URL must be specified so that the microPhotoFrame knows from which server and directory the images should be loaded and displayed.

# Host-Channel-URL and Photo Shows
The server and directory used for the microPhotoFrame photo shows are determined via the host-channel URL. This URL must be specified at the reTerminal and is recorded together with the WiFi configuration. A server can serve various channels, and users of terminals running the microPhotoFrame firmware can determine which channel they want to see during configuration via the host-channel URL.

Each channel can have any number of (photo) shows. A show always includes any number of photos for a specific display, as well as information about how long a single image should be displayed, at what times of day image changes should occur, and how the selection of images should be made (random, sequential, etc.). A display corresponds to a specific e-ink screen with a specific size, resolution, and color selection. The different e-ink screens each have their own identification code. microPhotoFrame terminals can only display shows that match their installed screen.

The following e-ink screens are currently defined and usable:

**Monochrome (B&W) Models**
* **B&W 1.54"** · 200x200 (ID: 0)
* **B&W 2.13"** · 250x122 (ID: 1)
* **B&W 2.9"** · 296x128 (ID: 2)
* **B&W 4.2"** · 400x300 (ID: 3)
* **B&W 7.5"** · 800x480 (ID: 4)
* **B&W 10.3"** · 1872x1404 · Carta/Mobius (ID: 5)
* **B&W 13.3"** · 2200x1650 · Carta/Fina (ID: 6)


**Spectra 6 (Full Color Models)**
* **Spectra 6 1.69" Round** · 400x400 (ID: 7)
* **Spectra 6 4.0"** · 600x400 (ID: 8)
* **Spectra 6 7.3"** · 800x480 (ID: 9)
* **Spectra 6 8.14"** · 1024x576 (ID: A)
* **Spectra 6 13.3"** · 1600x1200 (ID: B)
* **Spectra 6 25.3"** · 3200x1800 · Signage (ID: C)
* **Spectra 6 28.5"** · 2160x3060 · Poster (ID: D)
* **Spectra 6 31.5"** · 2560x1440 (ID: E)
* **Spectra 6 32.0"** · 2560x1440 (ID: F)
* **Spectra 6 43.0"** · 3840x2160 · UHD (ID: G)


**Spectra (3-Color: BWR / BWY)**
* **Spectra BWR 1.54"** · 200x200 (ID: H)
* **Spectra BWR 2.13"** · 250x122 (ID: I)
* **Spectra BWR 2.7"** · 264x176 (ID: J)
* **Spectra BWR 2.9"** · 296x128 (ID: K)
* **Spectra BWR 4.2"** · 400x300 (ID: L)
* **Spectra BWR 5.83"** · 648x480 (ID: M)
* **Spectra BWR 7.5"** · 800x480 (ID: N)
* **Spectra BWY 2.13"** · 250x122 (ID: O)
* **Spectra BWR 12.48"** · 1304x984 (ID: P)


**Spectra 3100 (4-Color: BWRY)**
* **Spectra 3100 2.13"** · 212x104 (ID: Q)
* **Spectra 3100 2.66"** · 296x152 (ID: R)

<br><br>

Terminal owners can only see channels if they know the correct host-channel URL, just as users can only edit shows on the microPhotoFrame server if they know its host-channel URL.

Thus, each channel can serve multiple different terminals with different screens. Only one show can be active at the same time per screen type. "Active" means that microPhotoFrame terminals display this show.

The images are stored in a special format (image/ink, or extension .ink) and are only usable for a specific e-ink screen or specifically prepared for it. The header of these .ink files indicates for which e-ink screen the photo was prepared, which orientation it has (landscape or portrait), and which dithering mode was used during image conversion.

[Back to main page](../README.md).

---

**Deutsch**

## Komponenten des microPhotoFrames Projektes

# Client
Über eine Single-Page-Applikation können Anwender die (Foto-)Shows mit jedem Browser verwalten und mit eigenen Fotos befüllen. Ganze Fotoalben lassen sich hier automatisch für die Besonderheiten der e-Ink-Bildschirme (Farben, Rasterung, Tonerwerte) aufbereiten und hochladen. Der Bildzuschnitt für das jeweilige Quer- und Hochformat erfolgt dabei mithilfe einer lokalen KI.

# Server
Der microPhotoFrame-Server ist für verschiedene Systeme verfügbar, IIS/C#, PHP/Apache/NGNIX oder Node Express. Ein Datenbank-Server wird nicht benötigt, eine Benutzerverwaltung ist auch nicht notwendig bzw. vorgesehen. Jeder, der die Host-Channel-URL kennt, kann die Shows und Fotos bearbeiten. Alles ist möglichst einfach aufgebaut.
Mittels eines Gulp-Scripts können Pakete für die verschiedenen Server nach Vorgabe erstellt werden. Der Anwender kann hierbei die Art des Servers konfigurieren, wobei ein Server auch meherere Host-Channel-URLs bedienen kann.

# Firmware
Die Firmware wird beim ersten Einschalten oder nach Gedrückthalten von mehr als 5 Sekunden der Vor- und Zurücktaste in den Konfigurationsmodus versetzt. In diesem Modus kann der Anwender die WiFi-Verbdindung konfigurieren, indem er eine WLAN-Verbindung mit dem erPhotoTerminal auswählt. Durch die Auswahl des WLANs gelangt er automatisch auf die Konfigurationsseite. Hier muss dann nicht nur das lokale WLAN (SSID, Kennwort) angegeben werden, mit dem sich später das microPhotoFrame in das lokale WLAN einwählt, zudem muss noch dei Host-Channel-URL angeben werden, damit das microPhotoFrame weiss, von welchem Server und Verzeichnis die Bilder geladen und angezeigt werden sollen.

# Host-Channel-URL und Foto-Shows
Über die Host-Channel-URL wird der Server und das Verzeichnis bestimmt, welches für die microPhotoFrame Foto-Shows verwendet wird. Diese URL muss beim reTerminal angegeben werden und wird zusammen mit der WiFi-Konfiguration erfasst. Ein Server kann hierbei verschiedene Kanäle (Channels) bedienen, die Benutzer der Terminals, auf denen die microPhotoFrame Firmware läuft, können bei der Konfiguration über die Host-Channel-URL bestimmen, welchen Kanal sie sehen möchten.

Jeder Kanal kann über beliebig viele (Foto-)Shows verfügen. Eine Show umfasst immer eine beliebige Anzahl an Fotos für ein bestinnmtes Display sowie Information darüber, wie lange ein einzelnes Bild angezeigt werden soll, zu welchen Tageszeiten Bildwechsel erfolgen sollen und wie die Auswahl der Bilder erfolgen soll (zufällig, squenziell etc.). Ein Display entspricht dabei einem bestimmten E-Ink-Bildschirm mit einer spezifischen Größe, Auflösung und Farbenauswahl. Die unterschiedlichen e-Ink-Bildschirme besitzen hierfür jeweils eine eigene Identifikationskennung. Die microPhotoFrame-Terminals können nur Shows anzeigen, die ihrem verbauten Bildschirm entsprechen.

Folgende e-Ink-Bildschirme sind bisher definiert und nutzbar:

**Monochrome (S/W) Modelle**
* **B&W 1,54"** · 200x200 (ID: 0)
* **B&W 2,13"** · 250x122 (ID: 1)
* **B&W 2,9"** · 296x128 (ID: 2)
* **B&W 4,2"** · 400x300 (ID: 3)
* **B&W 7,5"** · 800x480 (ID: 4)
* **B&W 10,3"** · 1872x1404 · Carta/Mobius (ID: 5)
* **B&W 13,3"** · 2200x1650 · Carta/Fina (ID: 6)


**Spectra 6 (Full Color Models)**
* **Spectra 6 1,69" Round** · 400x400 (ID: 7)
* **Spectra 6 4,0"** · 600x400 (ID: 8)
* **Spectra 6 7,3"** · 800x480 (ID: 9)
* **Spectra 6 8,14"** · 1024x576 (ID: A)
* **Spectra 6 13,3"** · 1600x1200 (ID: B)
* **Spectra 6 25,3"** · 3200x1800 · Signage (ID: C)
* **Spectra 6 28,5"** · 2160x3060 · Poster (ID: D)
* **Spectra 6 31,5"** · 2560x1440 (ID: E)
* **Spectra 6 32,0"** · 2560x1440 (ID: F)
* **Spectra 6 43,0"** · 3840x2160 · UHD (ID: G)


**Spectra (3-Farben: BWR / BWY)**
* **Spectra BWR 1,54"** · 200x200 (ID: H)
* **Spectra BWR 2,13"** · 250x122 (ID: I)
* **Spectra BWR 2,7"** · 264x176 (ID: J)
* **Spectra BWR 2,9"** · 296x128 (ID: K)
* **Spectra BWR 4,2"** · 400x300 (ID: L)
* **Spectra BWR 5,83"** · 648x480 (ID: M)
* **Spectra BWR 7,5"** · 800x480 (ID: N)
* **Spectra BWY 2,13"** · 250x122 (ID: O)
* **Spectra BWR 12,48"** · 1304x984 (ID: P)


**Spectra 3100 (4-Farben: BWRY)**
* **Spectra 3100 2,13"** · 212x104 (ID: Q)
* **Spectra 3100 2,66"** · 296x152 (ID: R)

<br><br>

Terminalbesitzer können Kanäle nur sehen, wenn sie die korrekte Host-Channel-URL kennen, genauso wie Benutzer nur Shows am microPhotoFrame-Server nur bearbeiten können, wenn sie dessen Host-Channel-URL kennen.

Somit kann jeder Kanal mehrere unterschiedliche Terminals mit unterschiedlichen Bildschirmen bedienen. Je Bildschirmtyp kann immer nur eine Show zur gleichen Zeit aktiv sein. "Aktiv" bedeutet, dass erPhotoFrame Terminals diese Show anzeigen.

Die Bilder werden in einem speziellen Format gespeichert (image/ink, bzw. Endung .ink) und sind jeweils nur für einen bestimmten e-Ink-Bildschirm nutzbar bzw. speziell dafür aufbereitet. Im Header dieser .ink-Dateien ist vermerkt, für welchen e-Ink-Bildschirm das Foto aufbereitet wurde, welche Orientierung es besitzt (Quer- oder Hochformat) und welcher Rasterungsmodus beim der Konvertierung des Bildes verwendet wurde.

[Zurück zur Hauptseite](../README.md).
