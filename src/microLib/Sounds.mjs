// ===========================================
// SoundAtlas.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

/** Module to manage sound playing.
 * @module Sounds
 */

/** Static class manage sound playing.
 * @class Sounds
 */

import './WebUtils.mjs';
import Config from "./Config.mjs";

export default class Sounds {
	static  _AUDIOCONTEXT = window.AudioContext || window.webkitAudioContext;
	static AUDIOCONTEXT = new Sounds._AUDIOCONTEXT();
	static sounds = {};
	
	static loadEvents = {};
	
	static getEventTarget(_e) {
		let t;
		if (_e.target) {
			t = _e.target;
		} else if (_e.currentTarget) {
			t = _e.currentTarget;
		} else if (_e.srcElement) {
			t = _e.srcElement;
		}
		if (t.nodeType == 3) t = t.parentNode;
		return t;
	}
	
	static extractAudioBuffer(_srcAudioBuffer, _start, _duration) {
		let buffer = Sounds.AUDIOCONTEXT.createBuffer(_srcAudioBuffer.numberOfChannels, _srcAudioBuffer.sampleRate * _duration, _srcAudioBuffer.sampleRate);
		let srcChanData, dstChanData, s, c,
			offset = Math.floor(_start * _srcAudioBuffer.sampleRate);
		for (c = 0; c < _srcAudioBuffer.numberOfChannels; c++) {
			srcChanData = _srcAudioBuffer.getChannelData(c);
			dstChanData = buffer.getChannelData(c);
			for (s = 0; s < buffer.length; s++) dstChanData[s] = srcChanData[s + offset];
		}
		return buffer;
	}
	
	static _onSoundEnd(_e) {
		let s = Sounds.getEventTarget(_e);
		Sounds.sounds[s.name].removeEventListener("ended", _onSoundEnd, false);
		eval(Sounds.sounds[s.name].onendeval);
	}
	
	static play(_soundName, _vol = 100) {
		let err, ret = null, i;
		//log("PlaySound=",_soundName);
		if (Sounds.sounds.hasOwnProperty(_soundName) && !document.hidden) {
			if (_vol == 0) return;
			let source = Sounds.AUDIOCONTEXT.createBufferSource();
			let gainNode = Sounds.AUDIOCONTEXT.createGain(),
				b = Sounds.sounds[_soundName].buffer, i = Sounds.sounds[_soundName].info;
			if (b == null) return;
			source.buffer = b;
			source.connect(gainNode);
			gainNode.connect(Sounds.AUDIOCONTEXT.destination);
			gainNode.gain.value = _vol;
			ret = source;
			source.isEnded = false;
			source.addEventListener('ended', function (e) { e.target.isEnded = true; });
			//source.onended=function(e){e.target.isEnded=true;};
			if (i == null) {
				source.start(0);
			} else {
				if (i[2] >= 0) {
					source.loop = true;
					source.loopStart = i[2];
					source.loopEnd = i[3];
					if (Config.IS_CHROME) {
						source.start(0, i[0], 10000);
					} else {
						source.start(0, i[0], i[1]);
					}
					;
				} else {
					source.start(0, i[0], i[1]);
				}
			}
		}
		return ret;
	}
	
	static playControl(_soundName) {
		if (!Config.ALL_AUDIO_MUTE) if (!Config.SOUND_CONTROL_MUTE) return this.play(_soundName, Config.SOUND_CONTROL_VOL);
	}
	
	static playModal(_soundName) {
		if (!Config.ALL_AUDIO_MUTE) if (!Config.SOUND_MODAL_MUTE) return this.play(_soundName, Config.SOUND_MODAL_VOL);
	}
	
	static stop(_source, _force = false) {
		if (_source != null) {
			if (_source.loop && !_force) {
				_source.loop = false;
				return _source;
			} else {
				_source.stop();
				_source.isEnded = true;
				return null;
			}
		}
	}
	
	static load(_soundAtlasName, _path = null) {
		if (_path === null) _path = "./build/exresources/snds";
		if (Sounds.sounds[_soundAtlasName] === undefined) {
			let request = new XMLHttpRequest(), isjson = true;
			if (_soundAtlasName.suffix() == "json") {
				WebUtils.LoadJSON(_path + '/' + _soundAtlasName, false, {sndName: _soundAtlasName}, function (_json, _success, _info) {
					let s, sndName = _info.sndName.withoutSuffix();
					if (Sounds.sounds.hasOwnProperty(sndName)) {
						for (s in _json.sounds) Sounds.sounds[s] = {
							buffer: Sounds.sounds[sndName].buffer,
							info: _json.sounds[s]
						};
						delete Sounds.sounds[sndName];
					} else {
						for (s in _json.sounds) Sounds.sounds[s] = {
							buffer: null,
							info: _json.sounds[s]
						};
						Sounds.sounds[sndName] = {
							buffer: null,
							info: null,
							jsonsounds: _json.sounds
						};
					}
				})
				_soundAtlasName = _soundAtlasName.withoutSuffix();
			} else {
				isjson = false;
			}
			request.open("GET", _path + '/' + _soundAtlasName, true);
			if (!isjson) _soundAtlasName = _soundAtlasName.withoutSuffix();
			request.responseType = "arraybuffer";
			request.onload = function () {
				// Asynchronously decode the audio file data in request.response
				//log(_soundAtlasName);
				Sounds.AUDIOCONTEXT.decodeAudioData(
					request.response,
					function (buffer) {
						let sndName = _soundAtlasName, s;
						if (buffer) {
							if (Sounds.sounds.hasOwnProperty(sndName)) {
								for (s in Sounds.sounds[sndName].jsonsounds) {
									Sounds.sounds[s] = {
										buffer: buffer,
										info: Sounds.sounds[sndName].jsonsounds[s]
									};
									if (Sounds.sounds[s].info[2] >= 0) {
										// is a loop sound, because w3c has a silly definition for loops we have to create a new buffer...
										let newbuffer = Sounds.extractAudioBuffer(buffer, Sounds.sounds[s].info[0], Sounds.sounds[s].info[1]);
										Sounds.sounds[s].buffer = newbuffer;
										Sounds.sounds[s].info[2] -= Sounds.sounds[s].info[0];
										Sounds.sounds[s].info[3] -= Sounds.sounds[s].info[0];
										Sounds.sounds[s].info[0] = 0;
										//sounds[s].info[SND_DURATION]=0;
									}
								}
								delete Sounds.sounds[sndName];
							} else {
								Sounds.sounds[sndName] = {buffer: buffer, info: null};
							}
						}
						for(let se in Sounds.loadEvents){
							Sounds.loadEvents[se]();
						}
						//if (µlibConf.hasOwnProperty("soundPlayOnLoad")) if (sounds.hasOwnProperty(µlibConf.soundPlayOnLoad)) if (!GetParameterExists("noss")) PlaySound(µlibConf.soundPlayOnLoad);
					},
					function (error) {
						console.Log("Error loading sound:", _soundAtlasName);
					}
				)
			}
			request.send();
		}
	}
	
	static registerLoadEvent(_name, _eventFunction) {
		Sounds.loadEvents [_name] = _eventFunction;
	}
	
	static unRegisterLoadEvent(_name) {
		delete Sounds.loadEvents [_name];
	}
	
}