// ===========================================
// Musics.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

/** Module to manage music playing.
 * @module Musics
 */

/** Static class for music playing.
 * @class Musics
 */

import Config from "./Config.mjs";

export default class Musics {
	static musicAudio = null;
	static musicLastUrl = "";
	
	static play(_musicURL, _loop) {
		if (Musics.musicAudio != null) Musics.stop();
		if (Config.ALL_AUDIO_MUTE || Config.MUSIC_MUTE) return;
		Musics.musicLastUrl = _musicURL;
		Musics.musicAudio = new Audio(_musicURL);
		Musics.musicAudio.isStream = true;
		Musics.musicAudio.loop = _loop;
		Musics.musicAudio.preload = "none";
		Musics.musicAudio.volume = Config.MUSIC_MUTE ? 0.0 : Config.MUSIC_VOL;
		//musicAudio.fadeOutStartVolume=1.0;
		Musics.musicAudio.addEventListener('ended', function (_ev) { musicAudio = null; }, false);
		try {
			Musics.musicAudio.currentTime = 0;
			Musics.musicAudio.autoplay = true;
			//var playPromise=musicAudio.play();
		} catch (err) { musicAudio = null; }
		//_endCallback(true);
	}
	
	static stop() {
		if (Musics.musicAudio != null) {
			Musics.musicAudio.pause();
			Musics.musicAudio = null;
		}
	}
	
	static setupSetting() {
		//if(musicAudio==null)if(musicLastUrl!="")PlayGUIMusic(musicLastUrl);
		if (Musics.musicAudio != null) Musics.musicAudio.volume = (Config.ALL_AUDIO_MUTE || Config.MUSIC_MUTE) ? 0.0 : Config.MUSIC_VOL;
	}
	
	static isPlaying() {
		if (Musics.musicAudio == null) return false;
		return Musics.musicAudio.currentTime != 0;
	}
}