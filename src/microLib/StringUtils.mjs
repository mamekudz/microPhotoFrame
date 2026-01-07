// ===========================================
// StringUtils.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================



/** General String prototype extensions.
 * @module StringUtils
 */

let LZString = {
	_keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	_f: String.fromCharCode,
	compressToBase64: function (e) {
		if (e == null) return "";
		let t = "";
		let n, r, i, s, o, u, a;
		let f = 0;
		e = LZString.compress(e);
		while (f < e.length * 2) {
			if (f % 2 == 0) {
				n = e.charCodeAt(f / 2) >> 8;
				r = e.charCodeAt(f / 2) & 255;
				if (f / 2 + 1 < e.length) i = e.charCodeAt(f / 2 + 1) >> 8; else i = NaN
			} else {
				n = e.charCodeAt((f - 1) / 2) & 255;
				if ((f + 1) / 2 < e.length) {
					r = e.charCodeAt((f + 1) / 2) >> 8;
					i = e.charCodeAt((f + 1) / 2) & 255
				} else r = i = NaN
			}
			f += 3;
			s = n >> 2;
			o = (n & 3) << 4 | r >> 4;
			u = (r & 15) << 2 | i >> 6;
			a = i & 63;
			if (isNaN(r)) {
				u = a = 64
			} else if (isNaN(i)) {
				a = 64
			}
			t = t + LZString._keyStr.charAt(s) + LZString._keyStr.charAt(o) + LZString._keyStr.charAt(u) + LZString._keyStr.charAt(a)
		}
		return t
	},
	decompressFromBase64: function (e) {
		if (e == null) return "";
		let t = "", n = 0, r, i, s, o, u, a, f, l, c = 0, h = LZString._f;
		e = e.replace(/[^A-Za-z0-9\+\/\=]/g, "");
		while (c < e.length) {
			u = LZString._keyStr.indexOf(e.charAt(c++));
			a = LZString._keyStr.indexOf(e.charAt(c++));
			f = LZString._keyStr.indexOf(e.charAt(c++));
			l = LZString._keyStr.indexOf(e.charAt(c++));
			i = u << 2 | a >> 4;
			s = (a & 15) << 4 | f >> 2;
			o = (f & 3) << 6 | l;
			if (n % 2 == 0) {
				r = i << 8;
				if (f != 64) {
					t += h(r | s)
				}
				if (l != 64) {
					r = o << 8
				}
			} else {
				t = t + h(r | i);
				if (f != 64) {
					r = s << 8
				}
				if (l != 64) {
					t += h(r | o)
				}
			}
			n += 3
		}
		return LZString.decompress(t)
	},
	compressToUTF16: function (e) {
		if (e == null) return "";
		let t = "", n, r, i, s = 0, o = LZString._f;
		e = LZString.compress(e);
		for (n = 0; n < e.length; n++) {
			r = e.charCodeAt(n);
			switch (s++) {
				case 0:
					t += o((r >> 1) + 32);
					i = (r & 1) << 14;
					break;
				case 1:
					t += o(i + (r >> 2) + 32);
					i = (r & 3) << 13;
					break;
				case 2:
					t += o(i + (r >> 3) + 32);
					i = (r & 7) << 12;
					break;
				case 3:
					t += o(i + (r >> 4) + 32);
					i = (r & 15) << 11;
					break;
				case 4:
					t += o(i + (r >> 5) + 32);
					i = (r & 31) << 10;
					break;
				case 5:
					t += o(i + (r >> 6) + 32);
					i = (r & 63) << 9;
					break;
				case 6:
					t += o(i + (r >> 7) + 32);
					i = (r & 127) << 8;
					break;
				case 7:
					t += o(i + (r >> 8) + 32);
					i = (r & 255) << 7;
					break;
				case 8:
					t += o(i + (r >> 9) + 32);
					i = (r & 511) << 6;
					break;
				case 9:
					t += o(i + (r >> 10) + 32);
					i = (r & 1023) << 5;
					break;
				case 10:
					t += o(i + (r >> 11) + 32);
					i = (r & 2047) << 4;
					break;
				case 11:
					t += o(i + (r >> 12) + 32);
					i = (r & 4095) << 3;
					break;
				case 12:
					t += o(i + (r >> 13) + 32);
					i = (r & 8191) << 2;
					break;
				case 13:
					t += o(i + (r >> 14) + 32);
					i = (r & 16383) << 1;
					break;
				case 14:
					t += o(i + (r >> 15) + 32, (r & 32767) + 32);
					s = 0;
					break
			}
		}
		return t + o(i + 32)
	},
	decompressFromUTF16: function (e) {
		if (e == null) return "";
		let t = "", n, r, i = 0, s = 0, o = LZString._f;
		while (s < e.length) {
			r = e.charCodeAt(s) - 32;
			switch (i++) {
				case 0:
					n = r << 1;
					break;
				case 1:
					t += o(n | r >> 14);
					n = (r & 16383) << 2;
					break;
				case 2:
					t += o(n | r >> 13);
					n = (r & 8191) << 3;
					break;
				case 3:
					t += o(n | r >> 12);
					n = (r & 4095) << 4;
					break;
				case 4:
					t += o(n | r >> 11);
					n = (r & 2047) << 5;
					break;
				case 5:
					t += o(n | r >> 10);
					n = (r & 1023) << 6;
					break;
				case 6:
					t += o(n | r >> 9);
					n = (r & 511) << 7;
					break;
				case 7:
					t += o(n | r >> 8);
					n = (r & 255) << 8;
					break;
				case 8:
					t += o(n | r >> 7);
					n = (r & 127) << 9;
					break;
				case 9:
					t += o(n | r >> 6);
					n = (r & 63) << 10;
					break;
				case 10:
					t += o(n | r >> 5);
					n = (r & 31) << 11;
					break;
				case 11:
					t += o(n | r >> 4);
					n = (r & 15) << 12;
					break;
				case 12:
					t += o(n | r >> 3);
					n = (r & 7) << 13;
					break;
				case 13:
					t += o(n | r >> 2);
					n = (r & 3) << 14;
					break;
				case 14:
					t += o(n | r >> 1);
					n = (r & 1) << 15;
					break;
				case 15:
					t += o(n | r);
					i = 0;
					break
			}
			s++
		}
		return LZString.decompress(t)
	},
	compress: function (e) {
		if (e == null) return "";
		let t, n, r = {}, i = {}, s = "", o = "", u = "", a = 2, f = 3, l = 2, c = "", h = 0, p = 0,
			d, v = LZString._f;
		for (d = 0; d < e.length; d += 1) {
			s = e.charAt(d);
			if (!Object.prototype.hasOwnProperty.call(r, s)) {
				r[s] = f++;
				i[s] = true
			}
			o = u + s;
			if (Object.prototype.hasOwnProperty.call(r, o)) {
				u = o
			} else {
				if (Object.prototype.hasOwnProperty.call(i, u)) {
					if (u.charCodeAt(0) < 256) {
						for (t = 0; t < l; t++) {
							h = h << 1;
							if (p == 15) {
								p = 0;
								c += v(h);
								h = 0
							} else {
								p++
							}
						}
						n = u.charCodeAt(0);
						for (t = 0; t < 8; t++) {
							h = h << 1 | n & 1;
							if (p == 15) {
								p = 0;
								c += v(h);
								h = 0
							} else {
								p++
							}
							n = n >> 1
						}
					} else {
						n = 1;
						for (t = 0; t < l; t++) {
							h = h << 1 | n;
							if (p == 15) {
								p = 0;
								c += v(h);
								h = 0
							} else {
								p++
							}
							n = 0
						}
						n = u.charCodeAt(0);
						for (t = 0; t < 16; t++) {
							h = h << 1 | n & 1;
							if (p == 15) {
								p = 0;
								c += v(h);
								h = 0
							} else {
								p++
							}
							n = n >> 1
						}
					}
					a--;
					if (a == 0) {
						a = Math.pow(2, l);
						l++
					}
					delete i[u]
				} else {
					n = r[u];
					for (t = 0; t < l; t++) {
						h = h << 1 | n & 1;
						if (p == 15) {
							p = 0;
							c += v(h);
							h = 0
						} else {
							p++
						}
						n = n >> 1
					}
				}
				a--;
				if (a == 0) {
					a = Math.pow(2, l);
					l++
				}
				r[o] = f++;
				u = String(s)
			}
		}
		if (u !== "") {
			if (Object.prototype.hasOwnProperty.call(i, u)) {
				if (u.charCodeAt(0) < 256) {
					for (t = 0; t < l; t++) {
						h = h << 1;
						if (p == 15) {
							p = 0;
							c += v(h);
							h = 0
						} else {
							p++
						}
					}
					n = u.charCodeAt(0);
					for (t = 0; t < 8; t++) {
						h = h << 1 | n & 1;
						if (p == 15) {
							p = 0;
							c += v(h);
							h = 0
						} else {
							p++
						}
						n = n >> 1
					}
				} else {
					n = 1;
					for (t = 0; t < l; t++) {
						h = h << 1 | n;
						if (p == 15) {
							p = 0;
							c += v(h);
							h = 0
						} else {
							p++
						}
						n = 0
					}
					n = u.charCodeAt(0);
					for (t = 0; t < 16; t++) {
						h = h << 1 | n & 1;
						if (p == 15) {
							p = 0;
							c += v(h);
							h = 0
						} else {
							p++
						}
						n = n >> 1
					}
				}
				a--;
				if (a == 0) {
					a = Math.pow(2, l);
					l++
				}
				delete i[u]
			} else {
				n = r[u];
				for (t = 0; t < l; t++) {
					h = h << 1 | n & 1;
					if (p == 15) {
						p = 0;
						c += v(h);
						h = 0
					} else {
						p++
					}
					n = n >> 1
				}
			}
			a--;
			if (a == 0) {
				a = Math.pow(2, l);
				l++
			}
		}
		n = 2;
		for (t = 0; t < l; t++) {
			h = h << 1 | n & 1;
			if (p == 15) {
				p = 0;
				c += v(h);
				h = 0
			} else {
				p++
			}
			n = n >> 1
		}
		while (true) {
			h = h << 1;
			if (p == 15) {
				c += v(h);
				break
			} else p++
		}
		return c
	},
	decompress: function (e) {
		if (e == null) return "";
		if (e == "") return null;
		let t = [], n, r = 4, i = 4, s = 3, o = "", u = "", a, f, l, c, h, p, d, v = LZString._f,
			m = {string: e, val: e.charCodeAt(0), position: 32768, index: 1};
		for (a = 0; a < 3; a += 1) {
			t[a] = a
		}
		l = 0;
		h = Math.pow(2, 2);
		p = 1;
		while (p != h) {
			c = m.val & m.position;
			m.position >>= 1;
			if (m.position == 0) {
				m.position = 32768;
				m.val = m.string.charCodeAt(m.index++)
			}
			l |= (c > 0 ? 1 : 0) * p;
			p <<= 1
		}
		switch (n = l) {
			case 0:
				l = 0;
				h = Math.pow(2, 8);
				p = 1;
				while (p != h) {
					c = m.val & m.position;
					m.position >>= 1;
					if (m.position == 0) {
						m.position = 32768;
						m.val = m.string.charCodeAt(m.index++)
					}
					l |= (c > 0 ? 1 : 0) * p;
					p <<= 1
				}
				d = v(l);
				break;
			case 1:
				l = 0;
				h = Math.pow(2, 16);
				p = 1;
				while (p != h) {
					c = m.val & m.position;
					m.position >>= 1;
					if (m.position == 0) {
						m.position = 32768;
						m.val = m.string.charCodeAt(m.index++)
					}
					l |= (c > 0 ? 1 : 0) * p;
					p <<= 1
				}
				d = v(l);
				break;
			case 2:
				return ""
		}
		t[3] = d;
		f = u = d;
		while (true) {
			if (m.index > m.string.length) {
				return ""
			}
			l = 0;
			h = Math.pow(2, s);
			p = 1;
			while (p != h) {
				c = m.val & m.position;
				m.position >>= 1;
				if (m.position == 0) {
					m.position = 32768;
					m.val = m.string.charCodeAt(m.index++)
				}
				l |= (c > 0 ? 1 : 0) * p;
				p <<= 1
			}
			switch (d = l) {
				case 0:
					l = 0;
					h = Math.pow(2, 8);
					p = 1;
					while (p != h) {
						c = m.val & m.position;
						m.position >>= 1;
						if (m.position == 0) {
							m.position = 32768;
							m.val = m.string.charCodeAt(m.index++)
						}
						l |= (c > 0 ? 1 : 0) * p;
						p <<= 1
					}
					t[i++] = v(l);
					d = i - 1;
					r--;
					break;
				case 1:
					l = 0;
					h = Math.pow(2, 16);
					p = 1;
					while (p != h) {
						c = m.val & m.position;
						m.position >>= 1;
						if (m.position == 0) {
							m.position = 32768;
							m.val = m.string.charCodeAt(m.index++)
						}
						l |= (c > 0 ? 1 : 0) * p;
						p <<= 1
					}
					t[i++] = v(l);
					d = i - 1;
					r--;
					break;
				case 2:
					return u
			}
			if (r == 0) {
				r = Math.pow(2, s);
				s++
			}
			if (t[d]) {
				o = t[d]
			} else {
				if (d === i) {
					o = f + f.charAt(0)
				} else {
					return null
				}
			}
			u += o;
			t[i++] = f + o.charAt(0);
			r--;
			f = o;
			if (r == 0) {
				r = Math.pow(2, s);
				s++
			}
		}
	}
};
if (typeof module !== "undefined" && module != null) {
	module.exports = LZString
}

