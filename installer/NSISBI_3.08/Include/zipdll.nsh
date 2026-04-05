;ZipDLL include file for NSIS
;Written by Tim Kosse (mailto:tim.kosse@gmx.de)
;some improvements by deguix

;Supported languages with their translators in alphabetical order:

;Arabic translation by asdfuae
;Brazilian Portuguese translation by "deguix"
;Chinese, Simplified translation by Kii Ali <kiiali@cpatch.org>
;Chinese, Traditional traslation by "matini" and Kii Ali <kiiali@cpatch.org>
;Croatian translation by "iostriz"
;Danish translation by Claus Futtrup
;French translation by "veekee"
;German translation by Tim Kosse
;Hungarian translation by Toth Laszlo
;Korean translation by Seongab Kim
;Lithuanian translation by Vytautas Krivickas
;Polish translation by Krzysztof Galuszka
;Russion translation by Sergey
;Spanish translation by "dark_boy"

!ifndef ZIPDLL_USED

!define ZIPDLL_USED

!macro ZIPDLL_EXTRACT SOURCE DESTINATION FILE

  !define "FILE_${FILE}"

  !ifndef FILE_<ALL>
    Push "${FILE}"
  !endif

  IfFileExists "${DESTINATION}" +2
    CreateDirectory "${DESTINATION}"

  Push "${DESTINATION}"

  IfFileExists "${SOURCE}" +2
    SetErrors

  Push "${SOURCE}"

  ;The strings that will be translated are (ready to copy,
  ;remove leading semicolons in your language block):

  !ifdef LANG_ENGLISH

    ;English is default language of ZipDLL, no need to push the untranslated strings

    ;StrCmp $LANGUAGE ${LANG_ENGLISH} 0 +1

      ;Push "  Error: %s"
      ;Push "Could not get file attributes."
      ;Push "Error: Could not get file attributes."
      ;Push "Could not extract %s"
      ;Push "  Error: Could not extract %s"

      ;!ifdef FILE_<ALL>
        ;Push "  Extract: %s"
        ;Push "  Extracting %d files and directories"
        ;Push "Extracting contents of %s to %s"
      ;!else
        ;Push "Specified file does not exist in archive."
        ;Push "Error: Specified file does not exist in archive."
        ;Push "Extracting the file %s from %s to %s"
      ;!endif

      ;Push "/TRANSLATE"

  !endif

  !ifdef LANG_HUNGARIAN

    StrCmp $LANGUAGE ${LANG_HUNGARIAN} 0 +10

      Push "  Hiba: %s"
      Push "Nem olvashat� a f�jl attrib�tumai."
      Push "Hiba: Nem olvashat� a f�jl attrib�tumai."
      Push "Nem siker�lt kicsomagolni a(z) %s"
      Push "  Hiba: Nem siker�lt kicsomagolni a(z) %s"

      !ifdef FILE_<ALL>
        Push "  Kicsomagol�s: %s"
        Push "  %d f�jl �s mappa kicsomagol�sa"
        Push "%s tartalom kicsomagol�sa a %s helyre" 
      !else
        Push "A megadott f�jl nem tal�lhat� az arh�vumban."
        Push "Hiba: A megadott f�jl nem tal�lhat� az arh�vumban."
        Push "%s f�jl kcsomagol�sa a(z) %s f�jlb�l a %s helyre"
      !endif

      Push "/TRANSLATE"

  !endif

  !ifdef LANG_FRENCH

    StrCmp $LANGUAGE ${LANG_FRENCH} 0 +10

      Push "  Erreur : %s"
      Push "Impossible de r�cup�rer les informations sur le fichier."
      Push "Erreur : Impossible de r�cup�rer les informations sur le fichier."
      Push "Impossible de d�compresser %s."
      Push "  Erreur : Impossible de d�compresser %s."

      !ifdef FILE_<ALL>
        Push "  D�compression : %s"
        Push "  D�compression de %d fichiers et r�pertoires"
        Push "D�compression des donn�es de %s vers %s"
      !else
        Push "Le fichier sp�cifi� n'existe pas dans l'archive"
        Push "Erreur : Le fichier sp�cifi� n'existe pas dans l'archive"
        Push "D�compression du fichier %s depuis %s vers %s"
      !endif

      Push "/TRANSLATE"

  !endif

  !ifdef LANG_GERMAN

    StrCmp $LANGUAGE ${LANG_GERMAN} 0 +10

      Push "  Fehler: %s"
      Push "Dateiattribute konnten nicht ermittelt werden."
      Push "Fehler: Dateiattribute konnten nicht ermittelt werden."
      Push "%s konnte nicht dekomprimiert werden."
      Push "  Fehler: %s konnte nicht dekomprimiert werden."

      !ifdef FILE_<ALL>
        Push "  Dekomprimiere: %s"
        Push "  Dekomprimiere %d Dateien und Verzeichnisse"
        Push "Dekomprimiere Inhalt von %s nach %s"
      !else
        Push "Die angegebene Datei existiert nicht im Archiv"
        Push "Fehler: Die angegebene Datei existiert nicht im Archiv"
        Push "Dekomprimiere Datei %s von %s nach %s"
      !endif

      Push "/TRANSLATE"

  !endif

  !ifdef LANG_SPANISH

    StrCmp $LANGUAGE ${LANG_SPANISH} 0 +10

      Push "  Error: %s"
      Push "No se obtuvieron atributos del archivo"
      Push "Error: No se obtuvieron atributos del archivo"
      Push "No se pudo extraer %s"
      Push "  Error: No se pudo extraer %s"

      !ifdef FILE_<ALL>
        Push "  Extraer: %s"
        Push "  Extrayendo %d archivos y directorios"
        Push "Extraer archivos de %s a %s"
      !else
        Push "Archivo especificado no existe en el ZIP"
        Push "Error: El archivo especificado no existe en el ZIP"
        Push "Extrayendo el archivo %s de %s a %s"
      !endif

      Push "/TRANSLATE"

  !endif

  !ifdef LANG_PORTUGUESEBR

    StrCmp $LANGUAGE ${LANG_PORTUGUESEBR} 0 +10

      Push "  Erro: %s"
      Push "N�o se pode ler os atributos do arquivo"
      Push "Error: N�o se pode ler os atributos do arquivo"
      Push "N�o se pode extrair %s"
      Push "  Erro: N�o se pode extrair %s"

      !ifdef FILE_<ALL>
        Push "  Extraindo: %s"
        Push "  Extraindo %d arquivos e diret�rios"
        Push "Extraindo arquivos de %s a %s"
      !else
        Push "O arquivo especificado n�o existe no ZIP"
        Push "Erro: O arquivo especificado n�o existe no ZIP"
        Push "Extraindo o arquivo %s de %s a %s"
      !endif

      Push "/TRANSLATE"

  !endif

  !ifdef LANG_TRADCHINESE

  StrCmp $LANGUAGE ${LANG_TRADCHINESE} 0 +11

    Push "  ���~: %s"
    Push "�L�k���o�ɮ��ݩʡC"
    Push "���~: �L�k���o�ɮ��ݩʡC"
    Push "�L�k�����Y %s"
    Push "  ���~�G�L�k�����Y %s"
    
    !ifdef FILE_<ALL>
      Push "  �����Y�G%s"
      Push "  ���b�����Y %d �ɮ׻P�ؿ�"
      Push "���b�����Y %s �����e�� %s"
    !else
      Push "���w���ɮרä��s�b�����Y�]�C"
      Push "���~�G���w���ɮרä��s�b�����Y�]�C"
      Push "���b�����Y�ɮ� %s �A�q %s �� %s"
    !endif
    
    Push "/TRANSLATE"

  !endif

  !ifdef LANG_SIMPCHINESE

  StrCmp $LANGUAGE ${LANG_SIMPCHINESE} 0 +11

    Push "  ����: %s"
    Push "�޷�ȡ���ļ����ԡ�"
    Push "����: �޷�ȡ���ļ����ԡ�"
    Push "�޷���ѹ�� %s"
    Push "  �����޷���ѹ�� %s"
    
    !ifdef FILE_<ALL>
      Push "  ��ѹ����%s"
      Push "  ���ڽ�ѹ�� %d �ļ���Ŀ¼"
      Push "���ڽ�ѹ�� %s �����ݵ� %s"
    !else
      Push "ָ�����ļ�����������ѹ������"
      Push "����ָ�����ļ�����������ѹ������"
      Push "���ڽ�ѹ���ļ� %s ���� %s �� %s"
    !endif
    
    Push "/TRANSLATE"

  !endif

  !ifdef LANG_LITHUANIAN

    StrCmp $LANGUAGE ${LANG_LITHUANIAN} 0 +10

      Push "  Klaida: %s"
      Push "Negaleta gauti bylos nuorodu."
      Push "Klaida: Negaleta gauti bylos nuorodu."
      Push "Negaleta i�traukti %s"
      Push "  Klaida: Negaleta i�traukti %s"

      !ifdef FILE_<ALL>
        Push "  I�traukiam : %s"
        Push "  I�traukiame %d bylas ir katalogus"
        Push "I�traukiame viska is %s i %s"
      !else
        Push "Parinkta byla nesurasta �iame archyve."
        Push "Klaida: Parinkta byla nesurasta �iame archyve."
        Push "I�traukiame byla %s i� %s i %s"
      !endif

      Push "/TRANSLATE"

  !endif

  !ifdef "LANG_POLISH"

    strcmp $LANGUAGE ${LANG_POLISH} 0 +10

      Push "  B��d: %s"
      Push "Nie mo�e pobra� atrybutu pliku."
      Push "B��d: Nie mo�e pobra� atrybutu pliku."
      Push "Nie mo�e rozpakowa� %s."
      Push "  B��d: Nie mo�e rozpakowa� %s."

      !ifdef FILE_<ALL>
        Push "  Rozpakuj: %s"
        Push "  Rozpakowywanie %d plik�w i katalog�w"
        Push "Rozpakowywanie zawarto�ci %s do %s"
      !else
        Push "Plik nie istnieje w archiwum"
        Push "B��d: Plik nie istnieje w archiwum"
        Push "Rozpakowywanie pliku %s z %s do %s"
      !endif

      Push "/TRANSLATE"

  !endif

  !ifdef "LANG_KOREAN"
    strcmp $LANGUAGE ${LANG_KOREAN} 0 +10
      Push "  ���� : %s"
      Push "ȭ�� �Ӽ��� ���� �� �����ϴ�."
      Push "����: ȭ�� �Ӽ��� ���� �� �����ϴ�."
      Push "%s��(��) Ǯ �� �����ϴ�."
      Push "  ����: %s��(��) Ǯ �� �����ϴ�."

      !ifdef FILE_<ALL>
        Push "  Ǯ�� : %s"
        Push "  %d���� ���ϰ� ������ Ǫ�� ��"
        Push "%s�� ������ %s�� Ǫ�� ��"
      !else
        Push "������ ������ ���� ���� �ȿ� �����ϴ�."
        Push "����: ������ ������ ���� ���� �ȿ� �����ϴ�."
        Push "%s ������ %s���� %s�� Ǫ�� ��"
      !endif

      Push "/TRANSLATE"

  !endif

  !ifdef "LANG_RUSSIAN"

    strcmp $LANGUAGE ${LANG_RUSSIAN} 0 +10

      Push "  ������: %s"
      Push "�� ���� �������� �������� �����."
      Push "������: �� ���� �������� �������� �����."
      Push "�� ���� ������� %s"
      Push "  ������: �� ���� ������� %s"

      !ifdef LANG_<ALL>
        Push "  �������� : %s"
        Push "  ���������� %d ������ � �����"
        Push "������ ����������� ������ �� %s � %s"
      !else
        Push "����������� ���� �� ��������� � ������."
        Push "������: S����������� ���� �� ��������� � ������."
        Push "���������� ����� %s �� %s � %s"
      !endif

      Push "/TRANSLATE"

  !endif

  !ifdef LANG_ARABIC

    StrCmp $LANGUAGE ${LANG_ARABIC} 0 +10

      Push "  ����: %s"
      Push "�� ���� ��� ����� �����."
      Push "����: �� ���� ��� ����� �����."
      Push "�� ���� ������� %s"
      Push " ����: �� ���� ������� %s"
  
      !ifdef FILE_<ALL>
        Push "  ������� : %s"
        Push "  ������� ������ � ����� %d"
        Push "������� ������� %s ��� %s"
      !else
        Push "����� ��� ����� �� �����."
        Push "����: ����� ��� ����� �� �����."
        Push "������� ����� %s �� %s ��� %s"
      !endif

      Push "/TRANSLATE"

  !endif

  !ifdef LANG_DANISH

    StrCmp $LANGUAGE ${LANG_DANISH} 0 +10

      Push "  Fejl: %s"
      Push "Kunne ikke l�se fil attributter."
      Push "Fejl: Kunne ikke l�se fil attributter."
      Push "Kunne ikke udpakke %s"
      Push "  Fejl: Kunne ikke udpakke %s"

      !ifdef FILE_<ALL>
        Push "  Udpakker: %s"
        Push "  Udpakker %d filer og mapper"
        Push "Udpakker indhold fra %s til %s"
      !else
        Push "Specificeret fil eksisterer ikke i filarkivet"
        Push "Fejl: Specificeret fil eksisterer ikke i filarkivet"
        Push "Udpakker fil %s fra %s til %s"
      !endif

      Push "/TRANSLATE"

  !endif 

  !ifdef LANG_CROATIAN

    StrCmp $LANGUAGE ${LANG_CROATIAN} 0 +10

      Push "  Gre�ka: %s"
      Push "Ne mogu dohvatiti atribute datoteke."
      Push "Gre�ka: Ne mogu dohvatiti atribute datoteke."
      Push "Ne mogu ekstrahirati %s"
      Push "  Gre�ka: Ne mogu ekstrahirati %s"

      !ifdef FILE_<ALL>
        Push "  Ekstrakcija: %s"
        Push "  Ekstrakcija %d datoteka i mapa"
        Push "Ekstrakcija sadr�aja %s u %s"
      !else
        Push "Tra�ena datoteka ne postoji u arhivi."
        Push "Gre�ka: Tra�ena datoteka ne postoji u arhivi."
        Push "Ekstrakcija datoteke %s iz %s u %s"
      !endif

      Push "/TRANSLATE"

  !endif

  !ifdef FILE_<ALL>
    ZipDLL::extractall
  !else
    ZipDLL::extractfile
  !endif

  !undef "FILE_${FILE}"

!macroend

!endif
