// ===========================================
// Config.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

/**
 * A class to configure web applications.
 * @module Config
 */

import Users from "./Users.mjs";

/** Class to configure web applications. Properties will be overwritten by main javascript file of application.
 * @class Config
 */
export default class Config {
	/** The application identifier. Used for localStorage and external server communication.
	 * @static
	 * @type  {string}
	 */
	static APPID = "UnknownApp";
	
	/** The client identifier. Used for application customizing.
	 * @static
	 * @type  {string}
	 */
	
	static CLIENT = "Standard";
	/** The instance identifier.
	 * @static
	 * @type  {string}
	 */
	static INSTANCE = "";
	
	static IS_CHROME = navigator.userAgent.match(/Chrome/i) != null;
	static IS_FIREFOX = navigator.userAgent.match(/Firefox/i) != null;
	
	/*-- @<BUILD_ONLY_AT_RELEASES:Production ----
	static IS_DEVELOPEMENT_SERVER = false;
	static IS_TEST_SERVER = false;
	static IS_PRODUCTION_SERVER = true;
	---- @>BUILD_ONLY_AT_RELEASES --*/
	/*-- @<BUILD_ONLY_AT_RELEASES:Test ----
	static IS_DEVELOPEMENT_SERVER = false;
	static IS_TEST_SERVER = true;
	static IS_PRODUCTION_SERVER = false;
	---- @>BUILD_ONLY_AT_RELEASES --*/
	/*-- @<BUILD_NEVER_AT_RELEASES:Production,Test --*/
	static IS_DEVELOPEMENT_SERVER = true;
	static IS_TEST_SERVER = false;
	static IS_PRODUCTION_SERVER = false;
	/*-- @>BUILD_NEVER_AT_RELEASES:Production,Test --*/
	
	/** The release and development documentation.
	 * This is an array of following format:
	 * @example
	 * [
	 *   {
	 *     "main": 0, "minor": 1, "revision": 0, "date": "2022-06-01 18:00", "beta": true,
	 *     "info": [
	 *       "basic implementatinos"
	 *     ]
	 *   }
	 * ]
	 * @static
	 * @type  {array}
	 */
	static RELEASES = [
		{
			"main": 0, "minor": 0, "revision": 0, "date": "2000-01-01 00:00", "beta": true,
			"info": [
				"dummy information"
			]
		},
	];
	
	static subMenuLayoutFlags = {
		"InfoSheet": 1 << 0,
		"ActivityLog": 1 << 1,
		"Lock": 1 << 2,
		"Detail": 1 << 3
	};
	
	static maintenanceActive = false;

	
	static SUPPORTED_USER_ROLES = User.ROLES_ALL;
	
	// Sound, Music and Speech Settings...
	/** Mute of audio output.
	 * @static
	 * @type  {boolean}
	 */
	static ALL_AUDIO_MUTE = true;
	/** Mute of control elements audio output.
	 * @static
	 * @type  {boolean}
	 */
	static SOUND_CONTROL_MUTE = false
	/** Volume of control elements (float, range 0.0 to 1.0).
	 * @static
	 * @type  {number}
	 */
	static SOUND_CONTROL_VOL = 1;
	/** Mute of modal panel elements audio output.
	 * @static
	 * @type  {boolean}
	 */
	static SOUND_MODAL_MUTE = true;
	/** Volume of modal panel elements (float, range 0.0 to 1.0).
	 * @static
	 * @type  {number}
	 */
	static SOUND_MODAL_VOL = 1;
	/** Mute of music audio output.
	 * @static
	 * @type  {boolean}
	 */
	static MUSIC_MUTE = true;
	/** Volume of musics (float, range 0.0 to 1.0).
	 * @static
	 * @type  {number}
	 */
	static MUSIC_VOL = 0.8;
	/** Mute of speech audio output.
	 * @static
	 * @type  {boolean}
	 */
	static SPEECH_MUTE = true;
	/** Volume of speech outputs (float, range 0.0 to 1.0).
	 * @static
	 * @type  {number}
	 */
	static SPEECH_VOL = 1;
	
	static GetCurrentVersionString = function () {
		return "V" + this.RELEASES[0].main + "." + this.RELEASES[0].minor + "." + this.RELEASES[0].revision + ((this.RELEASES[0].beta) ? "β" : "");
	}
	
	static GetCurrentFullVersionString = function () {
		return "V" + this.RELEASES[0].main + "." + this.RELEASES[0].minor + "." + this.RELEASES[0].revision + ((this.RELEASES[0].beta) ? "β" : "") + " · " + this.RELEASES[0].date.ReleaseDate2DateTime().Format('stddatetime');
	}
	
	static GetCopyrightYearsString = function () {
		let s = 0;
		let e = 0;
		let d = 0;
		for (let r in this.RELEASES) {
			if (!(this.RELEASES[r] instanceof Function)) {
				for (let i in this.RELEASES[r].info) {
					if (!(this.RELEASES[r].info[i] instanceof Function)) {
						d = this.RELEASES[0].date.ReleaseDateYear();
						if (s == 0) {
							s = d;
							e = d;
						} else if (d > e) {
							e = d;
						}
					}
				}
			}
		}
		return s + (e != s ? "-" + e : "");
	}
	
	static GetReleasesHTML = function () {
		let ret = "";
		for (let r in this.RELEASES) {
			if (!(this.RELEASES[r] instanceof Function)) {
				ret += '<ul class="versioninfo">' + this.RELEASES[r].main + "." + this.RELEASES[r].minor + "." + this.RELEASES[r].revision + ((this.RELEASES[r].beta) ? "β" : "") + " · " + this.RELEASES[r].date.ReleaseDate2DateTime().Format('stddate');
				for (let i in this.RELEASES[r].info) {
					if (!(this.RELEASES[r].info[i] instanceof Function)) {
						ret += '<li class="versioninfo">' + this.RELEASES[r].info[i].HtmlEntities() + '</li>';
					}
				}
				ret += '</ul>';
			}
		}
		return ret;
	}
	
	static setConfigByLocalStorage() {
		this.ALL_AUDIO_MUTE = localStorage.Get("ALL_AUDIO_MUTE", true, Storage.LEVEL_APP);
		this.SOUND_CONTROL_MUTE = localStorage.Get("SOUND_CONTROL_MUTE", false, Storage.LEVEL_APP);
		this.SOUND_CONTROL_VOL = localStorage.Get("SOUND_CONTROL_VOL", 1, Storage.LEVEL_APP);
		this.SOUND_MODAL_MUTE = localStorage.Get("SOUND_MODAL_MUTE", true, Storage.LEVEL_APP);
		this.SOUND_MODAL_VOL = localStorage.Get("SOUND_MODAL_VOL", 1, Storage.LEVEL_APP);
		this.MUSIC_MUTE = localStorage.Get("MUSIC_MUTE", true, Storage.LEVEL_APP);
		this.MUSIC_VOL = localStorage.Get("MUSIC_VOL", 0.8, Storage.LEVEL_APP);
		this.SPEECH_MUTE = localStorage.Get("SPEECH_MUTE", true, Storage.LEVEL_APP);
		this.SPEECH_VOL = localStorage.Get("SPEECH_VOL", 1, Storage.LEVEL_APP);
	}
}

String.prototype.ConfigFullVersionString = function (_configVersion) {
	return this.valueOf() + "V" + _configVersion.main + "." + _configVersion.minor + "." + _configVersion.revision + ((_configVersion.beta) ? "𝛽" : "") + " · " + _configVersion.date.ReleaseDate2DateTime().Format('stddatetime');
}

window.Config = Config;