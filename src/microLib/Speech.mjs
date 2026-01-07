// ===========================================
// Speech.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

/** Module to manage speech output.
 * @module Speech
 */

/** Static class for speech output.
 * @class Speech
 */

import './i18x.mjs';
import Config from "./Config.mjs";

export default class Speech {
	static curSpeechOut = null;
	static curSpeechTimeout = null;
	static DOSPEECHINTERRUPT = true;
	static speak(_text) {
		if (Config.ALL_AUDIO_MUTE || Config.SPEECH_MUTE) return;
		if (Speech.DOSPEECHINTERRUPT) {
			if (speechSynthesis.speaking) {
				// Speechyn is currently speaking, cancel the current utterance(s)
				speechSynthesis.cancel();
				// Make sure we don't create more than one timeout...
				if (Speech.curSpeechTimeout !== null) clearTimeout(Speech.curSpeechTimeout);
				Speech.curSpeechTimeout = setTimeout(function () { Speech.speak(_text); }, 250);
				return;
			}
		}
		Speech.curSpeechOut = new SpeechSynthesisUtterance(_text);
		Speech.curSpeechOut.volume = Config.SPEECH_VOL;
		Speech.curSpeechOut.rate = 0.7;
		Speech.curSpeechOut.pitch = 1;
		Speech.curSpeechOut.lang = (i18x.curLid === undefined) ? "es-US" : i18x.curLid;
		speechSynthesis.speak(Speech.curSpeechOut);
	}
	
	//static setRatePitch(_rate){
	//}
	
	static stop() {
		if (speechSynthesis.speaking) {
			// Speechyn is currently speaking, cancel the current utterance(s)
			speechSynthesis.cancel();
		}
	}
	
}