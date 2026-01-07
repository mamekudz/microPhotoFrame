// ===========================================
// WebUtils.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================


import Config from './Config.mjs';

/**
 * @jest-environment jsdom
 */
export default class WebUtils {
	// ===========================================
	// GET PARAMETERS
	// ===========================================
	static GetParameter(_name, _def) {
		if (typeof window === 'undefined') return _def;
		_name = _name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		let regexS = "[\\?&]" + _name + "=([^&#]*)";
		let regex = new RegExp(regexS);
		let results = regex.exec(window.location.href);
		if (results == null) return _def;
		return unescape(results[1]);
	}

	static GetParameterExists(_name) {
		if (typeof window === 'undefined') return false;
		_name = _name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		let regexS = "[\\?&]" + _name + "(&|=)([^&#]*)";
		let regex = new RegExp(regexS);
		let results = regex.exec(window.location.href);
		return results != null;
	}

	static SetCookie(_name, _value, _defaultvalue, _expminutes = undefined, _nonapp = false, _secure = false) {
		if (typeof window === 'undefined') return;
		let today = new Date(), d = new Date(), ex = true, cd = ""; //+document.location.hostname;
		if (navigator.cookieEnabled) {
			WebUtils.ClearCookie(_name);
			_secure = (_secure === undefined) ? "" : ";secure";
			_nonapp = (_nonapp === undefined) ? false : _nonapp === true;
			//d=(_expminutes===undefined)? d:d=new Date();
			if (_defaultvalue != _value) {
				if (_expminutes === undefined) {
					d.setTime(today.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
					document.cookie = ((_nonapp) ? "" : Config.APPID + "_" + Config.INSTANCE + "_" + Config.CLIENT + "_") + _name + "=" + escape(_value) + ";expires=" + d.toGMTString() + ((cd == "") ? "" : (";domain=" + cd)) + _secure;
				} else if (_expminutes == null) {
					d.setTime(today.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
					document.cookie = ((_nonapp) ? "" : Config.APPID + "_" + Config.INSTANCE + "_" + Config.CLIENT + "_") + _name + "=" + escape(_value) + ";expires=" + d.toGMTString() + ((cd == "") ? "" : (";domain=" + cd)) + _secure;
				} else if (_expminutes == -1) {
					document.cookie = ((_nonapp) ? "" : Config.APPID + "_" + Config.INSTANCE + "_" + Config.CLIENT + "_") + _name + "=" + escape(_value) + ((cd == "") ? "" : (";domain=" + cd)) + _secure;
				} else {
					d.setTime(today.getTime() + _expminutes * 1000 * 60);
					document.cookie = ((_nonapp) ? "" : Config.APPID + "_" + Config.INSTANCE + "_" + Config.CLIENT + "_") + _name + "=" + escape(_value) + ";expires=" + d.toGMTString() + ((cd == "") ? "" : (";domain=" + cd)) + _secure;
				}
			}
		}
	}

	static ClearCookie(_name, _nonapp = false) {
		if (typeof window === 'undefined') return;
		let cd = ""; //+document.location.hostname;
		_nonapp = (_nonapp === undefined) ? false : _nonapp === true;
		if (navigator.cookieEnabled) document.cookie = ((_nonapp) ? "" : Config.APPID + "_" + Config.INSTANCE + "_" + Config.CLIENT + "_") + _name + "=;expires=Fri, 31 Dec 1999 23:59:59 GMT" + ((cd == "") ? "" : (";domain=" + cd)) + ';';
	}

	static getCookie(_name, _defaultvalue, _nonapp = false) {
		if (typeof window === 'undefined') return _defaultvalue;
		if (_defaultvalue === undefined) _defaultvalue = "", i, f;
		let aCookie = document.cookie.split(";"), i, aCrumb, ret = _defaultvalue;
		if (navigator.cookieEnabled) {
			for (i = 0; i < aCookie.length; i++) {
				aCrumb = aCookie[i].split("=");
				if (aCrumb[0].indexOf(((_nonapp) ? "" : Config.APPID + "_" + Config.INSTANCE + "_" + Config.CLIENT + "_") + _name) >= 0) ret = unescape(aCrumb[1]);
			}
		}
		if (typeof ret === "string") {
			if (ret == "true") {
				ret = true;
			} else if (ret == "false") {
				ret = false;
			} else if (!isNaN(ret)) {
				i = parseInt(ret, 10);
				f = parseFloat(ret);
				if (i == f) {
					ret = i;
				} else {
					ret = f;
				}
			}
		}
		return ret;
	}
	
	static  LoadJSON(_url, _rmvLF, _info, _callBack, _cache = true) {
		var json, ret = {}, e;
		if (_callBack === undefined) {
			json = WebUtils.LoadFile(_url, {}, null, _cache);
			try {
				if (_rmvLF) {
					ret = JSON.parse(json.str_replace("\\\n", "\\n"));
				} else {
					ret = JSON.parse(json);
				};
			} catch (e) {
				log(_url, e.message, e.lineNumber);
			};
		} else {
			WebUtils.LoadFile(_url, _info, function (_json, _success, _info, _req) {
				//log(_url);
				/*-- @<BUILD_ONLY_AT_RELEASES:Production ----
				try{
				---- @>BUILD_ONLY_AT_RELEASES --*/
				if (_success) {
					if (_rmvLF) {
						ret = JSON.parse(_json.str_replace("\\\n", "\\n"));
					} else {
						//console.Log(_url,_json.substr(0,100));
						ret = JSON.parse(_json);
					};
					_callBack(ret, _success, _info, _req);
				} else {
					_callBack({}, false, _info, _req);
				}
				/*-- @<BUILD_ONLY_AT_RELEASES:Production ----
				}catch(e){
					errlog(_url,e.message,e.lineNumber);
					_callBack({},false,_info);
				};
				---- @>BUILD_ONLY_AT_RELEASES --*/
			}, _cache);
		}
		return ret;
	}
	
	static  LoadFile(_url, _info, _callBack = null, _cache = true) {
		let jsonajax = new XMLHttpRequest(), ret = "", e;
		//log("LoadFile", _url);
		jsonajax.open("GET", _url, _callBack != null);
		jsonajax.setRequestHeader("Content-Type", "application/json");
		if (!_cache) {
			jsonajax.setRequestHeader("pragma", "no-cache");
			jsonajax.setRequestHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate, no-transform");
			jsonajax.setRequestHeader("pragma", "no-cache");
			jsonajax.setRequestHeader("Expires", 0);
		};
		jsonajax.onreadystatechange = function () {
			if (this.readyState == 4) {
				if (this.status == 200) {
					//try{
					ret = this.responseText;
					if (_callBack != null) _callBack(ret, true, _info, this);
					//}catch(e){
					//log(_url,e.message,e.lineNumber);  //this.responseText,
					//ret="";
					//if(_callBack!==undefined)_callBack(ret,false,_info);
					//};
				} else {
					ret = "";
					if (_callBack != null) _callBack(ret, false, _info, this);
				}
			}
		}
		jsonajax.send(null);
		return ret;
	}
	
	
}

if (typeof window !== 'undefined') window.location.protocolHostPort = function () {
	let port = "";
	switch (location.protocol) {
		case "https:":
			if (location.port != 443 && location.port != "") port = ":" + location.port;
			break;
		case "http:":
			if (location.port != 80 && location.port != "") port = ":" + location.port;
			break;
	}
	return location.protocol + "//" + location.host.split(":")[0] + port;
}

if (typeof window !== 'undefined') window.location.protocolHost = function () {
	return location.protocol + "//" + location.host.split(":")[0];
}

if (typeof window !== 'undefined') document.location.protocolHostPort = function () {
	let port = "";
	switch (location.protocol) {
		case "https:":
			if (location.port != 443 && location.port != "") port = ":" + location.port;
			break;
		case "http:":
			if (location.port != 80 && location.port != "") port = ":" + location.port;
			break;
	}
	return location.protocol + "//" + location.host.split(":")[0] + port;
}

if (typeof window !== 'undefined') document.location.protocolHost = function () {
	return location.protocol + "//" + location.host.split(":")[0];
}

if (typeof window !== 'undefined') window.WebUtils = WebUtils;