class MD5Class {
	static MD5HEXCHR = '0123456789abcdef'.split('');
	
	static _md5cycle(x, k) {
		let a = x[0], b = x[1], c = x[2], d = x[3];
		a = MD5Class._ff(a, b, c, d, k[0], 7, -680876936);
		d = MD5Class._ff(d, a, b, c, k[1], 12, -389564586);
		c = MD5Class._ff(c, d, a, b, k[2], 17, 606105819);
		b = MD5Class._ff(b, c, d, a, k[3], 22, -1044525330);
		a = MD5Class._ff(a, b, c, d, k[4], 7, -176418897);
		d = MD5Class._ff(d, a, b, c, k[5], 12, 1200080426);
		c = MD5Class._ff(c, d, a, b, k[6], 17, -1473231341);
		b = MD5Class._ff(b, c, d, a, k[7], 22, -45705983);
		a = MD5Class._ff(a, b, c, d, k[8], 7, 1770035416);
		d = MD5Class._ff(d, a, b, c, k[9], 12, -1958414417);
		c = MD5Class._ff(c, d, a, b, k[10], 17, -42063);
		b = MD5Class._ff(b, c, d, a, k[11], 22, -1990404162);
		a = MD5Class._ff(a, b, c, d, k[12], 7, 1804603682);
		d = MD5Class._ff(d, a, b, c, k[13], 12, -40341101);
		c = MD5Class._ff(c, d, a, b, k[14], 17, -1502002290);
		b = MD5Class._ff(b, c, d, a, k[15], 22, 1236535329);
		
		a = MD5Class._gg(a, b, c, d, k[1], 5, -165796510);
		d = MD5Class._gg(d, a, b, c, k[6], 9, -1069501632);
		c = MD5Class._gg(c, d, a, b, k[11], 14, 643717713);
		b = MD5Class._gg(b, c, d, a, k[0], 20, -373897302);
		a = MD5Class._gg(a, b, c, d, k[5], 5, -701558691);
		d = MD5Class._gg(d, a, b, c, k[10], 9, 38016083);
		c = MD5Class._gg(c, d, a, b, k[15], 14, -660478335);
		b = MD5Class._gg(b, c, d, a, k[4], 20, -405537848);
		a = MD5Class._gg(a, b, c, d, k[9], 5, 568446438);
		d = MD5Class._gg(d, a, b, c, k[14], 9, -1019803690);
		c = MD5Class._gg(c, d, a, b, k[3], 14, -187363961);
		b = MD5Class._gg(b, c, d, a, k[8], 20, 1163531501);
		a = MD5Class._gg(a, b, c, d, k[13], 5, -1444681467);
		d = MD5Class._gg(d, a, b, c, k[2], 9, -51403784);
		c = MD5Class._gg(c, d, a, b, k[7], 14, 1735328473);
		b = MD5Class._gg(b, c, d, a, k[12], 20, -1926607734);
		
		a = MD5Class._hh(a, b, c, d, k[5], 4, -378558);
		d = MD5Class._hh(d, a, b, c, k[8], 11, -2022574463);
		c = MD5Class._hh(c, d, a, b, k[11], 16, 1839030562);
		b = MD5Class._hh(b, c, d, a, k[14], 23, -35309556);
		a = MD5Class._hh(a, b, c, d, k[1], 4, -1530992060);
		d = MD5Class._hh(d, a, b, c, k[4], 11, 1272893353);
		c = MD5Class._hh(c, d, a, b, k[7], 16, -155497632);
		b = MD5Class._hh(b, c, d, a, k[10], 23, -1094730640);
		a = MD5Class._hh(a, b, c, d, k[13], 4, 681279174);
		d = MD5Class._hh(d, a, b, c, k[0], 11, -358537222);
		c = MD5Class._hh(c, d, a, b, k[3], 16, -722521979);
		b = MD5Class._hh(b, c, d, a, k[6], 23, 76029189);
		a = MD5Class._hh(a, b, c, d, k[9], 4, -640364487);
		d = MD5Class._hh(d, a, b, c, k[12], 11, -421815835);
		c = MD5Class._hh(c, d, a, b, k[15], 16, 530742520);
		b = MD5Class._hh(b, c, d, a, k[2], 23, -995338651);
		
		a = MD5Class._ii(a, b, c, d, k[0], 6, -198630844);
		d = MD5Class._ii(d, a, b, c, k[7], 10, 1126891415);
		c = MD5Class._ii(c, d, a, b, k[14], 15, -1416354905);
		b = MD5Class._ii(b, c, d, a, k[5], 21, -57434055);
		a = MD5Class._ii(a, b, c, d, k[12], 6, 1700485571);
		d = MD5Class._ii(d, a, b, c, k[3], 10, -1894986606);
		c = MD5Class._ii(c, d, a, b, k[10], 15, -1051523);
		b = MD5Class._ii(b, c, d, a, k[1], 21, -2054922799);
		a = MD5Class._ii(a, b, c, d, k[8], 6, 1873313359);
		d = MD5Class._ii(d, a, b, c, k[15], 10, -30611744);
		c = MD5Class._ii(c, d, a, b, k[6], 15, -1560198380);
		b = MD5Class._ii(b, c, d, a, k[13], 21, 1309151649);
		a = MD5Class._ii(a, b, c, d, k[4], 6, -145523070);
		d = MD5Class._ii(d, a, b, c, k[11], 10, -1120210379);
		c = MD5Class._ii(c, d, a, b, k[2], 15, 718787259);
		b = MD5Class._ii(b, c, d, a, k[9], 21, -343485551);
		
		x[0] = MD5Class._add32(a, x[0]);
		x[1] = MD5Class._add32(b, x[1]);
		x[2] = MD5Class._add32(c, x[2]);
		x[3] = MD5Class._add32(d, x[3]);
	};
	
