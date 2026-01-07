// ===========================================
// System.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

/** Module to manage system environment.
 * @module System
 */

// Mock browser environment for Node.js
if (typeof process !== 'undefined' && process.title && process.title.indexOf("node") >= 0) {
	global.navigator = { userAgent: "node.js" };
	global.location = { href: "", protocol: "" };
	global.screen = { availWidth: 0, availHeight: 0 };
	global.document = { location: global.location };
	global.Image = class {};
	global.XMLHttpRequest = class {};
	global.XMLDocument = class {};
	global.Element = class {};
	global.Storage = class { set() {} get() {} exists() {} clear() {} };
	global.window = {
		Image: global.Image,
		screen: global.screen,
		document: global.document,
		location: global.location,
		navigator: global.navigator,
		devicePixelRatio: 1,
		innerWidth: 0,
		innerHeight: 0,
		availWidth: 0,
		availHeight: 0,
        requestAnimationFrame: (callback) => {
            setTimeout(callback, 0);
        },
	};
}


/** Class which represents a single user.
 * @class System
 */
export default class System {
	static CLIENT_PLATFORM_UNKOWN = -1;
	static CLIENT_PLATFORM_WEB = 0;
	static CLIENT_PLATFORM_IOS = 1;
	static CLIENT_PLATFORM_APPLETV = 2;
	static CLIENT_PLATFORM_ANDROID = 3;
	static CLIENT_PLATFORM_WINDOWS = 4;
	static CLIENT_PLATFORM_OSX = 5;
	static CLIENT_PLATFORM_LINUX = 6;
	static CLIENT_PLATFORM_SWITCH = 7;
	static CLIENT_PLATFORM_XBOX = 8;
	static CLIENT_PLATFORM_PS4 = 9;

	static SERVERTYPE_NONE = 0;
	static SERVERTYPE_APACHE = 1;
	static SERVERTYPE_NETWEAVER = 2
	static SERVERTYPE_IIS = 3;

	static IS_NODEJS;
	static APPID;
	static CLIENT;
	static CLIENTS;
	static INSTANCE;
	static INSTANCES;

	static IS_HTTPS;
	static IS_APACHE;
	static IS_NETWEAVER;
	static IS_IIS;

	static IS_IPOD;
	static IS_IPAD;
	static IS_IPAD3PLUS;
	static IS_IPHONE;
	static IS_IPHONEIPOD5;
	static IS_IOS;
	static IS_IE;
	static IS_FIREFOX;
	static IS_SAFARI;
	static IS_OPERA;
	static IS_CHROME;
	static IS_ANDROID;
	static IS_WEBKIT;
	static IS_WINDOWS;
	static IS_MAC;
	static IS_MACSAFARI;
	static IS_WINSAFARI;
	static IS_ANDROID40;
	static IS_MOBILE;
	
	static IS_RETINA;
	static IOSVERSION;
	
	static verPat;
	static IS_IE_APP;
	
	static BROWSERVERSION;
	static WHEELYSTEPSIZE;
	static WHEELXSTEPSIZE;
	static WHEELXFIXFACTOR2Y;
	
	static IS_WEBVIEW;
	static IS_M$HIT;
	static IS_APPLEBUG;
    static IS_SAFARI$HIT;

	static DISPLAYFPS = 60;

