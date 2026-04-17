// ===========================================
// microPhotoFrame.cs
// © 2026 Meinolf Amekudzi
// ===========================================


using System;
using System.Threading.Tasks;
using System.IO;
using System.Data;
using System.Net;
using System.Web;
using System.Web.UI;
using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using System.Collections;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Linq;
using System.Web.Caching;

using Newtonsoft.Json.Linq;
using Newtonsoft.Json;

public partial class microPhotoFrame : System.Web.UI.Page {
  private JObject rest = null;


  public static string DataUrlMimeType(ref string _dataUrl) {
    return _dataUrl.Split(';')[0].Split(':')[1].ToLower();
  }

  public static string DataUrlData(ref string _dataUrl) {
    return _dataUrl.Split(',')[1];
  }

  public static string FileReadAllText(string _pathName) {
    bool ok = false;
    string ret = "";
    int times = 0;
    if (!File.Exists(_pathName)) return "";
    while (!ok && times < 1000) {
      try {
        ret = File.ReadAllText(_pathName);
        ok = true;
      } catch (Exception err) {
        times++;
        System.Threading.Thread.Sleep(100);
      }
    }
    return ret;
  }


  public static void FileWriteAllText(string _pathName, string _text) {
    bool ok = false;
    int times = 0;
    while (!ok && times < 1000) {
      try {
        File.WriteAllText(_pathName, _text);
        ok = true;
      } catch (Exception err) {
        times++;
        System.Threading.Thread.Sleep(100);
      }
    }
  }

  public static void WriteAllJSON(string _pathName, dynamic _json) {
    //Logging.log("WriteAllJSON:"+JsonConvert.SerializeObject(_json, Newtonsoft.Json.Formatting.Indented));
    FileWriteAllText(_pathName, JsonConvert.SerializeObject(_json, Newtonsoft.Json.Formatting.Indented));
  }

  public static void WriteAllJSONNoFormat(string _pathName, dynamic _json) {
    //Logging.log(_pathName+":"+JsonConvert.SerializeObject(_json,Newtonsoft.Json.Formatting.None));
    //FileWriteAllText(_pathName,_json.ToString(Newtonsoft.Json.Formatting.None));
    FileWriteAllText(_pathName, JsonConvert.SerializeObject(_json, Newtonsoft.Json.Formatting.None));
  }

  public static dynamic ReadAllJSON(string _pathName) {
    try {
      string json = FileReadAllText(_pathName);
      if (Path.GetExtension(_pathName) == ".js") {
        json = json.Replace(".i18x" + "Register()", "");
        if (json.Substring(0, 1) != "{") json = json.Substring(json.IndexOf("{"));
      }
      return JValue.Parse(json);
    } catch (Exception err) {
      return new JObject();
    }
  }
  public static dynamic ReadAllJSONObject(string _pathName) {
    try {
      return JObject.Parse(FileReadAllText(_pathName));
    } catch (Exception err) {
      return null;
    }
  }


  public static string PathCorrection(string _path) {
    string ret;
    //Logging.log("asdasd" + _path);
    if (_path.Substring(1, 1) == ":") {
      ret = _path.Replace("/", "\\");
      if (ret.Substring(0, HttpRuntime.AppDomainAppPath.Length) != HttpRuntime.AppDomainAppPath) return "xxxxxxxxx";
      return ret;
    } else {
      if (_path.Substring(1, 1) == ".") _path = _path.Substring(2);
      ret = HttpRuntime.AppDomainAppPath + _path.Replace("/", "\\");
      return ret;
    }
  }

  public static bool IsValidDirectoryName(string name) {
    if (string.IsNullOrWhiteSpace(name))
      return false;
    char[] invalidChars = Path.GetInvalidFileNameChars();
    return !name.Any(c => invalidChars.Contains(c));
  }

  public string GetSafeShowName(string _givenName) {
    if (string.IsNullOrEmpty(_givenName)) {
      return "show_unknown";
    }
    string safeName = Regex.Replace(_givenName, @"[^a-zA-Z0-9\-_]", "_");
    safeName = safeName.Trim('_');
    return "show_" + safeName;
  }