	static _cmn(q, a, b, x, s, t) {
		a = MD5Class._add32(MD5Class._add32(a, q), MD5Class._add32(x, t));
		return MD5Class._add32((a << s) | (a >>> (32 - s)), b);
	};
	
	static _ff(a, b, c, d, x, s, t) {
		return MD5Class._cmn((b & c) | ((~b) & d), a, b, x, s, t);
	};
	
	static _gg(a, b, c, d, x, s, t) {
		return MD5Class._cmn((b & d) | (c & (~d)), a, b, x, s, t);
	};
	
	static _hh(a, b, c, d, x, s, t) {
		return MD5Class._cmn(b ^ c ^ d, a, b, x, s, t);
	};
	
	static _ii(a, b, c, d, x, s, t) {
		return MD5Class._cmn(c ^ (b | (~d)), a, b, x, s, t);
	};
	
	static _md51(s) {
		let txt = '', n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i;
		let tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		for (i = 64; i <= s.length; i += 64) MD5Class._md5cycle(state, MD5Class._md5blk(s.substring(i - 64, i)));
		s = s.substring(i - 64);
		for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
		tail[i >> 2] |= 0x80 << ((i % 4) << 3);
		if (i > 55) {
			MD5Class._md5cycle(state, tail);
			for (i = 0; i < 16; i++) tail[i] = 0;
		}
		;
		tail[14] = n * 8;
		MD5Class._md5cycle(state, tail);
		return state;
	}
	