	static {
		this.IS_NODEJS = typeof (process) !== 'undefined' && process.title && process.title.indexOf("node") >= 0;

		this.APPID = typeof APPID === 'undefined' ? "none" : APPID;
		this.CLIENT = typeof CLIENT === 'undefined' ? "std" : CLIENT;
		this.CLIENTS = typeof CLIENTS === 'undefined' ? [["std", "Standard"]] : CLIENTS;
		this.INSTANCE = typeof INSTANCE === 'undefined' ? "std" : INSTANCE;
		this.INSTANCES = typeof INSTANCES === 'undefined' ? [["std", "Standard"]] : INSTANCES;
		
		this.IS_HTTPS = document.location.href.indexOf("https://") !== -1;
		this.IS_APACHE = false;
		this.IS_NETWEAVER = false;
		this.IS_IIS = false;
		
		this.IS_IPOD = navigator.userAgent.match(/iPod/i) != null;
		this.IS_IPAD = navigator.userAgent.match(/iPad/i) != null;
		this.IS_IPAD3PLUS = this.IS_IPAD && window.devicePixelRatio === 2;
		this.IS_IPHONE = navigator.userAgent.match(/iPhone/i) != null;
		this.IS_IPHONEIPOD5 = screen.availHeight === 548;
		this.IS_IOS = this.IS_IPHONE || this.IS_IPOD || this.IS_IPAD;
		this.IS_IE = navigator.userAgent.match(/MSIE/) != null || navigator.userAgent.match(/Trident/) != null || navigator.userAgent.match(/Zune/) != null;
		this.IS_FIREFOX = navigator.userAgent.match(/Firefox/i) != null;
		this.IS_SAFARI = (navigator.userAgent.match(/Safari/i) != null && navigator.userAgent.match(/Chrome/i) == null) || this.IS_IPHONE || this.IS_IPAD;
		this.IS_OPERA = navigator.userAgent.match(/Opera/i) != null;
		this.IS_CHROME = navigator.userAgent.match(/Chrome/i) != null;
		
		this.IS_ANDROID = navigator.userAgent.match(/Android/i) != null;
		if (this.IS_ANDROID) this.IS_SAFARI = false;

		this.IS_WEBKIT = navigator.userAgent.match(/WebKit/i) != null;
		this.IS_WINDOWS = navigator.userAgent.match(/Windows/i) != null;
		this.IS_MAC = navigator.userAgent.match(/Macintosh/i) != null;
		this.IS_MACSAFARI = this.IS_MAC && this.IS_SAFARI;
		this.IS_WINSAFARI = this.IS_WINDOWS && this.IS_SAFARI;
		
        this.IS_ANDROID40 = false;
		if (this.IS_ANDROID) {
            const versionMatch = navigator.userAgent.split("Android")[1];
            if(versionMatch) {
                this.IS_ANDROID40 = parseFloat(versionMatch) < 4.1;
            }
		}
		
		this.IS_MOBILE = this.IS_ANDROID || this.IS_IOS;
		
		this.IS_RETINA = window.devicePixelRatio > 1;
		this.IOSVERSION = this.GetIOSVersion();
		
		this.verPat = "";
		if (this.IS_SAFARI) this.verPat = "Version/";
		if (this.IS_CHROME) this.verPat = "Chrome/";
		if (this.IS_IPHONE) this.verPat = "iPhone; CPU OS ";
		
        this.IS_IE_APP = false;
		if (this.IS_IE) {
            this.IS_IE_APP = (navigator.userAgent.match(/Trident/) != null || navigator.userAgent.match(/Zune/) != null);
			if ((navigator.userAgent.match(/Trident/) != null || navigator.userAgent.match(/Zune/) != null) && navigator.userAgent.indexOf("rv:") >= 0) {
                this.verPat = "rv:";
            } else if (this.verPat !== "rv:") {
                this.verPat = "MSIE";
            }
        }
		if (this.IS_FIREFOX) this.verPat = "Firefox/";
		
		this.BROWSERVERSION = this.verPat ? parseFloat(navigator.userAgent.substr(navigator.userAgent.indexOf(this.verPat) + this.verPat.length)) : 0;
		if (isNaN(this.BROWSERVERSION)) this.BROWSERVERSION = 0;

		this.WHEELYSTEPSIZE = ((this.IS_IE) ? 70 / 3 : ((this.IS_WEBKIT) ? ((this.IS_MAC) ? 10 : 30) : ((this.IS_FIREFOX) ? ((this.IS_MAC) ? 10 : 3 / 3) : 1)));
		this.WHEELXSTEPSIZE = ((this.IS_IE) ? 180 : ((this.IS_WEBKIT) ? ((this.IS_MAC) ? 1 : 3) : ((this.IS_FIREFOX) ? ((this.IS_MAC) ? 1 : 3) : 1)));
		this.WHEELXFIXFACTOR2Y = ((this.IS_IE) ? 3 : ((this.IS_WEBKIT) ? ((this.IS_MAC) ? 1 : 3) : ((this.IS_FIREFOX) ? ((this.IS_MAC) ? 1 : 3) : 1)));
		
		this.IS_WEBVIEW = navigator.userAgent.match(/webview/i) != null;
		this.IS_M$HIT = this.IS_IE && this.BROWSERVERSION < 11;
		this.IS_APPLEBUG = this.IS_IOS && this.IOSVERSION >= 8 && this.IS_STANDALONE && !this.IS_WEBVIEW;
		this.IS_SAFARI$HIT = this.IS_SAFARI;
	}
	
	static GetIOSVersion() {
		if (!this.IS_IOS) return 0.0;
		let s = navigator.userAgent, p = s.indexOf("OS ");
        if (p === -1) return 0.0;
        let q = s.indexOf(" ", p + 3);
        if (q === -1) q = s.length;
		let a = s.substring(p + 3, q).split("_");
		if (a.length < 2) a[1] = "0";
		return parseFloat(a[0] + "." + a[1]);
	}
	
	CalcFPS(_count = 60, _callBack = null) {
		let count = _count, index = count, start = performance.now(), requestFrame = window.requestAnimationFrame;
		const _checker = () => {
			if (index--) {
				requestFrame(_checker);
			} else {
				let result = count * 1000 / (performance.now() - start);
				console.Log(result + " FPS display detected");
				if (result < 35) {
					result = 30;
				} else if (result < 65) {
					result = 60;
				} else if (result < 95) {
					result = 90;
				} else if (result < 105) {
					result = 100;
				} else if (result < 115) {
					result = 110;
				} else if (result < 127) {
					result = 122;
				}
				System.DISPLAYFPS = result;
				if (_callBack != null) _callBack(result);
			}
		}
		_checker();
	}
}