  public string UnzipBufferToString(byte[] zippedBuffer) {
    if (zippedBuffer == null || zippedBuffer.Length == 0)
      return string.Empty;

    using (var memoryStream = new MemoryStream(zippedBuffer)) {
      using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Read)) {
        // Wir nehmen den ersten Eintrag im Zip-Archiv
        var entry = archive.Entries.FirstOrDefault();

        if (entry == null)
          return string.Empty;

        using (var entryStream = entry.Open())
        using (var reader = new StreamReader(entryStream, Encoding.UTF8)) {
          return reader.ReadToEnd();
        }
      }
    }
  }

  public byte[] CreateZippedBufferByString(string _content, string _fileNameInZip) {
    using (var memoryStream = new MemoryStream()) {
      // 1. Erstelle das Zip-Archiv im MemoryStream
      using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true)) {
        // 2. Erstelle einen Eintrag (die Datei) innerhalb des Zips
        var demoFile = archive.CreateEntry(_fileNameInZip);

        // 3. Schreibe den String in diesen Eintrag
        using (var entryStream = demoFile.Open())
        using (var writer = new StreamWriter(entryStream, Encoding.UTF8)) {
          writer.Write(_content);
        }
      }

      // 4. Gib den Inhalt des MemoryStreams als Byte-Array zurück
      return memoryStream.ToArray();
    }
  }


  public bool IsSaveImageInkFile(string _fileName, byte[] _data) {
    if (string.IsNullOrEmpty(_fileName) || _data == null || _data.Length == 0) {
      return false;
    }
    string nameWithoutExtension = Path.GetFileNameWithoutExtension(_fileName);
    string extension = Path.GetExtension(_fileName);
    if (!extension.Equals(".ink", StringComparison.OrdinalIgnoreCase)) {
      return false;
    }
    if (!Regex.IsMatch(nameWithoutExtension, @"^[0-9]+$")) {
      return false;
    }
    byte firstByte = _data[0];
    bool isDigit = (firstByte >= 48 && firstByte <= 57);
    bool isUpper = (firstByte >= 65 && firstByte <= 90);
    bool isLower = (firstByte >= 97 && firstByte <= 122);
    if (!(isDigit || isUpper || isLower)) {
      return false;
    }
    return true;
  }

  protected void Page_Unload(object _sender, EventArgs _e) {
  }

  protected void Page_AbortTransaction(object _sender, EventArgs _e) {
  }

  public void onCacheItemRemovedCallback(string _key, object _value, CacheItemRemovedReason _reason) {
  }


  /** Register information of devices. If a device is called a webservice 
    * it will send device infos which will be registered here.
    * dynamic _r  the given rest json by webservice
    * @param input.deviceInfo   optional, the information of the device, see below.
    *
    * deviceInfo.displayId   (id of eink display, EInkDef.DISPLAYS)
    * deviceInfo.name
    * deviceInfo.ip
    * deviceInfo.tzoff (timezone offset)
    * deviceInfo.battery (in percent)
    * deviceInfo.temperature (in celsius)
    * deviceInfo.humidity (in percent)
    * deviceInfo.stand (0=landscape, 1=portrait)
    * deviceInfo.clockTS (timestamp of internal clock in unix ms)
    * deviceInfo.nextSleepTS (next sleep time in HHMM)
    * deviceInfo.nextWakeupTS (next wakeup time in HHMM)
    * deviceInfo.showName (current show)
    * deviceInfo.imgName (current img)
    *
    * deviceInfo.lastEcho
    */
  public void RegisterDeviceEcho(dynamic _r) {
    try {
      string devicesPathName = PathCorrection("./shows/devices.json");
      if (_r.input != null && _r.input.Property("deviceInfo") != null) {
        dynamic device = (JObject)_r.input.deviceInfo;
        dynamic devices = ReadAllJSONObject(devicesPathName);
        if (devices == null) {
          devices = new JObject();
        }
        string deviceID = (string)device.name + "_" + (string)device.ip;
        if (devices.Property(deviceID) != null) {
          devices.Remove(deviceID);
        }
        device.lastEcho = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        devices.Add(deviceID, device);
        WriteAllJSONNoFormat(devicesPathName, devices);
      }
    } catch (Exception ex) {
      // Silently ignore errors in RegisterDeviceEcho - it's not critical
      System.Diagnostics.Debug.WriteLine("Error in RegisterDeviceEcho: " + ex.Message);
    }
  }

  /** Returns a list of devices which uses the shows of this server.
    * dynamic _r  the given rest json by webservice
    * @return output.devices, json of a description all available devices
    */
  public void GetDevices(dynamic _r) {
    string devicesPathName = PathCorrection("./shows/devices.json");
    dynamic devices = ReadAllJSONObject(devicesPathName);
    if (devices == null) {
      devices = new JObject();
    }
    _r.output.devices = devices;
    _r.ok = true;
  }

  /** Creates a show.
    * dynamic _r  the given rest json by webservice
    * @param input.showName   the name of the show which should be created.
    * @param input.displayId  the ID (one character like EInkDef)  of the displayType the show should created.
    * @return output.shows, json of a description all available shows (see GetShows)
    *         output.showName, name of the created show (without "show_" prefix, perhaps corrected and cleaned)
    */
  public void CreateShow(dynamic _r) {
    string showsPathName = PathCorrection("./shows/shows.json");
    string orgShowName = (string)_r.input.showName;
    string displayId = (string)_r.input.displayId;
    string showName = GetSafeShowName(orgShowName);
    string showPath = PathCorrection("./shows/" + showName);
    string showPathName = showPath + "\\show.json";
    if (IsValidDirectoryName(showName)) {
      dynamic shows = ReadAllJSONObject(showsPathName);
      if (shows == null) {
        shows = new JObject();
        shows.shows = new JArray();
        shows.dayStart = 7;
        shows.dayEnd = 24;
        shows.activeShows = new JObject();
      }
      JArray showsList = (JArray)shows.shows;
      bool exists = showsList.Any(obj => obj.ToString() == orgShowName);
      if (!exists) {
        shows.shows.Add(orgShowName);
        if(shows.activeShows.Property(displayId) == null) {
          shows.activeShows.Add(displayId, orgShowName);
        }else{
          shows.activeShows.Property(displayId).Value = orgShowName;
        }
      }
      WriteAllJSONNoFormat(showsPathName, shows);
      if (!Directory.Exists(showPath)) Directory.CreateDirectory(showPath);
      dynamic show = ReadAllJSONObject(showPathName);
      if (show == null) {
        show = new JObject();
        show.timer = 1;
        show.mode = "random";
        show.imgs = new JArray();
        show.displayId = displayId;
      }
      WriteAllJSONNoFormat(showPathName, show);
      _r.output.shows = shows;
      _r.output.showName = showName;
      _r.ok = true;
    } else {
      _r.ok = false;
    }
  }

  /** Deletes a show.
    * dynamic _r  the given rest json by webservice
    * @param input.showName   the name of the show which have to deleted.
    * @return output.shows, json of a description all available shows (see GetShows)
    */
  public void DeleteShow(dynamic _r) {
    string showsPathName = PathCorrection("./shows/shows.json");
    string orgShowName = (string)_r.input.showName;
    string showName = GetSafeShowName(orgShowName);
    string showPathName = PathCorrection("./shows/" + showName);
    if (Directory.Exists(showPathName)) {
      Directory.Delete(showPathName, true);
      _r.ok = true;
      dynamic shows = ReadAllJSONObject(showsPathName);
      if (shows == null) {
        shows = new JObject();
        shows.activeShows = new JObject();
        shows.shows = new JArray();
        shows.timer = 1;
        shows.dayStart = 7;
        shows.dayEnd = 24;
        shows.mode = "random";
      } else {
        // Get the displayId of the show being deleted
        string showPathNameForDisplay = PathCorrection("./shows/" + showName + "\\show.json");
        dynamic show = ReadAllJSONObject(showPathNameForDisplay);
        string showDisplayId = null;
        if (show != null && show.displayId != null) {
          showDisplayId = (string)show.displayId;
        }
        
        var showsArray = (JArray)shows.shows;
        var showToRemove = showsArray.FirstOrDefault(obj => obj.ToString() == orgShowName);
        if (showToRemove != null) {
          showToRemove.Remove();
        }
        
        // Remove from activeShows if this show is active for its displayId
        bool wasActive = false;
        if (showDisplayId != null && shows.activeShows != null) {
          if (shows.activeShows.Property(showDisplayId) != null) {
            string activeShowForDisplay = (string)shows.activeShows.Property(showDisplayId).Value;
            if (activeShowForDisplay == orgShowName) {
              shows.activeShows.Property(showDisplayId).Remove();
              wasActive = true;
            }
          }
        }
        
        // If this was the active show for its displayId, try to activate another show with the same displayId
        if (wasActive && showDisplayId != null) {
          // Find another show with the same displayId
          string newActiveShow = null;
          foreach (var showNameInList in shows.shows) {
            string candidateShowName = showNameInList.ToString();
            string candidateSafeName = GetSafeShowName(candidateShowName);
            string candidateShowPath = PathCorrection("./shows/" + candidateSafeName + "\\show.json");
            dynamic candidateShow = ReadAllJSONObject(candidateShowPath);
            if (candidateShow != null && candidateShow.displayId != null) {
              string candidateDisplayId = (string)candidateShow.displayId;
              if (candidateDisplayId == showDisplayId) {
                newActiveShow = candidateShowName;
                break;
              }
            }
          }
          
          // Set the new active show if found
          if (newActiveShow != null) {
            shows.activeShows[showDisplayId] = newActiveShow;
          }
        }
      }
      WriteAllJSONNoFormat(showsPathName, shows);
      _r.output.shows = shows;

    }
  }

  /** Adds an image to the show.
    * dynamic _r  the given rest json by webservice
    * @param input.showName   the name of the show where the image have to deleted.
    * @param input.img        data uri of the image/ink.
    * @return output.show, json of a description the show (see GetShow)
    *         ouput.imgName, filename of the image 
    *
    * note: the filename of the image will be generated by current ticks,
    *       the first digit of the name is "0", if it is a image in landscape format,
    *       "1" if it is in portrait format.
    */
  public void SaveShowImage(dynamic _r) {
    string orgShowName = (string)_r.input.showName;
    string showName = GetSafeShowName(orgShowName);
    string showPath = PathCorrection("./shows/" + showName);
    string showPathName = showPath + "\\show.json";
    string imageData = (string)_r.input.img;
    string mimeType = DataUrlMimeType(ref imageData);
    string rawdataBase64 = DataUrlData(ref imageData);
    byte[] rawdata = Convert.FromBase64String(rawdataBase64);
    string imageName;
    dynamic show = null;
    _r.ok = false;
    if (mimeType == "image/ink") {
      show = ReadAllJSONObject(showPathName);
      if (show != null) {
        // Detect format version: Version 1 starts with 1, old format starts with display ID (< 32)
        int currentOrientation;
        string displayId;
        if (rawdata.Length >= 4 && (rawdata[0] == 1 || rawdata[0] == 2 || rawdata[0] == 3)) {
          // Version 1 (LZW), 2 (Deflate), 3 (Paeth+Deflate): [version, displayId, dither, orient, ...]
          displayId = ((char)rawdata[1]).ToString();
          currentOrientation = rawdata[3]; // 0 = landscape, 1 = portrait
        } else {
          // Old format (Version 0): [displayId, dither, orient, minCodeSize, ...]
          displayId = ((char)rawdata[0]).ToString();
          currentOrientation = rawdata[2]; // 0 = landscape, 1 = portrait
        }
        bool isLandscape = currentOrientation == 0;
        if(displayId == (string)show.displayId) {
          // Check if we're replacing an existing image
          string replaceImageName = _r.input.replaceImageName != null ? (string)_r.input.replaceImageName : null;
          if (!string.IsNullOrEmpty(replaceImageName)) {
            // Check if the file to replace actually exists
            string replacePath = PathCorrection(showPath + "/" + replaceImageName);
            if (File.Exists(replacePath)) {
              // Replace existing file
              imageName = replaceImageName;
              File.WriteAllBytes(replacePath, rawdata);
              // Don't add to show.imgs if it's already there (it should be)
              if (show.imgs != null) {
                JArray imgsArray = (JArray)show.imgs;
                bool exists = false;
                foreach (var img in imgsArray) {
                  if (img.ToString() == imageName) {
                    exists = true;
                    break;
                  }
                }
                if (!exists) {
                  show.imgs.Add(imageName);
                }
              }
              WriteAllJSONNoFormat(showPathName, show);
              _r.ok = true;
              if (_r.output == null) _r.output = new { };
              _r.output.imgName = imageName;
              return;
            } else {
              // File to replace doesn't exist, fall through to normal save
              _r.error = "Image to replace not found: " + replaceImageName;
            }
          }
          
          // Normal save (new image or replace failed)
          // Check if reference name is provided
          string referenceName = _r.input.referenceName != null ? (string)_r.input.referenceName : null;
          if (!string.IsNullOrEmpty(referenceName)) {
            // Check if reference file exists
            string referencePath = PathCorrection(showPath + "/" + referenceName);
            if (File.Exists(referencePath)) {
              // Extract base name (without orientation prefix and extension)
              string baseName = referenceName;
              if (baseName.Length > 0 && (baseName[0] == '0' || baseName[0] == '1' || baseName[0] == '2' || baseName[0] == '3')) {
                // Remove orientation prefix (first character)
                baseName = baseName.Substring(1);
              }
              // Remove .ink extension if present
              if (baseName.EndsWith(".ink")) {
                baseName = baseName.Substring(0, baseName.Length - 4);
              }
              
              // Get orientation of reference file
              int referenceOrientation = 0; // Default to landscape
              if (referenceName.Length > 0 && referenceName[0] >= '0' && referenceName[0] <= '3') {
                referenceOrientation = referenceName[0] - '0';
              }
              
              // Only use reference name if current orientation is opposite (0<->1 or 2<->3)
              bool isOppositeOrientation = false;
              if ((referenceOrientation == 0 && currentOrientation == 1) || 
                  (referenceOrientation == 1 && currentOrientation == 0) ||
                  (referenceOrientation == 2 && currentOrientation == 3) ||
                  (referenceOrientation == 3 && currentOrientation == 2)) {
                isOppositeOrientation = true;
              }
              
              if (isOppositeOrientation) {
                // Use same base name with current orientation prefix
                imageName = currentOrientation.ToString() + baseName + ".ink";
              } else {
                // Not opposite orientation, use default naming
                imageName = currentOrientation.ToString() + DateTime.UtcNow.Ticks + ".ink";
              }
            } else {
              // Reference file doesn't exist, use default naming
              imageName = currentOrientation.ToString() + DateTime.UtcNow.Ticks + ".ink";
            }
          } else {
            // No reference name provided, use default naming
            imageName = currentOrientation.ToString() + DateTime.UtcNow.Ticks + ".ink";
          }
          
          File.WriteAllBytes(PathCorrection(showPath + "/" + imageName), rawdata);
          show.imgs.Add(imageName);
          WriteAllJSONNoFormat(showPathName, show);
          _r.ok = true;
          if (_r.output == null) _r.output = new { };
          _r.output.imgName = imageName;
        }else{
          _r.error = "Display ID mismatch";
        }
      }else{
        _r.error = "Show not found";
      }
    }
    _r.output.show = show;
  }

  /** Deletes the given image in show.
    * dynamic _r  the given rest json by webservice
    * @param input.showName   the name of the show where the image have to delete.
    * @param input.imgName    the name of the image which have to delete.
    * @return output.show, json of a description the show (see GetShow)
    */
  public void DeleteShowImage(dynamic _r) {
    string orgShowName = (string)_r.input.showName;
    string showName = GetSafeShowName(orgShowName);
    string showPath = PathCorrection("./shows/" + showName);
    string showPathName = showPath + "\\show.json";
    string imgName = (string)_r.input.imgName;
    string imgPathName = showPath + "/" + imgName;
    dynamic show = null;
    if (File.Exists(imgPathName)) {
      File.Delete(imgPathName);
      show = ReadAllJSONObject(showPathName);
      if(show != null) {
        var imgsArray = (JArray)show.imgs;
        var imgToRemove = imgsArray.FirstOrDefault(obj => obj.ToString() == imgName);
        if (imgToRemove != null) {
          imgToRemove.Remove();
          WriteAllJSONNoFormat(showPathName, show);
          _r.output.show = show;
          _r.ok = true;
        }else{
          _r.error = "Image not found";
        }
      }else{
        _r.error = "Show not found";
      }
    } else {
      _r.ok = false;
    }
    _r.output.show = show;
  }

  /** Returns the description son of the requested show.
    * dynamic _r  the given rest json by webservice
    * @param input.showName   the name of the show which description should be returned.
    * @return output.show, json of a description the show:
    *
    * show.name         name of the show
    * show.timer        display duration of one image in minutes
    * show.imgs         array of image names available in show
    * shows.mode        "random" / "forwaresequence" / "reverssequence"
    */
  public void GetShow(dynamic _r) {
    RegisterDeviceEcho(_r);
    string orgShowName = (string)_r.input.showName;
    string showName = GetSafeShowName(orgShowName);
    string showPath = PathCorrection("./shows/" + showName);
    string showPathName = showPath + "\\show.json";
    dynamic show = ReadAllJSONObject(showPathName);
    if (show != null) {
      _r.output.show = show;
      _r.ok = true;
    } else {
      _r.ok = false;
    }

  }

  /** Sets up the active show.
   * dynamic _r  the given rest json by webservice
   * @param input.showName   the name of the show which have to set active.
   * @return output.shows, json of a description of all defined shows:
   */
  public void SetActiveShow(dynamic _r) {
    string orgShowName = (string)_r.input.showName;
    string showName = GetSafeShowName(orgShowName);
    string showPath = PathCorrection("./shows/" + showName);
    string showsPathName = PathCorrection("./shows/shows.json");
    string showPathName = showPath + "\\show.json";
    dynamic shows = ReadAllJSONObject(showsPathName);
    dynamic show = ReadAllJSONObject(showPathName);
     _r.ok = false;
    if (shows != null) {
      if(show != null) {
        string showDisplayId = (string)show.displayId;
        if(shows.activeShows.Property(showDisplayId) == null) {
          shows.activeShows.Add(showDisplayId, orgShowName);
        }else{
          shows.activeShows.Property(showDisplayId).Value = orgShowName;
        }
        _r.output.shows = shows;
        WriteAllJSONNoFormat(showsPathName, shows);
        _r.ok = true;
      } else {
      _r.error = "Show not found";
    }
    } else {
      _r.error = "Shows not found";
    }
  }

  /** Saves new setting to a show (time to show each photo, selection mode of photos).
   * dynamic _r  the given rest json by webservice
   * @param input.showName   the name of the show which have to set active.
   * @param input.showMode   new photo selection mode of show.
   * @param input.showTimer  new display time for each photo in minutes.
   * @return output.show, json of a description the given show (see GetShow).
   */
  public void SetShowSettings(dynamic _r) {
    string orgShowName = (string)_r.input.showName;
    string showName = GetSafeShowName(orgShowName);
    string showPath = PathCorrection("./shows/" + showName);
    string showPathName = showPath + "\\show.json";
    dynamic show = ReadAllJSONObject(showPathName);
    if (show != null) {
      show.mode = (string)_r.input.showMode;
      show.timer = (int)_r.input.showTimer;
      _r.output.show = show;
      WriteAllJSONNoFormat(showPathName, show);
      _r.ok = true;
    } else {
      _r.ok = false;
    }
  }

  /** Returns json with information about available shows.
  * dynamic _r  the given rest json by webservice
  * @return output.shows, json of a description of all defined shows:
  *
  * shows.activeShows JObject with keys of displays and corresponding shownames of the active shows
  * shows.shows       array of string, names of available shows
  * shows.dayStart    hour and minute (e.g. 1330) wakeup from daily device sleep
  * shows.dayEnd      hour and minute (e.g. 1330) begin of daily device sleep
  */
  public void GetShows(dynamic _r) {
    try {
      RegisterDeviceEcho(_r);
      string showsPathName = PathCorrection("./shows/shows.json");
      dynamic shows = ReadAllJSONObject(showsPathName);
      if (shows == null) {
        shows = new JObject();
        shows.shows = new JArray();
        shows.dayStart = 7;
        shows.dayEnd = 24;
        shows.activeShows = new JObject();
      }
      _r.output.shows = shows;
      _r.ok = true;
    } catch (Exception ex) {
      _r.ok = false;
      if (_r.error == null) {
        _r.error = new JObject();
      }
      _r.error.msg = "Error in GetShows: " + ex.Message;
      _r.error.code = -1;
    }
  }


  /** Exports a given show as a zipped json file including all image data.
    * dynamic _r  the given rest json by webservice
    * @param input.showName   the name of the show which have to export.
    * @return output.showZi   the base64 encoded zip file of the show json.
    */
  public void ExportShow(dynamic _r) {
    string orgShowName = (string)_r.input.showName;
    string showName = GetSafeShowName(orgShowName);
    string showPath = PathCorrection("./shows/" + showName);
    string showPathName = showPath + "\\show.json";
    if (Directory.Exists(showPath)) {
      string showsPathName = showPath + "/shows/show.json";
      dynamic show = ReadAllJSONObject(showPathName);
      JObject export = new JObject();
      export.Add("name", showName);
      export.Add("show", show);
      JObject imgsdata = new JObject();
      JArray showImgs = (JArray)show.imgs;
      foreach (var img in showImgs) {
        imgsdata.Add(img.ToString(), "data:image/ink;base64," + Convert.ToBase64String(File.ReadAllBytes(showPath + "\\" + img.ToString())));
      }
      export.Add("imgsdata", imgsdata);
      string exportStr = JsonConvert.SerializeObject(export, Newtonsoft.Json.Formatting.None);
      byte[] zip = CreateZippedBufferByString(exportStr, showName + ".show");
      _r.output.showZip = Convert.ToBase64String(zip);
      _r.ok = true;
    } else {
      _r.ok = false;
    }
  }

  /** Imports and creates a show based on the given base64 encoded zip file.
    * dynamic _r  the given rest json by webservice
    * @param input.showZip    the base64 encoded zip file which contains the json of the show and all image data.
    * @return output.showZi   the base64 encoded zip file of the show json.
    */
  public void ImportShow(dynamic _r) {
    _r.ok = false;
    dynamic info = null;
    
    // Initialize error object
    _r.error = new JObject();
    _r.error.msg = "";
    _r.error.code = 0;
    
    // Check if importShow data is provided
    if (_r.input == null || _r.input.importShow == null) {
      _r.error.msg = "No import data provided";
      _r.error.code = 1;
      return;
    }
    
    try {
      byte[] zipBuffer = Convert.FromBase64String((string)_r.input.importShow);
      string json = UnzipBufferToString(zipBuffer);
      info = JObject.Parse(json);

    if (info != null) {
      string orgShowName = (string)info.name;
      string showName = GetSafeShowName(orgShowName);
      if (IsValidDirectoryName(showName)) {
        string showsPathName = PathCorrection("./shows/shows.json");
        string showPath = PathCorrection("./shows/" + showName);
        string showPathName = showPath + "\\show.json";
        dynamic shows = ReadAllJSONObject(showsPathName);
        if (shows == null) {
          shows = new JObject();
          shows.shows = new JArray();
          shows.dayStart = 7;
          shows.dayEnd = 24;
        }
        dynamic show = new JObject();
        show.imgs = new JArray();
        // write out ink images of show...
        if (!Directory.Exists(showPath)) Directory.CreateDirectory(showPath);
        JObject imgsData = (JObject)info.imgsdata;
        foreach (KeyValuePair<string, JToken> img in imgsData) {
          string data = (string)img.Value;
          var mimeType = DataUrlMimeType(ref data);
          var dataString = DataUrlData(ref data);
          byte[] dataBytes = Convert.FromBase64String(dataString);
          if (!IsSaveImageInkFile(img.Key, dataBytes)) {
            _r.ok = false;
            return;
          }
          File.WriteAllBytes(showPathName + "\\" + img.Key, dataBytes);
          show.imgs.Add(img.Key);
        }
        WriteAllJSONNoFormat(showPathName, show);
        shows.shows.Add(showName);
        WriteAllJSONNoFormat(showsPathName, shows);
        _r.ok = true;
      } else {
        _r.error.msg = "Invalid show name";
        _r.error.code = 3;
      }
    } else {
      _r.error.msg = "Failed to parse show data";
      _r.error.code = 4;
    }
    } catch (Exception ex) {
      _r.error.msg = "Import error: " + ex.Message;
      _r.error.code = 5;
    }
  }



  public string GetRequestBodyString() {
    try {
      using (var reader = new System.IO.StreamReader(Request.InputStream, Encoding.UTF8)) {
        return reader.ReadToEnd();
      }
    } catch (Exception ex) {
      // Log error but don't crash
      System.Diagnostics.Debug.WriteLine("Error reading request body: " + ex.Message);
      return "";
    }
  }

  protected async void Page_Load(object _sender, EventArgs _e) {
    string action = Request.QueryString["action"];

    dynamic rest = new JObject();
    rest.action = action;
    rest.input = new JObject();
    rest.output = new JObject();
    rest.ok = false;
    
    // Always try to parse request body (POST requests)
    // Handle empty body gracefully
    string requestBody = GetRequestBodyString();
    if (!string.IsNullOrWhiteSpace(requestBody)) {
      try {
        // Try to parse as JSON object
        dynamic parsedBody = JObject.Parse(requestBody);
        // Merge parsed body into rest object, preserving defaults
        if (parsedBody.input != null) {
          rest.input = parsedBody.input;
        }
        if (parsedBody.action != null) {
          rest.action = parsedBody.action;
        }
      } catch {
        // If parsing fails (e.g., empty string, invalid JSON), use default rest object
        // This handles cases like empty POST body or "{}"
      }
    }
    // If requestBody is empty or whitespace, use default rest object (already initialized above)

    // Ensure error object exists
    if (rest.error == null) {
      rest.error = new JObject();
      rest.error.msg = "";
      rest.error.code = 0;
    }
    
    switch (action) {
      case "getDevices":
        GetDevices(rest);
        break;
      case "createShow":
        CreateShow(rest);
        break;
      case "deleteShow":
        DeleteShow(rest);
        break;
      case "saveShowImage":
        SaveShowImage(rest);
        break;
      case "deleteShowImage":
        DeleteShowImage(rest);
        break;
      case "getShow":
        GetShow(rest);
        break;
      case "setActiveShow":
        SetActiveShow(rest);
        break;
      case "setShowSettings":
        SetShowSettings(rest);
        break;
      case "getShows":
        GetShows(rest);
        break;
      case "exportShow":
        ExportShow(rest);
        break;
      case "importShow":
        ImportShow(rest);
        break;
      default:
        if (string.IsNullOrEmpty(action)) {
          rest.error.msg = "No action specified";
          rest.error.code = -1;
        } else {
          rest.error.msg = "Unknown action: " + action;
          rest.error.code = -1;
        }
        break;
    }
    /*-- @<BUILD_ONLY_ON_BUILDS:Release ----
    rest.input = new JObject();
    ---- @>BUILD_ONLY_ON_BUILDS --*/
    Response.ContentType = "application/json";
    Response.Write(Newtonsoft.Json.JsonConvert.SerializeObject(rest, Newtonsoft.Json.Formatting.None));
    Response.Flush();
    HttpContext.Current.ApplicationInstance.CompleteRequest();
  }

}