	static _md5blk(s) {
		let md5blks = [], i;
		for (i = 0; i < 64; i += 4) md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
		return md5blks;
	}
	
	static _rhex(n) {
		let s = '', j = 0;
		for (; j < 4; j++) s += MD5Class.MD5HEXCHR[(n >> (j * 8 + 4)) & 0x0F] + MD5Class.MD5HEXCHR[(n >> (j * 8)) & 0x0F];
		return s;
	}
	
	static _md5hex(x) {
		let i;
		for (i = 0; i < x.length; i++) x[i] = MD5Class._rhex(x[i]);
		return x.join('');
	}
	
	static _add32(a, b) {
		return (a + b) & 0xFFFFFFFF;
	}
	
	static md5(s) {
		return MD5Class._md5hex(MD5Class._md51(s));
	}
}


/** General String extensions.
 * @class String
 */

String.prototype.empty = function () {
	return "";
}

String.prototype.md5 = function (_salt = "") {
	return MD5Class.md5(this.valueOf());
}

String.prototype.base64 = function () {
	return btoa(this.valueOf());
}

String.prototype.chrrpl = function (_chrsobj) {
	let i, ret = "", s = this.valueOf(), l = s.length;
	for (i = 0; i < l; i++) ret += _chrsobj[s.charAt(i)] ? _chrsobj[s.charAt(i)] : s.charAt(i);
	return ret;
}

