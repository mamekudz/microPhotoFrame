// ===========================================
// Utils.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

export default class Utils {
	static IS_PIXELRATIO = window.devicePixelRatio || 1;
	static IS_VIEWPORT = { width: window.innerWidth, height: window.innerHeight };
	static IS_SCREEN = { width: window.screen.width * Utils.IS_PIXELRATIO, height: window.screen.height * Utils.IS_PIXELRATIO };
	
	static IS_IPOD = navigator.userAgent.match(/iPod/i) != null;
	static IS_IPAD = navigator.userAgent.match(/iPad/i) != null;
	static IS_IPAD3PLUS = Utils.IS_IPAD && window.devicePixelRatio == 2;
	static IS_IPHONE = navigator.userAgent.match(/iPhone/i) != null;
	static IS_IPHONEIPOD5 = window.screen.availHeight == 548;
	static IS_IOS = Utils.IS_IPHONE || Utils.IS_IPOD || Utils.IS_IPAD;
	static IS_IE = navigator.userAgent.match(/MSIE/) != null || navigator.userAgent.match(/Trident/) != null || navigator.userAgent.match(/Zune/) != null;
	static IS_FIREFOX = navigator.userAgent.match(/Firefox/i) != null;
	static IS_SAFARI = ((navigator.userAgent.match(/Safari/i) != null && navigator.userAgent.match(/Chrome/i) == null) || Utils.IS_IPHONE || Utils.IS_IPAD) && !navigator.userAgent.match(/Android/i) != null;
	static IS_CHROME = navigator.userAgent.match(/Chrome/i) != null;
	static IS_OPERA = navigator.userAgent.match(/Opera/i) != null;
	static IS_ANDROID = navigator.userAgent.match(/Android/i) != null;
	static IS_WEBKIT = navigator.userAgent.match(/WebKit/i) != null;
	static IS_WINDOWS = navigator.userAgent.match(/Windows/i) != null;
	static IS_MAC = navigator.userAgent.match(/Macintosh/i) != null;
	static IS_MACSAFARI = Utils.IS_MAC && Utils.IS_SAFARI;
	static IS_WINSAFARI = Utils.IS_WINDOWS && Utils.IS_SAFARI;
	static IS_ANDROID40 = Utils.IS_ANDROID && parseFloat(navigator.userAgent.split("Android")[1]) < 4.1;
	static IS_MOBILE = Utils.IS_ANDROID || Utils.IS_IOS;

	
	/** STATIC: a function that do nothings, usefull as empty event handler.
	 */
	static nothings() {
	}
	
	/** STATIC: Loads a json file from server.
	 * @method LoadJSON
	 * @static
	 * @param {string} _url   URL to load.
	 * @param {boolean} _cache   Whether to use browsers cache, default value is true.
	 * @return {Promise}	A promise which will be give the parsed json if successfully.
	 */
	static LoadJSON = function (_url, _cache = true) {
		let jsonajax = new XMLHttpRequest(), self = this, ret;
		jsonajax.open("GET", _url, true);
		jsonajax.setRequestHeader("Content-Type", "application/json");
		if (!_cache) {
			jsonajax.setRequestHeader("pragma", "no-cache");
			jsonajax.setRequestHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate, no-transform");
			jsonajax.setRequestHeader("pragma", "no-cache");
			jsonajax.setRequestHeader("Expires", 0);
		}
		ret =  new Promise(
			 function (_resolve, _reject) {
						jsonajax.onreadystatechange = function () {
							if (this.readyState == 4) {
								if (this.status == 200) {
									try {
										_resolve(JSON.parse(this.responseText));
									} catch (e) {
										_reject();
									}
								} else {
									_reject();
								}
							}
						}
			 })
		jsonajax.send(null);
		return ret;
	}
	
	/** STATIC: Loads a text file from server.
	 * @method loadText
	 * @static
	 * @param {string} _url   URL to load.
	 * @param {boolean} _cache   Whether to use browsers cache, default value is true.
	 * @return {Promise}	A promise which will be give the parsed json if successfully.
	 */
	static loadText = function (_url, _cache = true) {
		let textajax = new XMLHttpRequest(), self = this, ret;
		textajax.open("GET", _url, true);
		textajax.setRequestHeader("Content-Type", "text/plain");
		if (!_cache) {
			textajax.setRequestHeader("pragma", "no-cache");
			textajax.setRequestHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate, no-transform");
			textajax.setRequestHeader("pragma", "no-cache");
			textajax.setRequestHeader("Expires", 0);
		}
		ret =  new Promise(
			function (_resolve, _reject) {
				textajax.onreadystatechange = function () {
					if (this.readyState == 4) {
						if (this.status == 200) {
							try {
								_resolve(this.responseText);
							} catch (e) {
								_reject();
							}
						} else {
							_reject();
						}
					}
				}
			})
		textajax.send(null);
		return ret;
	}
}


String.prototype.unicodePolyfill = function (){
	if(Utils.IS_CHROME){
		return this.valueOf().replace(/([\u{1F1E6}-\u{1F1FF}]+)/gmu,'<span class="unicode">$1</span>');
	}
	return this.valueOf();
}

/**
 * Returns a debounced version of the given callback function.
 * The debounced function delays invoking the callback until after
 * the specified wait time has elapsed since the last time it was called.
 *
 * @param {Function} callback - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @returns {Function} A debounced function.
 */
export const debounce = (callback, wait) => {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
};