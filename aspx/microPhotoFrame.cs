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
    string safeName = Regex.Replace(_givenName, @"[^a-zA-Z0-9\-_.]", "_");
    safeName = Regex.Replace(safeName, @"\.{2,}", ".");
    safeName = safeName.Trim('.', '_');
    if (string.IsNullOrEmpty(safeName) || safeName.Contains("..")) return "show_unknown";
    return "show_" + safeName;
  }

  private Dictionary<string, string> _displaySlugs;

  public string DisplaySlugForId(string displayId) {
    string key = displayId == null ? "" : displayId.Trim();
    if (key.Length == 0) return "";
    if (_displaySlugs == null) {
      _displaySlugs = new Dictionary<string, string>();
      try {
        string slugPath = PathCorrection("./src/microLib/display-slugs.json");
        JObject map = JObject.Parse(File.ReadAllText(slugPath));
        foreach (var p in map.Properties()) _displaySlugs[p.Name] = (string)p.Value;
      } catch { }
    }
    string slug;
    return _displaySlugs.TryGetValue(key, out slug) ? slug : key;
  }

  public string ShowPackageFileName(string showName, string displayId) {
    string baseName = string.IsNullOrEmpty(showName) ? "show" : Regex.Replace(showName, @"[^a-zA-Z0-9\-_.]", "_");
    baseName = Regex.Replace(baseName, @"\.{2,}", ".").Trim('.', '_');
    if (string.IsNullOrEmpty(baseName)) baseName = "show";
    string slug = DisplaySlugForId(displayId);
    return string.IsNullOrEmpty(slug) ? baseName + ".show" : baseName + "_" + slug + ".show";
  }

  private string ShowDisplayId(string showName) {
    if (string.IsNullOrEmpty(showName)) return "";
    string showPathName = PathCorrection("./shows/" + GetSafeShowName(showName)) + "\\show.json";
    dynamic show = ReadAllJSONObject(showPathName);
    return show != null && show.displayId != null ? (string)show.displayId : "";
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

  private static readonly Regex ChannelSlugRe = new Regex(@"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$", RegexOptions.Compiled);

  private static string NormalizeChannelSlug(string raw) {
    if (string.IsNullOrWhiteSpace(raw)) return "";
    raw = raw.Trim();
    return ChannelSlugRe.IsMatch(raw) ? raw : "";
  }

  private static string SlugFromShowName(string name) {
    if (string.IsNullOrWhiteSpace(name)) return "";
    string s = Regex.Replace(name.Trim().ToLowerInvariant(), @"[^a-z0-9_-]+", "-").Trim('-');
    if (s.Length > 32) s = s.Substring(0, 32);
    return ChannelSlugRe.IsMatch(s) ? s : "";
  }

  private static string UniqueChannelSlug(JObject channels, string preferred) {
    string slug = NormalizeChannelSlug(preferred);
    if (slug == "") slug = "channel";
    if (channels[slug] == null) return slug;
    string baseSlug = slug.Length > 28 ? slug.Substring(0, 28) : slug;
    int n = 2;
    while (channels[baseSlug + "-" + n] != null) n++;
    string next = baseSlug + "-" + n;
    return next.Length > 32 ? next.Substring(0, 32) : next;
  }

  private JObject EmptyShowsCfg() {
    JObject o = new JObject();
    o["shows"] = new JArray();
    o["dayStart"] = 7;
    o["dayEnd"] = 24;
    o["activeShows"] = new JObject();
    o["channels"] = new JObject();
    o["defaultChannel"] = "";
    return o;
  }

  private JObject AsShowsObject(dynamic shows) {
    if (shows == null) return EmptyShowsCfg();
    return shows as JObject ?? JObject.FromObject(shows);
  }

  private JObject SyncActiveShows(JObject cfg) {
    JObject active = new JObject();
    JObject chs = cfg["channels"] as JObject ?? new JObject();
    foreach (var p in chs.Properties()) {
      JObject ch = p.Value as JObject;
      if (ch == null) continue;
      string displayId = (string)ch["displayId"];
      string showName = (string)ch["showName"];
      if (!string.IsNullOrEmpty(displayId) && !string.IsNullOrEmpty(showName)) {
        active[displayId] = showName;
      }
    }
    cfg["activeShows"] = active;
    return cfg;
  }

  private JObject MigrateShowsCfg(dynamic showsDyn) {
    JObject cfg = AsShowsObject(showsDyn);
    if (cfg["shows"] == null || cfg["shows"].Type != JTokenType.Array) cfg["shows"] = new JArray();
    if (cfg["activeShows"] == null || cfg["activeShows"].Type != JTokenType.Object) cfg["activeShows"] = new JObject();
    if (cfg["channels"] == null || cfg["channels"].Type != JTokenType.Object) {
      cfg["channels"] = new JObject();
    }
    JObject chObj = (JObject)cfg["channels"];
    string def = (string)cfg["defaultChannel"];
    if (string.IsNullOrEmpty(def) || chObj[def] == null) {
      var first = chObj.Properties().FirstOrDefault();
      cfg["defaultChannel"] = first != null ? first.Name : "";
    }
    return SyncActiveShows(cfg);
  }

  private JObject AssignShowToChannel(JObject cfg, string showName, string displayId, string channel) {
    if (string.IsNullOrEmpty(showName)) throw new Exception("showName fehlt.");
    string did = displayId ?? "";
    string slug = NormalizeChannelSlug(channel);
    JObject chs = (JObject)cfg["channels"];
    if (slug == "") throw new Exception("Kanal fehlt — Kanäle werden nur manuell angelegt.");
    if (chs[slug] == null) throw new Exception("Kanal nicht gefunden.");
    string chDid = (string)chs[slug]["displayId"];
    if (string.IsNullOrEmpty(chDid)) throw new Exception("Kanal hat keinen Displaytyp.");
    if (did == "") throw new Exception("Show-Display fehlt.");
    if (chDid != did) throw new Exception("Show-Display passt nicht zum Kanal.");
    chs[slug]["showName"] = showName;
    return SyncActiveShows(cfg);
  }

  private string ChannelSlugForShow(JObject cfg, string showName) {
    JObject chs = cfg["channels"] as JObject ?? new JObject();
    foreach (var p in chs.Properties()) {
      if ((string)p.Value["showName"] == showName) return p.Name;
    }
    return "";
  }

  private JObject EnsureShowHasChannel(JObject cfg, string showName, string displayId, string channel) {
    if (string.IsNullOrEmpty(showName)) throw new Exception("showName fehlt.");
    string requested = NormalizeChannelSlug(channel);
    if (requested != "") return AssignShowToChannel(cfg, showName, displayId, requested);
    string existing = ChannelSlugForShow(cfg, showName);
    if (existing != "") {
      string chDid = (string)cfg["channels"][existing]["displayId"];
      if (!string.IsNullOrEmpty(displayId) && !string.IsNullOrEmpty(chDid) && chDid != displayId) {
        throw new Exception("Show-Display passt nicht zum Kanal.");
      }
      return SyncActiveShows(cfg);
    }
    return cfg;
  }

  /** Creates a show.
    * dynamic _r  the given rest json by webservice
    * @param input.showName   the name of the show which should be created.
    * @param input.displayId  the ID (one character like EInkDef)  of the displayType the show should created.
    * @return output.shows, json of a description all available shows (see GetShows)
    *         output.showName, name of the created show (without "show_" prefix, perhaps corrected and cleaned)
    */
  public void CreateShow(dynamic _r) {
    try {
      string orgShowName = (string)_r.input.showName;
      string channel = _r.input.channel != null ? (string)_r.input.channel : "";
      string user, target, displayId;
      if (!TryParseChannelId(channel, out user, out target, out displayId)) {
        throw new Exception("Kanal fehlt — zuerst einen Kanal anlegen.");
      }
      string safe = GetSafeShowName(orgShowName);
      string showPath = Path.Combine(ShowsRoot(), user, target, displayId, safe);
      if (Directory.Exists(showPath)) throw new Exception("Show existiert bereits.");
      Directory.CreateDirectory(showPath);
      JObject show = new JObject();
      show["name"] = orgShowName;
      show["timer"] = 1;
      show["mode"] = "random";
      show["restStart"] = 22;
      show["restEnd"] = 6;
      show["imgs"] = new JArray();
      show["displayId"] = displayId;
      WriteAllJSONNoFormat(Path.Combine(showPath, "show.json"), show);
      JObject shows = LoadShowsCfg();
      _r.output.shows = shows;
      _r.output.showName = orgShowName;
      _r.ok = true;
    } catch (Exception ex) {
      _r.ok = false;
      if (_r.error == null) _r.error = new JObject();
      _r.error.msg = ex.Message;
      _r.error.code = -1;
    }
  }

  /** Deletes a show.
    * dynamic _r  the given rest json by webservice
    * @param input.showName   the name of the show which have to deleted.
    * @return output.shows, json of a description all available shows (see GetShows)
    */
  public void DeleteShow(dynamic _r) {
    string orgShowName = (string)_r.input.showName;
    string channel = _r.input.channel != null ? (string)_r.input.channel : RequestedChannelId(_r);
    FoundShow found = FindShow(orgShowName, channel);
    if (found == null) {
      _r.ok = false;
      return;
    }
    Directory.Delete(found.Dir, true);
    if (!string.IsNullOrEmpty(found.Channel)) {
      string user, target, displayId;
      TryParseChannelId(found.Channel, out user, out target, out displayId);
      string chJsonPath = Path.Combine(ShowsRoot(), user, target, displayId, "channel.json");
      JObject chJson = ReadAllJSONObject(chJsonPath) as JObject ?? new JObject();
      if ((string)chJson["showName"] == orgShowName) {
        JArray names = ListShowNamesIn(Path.Combine(ShowsRoot(), user, target, displayId));
        chJson["showName"] = names.Count > 0 ? (string)names[0] : "";
        WriteAllJSONNoFormat(chJsonPath, chJson);
      }
    }
    _r.output.shows = LoadShowsCfg();
    _r.ok = true;
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
    try {
    string orgShowName = (string)_r.input.showName;
    string channel = _r.input.channel != null ? (string)_r.input.channel : RequestedChannelId(_r);
    string showName = GetSafeShowName(orgShowName);
    string showPath = ResolveShowDirectory(orgShowName, channel);
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
          _r.error.msg = "Display ID mismatch";
        }
      }else{
        _r.error.msg = "Show not found";
      }
    }
    _r.output.show = show;
    } catch (Exception ex) {
      _r.ok = false;
      if (_r.error == null) _r.error = new JObject();
      _r.error.msg = "saveShowImage: " + ex.Message;
      _r.error.code = 5;
    }
  }

  /** Deletes the given image in show.
    * dynamic _r  the given rest json by webservice
    * @param input.showName   the name of the show where the image have to delete.
    * @param input.imgName    the name of the image which have to delete.
    * @return output.show, json of a description the show (see GetShow)
    */
  public void DeleteShowImage(dynamic _r) {
    string orgShowName = (string)_r.input.showName;
    string channel = _r.input.channel != null ? (string)_r.input.channel : RequestedChannelId(_r);
    string showName = GetSafeShowName(orgShowName);
    string showPath = ResolveShowDirectory(orgShowName, channel);
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
    * show.restStart    hour 0-23 when nightly deep sleep begins (default 22)
    * show.restEnd      hour 0-23 when nightly deep sleep ends (default 6); same as restStart disables rest
    * show.imgs         array of image names available in show
    * shows.mode        "random" / "forwaresequence" / "reverssequence"
    */
  public void GetShow(dynamic _r) {
    RegisterDeviceEcho(_r);
    string orgShowName = (string)_r.input.showName;
    string channel = _r.input.channel != null ? (string)_r.input.channel : RequestedChannelId(_r);
    FoundShow found = FindShow(orgShowName, channel);
    if (found == null) {
      _r.ok = false;
      return;
    }
    dynamic show = ReadAllJSONObject(Path.Combine(found.Dir, "show.json"));
    if (show != null) {
      AttachShowMeta(show, found);
      AttachShowRestWindow(show as JObject);
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
    string channel = _r.input.channel != null ? (string)_r.input.channel : RequestedChannelId(_r);
    FoundShow found = FindShow(orgShowName, channel);
    if (found == null || string.IsNullOrEmpty(found.Channel)) {
      throw new Exception("Show gehört nicht zu diesem Kanal.");
    }
    if (!string.IsNullOrEmpty(channel) && found.Channel != channel) {
      throw new Exception("Show gehört nicht zu diesem Kanal.");
    }
    string user, target, displayId;
    TryParseChannelId(found.Channel, out user, out target, out displayId);
    JObject chJson = new JObject();
    chJson["showName"] = orgShowName;
    WriteAllJSONNoFormat(Path.Combine(ShowsRoot(), user, target, displayId, "channel.json"), chJson);
    JObject shows = LoadShowsCfg();
    _r.output.shows = shows;
    _r.ok = true;
  }

  /** Saves new setting to a show (time to show each photo, selection mode of photos).
   * dynamic _r  the given rest json by webservice
   * @param input.showName   the name of the show which have to set active.
   * @param input.showMode   new photo selection mode of show.
   * @param input.showTimer  new display time for each photo in minutes.
   * @param input.showRestStart  optional rest-period start hour 0-23.
   * @param input.showRestEnd    optional rest-period end hour 0-23.
   * @return output.show, json of a description the given show (see GetShow).
   */
  public void SetShowSettings(dynamic _r) {
    string orgShowName = (string)_r.input.showName;
    string channel = _r.input.channel != null ? (string)_r.input.channel : RequestedChannelId(_r);
    string showPath = ResolveShowDirectory(orgShowName, channel);
    string showPathName = showPath + "\\show.json";
    dynamic show = ReadAllJSONObject(showPathName);
    if (show != null) {
      show.mode = (string)_r.input.showMode;
      show.timer = (int)_r.input.showTimer;
      JObject showObj = show as JObject;
      if (showObj != null) {
        if (_r.input.showRestStart != null) showObj["restStart"] = NormalizeRestHour(_r.input.showRestStart, 22);
        if (_r.input.showRestEnd != null) showObj["restEnd"] = NormalizeRestHour(_r.input.showRestEnd, 6);
        ApplyShowRestDefaults(showObj);
        StripShowRestWindow(showObj);
        WriteAllJSONNoFormat(showPathName, showObj);
        AttachShowRestWindow(showObj);
        _r.output.show = showObj;
      } else {
        WriteAllJSONNoFormat(showPathName, show);
        _r.output.show = show;
      }
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
  public void ListTargets(dynamic _r) {
    string user = InputUserId(_r.input, Request);
    string displayId = "";
    JObject input = _r.input as JObject;
    if (input != null && input["displayId"] != null) displayId = (string)input["displayId"];
    if (displayId == "" && input != null && input["deviceInfo"] != null && input["deviceInfo"]["displayId"] != null) {
      displayId = (string)input["deviceInfo"]["displayId"];
    }
    if (displayId == "" && Request != null) displayId = Request.QueryString["displayId"] ?? "";
    displayId = ToEinkDisplay(NormalizeChannelDisplay(displayId));
    if (user == "") throw new Exception("User ID fehlt.");
    if (displayId == "") throw new Exception("Displaytyp fehlt.");
    JObject shows = LoadShowsCfg();
    JArray groups = new JArray();
    JObject chs = shows["channels"] as JObject ?? new JObject();
    foreach (var p in chs.Properties()) {
      JObject ch = p.Value as JObject;
      if (ch == null) continue;
      string chUser = (string)(ch["userId"] ?? ch["user"] ?? "");
      if (chUser != user) continue;
      if ((string)ch["displayId"] != displayId) continue;
      string group = (string)(ch["groupId"] ?? ch["group"] ?? ch["target"] ?? "");
      JObject row = new JObject();
      row["group"] = group;
      row["groupId"] = group;
      row["target"] = group;
      row["user"] = user;
      row["userId"] = user;
      row["channel"] = p.Name;
      row["pathId"] = ch["pathId"] != null ? ch["pathId"] : ToPathDisplay(displayId);
      row["displayId"] = ch["displayId"];
      row["showName"] = ch["showName"] != null ? ch["showName"] : "";
      JArray names = ch["shows"] as JArray;
      row["shows"] = names != null ? names.Count : 0;
      groups.Add(row);
    }
    _r.output.user = user;
    _r.output.userId = user;
    _r.output.displayId = displayId;
    _r.output.groups = groups;
    _r.output.targets = groups;
    _r.ok = true;
  }

  public void GetShows(dynamic _r) {
    try {
      RegisterDeviceEcho(_r);
      JObject shows = LoadShowsCfg();
      _r.output.shows = shows;
      AttachChannelOutput(_r, shows);
      AttachPendingOta(_r);
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

  public void CreateChannel(dynamic _r) {
    string user = InputUserId(_r.input);
    string target = InputGroupId(_r.input);
    string displayId = ToPathDisplay((string)_r.input.displayId);
    if (user == "") throw new Exception("User ID fehlt.");
    if (target == "") throw new Exception("Group ID fehlt.");
    if (displayId == "") throw new Exception("Displaytyp fehlt.");
    string dir = Path.Combine(ShowsRoot(), user, target, displayId);
    if (Directory.Exists(dir) && (File.Exists(Path.Combine(dir, "channel.json")) || ListShowNamesIn(dir).Count > 0)) {
      throw new Exception("Kanal existiert bereits.");
    }
    Directory.CreateDirectory(dir);
    JObject chJson = new JObject();
    chJson["showName"] = "";
    WriteAllJSONNoFormat(Path.Combine(dir, "channel.json"), chJson);
    JObject shows = LoadShowsCfg();
    string id = MakeChannelId(user, target, displayId);
    if (string.IsNullOrEmpty((string)shows["defaultChannel"])) {
      shows["defaultChannel"] = id;
      WriteAllJSONNoFormat(ShowsCfgPath(), shows);
    }
    _r.output.shows = shows;
    _r.ok = true;
  }

  public void UpdateChannel(dynamic _r) {
    _r.input.channel = _r.input.channel != null ? _r.input.channel : _r.input.slug;
    SetActiveShow(_r);
  }

  public void DeleteChannel(dynamic _r) {
    string channel = _r.input.channel != null ? (string)_r.input.channel : (string)_r.input.slug;
    string user, target, displayId;
    if (!TryParseChannelId(channel, out user, out target, out displayId)) {
      user = InputUserId(_r.input);
      target = InputGroupId(_r.input);
      displayId = NormalizeChannelDisplay((string)_r.input.displayId);
    }
    if (user == "" || target == "" || displayId == "") throw new Exception("Kanal nicht gefunden.");
    string dir = Path.Combine(ShowsRoot(), user, target, displayId);
    if (!Directory.Exists(dir)) throw new Exception("Kanal nicht gefunden.");
    Directory.Delete(dir, true);
    string targetDir = Path.Combine(ShowsRoot(), user, target);
    if (Directory.Exists(targetDir) && Directory.GetFileSystemEntries(targetDir).Length == 0) Directory.Delete(targetDir);
    string userDir = Path.Combine(ShowsRoot(), user);
    if (Directory.Exists(userDir) && Directory.GetFileSystemEntries(userDir).Length == 0) Directory.Delete(userDir);
    _r.output.shows = LoadShowsCfg();
    _r.ok = true;
  }

  public void DeleteTarget(dynamic _r) {
    string user = InputUserId(_r.input);
    string target = InputGroupId(_r.input);
    if (user == "" || target == "") throw new Exception("Group ID fehlt.");
    string dir = Path.Combine(ShowsRoot(), user, target);
    if (!Directory.Exists(dir)) throw new Exception("Gruppe nicht gefunden.");
    Directory.Delete(dir, true);
    string userDir = Path.Combine(ShowsRoot(), user);
    if (Directory.Exists(userDir) && Directory.GetFileSystemEntries(userDir).Length == 0) Directory.Delete(userDir);
    _r.output.shows = LoadShowsCfg();
    _r.ok = true;
  }

  public void DeleteUser(dynamic _r) {
    string user = InputUserId(_r.input);
    if (user == "" || IsLegacyShowDir(user) || IsReservedShowsTop(user)) throw new Exception("User ID nicht gefunden.");
    string dir = Path.Combine(ShowsRoot(), user);
    if (!Directory.Exists(dir)) throw new Exception("User ID nicht gefunden.");
    Directory.Delete(dir, true);
    _r.output.shows = LoadShowsCfg();
    _r.ok = true;
  }

  public void SetDefaultChannel(dynamic _r) {
    string channel = _r.input.channel != null ? (string)_r.input.channel : (string)_r.input.slug;
    JObject shows = LoadShowsCfg();
    string user, target, displayId;
    if (!TryParseChannelId(channel, out user, out target, out displayId) || shows["channels"][MakeChannelId(user, target, displayId)] == null) {
      throw new Exception("Kanal nicht gefunden.");
    }
    shows["defaultChannel"] = MakeChannelId(user, target, displayId);
    WriteAllJSONNoFormat(ShowsCfgPath(), shows);
    _r.output.shows = shows;
    _r.ok = true;
  }


  /** Exports a given show as a zipped json file including all image data.
    * dynamic _r  the given rest json by webservice
    * @param input.showName   the name of the show which have to export.
    * @return output.showZi   the base64 encoded zip file of the show json.
    */
  public void ExportShow(dynamic _r) {
    string orgShowName = (string)_r.input.showName;
    string channel = _r.input.channel != null ? (string)_r.input.channel : RequestedChannelId(_r);
    string showName = GetSafeShowName(orgShowName);
    string showPath = ResolveShowDirectory(orgShowName, channel);
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
      string packageName = ShowPackageFileName(orgShowName, show.displayId != null ? (string)show.displayId : "");
      byte[] zip = CreateZippedBufferByString(exportStr, packageName);
      _r.output.showZip = Convert.ToBase64String(zip);
      _r.output.showFile = packageName;
      _r.ok = true;
    } else {
      _r.ok = false;
    }
  }

  private string ResolveReadyShowPath(string rawUrl) {
    string rel = (rawUrl ?? "").Trim().Replace("\\", "/").TrimStart('/');
    if (rel.StartsWith("readyToGoShows/")) rel = rel.Substring("readyToGoShows/".Length);
    if (rel.Length == 0 || rel.Contains("..")) return null;
    string root = PathCorrection("./readyToGoShows");
    string abs = Path.GetFullPath(Path.Combine(root, rel.Replace("/", "\\")));
    string rootFull = Path.GetFullPath(root);
    if (!abs.Equals(rootFull, StringComparison.OrdinalIgnoreCase) &&
        !abs.StartsWith(rootFull + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) {
      return null;
    }
    return abs;
  }

  public void ListReadyShows(dynamic _r) {
    JArray catalogs = new JArray();
    string root = PathCorrection("./readyToGoShows");
    if (Directory.Exists(root)) {
      foreach (string dir in Directory.GetDirectories(root)) {
        string name = Path.GetFileName(dir);
        string jsonPath = Path.Combine(dir, name + "_orgimgs.json");
        if (!File.Exists(jsonPath)) continue;
        string title = name;
        int count = 0;
        try {
          JObject cat = JObject.Parse(File.ReadAllText(jsonPath));
          if (cat["name"] != null) title = (string)cat["name"];
          JArray imgs = cat["images"] as JArray;
          if (imgs != null) count = imgs.Count;
        } catch { }
        JObject row = new JObject();
        row["name"] = name;
        row["title"] = title;
        row["count"] = count;
        row["path"] = "readyToGoShows/" + name + "/" + name + "_orgimgs.json";
        catalogs.Add(row);
      }
    }
    _r.output.catalogs = catalogs;
    _r.ok = true;
  }

  private static void EnsureHttpTls() {
    ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
  }

  private static byte[] DownloadHttpBytes(string url, out string contentType) {
    EnsureHttpTls();
    HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
    req.Method = "GET";
    req.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) microPhotoFrame/1.5";
    req.Accept = "image/avif,image/webp,image/apng,image/*,*/*;q=0.8";
    req.AllowAutoRedirect = true;
    req.Timeout = 30000;
    req.ReadWriteTimeout = 30000;
    using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse()) {
      contentType = resp.ContentType ?? "";
      using (Stream s = resp.GetResponseStream()) {
        MemoryStream ms = new MemoryStream();
        byte[] chunk = new byte[8192];
        int n;
        while ((n = s.Read(chunk, 0, chunk.Length)) > 0) {
          ms.Write(chunk, 0, n);
          if (ms.Length > 12 * 1024 * 1024) throw new Exception("image too large");
        }
        return ms.ToArray();
      }
    }
  }

  public void FetchShowSource(dynamic _r) {
    try {
      string raw = _r.input.url != null ? ((string)_r.input.url).Trim() : "";
      string name = _r.input.name != null ? Regex.Replace((string)_r.input.name, @"[^a-zA-Z0-9\-_]", "_") : "image";
      if (string.IsNullOrEmpty(name)) name = "image";
      if (string.IsNullOrEmpty(raw)) {
        _r.ok = false;
        _r.error.msg = "url fehlt";
        return;
      }
      byte[] buf;
      string mime = "image/jpeg";
      string ext = ".jpg";
      if (raw.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || raw.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) {
        string contentType;
        buf = DownloadHttpBytes(raw, out contentType);
        if (contentType.IndexOf("png", StringComparison.OrdinalIgnoreCase) >= 0) { mime = "image/png"; ext = ".png"; }
        else if (contentType.IndexOf("webp", StringComparison.OrdinalIgnoreCase) >= 0) { mime = "image/webp"; ext = ".webp"; }
        else if (contentType.IndexOf("gif", StringComparison.OrdinalIgnoreCase) >= 0) { mime = "image/gif"; ext = ".gif"; }
      } else {
        string filePath = ResolveReadyShowPath(raw);
        if (filePath == null || !File.Exists(filePath)) {
          _r.ok = false;
          _r.error.msg = "file not found";
          return;
        }
        buf = File.ReadAllBytes(filePath);
        ext = Path.GetExtension(filePath);
        if (string.Equals(ext, ".png", StringComparison.OrdinalIgnoreCase)) mime = "image/png";
        else if (string.Equals(ext, ".webp", StringComparison.OrdinalIgnoreCase)) mime = "image/webp";
        else if (string.Equals(ext, ".gif", StringComparison.OrdinalIgnoreCase)) mime = "image/gif";
        if (string.IsNullOrEmpty(ext)) ext = ".jpg";
      }
      if (buf == null || buf.Length > 12 * 1024 * 1024) {
        _r.ok = false;
        _r.error.msg = "image too large";
        return;
      }
      _r.output.base64 = Convert.ToBase64String(buf);
      _r.output.mime = mime;
      _r.output.fileName = name + ext;
      _r.ok = true;
    } catch (Exception ex) {
      _r.ok = false;
      if (_r.error == null) _r.error = new JObject();
      _r.error.msg = ex.Message;
      _r.error.code = -1;
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
    
    if (action == "getShowFile") {
      ServeLegacyShowFile(rest);
      return;
    }
    if (action == "getPendingOta") {
      ServePendingOta();
      return;
    }

    try {
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
      case "createChannel":
        CreateChannel(rest);
        break;
      case "updateChannel":
        UpdateChannel(rest);
        break;
      case "deleteChannel":
        DeleteChannel(rest);
        break;
      case "deleteTarget":
        DeleteTarget(rest);
        break;
      case "deleteUser":
        DeleteUser(rest);
        break;
      case "setDefaultChannel":
        SetDefaultChannel(rest);
        break;
      case "setShowSettings":
        SetShowSettings(rest);
        break;
      case "listTargets":
        ListTargets(rest);
        break;
      case "getShows":
        GetShows(rest);
        break;
      case "listFirmwareBins":
        ListFirmwareBins(rest);
        break;
      case "firmwareUpdate":
        FirmwareUpdate(rest);
        break;
      case "exportShow":
        ExportShow(rest);
        break;
      case "importShow":
        ImportShow(rest);
        break;
      case "listReadyShows":
        ListReadyShows(rest);
        break;
      case "fetchShowSource":
        FetchShowSource(rest);
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
    } catch (Exception actEx) {
      rest.ok = false;
      if (rest.error == null) rest.error = new JObject();
      rest.error.msg = actEx.Message;
      rest.error.code = -1;
    }
    /*-- @<BUILD_ONLY_ON_BUILDS:Release ----
    rest.input = new JObject();
    ---- @>BUILD_ONLY_ON_BUILDS --*/
    try {
      Response.ContentType = "application/json";
      Response.Write(Newtonsoft.Json.JsonConvert.SerializeObject(rest, Newtonsoft.Json.Formatting.None));
      Response.Flush();
    } catch (Exception serEx) {
      Response.ContentType = "application/json";
      Response.Write("{\"ok\":false,\"error\":{\"msg\":" + JsonConvert.ToString(serEx.Message) + ",\"code\":-1},\"output\":{}}");
    }
    HttpContext.Current.ApplicationInstance.CompleteRequest();
  }

  private static readonly Regex ChannelSegRe = new Regex(@"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$", RegexOptions.Compiled);
  private static readonly Regex ChannelDisplayRe = new Regex(@"^[0-9A-Za-z]$", RegexOptions.Compiled);
  private const string MigrateUser = "user";
  private const string MigrateTarget = "family";

  private class FoundShow {
    public string Dir;
    public string Channel;
    public string DisplayId;
    public string RelDir;
  }

  private string ShowsRoot() {
    return PathCorrection("./shows");
  }

  private string ShowsCfgPath() {
    return PathCorrection("./shows/shows.json");
  }

  private static string NormalizeChannelSeg(string raw) {
    if (string.IsNullOrWhiteSpace(raw)) return "";
    raw = raw.Trim();
    return ChannelSegRe.IsMatch(raw) ? raw : "";
  }

  private static string JStr(JObject jo, params string[] names) {
    if (jo == null) return "";
    foreach (string name in names) {
      if (jo[name] != null && jo[name].Type != JTokenType.Null) return (string)jo[name];
    }
    return "";
  }

  private static string InputUserId(dynamic input, System.Web.HttpRequest req = null) {
    string v = JStr(input as JObject, "userId", "user");
    if (v == "" && req != null) v = req.QueryString["userId"] ?? req.QueryString["user"] ?? "";
    return NormalizeChannelSeg(v);
  }

  private static string InputGroupId(dynamic input, System.Web.HttpRequest req = null) {
    string v = JStr(input as JObject, "groupId", "group", "target");
    if (v == "" && req != null) v = req.QueryString["groupId"] ?? req.QueryString["group"] ?? req.QueryString["target"] ?? "";
    return NormalizeChannelSeg(v);
  }

  private static string NormalizeChannelDisplay(string raw) {
    if (string.IsNullOrWhiteSpace(raw)) return "";
    raw = raw.Trim();
    return ChannelDisplayRe.IsMatch(raw) ? raw : "";
  }

  private static string ToPathDisplay(string id) {
    return NormalizeChannelDisplay(id);
  }

  private static string ToEinkDisplay(string id) {
    return NormalizeChannelDisplay(id);
  }

  private static string MakeChannelId(string user, string target, string displayId) {
    return user + "/" + target + "/" + displayId;
  }

  private static bool TryParseChannelId(string id, out string user, out string target, out string displayId) {
    user = target = displayId = "";
    if (string.IsNullOrWhiteSpace(id)) return false;
    string[] parts = id.Replace("\\", "/").Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
    if (parts.Length != 3) return false;
    user = NormalizeChannelSeg(parts[0]);
    target = NormalizeChannelSeg(parts[1]);
    displayId = ToPathDisplay(parts[2]);
    return user != "" && target != "" && displayId != "";
  }

  private void RenameEinkFoldersToPathIds(string root) {
    if (!Directory.Exists(root)) return;
    foreach (string userDir in Directory.GetDirectories(root)) {
      string userName = Path.GetFileName(userDir);
      if (IsReservedShowsTop(userName) || IsLegacyShowDir(userName)) continue;
      foreach (string targetDir in Directory.GetDirectories(userDir)) {
        foreach (string dispDir in Directory.GetDirectories(targetDir)) {
          string leaf = Path.GetFileName(dispDir);
          string pathId = ToPathDisplay(leaf);
          if (pathId == "" || pathId == leaf) continue;
          string dest = Path.Combine(targetDir, pathId);
          if (!Directory.Exists(dest)) Directory.Move(dispDir, dest);
          else {
            CopyShowDirectory(dispDir, dest);
            Directory.Delete(dispDir, true);
          }
        }
      }
    }
  }

  private string RequestedChannelId(dynamic _r) {
    string q = Request != null ? Request.QueryString["channel"] : null;
    string user, target, displayId;
    if (TryParseChannelId(q, out user, out target, out displayId)) return MakeChannelId(user, target, displayId);
    string input = _r.input != null && _r.input.channel != null ? (string)_r.input.channel : "";
    if (TryParseChannelId(input, out user, out target, out displayId)) return MakeChannelId(user, target, displayId);
    string path = Request != null ? Request.Path : "";
    Match m = Regex.Match(path ?? "", @"/(?:shows|c)/([A-Za-z0-9][A-Za-z0-9_-]{0,31})/([A-Za-z0-9][A-Za-z0-9_-]{0,31})/([0-9A-Za-z])(?:/|$)");
    if (m.Success) return MakeChannelId(m.Groups[1].Value, m.Groups[2].Value, ToPathDisplay(m.Groups[3].Value));
    return "";
  }

  private static bool IsLegacyShowDir(string name) {
    return name != null && name.StartsWith("show_");
  }

  private static bool IsReservedShowsTop(string name) {
    return name == "shows.json" || name == "devices.json" || name == ".gitkeep" || (name != null && name.StartsWith("."));
  }

  private void CopyShowDirectory(string src, string dest) {
    Directory.CreateDirectory(dest);
    foreach (string file in Directory.GetFiles(src)) {
      File.Copy(file, Path.Combine(dest, Path.GetFileName(file)), true);
    }
    foreach (string child in Directory.GetDirectories(src)) {
      CopyShowDirectory(child, Path.Combine(dest, Path.GetFileName(child)));
    }
  }

  private JArray ListShowNamesIn(string dir) {
    JArray names = new JArray();
    if (!Directory.Exists(dir)) return names;
    foreach (string child in Directory.GetDirectories(dir)) {
      string leaf = Path.GetFileName(child);
      if (!IsLegacyShowDir(leaf)) continue;
      dynamic show = ReadAllJSONObject(Path.Combine(child, "show.json"));
      string name = show != null && show.name != null ? (string)show.name : leaf.Substring(5);
      names.Add(name);
    }
    return names;
  }

  private JObject ScanDiskChannels() {
    JObject channels = new JObject();
    string root = ShowsRoot();
    if (!Directory.Exists(root)) return channels;
    foreach (string userDir in Directory.GetDirectories(root)) {
      string userName = Path.GetFileName(userDir);
      if (IsReservedShowsTop(userName) || IsLegacyShowDir(userName)) continue;
      string user = NormalizeChannelSeg(userName);
      if (user == "") continue;
      foreach (string targetDir in Directory.GetDirectories(userDir)) {
        string target = NormalizeChannelSeg(Path.GetFileName(targetDir));
        if (target == "") continue;
        foreach (string dispDir in Directory.GetDirectories(targetDir)) {
          string pathId = NormalizeChannelDisplay(Path.GetFileName(dispDir));
          if (pathId == "") continue;
          string displayId = ToEinkDisplay(pathId);
          string id = MakeChannelId(user, target, pathId);
          dynamic local = ReadAllJSONObject(Path.Combine(dispDir, "channel.json"));
          JArray names = ListShowNamesIn(dispDir);
          string showName = local != null && local.showName != null ? (string)local.showName : "";
          if (showName != "" && !names.Any(n => (string)n == showName)) showName = "";
          JObject ch = new JObject();
          ch["user"] = user;
          ch["target"] = target;
          ch["displayId"] = displayId;
          ch["pathId"] = pathId;
          ch["showName"] = showName;
          ch["shows"] = names;
          channels[id] = ch;
        }
      }
    }
    return channels;
  }

  private JObject RefreshShowsFromDisk(JObject cfg) {
    if (cfg == null) cfg = EmptyShowsCfg();
    cfg["channels"] = ScanDiskChannels();
    JObject channels = (JObject)cfg["channels"];
    string def = (string)cfg["defaultChannel"];
    if (string.IsNullOrEmpty(def) || channels[def] == null) {
      cfg["defaultChannel"] = channels.Properties().Select(p => p.Name).FirstOrDefault() ?? "";
    }
    string use = (string)cfg["defaultChannel"];
    cfg["shows"] = (use != "" && channels[use] != null) ? channels[use]["shows"].DeepClone() : new JArray();
    return SyncActiveShows(cfg);
  }

  private JObject MigrateLegacyShowFolders(JObject cfg) {
    if (cfg == null) cfg = EmptyShowsCfg();
    string root = ShowsRoot();
    if (!Directory.Exists(root)) return RefreshShowsFromDisk(cfg);
    JObject oldActive = cfg["activeShows"] as JObject ?? new JObject();
    bool copied = false;
    foreach (string src in Directory.GetDirectories(root)) {
      string leaf = Path.GetFileName(src);
      if (!IsLegacyShowDir(leaf)) continue;
      dynamic show = ReadAllJSONObject(Path.Combine(src, "show.json"));
      if (show == null || show.displayId == null) continue;
      string einkId = NormalizeChannelDisplay((string)show.displayId);
      if (einkId == "") continue;
      string pathId = ToPathDisplay(einkId);
      string dest = Path.Combine(root, MigrateUser, MigrateTarget, pathId, leaf);
      if (!Directory.Exists(dest)) {
        CopyShowDirectory(src, dest);
        copied = true;
      }
      if (Directory.Exists(dest) && !string.Equals(src, dest, StringComparison.OrdinalIgnoreCase)) {
        Directory.Delete(src, true);
      }
      string showName = show.name != null ? (string)show.name : leaf.Substring(5);
      string chJsonPath = Path.Combine(root, MigrateUser, MigrateTarget, pathId, "channel.json");
      JObject chJson = ReadAllJSONObject(chJsonPath) as JObject ?? new JObject();
      string active = (string)oldActive[einkId];
      if (active == showName || string.IsNullOrEmpty((string)chJson["showName"])) {
        chJson["showName"] = showName;
        WriteAllJSONNoFormat(chJsonPath, chJson);
      }
    }
    RenameEinkFoldersToPathIds(root);
    JObject next = RefreshShowsFromDisk(cfg);
    string oldDef = (string)cfg["defaultChannel"];
    bool oldSlug = !string.IsNullOrEmpty(oldDef) && !oldDef.Contains("/");
    if (copied || oldSlug || oldDef == MakeChannelId(MigrateUser, MigrateTarget, "I")) {
      string preferred = MakeChannelId(MigrateUser, MigrateTarget, "9");
      if (next["channels"][preferred] != null) next["defaultChannel"] = preferred;
    }
    return next;
  }

  private JObject LoadShowsCfg() {
    JObject cfg = MigrateShowsCfg(ReadAllJSONObject(ShowsCfgPath()));
    cfg = MigrateLegacyShowFolders(cfg);
    WriteAllJSONNoFormat(ShowsCfgPath(), cfg);
    return cfg;
  }

  private FoundShow FindShow(string showName, string channelHint) {
    if (string.IsNullOrEmpty(showName)) return null;
    string safe = GetSafeShowName(showName);
    string root = ShowsRoot();
    string user, target, displayId;
    if (TryParseChannelId(channelHint, out user, out target, out displayId)) {
      string dir = Path.Combine(root, user, target, displayId, safe);
      if (File.Exists(Path.Combine(dir, "show.json"))) {
        return new FoundShow {
          Dir = dir,
          Channel = MakeChannelId(user, target, displayId),
          DisplayId = displayId,
          RelDir = user + "/" + target + "/" + displayId + "/" + safe
        };
      }
    }
    JObject channels = ScanDiskChannels();
    foreach (var p in channels.Properties()) {
      if (!TryParseChannelId(p.Name, out user, out target, out displayId)) continue;
      string dir = Path.Combine(root, user, target, displayId, safe);
      if (File.Exists(Path.Combine(dir, "show.json"))) {
        return new FoundShow {
          Dir = dir,
          Channel = p.Name,
          DisplayId = displayId,
          RelDir = user + "/" + target + "/" + displayId + "/" + safe
        };
      }
    }
    string legacy = Path.Combine(root, safe);
    if (File.Exists(Path.Combine(legacy, "show.json"))) {
      return new FoundShow { Dir = legacy, Channel = "", DisplayId = "", RelDir = safe };
    }
    return null;
  }

  private string ResolveShowDirectory(string showName, string channelHint) {
    FoundShow found = FindShow(showName, channelHint);
    if (found != null) return found.Dir;
    return PathCorrection("./shows/" + GetSafeShowName(showName));
  }

  private void AttachShowMeta(dynamic show, FoundShow found) {
    if (show == null || found == null) return;
    show.channel = found.Channel ?? "";
    show.relDir = found.RelDir ?? "";
  }

  private static int NormalizeRestHour(object raw, int fallback) {
    if (raw == null) return fallback;
    int n;
    if (!int.TryParse(Convert.ToString(raw), out n) || n < 0 || n > 23) return fallback;
    return n;
  }

  private static DateTime RestLocalHour(DateTime now, int dayOffset, int hour) {
    return new DateTime(now.Year, now.Month, now.Day, hour, 0, 0, DateTimeKind.Local).AddDays(dayOffset);
  }

  private static long ToUnixSec(DateTime local) {
    DateTime utc = local.ToUniversalTime();
    return (long)(utc - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalSeconds;
  }

  private static void ApplyShowRestDefaults(JObject show) {
    if (show == null) return;
    show["restStart"] = show["restStart"] == null ? 22 : NormalizeRestHour(show["restStart"], 22);
    show["restEnd"] = show["restEnd"] == null ? 6 : NormalizeRestHour(show["restEnd"], 6);
  }

  private static void StripShowRestWindow(JObject show) {
    if (show == null) return;
    show.Remove("restActive");
    show.Remove("nextRestStart");
    show.Remove("restSleepUntil");
    show.Remove("tzOffsetMin");
  }

  private static void AttachShowRestWindow(JObject show) {
    if (show == null) return;
    ApplyShowRestDefaults(show);
    int start = (int)show["restStart"];
    int end = (int)show["restEnd"];
    if (start == end) {
      show["restActive"] = false;
      show["nextRestStart"] = 0;
      show["restSleepUntil"] = 0;
      show["tzOffsetMin"] = (int)TimeZoneInfo.Local.GetUtcOffset(DateTime.Now).TotalMinutes;
      return;
    }
    DateTime now = DateTime.Now;
    int h = now.Hour;
    DateTime startDt;
    DateTime endDt;
    if (start > end) {
      if (h >= start) {
        startDt = RestLocalHour(now, 0, start);
        endDt = RestLocalHour(now, 1, end);
      } else if (h < end) {
        startDt = RestLocalHour(now, -1, start);
        endDt = RestLocalHour(now, 0, end);
      } else {
        startDt = RestLocalHour(now, 0, start);
        endDt = RestLocalHour(now, 1, end);
      }
    } else if (h < start) {
      startDt = RestLocalHour(now, 0, start);
      endDt = RestLocalHour(now, 0, end);
    } else if (h < end) {
      startDt = RestLocalHour(now, 0, start);
      endDt = RestLocalHour(now, 0, end);
    } else {
      startDt = RestLocalHour(now, 1, start);
      endDt = RestLocalHour(now, 1, end);
    }
    long nextRestStart = ToUnixSec(startDt);
    long restSleepUntil = ToUnixSec(endDt);
    long nowSec = ToUnixSec(now);
    show["restActive"] = nowSec >= nextRestStart && nowSec < restSleepUntil;
    show["nextRestStart"] = nextRestStart;
    show["restSleepUntil"] = restSleepUntil;
    show["tzOffsetMin"] = (int)TimeZoneInfo.Local.GetUtcOffset(now).TotalMinutes;
  }

  private string RequestedDeviceDisplayIdRaw(dynamic _r) {
    try {
      if (_r.input != null && _r.input.deviceInfo != null && _r.input.deviceInfo.displayId != null) {
        return NormalizeChannelDisplay((string)_r.input.deviceInfo.displayId);
      }
    } catch {
    }
    return "";
  }

  private string RequestedDeviceDisplayId(dynamic _r) {
    return ToEinkDisplay(RequestedDeviceDisplayIdRaw(_r));
  }

  private void AliasChannelDisplayForDevice(JObject ch, string rawDeviceId) {
    if (ch == null || string.IsNullOrEmpty(rawDeviceId)) return;
    string einkCh = ToEinkDisplay((string)ch["displayId"]);
    string einkDev = ToEinkDisplay(rawDeviceId);
    if (einkCh != "" && einkCh == einkDev && (string)ch["displayId"] != rawDeviceId) {
      ch["displayId"] = rawDeviceId;
    }
  }

  private string ChannelIdForDeviceDisplay(JObject shows, string displayId) {
    if (string.IsNullOrEmpty(displayId) || shows == null) return "";
    JObject chs = shows["channels"] as JObject;
    if (chs == null) return "";
    string eink = ToEinkDisplay(NormalizeChannelDisplay(displayId));
    string def = (string)shows["defaultChannel"];
    if (!string.IsNullOrEmpty(def) && chs[def] != null && (string)chs[def]["displayId"] == eink) return def;
    string withShow = "";
    string any = "";
    foreach (var p in chs.Properties()) {
      JObject ch = p.Value as JObject;
      if (ch == null || (string)ch["displayId"] != eink) continue;
      if (any == "") any = p.Name;
      if (!string.IsNullOrEmpty((string)ch["showName"])) {
        withShow = p.Name;
        break;
      }
    }
    return withShow != "" ? withShow : any;
  }

  private string OtaDir() {
    string dir = PathCorrection("./tmp/ota");
    if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
    return dir;
  }

  private string OtaSafeKey(string ip) {
    if (ip == null) return "";
    StringBuilder sb = new StringBuilder();
    foreach (char c in ip) {
      if ((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F') || c == '.' || c == ':')
        sb.Append(c == '.' || c == ':' ? '_' : c);
    }
    return sb.ToString();
  }

  private JObject OtaQueueWrite(string deviceIp, byte[] buf, string fileName) {
    string dir = OtaDir();
    string key = OtaSafeKey(deviceIp);
    if (key == "") throw new Exception("deviceIp ungültig.");
    string prev = Path.Combine(dir, key + ".json");
    if (File.Exists(prev)) {
      try {
        JObject old = JObject.Parse(File.ReadAllText(prev));
        string oldTok = (string)old["token"];
        if (!string.IsNullOrEmpty(oldTok)) {
          string oldKey = Path.Combine(dir, "token-" + oldTok + ".key");
          if (File.Exists(oldKey)) File.Delete(oldKey);
        }
      } catch { }
    }
    string token = Guid.NewGuid().ToString("N");
    File.WriteAllBytes(Path.Combine(dir, key + ".bin"), buf);
    JObject meta = new JObject();
    meta["token"] = token;
    meta["deviceIp"] = deviceIp;
    meta["fileName"] = fileName;
    meta["size"] = buf.Length;
    meta["queuedAt"] = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    FileWriteAllText(Path.Combine(dir, key + ".json"), meta.ToString(Formatting.None));
    FileWriteAllText(Path.Combine(dir, "token-" + token + ".key"), key);
    JObject queued = new JObject();
    queued["token"] = token;
    queued["size"] = buf.Length;
    queued["fileName"] = fileName;
    return queued;
  }

  private void AttachPendingOta(dynamic _r) {
    List<string> ips = new List<string>();
    if (_r.input != null && _r.input.deviceInfo != null && _r.input.deviceInfo.ip != null)
      ips.Add((string)_r.input.deviceInfo.ip);
    if (_r.input != null && _r.input.deviceIp != null)
      ips.Add((string)_r.input.deviceIp);
    string remote = Request.Headers["X-Forwarded-For"];
    if (string.IsNullOrEmpty(remote)) remote = Request.UserHostAddress;
    if (!string.IsNullOrEmpty(remote)) ips.Add(remote.Split(',')[0].Trim());
    string dir = OtaDir();
    for (int i = 0; i < ips.Count; i++) {
      string key = OtaSafeKey(ips[i]);
      if (key == "") continue;
      string metaPath = Path.Combine(dir, key + ".json");
      if (!File.Exists(metaPath)) continue;
      try {
        JObject meta = JObject.Parse(File.ReadAllText(metaPath));
        if (meta["token"] == null) continue;
        JObject pending = new JObject();
        pending["token"] = (string)meta["token"];
        pending["size"] = meta["size"];
        pending["fileName"] = meta["fileName"];
        _r.output.pendingOta = pending;
        return;
      } catch { }
    }
  }

  private string ResolveFirmwareBuildBin(string id) {
    string safe = Regex.Replace(id ?? "", @"[^a-zA-Z0-9_\-]", "");
    if (safe == "") throw new Exception("firmwareId fehlt.");
    string root = Path.GetFullPath(PathCorrection("./firmware/.pio/build"));
    string abs = Path.GetFullPath(Path.Combine(root, safe, "firmware.bin"));
    if (!abs.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
      throw new Exception("path not allowed");
    if (!File.Exists(abs)) throw new Exception("firmware.bin nicht gefunden.");
    return abs;
  }

  private byte[] LoadFirmwareBuffer(dynamic input, out string fileName) {
    string firmwareId = input.firmwareId != null ? (string)input.firmwareId : "";
    if (firmwareId != "") {
      string fp = ResolveFirmwareBuildBin(firmwareId);
      fileName = firmwareId + ".bin";
      return File.ReadAllBytes(fp);
    }
    string b64 = input.firmware != null ? (string)input.firmware : "";
    if (b64 == "") throw new Exception("firmware (Base64) oder firmwareId fehlt.");
    fileName = "firmware.bin";
    return Convert.FromBase64String(b64);
  }

  public void ListFirmwareBins(dynamic _r) {
    JArray bins = new JArray();
    string root = PathCorrection("./firmware/.pio/build");
    if (Directory.Exists(root)) {
      string[] dirs = Directory.GetDirectories(root);
      for (int i = 0; i < dirs.Length; i++) {
        string bin = Path.Combine(dirs[i], "firmware.bin");
        if (!File.Exists(bin)) continue;
        FileInfo fi = new FileInfo(bin);
        JObject row = new JObject();
        row["id"] = Path.GetFileName(dirs[i]);
        row["label"] = Path.GetFileName(dirs[i]);
        row["size"] = fi.Length;
        row["mtime"] = fi.LastWriteTimeUtc.ToString("o");
        bins.Add(row);
      }
    }
    _r.output.bins = bins;
    _r.ok = true;
  }

  public void FirmwareUpdate(dynamic _r) {
    string deviceIp = _r.input.deviceIp != null ? (string)_r.input.deviceIp : "";
    if (deviceIp == "") throw new Exception("deviceIp fehlt.");
    string fileName;
    byte[] buf = LoadFirmwareBuffer(_r.input, out fileName);
    bool queue = _r.input.queue != null && (bool)_r.input.queue;
    if (queue) {
      _r.output.queued = true;
      _r.output.pendingOta = OtaQueueWrite(deviceIp, buf, fileName);
      _r.ok = true;
      return;
    }
    try {
      string boundary = "----FWUpload" + DateTime.UtcNow.Ticks;
      byte[] header = Encoding.ASCII.GetBytes("--" + boundary + "\r\nContent-Disposition: form-data; name=\"firmware\"; filename=\"firmware.bin\"\r\nContent-Type: application/octet-stream\r\n\r\n");
      byte[] footer = Encoding.ASCII.GetBytes("\r\n--" + boundary + "--\r\n");
      HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://" + deviceIp + "/ota");
      req.Method = "POST";
      req.ContentType = "multipart/form-data; boundary=" + boundary;
      req.Timeout = 120000;
      req.ReadWriteTimeout = 120000;
      req.ContentLength = header.Length + buf.Length + footer.Length;
      using (Stream s = req.GetRequestStream()) {
        s.Write(header, 0, header.Length);
        s.Write(buf, 0, buf.Length);
        s.Write(footer, 0, footer.Length);
      }
      using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse()) {
        using (StreamReader sr = new StreamReader(resp.GetResponseStream())) {
          string text = sr.ReadToEnd();
          try { _r.output.deviceResponse = JObject.Parse(text); } catch { _r.output.deviceResponse = text; }
        }
      }
      _r.ok = true;
    } catch {
      _r.output.queued = true;
      _r.output.pendingOta = OtaQueueWrite(deviceIp, buf, fileName);
      _r.output.deviceUnreachable = true;
      _r.ok = true;
    }
  }

  private void ServePendingOta() {
    string token = Regex.Replace(Request["token"] ?? "", @"[^a-zA-Z0-9]", "");
    if (token == "") {
      Response.StatusCode = 400;
      Response.Write("{\"ok\":false}");
      HttpContext.Current.ApplicationInstance.CompleteRequest();
      return;
    }
    string dir = OtaDir();
    string keyFile = Path.Combine(dir, "token-" + token + ".key");
    if (!File.Exists(keyFile)) {
      Response.StatusCode = 404;
      Response.Write("{\"ok\":false}");
      HttpContext.Current.ApplicationInstance.CompleteRequest();
      return;
    }
    string key = File.ReadAllText(keyFile).Trim();
    string binPath = Path.Combine(dir, key + ".bin");
    if (!File.Exists(binPath)) {
      Response.StatusCode = 404;
      Response.Write("{\"ok\":false}");
      HttpContext.Current.ApplicationInstance.CompleteRequest();
      return;
    }
    Response.Clear();
    Response.ContentType = "application/octet-stream";
    Response.AddHeader("Content-Disposition", "attachment; filename=\"firmware.bin\"");
    Response.TransmitFile(binPath);
    Response.Flush();
    try { File.Delete(binPath); } catch { }
    try { File.Delete(Path.Combine(dir, key + ".json")); } catch { }
    try { File.Delete(keyFile); } catch { }
    HttpContext.Current.ApplicationInstance.CompleteRequest();
  }

  private void ServeLegacyShowFile(dynamic _r) {
    string showToken = Request["show"] ?? "";
    string file = Path.GetFileName(Request["file"] ?? "");
    if (showToken.StartsWith("show_")) showToken = showToken.Substring(5);
    if (string.IsNullOrEmpty(showToken) || string.IsNullOrEmpty(file) || file == "." || file == "..") {
      Response.StatusCode = 404;
      Response.End();
      return;
    }
    FoundShow found = FindShow(showToken, RequestedChannelId(_r));
    if (found == null) {
      Response.StatusCode = 404;
      Response.End();
      return;
    }
    string full = Path.Combine(found.Dir, file);
    if (!File.Exists(full)) {
      Response.StatusCode = 404;
      Response.End();
      return;
    }
    Response.Clear();
    Response.ContentType = "image/ink";
    Response.TransmitFile(full);
    Response.Flush();
    HttpContext.Current.ApplicationInstance.CompleteRequest();
  }

  private void AttachChannelOutput(dynamic _r, JObject shows) {
    string requested = RequestedChannelId(_r);
    string user, target, displayId;
    if (TryParseChannelId(requested, out user, out target, out displayId)) {
      string id = MakeChannelId(user, target, displayId);
      if (shows["channels"][id] != null) {
        JObject ch = (JObject)shows["channels"][id].DeepClone();
        ch["slug"] = id;
        AliasChannelDisplayForDevice(ch, RequestedDeviceDisplayIdRaw(_r));
        shows["shows"] = ch["shows"].DeepClone();
        _r.output.shows = shows;
        _r.output.channel = ch;
        _r.output.channelError = null;
        return;
      }
      _r.output.shows = shows;
      _r.output.channel = null;
      _r.output.channelError = "unknown";
      return;
    }
    string idByDevice = ChannelIdForDeviceDisplay(shows, RequestedDeviceDisplayId(_r));
    string def = !string.IsNullOrEmpty(idByDevice) ? idByDevice : (string)shows["defaultChannel"];
    if (!string.IsNullOrEmpty(def) && shows["channels"][def] != null) {
      JObject ch = (JObject)shows["channels"][def].DeepClone();
      ch["slug"] = def;
      AliasChannelDisplayForDevice(ch, RequestedDeviceDisplayIdRaw(_r));
      shows["shows"] = ch["shows"].DeepClone();
      _r.output.shows = shows;
      _r.output.channel = ch;
      _r.output.channelError = null;
      return;
    }
    _r.output.shows = shows;
    _r.output.channel = null;
    _r.output.channelError = "no_default";
  }

}