String.prototype.str_replace = function (_s, _r) {
	return this.valueOf().split(_s).join(_r);
}

String.prototype.strtr = function (_s, _r) {
	let i, s = this.valueOf();
	for (i = 0; i < s.length; i++) s = s.split(_s[i]).join(_r[i]);
	return s;
}

String.prototype.strtrs = function (_r) {
	let i, s = this.valueOf();
	for (i in _r) s = s.split(i).join(_r[i]);
	return s;
}

String.prototype.PreZero = function (_n) {
	return this.PadStart(_n, "0");
}

String.prototype.ParseInt = function (_base = 10) {
	return parseInt(this.valueOf(), _base);
}

String.prototype.ParseFloat = function () {
	return parseFloat(this.valueOf());
}

String.prototype.parseFloatC = function () {
	return parseFloat(this.valueOf().str_replace(",", "."));
}

/** Returns count of a specified characters in string.
 * @param {string} _c    The character to count.
 * @return {number}    Number of occurrences of the character _c.
 * @test missing
 */
String.prototype.noOfChars = function (_c) {
	let t = this.valueOf(), lt, r = 0, i;
	lt = t.length;
	for (i = 0; i < lt; i++) if (t.charAt(i) == _c) r++;
	return r;
}

/**
 * Compress this string.
 * @return {string}    The compressed string.
 */
String.prototype.compress = function () {
	return LZString.compressToUTF16(this.valueOf());
}

/** Decompress this string.
 * @return {string}    The decompressed string.
 */
String.prototype.deCompress = function () {
	return LZString.decompressFromUTF16(this.valueOf());
}

/** Concat a string to the end of this string.
 * @param {string} _v    String to add to end.
 * @return {string} The string with added string to end.
 */
String.prototype.concat = function (_v) {
	return this.valueOf() + _v;
}

/** Add a string to begin of this string.
 * @param {string} _v    String to add to begin.
 * @return {string} The string with added string to begin.
 */
String.prototype.preConcat = function (_v) {
	return this.valueOf() + _v;
}

String.prototype.replaceAllByRegEx = function (_regEx, _rpls = {}) {
	return this.valueOf().replace(_regEx, function (_match) {
		return _rpls[_match];
	})
}

// not ready yet...
String.prototype.replaceAll = function (_rpls = {}) {
	let regex = "", rcs = "|?<>![]{}+-.:*$^^/";
	for (let s in _rpls) regex += (regex != "" ? "|" : "") + (rcs.indexOf(s) >= 0 ? "\\" + s : s);
	let rx = new RegExp("(" + regex + ")", 'gm');
	return this.valueOf().replace(rx, function (_match) {
		return _rpls[_match];
	})
}

