// ===========================================
// JSONUtils.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

/**
 * General JSON prototype extensions.
 * @module JSONUtils
 */

/** General JSON object extensions.
 * Special functions will also support extended JSONS. Extended JSONs are JSON definitions which contains
 * objects of type *function* or *Date*.
 * @class JSON
 */

/** Stringify an object to extended JSON text. If an objects contains *function* or *Date* objects, this objects will
 * be converted to a string beginning with "function". If objects contains *Date* objects, this objects will
 * be converted to a string of 24 characters of form "1970-01-02T10:17:14.345Z".
 * White characters will ever convert to \n,\r\t.
 * @param {object}  _o    A object to create a JSON from.
 * @param {string}  _space    The JSON stringify clue.
 * @param {array}  _exts    Optional, an array of object types which have to convert, default ["function", "date"].
 * @return {string}  An object, created by _json. Objects of type *function* will also created.
 */
JSON.extendedStringify = function (_o, _space, _exts) {
	if (_space === undefined) _space = "";
	if (_exts === undefined) _exts = ["function", "date"];
	let doFunction = _exts.indexOf("function") >= 0;
	let doDate = _exts.indexOf("date") >= 0;
	return JSON.stringify(_o, function (_k, _v) {
		//console.Log(_k,_v);
		switch (typeof _v) {
			case "function":
				if (doFunction) return _v + "";
				break;
			case "object":
				if (_v instanceof Date) {
					if (doDate) return _v.getUTCFullYear() + "-" + (_v.getUTCMonth() + 1).PreZero(2) + "-" + _v.getUTCDate().PreZero(2) + "T" + _v.getUTCHours().PreZero(2) + ":" + _v.getUTCMinutess().PreZero(2) + ":" + _v.getUTCSeconds().PreZero(2) + "Z";
				}
				break;
		}
		return _v;
	}, _space);
}

/** Stringify an object to extended JSON text. If objects contains *function* objects, this objects will
 * be converted to a string beginning with "function". If objects contains *Date* objects, this objects will
 * be converted to a string of 24 characters of form "1970-01-02T10:17:14.345Z".
 * **In contrast to JSON.extendedStringify this method will not convert white characters in *function* object,
 * so the result can be used for editing including javascript code.**
 * @param {object}  _o    A object to create a JSON from.
 * @param {string}  _space    The JSON stringify clue.
 * @return {string}  An object, created by _json. Objects of type *function* will also created.
 */
JSON.extendedStringify4Editing = function (_o, _space) {
	let ret, i, funcs = {}, dates = {};
	
	function JSStringify(_o, _space) {
		if (_space === undefined) _space = "";
		return JSON.stringify(_o, function (_k, _v) {
			let m;
			//console.Log(_k,_v);
			switch (typeof _v) {
				case "function":
					m = (_v + "").md5();
					funcs[m] = _v;
					return m;
				case "object":
					if (_v instanceof Date) {
						m = _v.getTime();
						dates[m] = _v;
					}
					break;
			}
			return _v;
		}, _space);
	}
	
	ret = JSStringify(_o, _space);
	for (i in funcs) ret = ret.str_replace('"' + i + '"', funcs[i] + "");
	for (i in dates) ret = ret.str_replace('"' + i + '"', "new Date(" + dates[i] + ")");
	return ret;
}

/** Check if a string is valid JSON.
 * @param {string} str - The string to check.
 * @return {boolean} True if the string is valid JSON, false otherwise.
 */
JSON.isJsonString = function (str) {
	try {
		JSON.parse(str);
		return true;
	} catch (e) {
		return false;
	}
}

/** Parses JSON text which contains objects of type *function*.
 * @param {string}  _json    A JSON text string.
 * @param {array}  _exts    Objects to make special handling, default ["function", "date"].
 * @return {object}  An object, created by _json. Objects of type *function* will also created.
 */
JSON.extendedParse = function (_json, _exts = ["function", "date"]) {
	let doFunction = _exts.indexOf("function") >= 0;
	let doDate = _exts.indexOf("date") >= 0;
	return JSON.parse(_json, function (_k, _v) {
		let a;
		//log(_k,typeof(_v),_v);
		switch (typeof (_v)) {
			case "string":
				if ((_v.substr(0, 10) == "function (" || _v.substr(0, 9) == "function(") && doFunction) {
					let func, err;
					try {
						eval("func=" + _v);
					} catch (err) {
						errlog(err, _v);
					}
					;
					return func;
				} else if (_v.length == 24 && doDate) {
					a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)(|Z)$/.exec(_v);
					if (a) return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]));
				}
				return _v;
			default:
				return _v;
		}
	})
}

/** Checks whether a JSON text contains an extended JSON function.
 * @param {string}  _json    A JSON text string.
 * @return {*}  true=the JSON text contains objects of type *function*.
 */
JSON.securityCheck = function (_json) {
	let securityFailed = false;
	JSON.parse(_json, function (_k, _v) {
		let a;
		//log(_k,typeof(_v),_v);
		switch (typeof (_v)) {
			case "string":
				if ((_v.substr(0, 10) == "function (" || _v.substr(0, 9) == "function(")) securityFailed = true;
				return _v;
			default:
				return _v;
		}
	})
	return !securityFailed;
}

/** Clones an extended object (an object which contains objects of type *function*).
 * @param {object}  _o    The extended object to clone.
 * @return {*}  The copy of _o.
 */
JSON.cloneExtended = function (_o) {
	return JSON.extendedParse(JSON.extendedStringify(_o));
}

/** Parsing a JSON string with a given mode.
 * @param {_json}  _o    The JSON or javascipt object text.
 * @param {_mode}  _o    The mode to use for parsing: ""=no parsing, returns given json string, "standard"=standard parsing, "eval"=parsing by eval method, "exended":use extended JSON parsing.
 * @return {*}  The parsed _json.
 * If _mode is "eval", the eval method will be used to parse the JSON string, so javascript object notations can also be converted.
 */
JSON.modeParse = function (_json, _mode = "standard") {
	switch (_mode) {
		case "none":
		case "":
			return _json;
		case "standard":
			return JSON.parse(_json);
		case "eval":
			return eval("(" + this.responseText.str_replace("\\\n", "\\n") + ")");
		case "extended":
			return JSON.extendedParse(_json);
		default:
			return JSON.parse(_json);
	}
}

JSON.stringifyEntities = function (_object) {
	return JSON.stringify(_object).str_replace('"', "&quote;");
}

/** Loads a JSON synchronously from server. Returns an empty object on any fails.
 * @param {string}  _url    The url of the file to load from server. if a "?" character is inside _url, the timestamp will add to url to prevent caching.
 * @param {string}  _parseMode    Mode of JSON parsing, see JSON.modeParse.
 * @return {object|string}  String or object of the loaded JSON.
 * **NOTE**
 */
JSON.loadSync = function (_url, _parseMode = "standard") {
	let ret;
	if (typeof window === 'undefined') {
		if (_parseMode == "none" || _parseMode == "") {
			ret = "{}";
		} else {
			ret = {};
		}
	} else {
		let jsonajax = new XMLHttpRequest(), ret = {}, e;
		jsonajax.open("GET", _url + ((_url.indexOf("?") < 0) ? "" : Date.now()), false);
		jsonajax.setRequestHeader("Content-Type", "application/json");
		jsonajax.setRequestHeader("pragma", "no-cache");
		jsonajax.setRequestHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate, no-transform");
		jsonajax.setRequestHeader("pragma", "no-cache");
		jsonajax.setRequestHeader("Expires", 0);
		jsonajax.send(null);
		if (jsonajax.status == 200) {
			try {
				ret = JSON.modeParse(jsonajax.responseText, _parseMode);
				return ret;
			} catch (e) {
				console.error(jsonajax.responseText, e.message, e.lineNumber);
				return JSON.modeParse("{}", _parseMode);
			}
		} else {
			return JSON.modeParse("{}", _parseMode);
		}
	}
	return ret;
}

/** Loads a JSON synchronously from server. Returns an empty object on any fails.
 * @param {string}  _url    The url of the file to load from server. if a "?" character is inside _url, the timestamp will add to url to prevent caching.
 * @param {string}  _parseMode    Mode of JSON parsing, see JSON.modeParse.
 * @param {function}  _callBack    callBack function to call after loading JSON (_jsonObject, null if failed).
 * **NOTE**
 */
JSON.loadASync = function (_url, _callBack = null, _parseMode = "standard") {
	let ret;
	if (typeof window === 'undefined') {
		if (_parseMode == "none" || _parseMode == "") {
			ret = "{}";
		} else {
			ret = {};
		}
	} else {
		let jsonajax = new XMLHttpRequest(), ret = {}, e;
		jsonajax.open("GET", _url + ((_url.indexOf("?") < 0) ? "" : Date.now()), true);
		jsonajax.setRequestHeader("Content-Type", "application/json");
		jsonajax.setRequestHeader("pragma", "no-cache");
		jsonajax.setRequestHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate, no-transform");
		jsonajax.setRequestHeader("pragma", "no-cache");
		jsonajax.setRequestHeader("Expires", 0);
		jsonajax.onreadystatechange=function(){
			if (this.readyState == 4) {
				if (this.status == 200) {
					try {
						ret = JSON.modeParse(this.responseText, _parseMode);
						if (_callBack != null) _callBack(ret);
					} catch (e) {
						console.error(this.responseText, e.message, e.lineNumber);
						if (_callBack != null) _callBack(null);
					}
				} else {
					if (_callBack != null) _callBack(null);
				}
			} else {
				if (_callBack != null) _callBack(null);
			}
		}
		jsonajax.send(null);
	}
}

/** Checks whether an object contains cyclic definitions which will prevent it to create a JSON text.
 * @param {object} _o    The value to calculate the fraction from.
 * @return {boolean}    true=the obejcts contains cyclic definitions
 */
JSON.isCyclic = function (_o) {
	let keys = [];
	let stack = [];
	let stackSet = new Set();
	let detected = false;
	
	function _detect(_o, _key) {
		if (typeof _o != 'object') {
			return;
		}
		
		if (stackSet.has(_o)) {
			// it's cyclic! Print the object and its locations.
			let oldindex = stack.indexOf(_o);
			let l1 = keys.join('.') + '.' + _key;
			let l2 = keys.slice(0, oldindex + 1).join('.');
			console.Log('CIRCULAR: ' + l1 + ' = ' + l2 + ' = ' + _o);
			console.Log(_o);
			detected = true;
			return;
		}
		keys.push(key);
		stack.push(_o);
		stackSet.add(_o);
		for (let k in _o) {
			//dive on the object's children
			if (_o.hasOwnProperty(k)) {
				_detect(_o[k], k);
			}
		}
		keys.pop();
		stack.pop();
		stackSet.delete(_o);
		return;
	}
	
	_detect(_o, '_o');
	return detected;
}

/** General String JSON object extensions.
 * @class String
 */
/** JSON parse of this string.
 * @return {*} An object or an array of JSON string data.
 */
String.prototype.JsonParse = function () {
	return JSON.parse(this.valueOf());
}

/** Extended JSON parse of this string.
 * @return {*} An object or an array of JSON string data.
 */
String.prototype.JsonParseExtended = function () {
	return JSON.extendedParse(this.valueOf());
}