// not ready yet...
/** Converts basic html characters to htmlEntities.
 * <code/>
 * "&": "&amp;"
 * "<": "&lt;"
 * ">": "&gt;"
 * "&": "&amp;"
 * "\"": "&quot;"
 * "\n": "<br/>"
 * "&": "<br/>"
 * "\t": "&nbsp;&nbsp;",
 * "\u00A0": "&nbsp;",
 * </code>
 * @param {string} _v    String to convert.
 * @return {string} The string with with converted characters.
 */
String.prototype.HtmlEntities = function () {
	return this.valueOf().replaceAllByRegEx(/(&|<|>|"|\n\r|\n|\r|\t|\u00AD|\u00A0\u202F)/gm, {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"\xAD": "&shy;",
		"\n\r": "<br/>",
		"\n": "<br/>",
		"\r": "<br/>",
		"\t": "&nbsp;&nbsp;",
		"\u00A0": "&nbsp;",
		"\u202F": "&nbsp;",
	});
};

/** HtmlEntities for tooltips (title attributes).
 */
String.prototype.tHtmlEntities = function () {
	return this.valueOf().replaceAllByRegEx(/(&|<|>|")/gm, {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\\": "&bsol;",
		"\"": "&quot;"
	});
};

String.prototype.deHtmlEntities = function () {
	let arr1 = ['&nbsp;', '&iexcl;', '&cent;', '&pound;', '&curren;', '&yen;', '&brvbar;', '&sect;', '&uml;', '&copy;', '&ordf;', '&laquo;', '&not;', '&shy;', '&reg;', '&macr;', '&deg;', '&plusmn;', '&sup2;', '&sup3;', '&acute;', '&micro;', '&para;', '&middot;', '&cedil;', '&sup1;', '&ordm;', '&raquo;', '&frac14;', '&frac12;', '&frac34;', '&iquest;', '&Agrave;', '&Aacute;', '&Acirc;', '&Atilde;', '&Auml;', '&Aring;', '&AElig;', '&Ccedil;', '&Egrave;', '&Eacute;', '&Ecirc;', '&Euml;', '&Igrave;', '&Iacute;', '&Icirc;', '&Iuml;', '&ETH;', '&Ntilde;', '&Ograve;', '&Oacute;', '&Ocirc;', '&Otilde;', '&Ouml;', '&times;', '&Oslash;', '&Ugrave;', '&Uacute;', '&Ucirc;', '&Uuml;', '&Yacute;', '&THORN;', '&szlig;', '&agrave;', '&aacute;', '&acirc;', '&atilde;', '&auml;', '&aring;', '&aelig;', '&ccedil;', '&egrave;', '&eacute;', '&ecirc;', '&euml;', '&igrave;', '&iacute;', '&icirc;', '&iuml;', '&eth;', '&ntilde;', '&ograve;', '&oacute;', '&ocirc;', '&otilde;', '&ouml;', '&divide;', '&oslash;', '&ugrave;', '&uacute;', '&ucirc;', '&uuml;', '&yacute;', '&thorn;', '&yuml;', '&quot;', '&amp;', '&lt;', '&gt;', '&OElig;', '&oelig;', '&Scaron;', '&scaron;', '&Yuml;', '&circ;', '&tilde;', '&ensp;', '&emsp;', '&thinsp;', '&zwnj;', '&zwj;', '&lrm;', '&rlm;', '&ndash;', '&mdash;', '&lsquo;', '&rsquo;', '&sbquo;', '&ldquo;', '&rdquo;', '&bdquo;', '&dagger;', '&Dagger;', '&permil;', '&lsaquo;', '&rsaquo;', '&euro;', '&fnof;', '&Alpha;', '&Beta;', '&Gamma;', '&Delta;', '&Epsilon;', '&Zeta;', '&Eta;', '&Theta;', '&Iota;', '&Kappa;', '&Lambda;', '&Mu;', '&Nu;', '&Xi;', '&Omicron;', '&Pi;', '&Rho;', '&Sigma;', '&Tau;', '&Upsilon;', '&Phi;', '&Chi;', '&Psi;', '&Omega;', '&alpha;', '&beta;', '&gamma;', '&delta;', '&epsilon;', '&zeta;', '&eta;', '&theta;', '&iota;', '&kappa;', '&lambda;', '&mu;', '&nu;', '&xi;', '&omicron;', '&pi;', '&rho;', '&sigmaf;', '&sigma;', '&tau;', '&upsilon;', '&phi;', '&chi;', '&psi;', '&omega;', '&thetasym;', '&upsih;', '&piv;', '&bull;', '&hellip;', '&prime;', '&Prime;', '&oline;', '&frasl;', '&weierp;', '&image;', '&real;', '&trade;', '&alefsym;', '&larr;', '&uarr;', '&rarr;', '&darr;', '&harr;', '&crarr;', '&lArr;', '&uArr;', '&rArr;', '&dArr;', '&hArr;', '&forall;', '&part;', '&exist;', '&empty;', '&nabla;', '&isin;', '&notin;', '&ni;', '&prod;', '&sum;', '&minus;', '&lowast;', '&radic;', '&prop;', '&infin;', '&ang;', '&and;', '&or;', '&cap;', '&cup;', '&int;', '&there4;', '&sim;', '&cong;', '&asymp;', '&ne;', '&equiv;', '&le;', '&ge;', '&sub;', '&sup;', '&nsub;', '&sube;', '&supe;', '&oplus;', '&otimes;', '&perp;', '&sdot;', '&lceil;', '&rceil;', '&lfloor;', '&rfloor;', '&lang;', '&rang;', '&loz;', '&spades;', '&clubs;', '&hearts;', '&diams;', '&bsol;'];
	let arr2 = ['&#160;', '&#161;', '&#162;', '&#163;', '&#164;', '&#165;', '&#166;', '&#167;', '&#168;', '&#169;', '&#170;', '&#171;', '&#172;', '&#173;', '&#174;', '&#175;', '&#176;', '&#177;', '&#178;', '&#179;', '&#180;', '&#181;', '&#182;', '&#183;', '&#184;', '&#185;', '&#186;', '&#187;', '&#188;', '&#189;', '&#190;', '&#191;', '&#192;', '&#193;', '&#194;', '&#195;', '&#196;', '&#197;', '&#198;', '&#199;', '&#200;', '&#201;', '&#202;', '&#203;', '&#204;', '&#205;', '&#206;', '&#207;', '&#208;', '&#209;', '&#210;', '&#211;', '&#212;', '&#213;', '&#214;', '&#215;', '&#216;', '&#217;', '&#218;', '&#219;', '&#220;', '&#221;', '&#222;', '&#223;', '&#224;', '&#225;', '&#226;', '&#227;', '&#228;', '&#229;', '&#230;', '&#231;', '&#232;', '&#233;', '&#234;', '&#235;', '&#236;', '&#237;', '&#238;', '&#239;', '&#240;', '&#241;', '&#242;', '&#243;', '&#244;', '&#245;', '&#246;', '&#247;', '&#248;', '&#249;', '&#250;', '&#251;', '&#252;', '&#253;', '&#254;', '&#255;', '&#34;', '&#38;', '&#60;', '&#62;', '&#338;', '&#339;', '&#352;', '&#353;', '&#376;', '&#710;', '&#732;', '&#8194;', '&#8195;', '&#8201;', '&#8204;', '&#8205;', '&#8206;', '&#8207;', '&#8211;', '&#8212;', '&#8216;', '&#8217;', '&#8218;', '&#8220;', '&#8221;', '&#8222;', '&#8224;', '&#8225;', '&#8240;', '&#8249;', '&#8250;', '&#8364;', '&#402;', '&#913;', '&#914;', '&#915;', '&#916;', '&#917;', '&#918;', '&#919;', '&#920;', '&#921;', '&#922;', '&#923;', '&#924;', '&#925;', '&#926;', '&#927;', '&#928;', '&#929;', '&#931;', '&#932;', '&#933;', '&#934;', '&#935;', '&#936;', '&#937;', '&#945;', '&#946;', '&#947;', '&#948;', '&#949;', '&#950;', '&#951;', '&#952;', '&#953;', '&#954;', '&#955;', '&#956;', '&#957;', '&#958;', '&#959;', '&#960;', '&#961;', '&#962;', '&#963;', '&#964;', '&#965;', '&#966;', '&#967;', '&#968;', '&#969;', '&#977;', '&#978;', '&#982;', '&#8226;', '&#8230;', '&#8242;', '&#8243;', '&#8254;', '&#8260;', '&#8472;', '&#8465;', '&#8476;', '&#8482;', '&#8501;', '&#8592;', '&#8593;', '&#8594;', '&#8595;', '&#8596;', '&#8629;', '&#8656;', '&#8657;', '&#8658;', '&#8659;', '&#8660;', '&#8704;', '&#8706;', '&#8707;', '&#8709;', '&#8711;', '&#8712;', '&#8713;', '&#8715;', '&#8719;', '&#8721;', '&#8722;', '&#8727;', '&#8730;', '&#8733;', '&#8734;', '&#8736;', '&#8743;', '&#8744;', '&#8745;', '&#8746;', '&#8747;', '&#8756;', '&#8764;', '&#8773;', '&#8776;', '&#8800;', '&#8801;', '&#8804;', '&#8805;', '&#8834;', '&#8835;', '&#8836;', '&#8838;', '&#8839;', '&#8853;', '&#8855;', '&#8869;', '&#8901;', '&#8968;', '&#8969;', '&#8970;', '&#8971;', '&#9001;', '&#9002;', '&#9674;', '&#9824;', '&#9827;', '&#9829;', '&#9830;', '&#92;'];
	
	function _isEmpty(val) {
		if (val) {
			return ((val === null) || val.length == 0 || /^\s+$/.test(val));
		} else {
			return true;
		}
	};
	
	function _swapArrayVals(s, arr1, arr2) {
		if (_isEmpty(s)) return "";
		let re;
		if (arr1 && arr2) {
			if (arr1.length == arr2.length) {
				for (let x = 0, i = arr1.length; x < i; x++) {
					re = new RegExp(arr1[x], 'g');
					s = s.replace(re, arr2[x]);
				}
			}
		}
		return s;
	};
	
	function _HTML2Numerical(s) {
		return _swapArrayVals(s, arr1, arr2);
	};
	
	function _htmlDecode(s) {
		let c, m, d = s, arr;
		if (_isEmpty(d)) return "";
		d = _HTML2Numerical(d);
		arr = d.match(/&#[0-9]{1,5};/g);
		if (arr != null) {
			for (let x = 0; x < arr.length; x++) {
				m = arr[x];
				c = m.substring(2, m.length - 1);
				if (c >= -32768 && c <= 65535) {
					d = d.replace(m, String.fromCharCode(c));
				} else {
					d = d.replace(m, "");
				}
			}
		}
		return d;
	}
	
	return _htmlDecode(this.valueOf());
}

// ================================
// Filename/URL String prototypes
// ================================

String.prototype.normalizePathname = function () {
	return this.valueOf().split("\\").join("/");
}

/** Returns the last suffix of a pathname.
 */
String.prototype.suffix = function () {
	var s = "" + this.valueOf(), i, ret = s;
	i = s.lastIndexOf(".");
	if (i > -1) ret = s.substr(i + 1);
	return ret.toLowerCase();
}
/** Returns the pathname without the last suffix.
 */
String.prototype.withoutSuffix = function () {
	var s = "" + this.valueOf(), i, ret = s;
	i = s.lastIndexOf(".");
	if (i > -1) ret = s.substr(0, i);
	return ret;
}

/** Returns the pathname without all suffixes.
 */
String.prototype.withoutAllSuffixes = function () {
	var s = "" + this.valueOf(), i, ret = s;
	i = s.indexOf(".");
	if (i > -1) ret = s.substr(0, i);
	return ret;
}

/** Returns the pathname without an new suffix _suffix.
 */
String.prototype.changeSuffix = function (_suffix) {
	return this.valueOf().withoutSuffix() + "." + _suffix;
}

/** Returns the basename of the pathname (slash path delimiters).
 */
String.prototype.basename = function () {
	var s = "" + this.valueOf(), i, ret = s;
	
	i = s.lastIndexOf("/");
	if (i > -1) ret = s.substr(i + 1);
	return ret;
}

/** Returns the directory pathname of the pathname (slash path delimiters).
 */
String.prototype.dirname = function () {
	var s = "" + this.valueOf(), i, ret = s;
	i = s.lastIndexOf("?");
	if (i > -1) s = s.substr(0, i);
	i = s.lastIndexOf("/");
	if (i > -1) ret = s.substr(0, i);
	return ret;
}

/** Returns the basename of a windows pathname (backslash path delimiters).
 */
String.prototype.wbasename = function () {
	var s = "" + this.valueOf(), i, ret = s;
	i = s.lastIndexOf("\\");
	if (i > -1) ret = s.substr(i + 1);
	return ret;
}

/** Returns the directory pathname of the windows pathname (backslash path delimiters).
 */
String.prototype.wdirname = function () {
	var s = "" + this.valueOf(), i, ret = s;
	i = s.lastIndexOf("?");
	if (i > -1) s = s.substr(0, i);
	i = s.lastIndexOf("\\");
	if (i > -1) ret = s.substr(0, i);
	return ret;
}

/** Returns ...
 */
String.prototype.leftAlign = function () {
	var lines = this.split("\n"), minTab = 999999, i, m, l = lines.length;
	if (l == 1) if (this.charAt(0) != "\t") return this.valueOf();
	for (i = 0; i < l; i++) {
		m = lines[i].noOfCharsAt(0, "\t");
		if (m == 0) return this.valueOf();
		if (m < minTab) minTab = m;
	}
	;
	for (i = 0; i < l; i++) lines[i] = lines[i].substr(minTab);
	return lines.join("\n");
}

/** Returns ...
 */
String.prototype.noOfCharsAtBegin = function (_c) {
	var t = this.valueOf(), lt, r = 0, i;
	lt = t.length;
	for (i = 0; i < lt; i++) if (t.charAt(i) == _c) {r++;} else {return r;}
	;
	return r;
}

/** Returns ...
 */
String.prototype.noOfCharsAt = function (_start = 0, _char) {
	let ret = 0, l = this.length, i;
	if (_char === undefined) _char = this.charAt(_start);
	if (_start >= l) return 0;
	for (i = _start; i < l; i++) {
		if (this.charAt(i) == _char) {
			ret++;
		} else {
			return ret;
		}
		;
	}
}

String.prototype.html = function (_cbhtml) {
	return this.replaceAllByRegEx(/(\{|\})/gm, {"{": "<", "}": ">"});
}

String.prototype.toBool = function () {
	return this.valueOf() == "true";
}

/**
 * Konvertiert einen Base64-String in ein Uint8Array.
 * @returns {Uint8Array}
 */
String.prototype.ToUint8Array = function() {
    // Falls der String einen Data-URL-Header hat (z.B. "data:...;base64,"), diesen entfernen
    const base64 = this.includes(',') ? this.split(',')[1] : this;
    
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
}