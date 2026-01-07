// ===========================================
// i18x.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

/**
 * Functions and classes for internationalization / localization.
 *
 * __Nomenclature__
 * * __Country Code__: an ISO-3166 code
 * * __Language Code__: an ISO-639 code
 * * __Localization Identifier/Code__: a combination of Country Code and Language Code with minus-sign-delimiter, optional followed by a dialect/client indicator
 *
 * @see <a target="i18x" href="https://www.dongleware.com/i18x/validator.html">i18x Validator</a>
 * @see <a target="i18x" href="https://www.dongleware.com/i18x/i18x%20Translators%20Quick%20Guide.pdf#pagemode=bookmarks&zoom=100">i18x Quick Guide</a>
 * @see <a target="i18x" ref="https://www.dongleware.com/i18x/i18x.pdf#pagemode=bookmarks&zoom=100">i18x Documentation</a>
 *
 * @module i18x
 * Note: Timezone support currently is not available, only local browser timezone or utc timezone.
 */

// ToDO:
// * remove editTrans

import ObjectUtils from './ObjectUtils.mjs';
import './StringUtils.mjs';
import './ArrayUtils.mjs';
import WebUtils from './WebUtils.mjs';
import './JSONUtils.mjs';
import './StorageUtils.mjs';

class i18xFormat {
	constructor(_xml) {
		this.name = "unnamed";
		this.source = _xml;
		this.execSource = "";
		this.exec = function (_x) {
			return _x;
		}
		this.#_parse(_xml);
	}

	#_parse = function (_xml) {
		let err, level = 0, a, l, i, j, k, m, e, u, s, n, x, y, z, txt, splits, parts, tag, attrs,
			attr,
			noOfInlineExpressions = 0, inlineExpressions = {}, noOfEnumereations = 0,
			enumerations = {};
		let isClosingTag, isClosedTag, format, defstart, defattrs, deflevel = 0, lastdefattrs,
			tagexpressionname,
			openChar = "<", closeChar = ">";
		let thisreturncodeconds, statementscodes = [], returncodes = [[]], returncodeconds = [[]],
			vardefcodes = {},
			expressions = {}, formats = {};
		let chrid, i_abs = false, i_max = 0, f_max = 0, g_max = 0, I_max = 0, F_max = 0, E_max = 0,
			i_full = false, f_full = false, g_full = false,
			I_full = false, F_full = false, E_full = false, r_max = 0, r_full, dochrrpl, chrrpls;

		//log(_xml);
		function _fillArrayStr(_noOf, _chr, _maxNo, _defchr) {
			let n, ret = [];
			if (_maxNo > 0) {
				if (_maxNo > _noOf) _maxNo = _noOf;
				for (n = 0; n < _maxNo; n++) ret.push('"' + _chr + '"');
				for (n = _maxNo; n < _noOf; n++) ret.push('"' + _defchr + '"');
				ret = ret.reverse();
			} else {
				for (n = 0; n < _noOf; n++) ret.push('"' + _chr + '"');
			}
			//log("-----------------------",ret.join(","));
			return ret.join(",");
		}

		function _defTagCodes(_vardefcodeName, _code, _vardefcode, _codeadd) {
			let expr, x, k, m, j, attr;
			if (_codeadd === undefined) _codeadd = true;
			switch (_vardefcodeName) {
				case "localdate":
					vardefcodes.localdate = "d=x.DateOfTicks()";
					vardefcodes[_code] = _vardefcode + "=" + _code;
					_code = _vardefcode;
					break;
				case "utcdate":
					vardefcodes.utcdate = "u=x.DateOfTicks()";
					vardefcodes[_code] = _vardefcode + "=" + _code;
					_code = _vardefcode;
					break;
				case "now":
					vardefcodes.utcdate = "n=new Date().Ticks()";
					vardefcodes[_code] = _vardefcode + "=" + _code;
					_code = _vardefcode;
					break;
				case "value":
					vardefcodes.value = _vardefcode;
					break;
			}
			for (attr in attrs) {
				x = attrs[attr];
				switch (attr) {
					case "digits":
						break;
					case "enumeration":
						if (!enumerations[attrs[attr]]) {
							noOfEnumereations++;
							enumerations[attrs[attr]] = {};
							enumerations[attrs[attr]].name = "e" + noOfEnumereations;
							enumerations[attrs[attr]].defs = [];
							m = attrs[attr].split("|");
							k = m.length;
							for (j = 0; j < k; j++) enumerations[attrs[attr]].defs.push('"' + m[j] + '"');
						}
						vardefcodes[enumerations[attrs[attr]].name] = enumerations[attrs[attr]].name + "=[" + enumerations[attrs[attr]].defs.join(",") + "]";
						_code = enumerations[attrs[attr]].name + "[" + _code + "]";
						break;
					case "expression":
						if (attrs[attr].substr(0, 1) == "=") {
							if (!inlineExpressions[attrs[attr]]) {
								expr = new i18xExpression(attrs[attr].substr(1));
								noOfInlineExpressions++;
								inlineExpressions[attrs[attr]] = {};
								inlineExpressions[attrs[attr]].no = noOfInlineExpressions;
								inlineExpressions[attrs[attr]].name = "_x_" + noOfInlineExpressions;
								expressions[inlineExpressions[attrs[attr]].name] = expr;
							}
							tagexpressionname = inlineExpressions[attrs[attr]].name;
							_code = inlineExpressions[attrs[attr]].name + "(" + _code + ")";
						} else {
							if (!expressions.hasOwnProperty("_local_" + attrs[attr])) {
								tagexpressionname = attrs[attr];
								_code = attrs[attr] + "(" + _code + ")";
							} else {
								tagexpressionname = "_local_" + attrs[attr];
								_code = "_local_" + attrs[attr] + "(" + _code + ")";
							}
						}
						break;
					case "format":
						if (!formats.hasOwnProperty("_local_" + attrs[attr])) {
							//_code=attrs[attr]+"("+_code+")";
							_code = "(" + _code + ").Format('" + attrs[attr] + "')";
						} else {
							_code = "_local_" + attrs[attr] + "(" + _code + ")";
						}
						break;
				}
			}
			if (_code != "" && _codeadd) returncodes[level].push(_code);
		}

		try {
			vardefcodes.absvalue = "";
			vardefcodes.value = "";
			vardefcodes.valueary = "";
			vardefcodes.integer = "";
			vardefcodes.integervalue = "";
			vardefcodes.fraction = "";
			vardefcodes.fractionvalue = "";
			vardefcodes.scvalueif = "";
			vardefcodes.scvaluee = "";
			vardefcodes.scinteger = "";
			vardefcodes.scfraction = "";
			vardefcodes.scexponent = "";
			vardefcodes.romanvalue = "";
			vardefcodes.roman = "";
			//_xml = _xml.I18xKey();
			//log(_xml);
			_xml.I18xNotationNormalizeTranslation("");
			n = ("<i18x>" + _xml + "</i18x>").split(openChar);

			if (_xml.indexOf(openChar) == -1) return _xml;
			l = n.length;
			for (i = 0; i < l; i++) {
				e = n[i].indexOf(closeChar);
				if (e == -1) {
					if (n[i] != "") returncodes[level].push(n[i].chrrpl({ '"': '/' }));
				} else {
					txt = n[i].substr(e + 1);
					isClosingTag = n[i].charAt(0) == "/";
					isClosedTag = n[i].charAt(e - 1) == "/";
					s = 0;
					u = e;
					if (isClosedTag) u -= 1;
					if (isClosingTag) {
						s = 1;
						u -= 1;
					}

					// calculate tag and attributes...
					parts = n[i].substr(s, u).split('" ');
					splits = parts[0].split(" ");
					tag = splits[0];
					tagexpressionname = "";
					if (splits[1]) {
						splits.shift();
						parts[0] = splits.join(" ");
						k = parts.length - 1;
						parts[k] = parts[k].substr(0, parts[k].length - 1);
						if (parts[k] == "") parts.pop();
					} else {
						parts = [];
					}
					k = parts.length;
					attrs = {};
					j = 0;
					while (j < k) {
						if (parts[j].indexOf('="') >= 0) {
							attr = parts[j].split('="');
							attrs[attr[0]] = attr[1];
							j++;
						} else {
							attrs[parts[j].substr(0, parts[j].length)] = parts[j + 1];
							j += 2;
						}
					}
					//log("tag=");log(tag);log("attrs=");log(attrs);
					// ...now tag is set and attrs contains an object with key/value pairs of attributes of tag.

					if (isClosingTag) {
						// ...is closing tag (</tag>).
						level--;
						returncodes[level] = (returncodeconds[level + 1] == "") ? returncodes[level].concat(returncodes[level + 1].JoinWithoutEmpty("+")) : returncodes[level].concat("((" + returncodeconds[level + 1] + ")?" + returncodes[level + 1].JoinWithoutEmpty("+") + ":'')");
						if (returncodes[level][0] == "") returncodes[level] = [];
					} else if (isClosedTag) {
						// ...is closed tag (<tag/>).
						//log("isClosedTag="+returncodes[level]+"#"+level);
						//doinsertvalue = true;
					} else {
						// ...is an open tag (<tag>).
						level++;
						returncodes[level] = [];
						returncodeconds[level] = "";
						//log("isOpenTag="+returncodes[level]+"#"+level);
					}

					// process tag...
					if (tag == "format" || tag == "expression") {
						// handle special tag "defintion" and nested tags of this...
						if (!isClosingTag && !isClosedTag) {
							deflevel++;
							if (deflevel == 2) {
								defstart = i;
								format = "";
							}
						}
						if (isClosingTag) {
							deflevel--;
							if (deflevel == 1) {
								format = [];
								for (j = defstart; j < i; j++) format.push(n[j]);
								defstart = n[i].indexOf(closeChar);
								format = openChar + format.join(openChar) + openChar + n[i].substr(0, defstart + 1);
							}
						}
						if (isClosedTag) {
							if (deflevel == 1) {
								defstart = n[i].indexOf(closeChar);
								format = openChar + n[i].substr(0, defstart + 1);
							}
						}
						if (((!isClosingTag && !isClosedTag) && deflevel == 1) || (isClosedTag && deflevel == 0)) {
							defattrs = attrs;
							if (!defattrs.base) defattrs.base = 10;
							if (!defattrs.ifillchr) defattrs.ifillchr = "";
							if (!defattrs.ffillchr) defattrs.ffillchr = "";
							if (!defattrs.gfillchr) defattrs.gfillchr = "";
							if (!defattrs.ifillchr) defattrs.Ifillchr = "";
							if (!defattrs.Ffillchr) defattrs.Ffillchr = "";
							if (!defattrs.Efillchr) defattrs.Efillchr = "";
							if (!defattrs.rfillchr) defattrs.rfillchr = "";
							if (!defattrs.ifillmax) defattrs.ifillmax = 0;
							if (!defattrs.ffillmax) defattrs.ffillmax = 0;
							if (!defattrs.gfillmax) defattrs.gfillmax = 0;
							if (!defattrs.Ifillmax) defattrs.Ifillmax = 0;
							if (!defattrs.Ffillmax) defattrs.Ffillmax = 0;
							if (!defattrs.Efillmax) defattrs.Efillmax = 0;
							if (!defattrs.rfillmax) defattrs.rfillmax = 0;
							if (!defattrs.digits) defattrs.digits = "";
							if (!defattrs.expression) defattrs.expression = "";
							if (defattrs.expression != "") {
								if (defattrs.expression.substr(0, 1) == "=") {
									if (!inlineExpressions[defattrs.expression]) {
										noOfInlineExpressions++;
										inlineExpressions[defattrs.expression] = {};
										inlineExpressions[defattrs.expression].no = noOfInlineExpressions;
										inlineExpressions[defattrs.expression].name = "_x_" + noOfInlineExpressions;
										expressions[inlineExpressions[defattrs.expression].name] = new i18xExpression(defattrs.expression.substr(1));
									}
								}
							}
						}
						if (((!isClosingTag && !isClosedTag) && deflevel == 2) || (isClosedTag && deflevel == 1)) lastdefattrs = attrs;
						if (isClosingTag || isClosedTag) {
							if (deflevel > 0) {
								//console.Log("format="+format+" name="+lastdefattrs.name);
								//switch (lastdefattrs.type) {
								switch (tag) {
									case "format":
										formats["_local_" + lastdefattrs.name] = new i18xFormat(format);
										break;
									case "expression":
										expressions["_local_" + lastdefattrs.name] = new i18xExpression(lastdefattrs.expression.substr(1));
										break;
									case "directions":
										break;
								}
							} else {
								this.name = defattrs['name'];
							}
						}
						//doinsertvalue = false;
					}
					if (deflevel <= 1) {
						switch (tag) {
							case "i18x":
								break;
							case "x":
								_defTagCodes("", "x", "", isClosedTag);
								break;
							case "xa":
								i_abs = true;
								_defTagCodes("", "xa", "", isClosedTag);
								break;
							case "weekday":
								_defTagCodes("localdate", "d.getDay()", "weekday", isClosedTag);
								break;
							case "day":
								_defTagCodes("localdate", "d.getDate()", "day", isClosedTag);
								break;
							case "month":
								_defTagCodes("localdate", "d.getMonth()", "month", isClosedTag);
								break;
							case "year":
								_defTagCodes("localdate", "d.getFullYear()", "year", isClosedTag);
								break;
							case "weekofyear":
								_defTagCodes("localdate", "d.GetWeekOfYear()", "weekofyear", isClosedTag);
								break;
							case "dayofyear":
								_defTagCodes("localdate", "d.GetDayOfYear()", "dayofyear", isClosedTag);
								break;
							case "hour":
								_defTagCodes("localdate", "d.getHours()", "hour", isClosedTag);
								break;
							case "minute":
								_defTagCodes("localdate", "d.getMinutes()", "minute", isClosedTag);
								break;
							case "second":
								_defTagCodes("localdate", "d.getSeconds()", "second", isClosedTag);
								break;
							case "millisecond":
								_defTagCodes("localdate", "(d.getTime()-Math.floor(d.getTime()*1000))");
								break;
							case "utcweekday":
								_defTagCodes("utcdate", "u.getUTCDay()", "utcweekday", isClosedTag);
								break;
							case "utcday":
								_defTagCodes("utcdate", "u.getUTCDate()", "utcday", isClosedTag);
								break;
							case "utcmonth":
								_defTagCodes("utcdate", "u.getUTCMonth()", "utcmonth", isClosedTag);
								break;
							case "utcyear":
								_defTagCodes("utcdate", "u.getUTCFullYear()", "utcyear", isClosedTag);
								break;
							case "utcweekofyear":
								_defTagCodes("utcdate", "u.getUTCWeekOfYear()", "utcweekofyear", isClosedTag);
								break;
							case "utcdayofyear":
								_defTagCodes("utcdate", "u.getUTCDayOfYear()", "utcdayofyear", isClosedTag);
								break;
							case "utchour":
								_defTagCodes("utcdate", "u.getUTCHours()", "utchour", isClosedTag);
								break;
							case "utcminute":
								_defTagCodes("utcdate", "u.getUTCMinutes()", "utcminute", isClosedTag);
								break;
							case "utcsecond":
								_defTagCodes("utcdate", "u.getUTCSeconds()", "utcsecond", isClosedTag);
								break;

							case "upToNowTicks":
								_defTagCodes("utcdate", "u.GetUpToNowTicks()", "upToNowTicks", isClosedTag);
								//_defTagCodes("utcdate", "u.getUpToNowMonths()", "upToNowMonths", isClosedTag);
								//_defTagCodes("utcdate", "u.getUpToNowYears()", "upToNowYear", isClosedTag);
								break;

							case "summertimeoffset":
								break;
							case "timezoneoffset":
								_defTagCodes("localdate", "d.getTimezoneOffset()");
								break;
							case "timezone":
								break;

							// BIDI unicode characters
							case "LRM":
								returncodes[level].push('"\u200E"');
								break;
							case "RLM":
								returncodes[level].push('"\u200F"');
								break;
							case "ALM":
								returncodes[level].push('"\u061C"');
								break;
							case "LRE":
								returncodes[level].push('"\u202A"');
								break;
							case "LRO":
								returncodes[level].push('"\u202D"');
								break;
							case "RLE":
								returncodes[level].push('"\u202B"');
								break;
							case "RLO":
								returncodes[level].push('"\u202E"');
								break;
							case "PDF":
								returncodes[level].push('"\u202C"');
								break;
							case "LRI":
								returncodes[level].push('"\u2066"');
								break;
							case "RLI":
								returncodes[level].push('"\u2067"');
								break;
							case "FSI":
								returncodes[level].push('"\u2068"');
								break;
							case "PDI":
								returncodes[level].push('"\u2069"');
								break;

							case "lt":
								returncodes[level].push('"' + "<".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "gt":
								returncodes[level].push('"' + ">".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "obrc":
								returncodes[level].push('"' + "{".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "cbrc":
								returncodes[level].push('"' + "}".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "br":
								returncodes[level].push('"' + "<br/>".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "italicOn":
								returncodes[level].push('"' + "<i>".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "italicOff":
								returncodes[level].push('"' + "</i>".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "boldOn":
								returncodes[level].push('"' + "<b>".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "boldOff":
								returncodes[level].push('"' + "</b>".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "underlineOn":
								returncodes[level].push('"' + "<u>".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "underlineOff":
								returncodes[level].push('"' + "</u>".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "newline":
								returncodes[level].push('"' + "\\n".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "slashnewline":
								returncodes[level].push('"' + "\\\\n".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "quot":
								returncodes[level].push('"' + '\\"'.repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "squot":
								returncodes[level].push('"' + "'".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "apos":
								returncodes[level].push('"' + "'".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "space":
								returncodes[level].push('"' + " ".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "amp":
								returncodes[level].push('"' + "\u0026".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "nbsp":
								returncodes[level].push('"' + "\u00A0".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							case "tab":
								returncodes[level].push('"' + "\\t".repeat(attrs.repeat == null ? 1 : attrs.repeat) + '"');
								break;
							default:
								// handle numbering tags...
								if (tag.length <= 3) {
									switch (tag.charAt(0)) {
										case "i":
											if (tag.length == 1) {
												i_full = true;
												_defTagCodes("", "sif[0]", "");
											} else {
												chrid = tag.substr(1).ParseInt(10);
												//log(chrid);
												i_max = Math.max(i_max, chrid + 1);
												if (chrid >= 0) _defTagCodes("", "i[" + chrid + "]");
											}
											break;
										case "f":
											if (tag.length == 1) {
												f_full = true;
												_defTagCodes("", "sif[1]");
											} else {
												chrid = tag.substr(1).ParseInt(10);
												//log(chrid);
												f_max = Math.max(f_max, chrid + 1);
												if (chrid >= 0) _defTagCodes("", "f[" + chrid + "]");
											}
											break;
										case "g":
											if (tag.length == 1) {
												g_full = true;
												_defTagCodes("", "sif[1]");
											} else {
												chrid = tag.substr(1).ParseInt(10);
												//log(chrid);
												g_max = Math.max(g_max, chrid + 1);
												if (chrid >= 0) _defTagCodes("", "g[" + chrid + "]");
											}
											break;
										case "E":
											if (tag.length == 1) {
												E_full = true;
												_defTagCodes("", "see[1]", "");
											} else {
												chrid = tag.substr(1).ParseInt(10);
												//log(chrid);
												E_max = Math.max(E_max, chrid + 1);
												if (chrid >= 0) _defTagCodes("", "E[" + chrid + "]");
											}
											break;
										case "I":
											if (tag.length == 1) {
												I_full = true;
												_defTagCodes("", "seif[0]", "");
											} else {
												chrid = tag.substr(1).ParseInt(10);
												//log(chrid);
												I_max = Math.max(I_max, chrid + 1);
												if (chrid >= 0) _defTagCodes("", "I[" + chrid + "]");
											}
											break;
										case "F":
											if (tag.length == 1) {
												F_full = true;
												_defTagCodes("", "seif[1]");
											} else {
												chrid = tag.substr(1).ParseInt(10);
												//log(chrid);
												F_max = Math.max(F_max, chrid + 1);
												if (chrid >= 0) _defTagCodes("", "F[" + chrid + "]");
											}
											break;
										case "r":
											if (tag.length == 1) {
												r_full = true;
												_defTagCodes("", "sr");
											} else {
												chrid = tag.substr(1).ParseInt(10);
												//log(chrid);
												r_max = Math.max(r_max, chrid + 1);
												if (chrid >= 0) _defTagCodes("", "r[" + chrid + "]");
											}
											break;
									}
								}
								break;
						}
						for (attr in attrs) {
							x = attrs[attr];
							switch (attr) {
								case "digits":
									break;
								case "if":
									z = x.split("|");
									thisreturncodeconds = [];
									for (a = 0; a < z.length; a++) {
										y = parseInt(z[a], 10);
										switch (z[a].charAt(z[a].length - 1)) {
											case '+':
												thisreturncodeconds.push(((tagexpressionname != "") ? tagexpressionname + "(" + tag + ")" : tag) + ">" + y);
												break;
											case '-':
												thisreturncodeconds.push(((tagexpressionname != "") ? tagexpressionname + "(" + tag + ")" : tag) + "<" + y);
												break;
											case '=':
												thisreturncodeconds.push(((tagexpressionname != "") ? tagexpressionname + "(" + tag + ")" : tag) + "==" + y);
												break;
											case '~':
												thisreturncodeconds.push(((tagexpressionname != "") ? tagexpressionname + "(" + tag + ")" : tag) + "!=" + y);
												break;
											default:
												thisreturncodeconds.push(((tagexpressionname != "") ? tagexpressionname + "(" + tag + ")" : tag) + "==" + y);
												break;
										}
										returncodeconds[level] = thisreturncodeconds.join("||");
									}
									break;
							}
						}
						//returncodes[level]+=value+func;
						//log("level function: "+returncodes[level]+" / "+txt+" / "+deflevel);
						if (txt != "") returncodes[level].push('"' + txt.chrrpl({ '"': '/' }) + '"');
						//log(returncodes[level]);
					}
				}
			}
			this.execSource = "this.exec=function(x){";
			dochrrpl = defattrs.digits != "";
			chrrpls = [];
			m = defattrs.digits.split("|");
			l = m.length;
			for (i = 0; i < l; i++) {
				n = m[i].split("=");
				chrrpls.push('"' + n[0] + '":"' + n[1] + '"');
			}
			chrrpls = "{" + chrrpls.join(",") + "}";
			if (i_abs || i_max > 0 || f_max > 0 || g_max > 0 || f_full || i_full) {
				vardefcodes.absvalue = 'xa=Math.abs(x)';
				vardefcodes.value = 'sif=xa.toString(' + defattrs.base + ')' + (dochrrpl ? '.chrrpl(' + chrrpls + ')' : '') + '.split(".").concat("")';
			}
			if (i_max > 0) {
				if (defattrs.ifillmax > 0) {
					vardefcodes.integer = "i=sif[0].split('').reverse()";
					statementscodes.unshift("i=i.concat([" + _fillArrayStr(i_max, defattrs.ifillchr, defattrs.ifillmax, "") + "].slice(0," + i_max + "-i.length))");
				} else {
					vardefcodes.integer = "i=sif[0].split('').reverse().concat([" + _fillArrayStr(i_max, defattrs.ifillchr, defattrs.ifillmax, "") + "])";
				}
			}
			//if(defattrs.ifillmax>0)statementscodes.unshift("log('#######################',["+_fillArrayStr(i_max,defattrs.ifillchr,defattrs.ifillmax,"")+"].slice(0,"+i_max+"-i.length))");
			if (f_max > 0) vardefcodes.fraction = "f=sif[1].split('').concat([" + _fillArrayStr(f_max, defattrs.ffillchr, defattrs.ffillmax, "") + "])";
			if (g_max > 0) vardefcodes.fraction = "g=sif[1].split('').concat([" + _fillArrayStr(g_max, defattrs.gfillchr, defattrs.gfillmax, "") + "])";
			if (I_max > 0 || F_max > 0 || E_max > 0 || F_full || I_full || E_full) {
				vardefcodes.scvalueif = 'see=x.toExponential()' + (dochrrpl ? '.chrrpl(' + chrrpls + ')' : '') + '.split("e").concat("")';
				vardefcodes.scvaluee = 'seif=see[0]' + (dochrrpl ? '.chrrpl(' + chrrpls + ')' : '') + '.split(".").concat("")';
			}
			if (I_max > 0) vardefcodes.scinteger = "I=seif[0].split('').reverse().concat([" + _fillArrayStr(I_max, defattrs.Ifillchr, defattrs.Ifillmax, "") + "])";
			if (F_max > 0) vardefcodes.scfraction = "F=seif[1].split('').concat([" + _fillArrayStr(F_max, defattrs.Ffillchr, defattrs.Ffillmax, "") + "])";
			if (E_max > 0) vardefcodes.scexponent = "E=see[1].split('').reverse().concat([" + _fillArrayStr(E_max, defattrs.Efillchr, defattrs.Efillmax, "") + "])";
			if (r_max > 0 || r_full) vardefcodes.romanvalue = 'sr=x.ToRoman()' + (dochrrpl ? '.chrrpl(' + chrrpls + ')' : '');
			if (r_max > 0) vardefcodes.roman = "r=sr.split('').reverse().concat([" + _fillArrayStr(r_max, defattrs.rfillchr, defattrs.rfillmax, "") + "])";
			//statementscodes.push('log(x)');
			if (defattrs.expression != "") {
				if (defattrs.expression.substr(0, 1) == "=") {
					this.execSource += "x=" + inlineExpressions[defattrs.expression].name + "(x);";
				} else {
					this.execSource += "x=" + defattrs.expression + "(x);";
				}
			}
			vardefcodes.err = "err";
			this.execSource += ObjectUtils.joinFlatValues(vardefcodes, ",", "let ", ";");
			this.execSource += statementscodes.join(";") + ((statementscodes.length > 0) ? ";" : "");
			for (i in formats) this.execSource += formats[i].execSource.str_replace("this.exec=function", "function " + i);
			for (i in expressions) this.execSource += expressions[i].execSource.str_replace("this.exec=function", "function " + i);
			this.execSource += "try{return " + returncodes[level].join("+") + ";}catch(err){return err.message};};";
			//this.execSource = this.execSource.str_replace('" "++','" "+');
			eval(this.execSource);
		} catch (err) {
			console.error("error in calculated function: ", this.name, this.source, this.execSource, err.message);
			this.exec = function (_x) {
				return "Error in i18x format format ('" + this.name + "', " + err.message + ").";
			};
			console.error("i18x Error: " + _xml + "\n" + err);
		}
	}


}


class i18xExpression {
	constructor(_exp) {
		this.source = _exp;
		this.execSource = "";
		this.exec = function (x) {
			return x;
		};
		this.#_parse(_exp);
	}

	#_parse = function (_exp) {
		let func = "this.exec=function(x){let e;if(!isNaN(x))x=parseFloat(x);try{return ";
		// quick and dirty...
		if (_exp) func += _exp.strtrs({
			"round": "Math.round",
			"abs": "Math.abs",
			"ceil": "Math.ceil",
			"floor": "Math.floor",
			"sign": "Math.sign",
			"frac": "Math.frac",
			"replace": "StringReplace"
		});
		func += "}catch(e){return e.message;}};";
		this.execSource = func;
		eval(this.execSource);
	}

}


/** Class to manage i18x translations.
 * @class i18x
 */
export default class i18x {
	/** Whether to use i18xe.
	 * @static
	 * @type {bool}
	 */
	static activated = false;
	/** The i18xe server host, e.g. "https://i18xe.dosing.local".
	 * @static
	 * @type {string}
	 */
	static i18xeServerHost = "";
	/** The i18xe server api host, e.g. "https://i18xeapi.dosing.local".
	 * @static
	 * @type {string}
	 **/
	static i18xeServerAPIHost = "";
	/** The i18xe server api identifier for this app.
	 * @static
	 * @type {string}
	 */
	static i18xeServerAPIAppId = "";
	/** The i18xe server api password for this app.
	 * @static
	 * @type {string}
	 */
	static i18xeServerAPIAppPwd = "";
	/** The folder of localization json files.
	 * @static
	 * @type {string}
	 */
	static serverUrl = "";
	/** The i18xe server url.
	 * @static
	 * @type {string}
	 */
	static i18xFolder = "./build/i18x";

	/** The currently set localization.
	 * @static
	 * @type {string}
	 * @example
	 * i18x:.curLid
	 */
	static curLid = "en-US";
	/** The standard set localization, usual way "en-US".
	 * @static
	 * @type {string}
	 * @example
	 * i18x.stdLid
	 */
	static stdLid = "en-US";

	/** Map of icons, where the name of the icon is the key and the value is the character which represents the icon.
	 * Used by rich text tag <icon/>
	 * @static
	 * @type {object}
	 * @example
	 * i18x.icon = {"test":0xFF}
	 */
	static icons = {};

	/*-- @<BUILD_ONLY_AT_RELEASES:Production ----
	static availableLids =JSON.loadSync(i18x.i18xFolder+"/prod/availableLids.json?");
	---- @>BUILD_ONLY_AT_RELEASES --*/
	/*-- @<BUILD_ONLY_AT_RELEASES:Test ----
	static availableLids =JSON.loadSync(i18x.i18xFolder+"/test/availableLids.json?");
	---- @>BUILD_ONLY_AT_RELEASES --*/
	/*-- @<BUILD_NEVER_AT_RELEASES:Production,Test --*/
	/** An object with all available localizations. (key=localizations id, value=description text)
	 * @static
	 * @type {object}
	 * @example
	 * i18x.availableLids.hasOwnProperty("de-DE")
	 * i18x.availableLids["de-DE"] // deutsch-Deutschland
	 */
	static availableLids = (i18x.activated) ? JSON.loadSync(i18x.i18xFolder + "/dev/availableLids.json?") : {};
	/*-- @>BUILD_NEVER_AT_RELEASES --*/

	/** An object with all localization JSONs.
	 * @static
	 * @type {object}
	 */
	static i18xs = {};
	/** An object with all currently compiled expressions.
	 * @static
	 * @type {object}
	 */
	static i18xExpressions = {};
	/** An object with all defined formats.
	 * @static
	 * @type {object}
	 */
	static formats = {};
	/** An object with all defined templates.
	 * @static
	 * @type {object}
	 */
	static templates = {};
	/** An object with all defined hyphenations per lid.
	 * @static
	 * @type {object}
	 */
	static hyphens = {};
	/** An object with all words which are already hyphenated.
	 * @static
	 * @type {object}
	 */
	static hypenCache = {};

	static HYPHENCHAR = "\xAD";

	static lastHorDir = "ltr";
	static lastVerDir = "ttb";

	static IS_I18XEDIT = false;
	static lastTransIdCounter = 0;
	static lastTransId = 0;
	static lastTransNativeId = 0;
	static lastTransPrefix = "";
	static lastState = "ok";
	static lastContext = "";
	static lastTransResult = "";
	static lastFormat = "text";
	static lastFormatName = "";
	static lastTransKey = "";
	static lastTransPlaceholders = {};
	static lastPlaceholderDefs = {};
	static lastTransKeyExists = false;
	static transEdits = {};
	static transNativeEdits = {};
	static transEditNativeIds = {};
	static activeEditNativeId = 0;

	static TRANSLATE = 0;
	static NO_TRANSLATE = 1;
	static TRANSLATE_WITH_PLACEHOLDERS = 2;
	static TRANSLATE_WITH_VALUES = 3;
	static NO_TRANSLATE_WITH_PLACEHOLDERS = 4;
	static NO_TRANSLATE_WITH_VALUES = 5;

	/** A list of main cultures. (Which country is the main country of a language).
	 * @static
	 * @type {{tt: string, de: string, hi: string, pt: string, kok: string, lt: string, hr: string, lv: string, hu: string, "Lt-uz": string, div: string, hy: string, uk: string, id: string, ur: string, mk: string, mn: string, af: string, ms: string, el: string, mt: string, en: string, is: string, it: string, zh: string, es: string, et: string, eu: string, ar: string, vi: string, nb: string, ja: string, az: string, fa: string, ro: string, nl: string, nn: string, no: string, be: string, fi: string, ru: string, bg: string, fo: string, fr: string, syr: string, sa: string, ka: string, sk: string, sl: string, "Cy-uz": string, sq: string, ca: string, sr: string, kk: string, kn: string, sv: string, ko: string, sw: string, gl: string, ta: string, gu: string, ky: string, cs: string, pa: string, te: string, th: string, pl: string, da: string, he: string, tr: string}}
	 */
	static LIDS_MAIN_CULTURES = {
		"af": "ZA",
		"sq": "AL",
		"ar": "SA",
		"hy": "AM",
		"az": "AZ",
		"eu": "ES",
		"be": "BY",
		"bg": "BG",
		"ca": "ES",
		"zh": "CN",
		"hr": "HR",
		"cs": "CZ",
		"da": "DK",
		"div": "MV",
		"nl": "NL",
		"en": "GB",
		"et": "EE",
		"fo": "FO",
		"fa": "IR",
		"fi": "FI",
		"fr": "FR",
		"gl": "ES",
		"ka": "GE",
		"de": "DE",
		"el": "GR",
		"gu": "IN",
		"he": "IL",
		"hi": "IN",
		"hu": "HU",
		"is": "IS",
		"id": "ID",
		"it": "IT",
		"ja": "JP",
		"kn": "IN",
		"kk": "KZ",
		"kok": "IN",
		"ko": "KR",
		"ky": "KZ",
		"lv": "LV",
		"lt": "LT",
		"mk": "MK",
		"ms": "MY",
		"mt": "MT",
		"mn": "MN",
		"nb": "NO",
		"nn": "NO",
		"no": "NO",
		"pl": "PL",
		"pt": "PT",
		"pa": "IN",
		"ro": "RO",
		"ru": "RU",
		"sa": "IN",
		"sr": "SP",
		"sk": "SK",
		"sl": "SI",
		"es": "ES",
		"sw": "KE",
		"sv": "SE",
		"syr": "SY",
		"ta": "IN",
		"tt": "RU",
		"te": "IN",
		"th": "TH",
		"tr": "TR",
		"uk": "UA",
		"ur": "PK",
		"Cy-uz": "UZ",
		"Lt-uz": "UZ",
		"vi": "VN"
	}
	/** A list of culture variations.
	 * @static
	 * @type {{de: string[], "smj-SE": string[], pt: string[], "sr-Cyrl-ME", hr: string[], "zh-CN", "sr-Latn-BA", "sr-Latn-RS", "zh-Hans", mn: string[], uz: string[], ms: string[], tzm: string[], en, it: string[], iu: string[], es, "sr-Cyrl-BA", zh, "smj-NO": string[], "sr-Cyrl-RS", ar, "zh-SG", "bs-Latn": string[], "bs-Cyrl": string[], az: string[], nl: string[], "sr-Latn-CS", "bs-Cyrl-BA": string[], "zh-MO", sma: string[], fr, bn: string[], bs: string[], smj: string[], se: string[], quz: string[], "sr-Cyrl-CS", sr, sv: string[], "bs-Latn-BA": string[], "zh-TW", "zh-HK", "sr-Latn-ME", "sma-NO": string[], "sr-Latn", "sr-Cyrl", "sma-SE": string[], tg: string[], ha: string[]}}
	 */
	static LIDS_MAIN_CULTURES_VARIATIONS = {
		"ar": ["ar-SA", "ar-IQ", "ar-EG", "ar-LY", "ar-DZ", "ar-MA", "ar-TN", "ar-OM", "ar-YE", "ar-SY", "ar-JO", "ar-LB", "ar-KW", "ar-AE", "ar-BH", "ar-QA"],
		"zh-Hans": ["zh-TW", "zh-CN", "zh-HK", "zh-SG", "zh-MO", "zh", "zh-Hant", "zh-CHS", "zh-CHT"],
		"de": ["de-DE", "de-CH", "de-AT", "de-LU", "de-LI"],
		"en": ["en-US", "en-GB", "en-AU", "en-CA", "en-NZ", "en-IE", "en-ZA", "en-JM", "en-029", "en-BZ", "en-TT", "en-ZW", "en-PH", "en-IN", "en-MY", "en-SG"],
		"es": ["es-MX", "es-ES", "es-GT", "es-CR", "es-PA", "es-DO", "es-VE", "es-CO", "es-PE", "es-AR", "es-EC", "es-CL", "es-UY", "es-PY", "es-BO", "es-SV", "es-HN", "es-NI", "es-PR", "es-US"],
		"fr": ["fr-FR", "fr-BE", "fr-CA", "fr-CH", "fr-LU", "fr-MC"],
		"it": ["it-IT", "it-CH"],
		"nl": ["nl-NL", "nl-BE"],
		"pt": ["pt-BR", "pt-PT"],
		"hr": ["hr-HR", "hr-BA"],
		"sv": ["sv-SE", "sv-FI"],
		"tg": ["tg-Cyrl-TJ", "tg-Cyrl"],
		"az": ["az-Latn-AZ", "az-Cyrl-AZ", "az-Cyrl", "az-Latn"],
		"se": ["se-NO", "se-SE", "se-FI"],
		"ms": ["ms-MY", "ms-BN"],
		"uz": ["uz-Latn-UZ", "uz-Cyrl-UZ", "uz-Cyrl", "uz-Latn"],
		"bn": ["bn-IN", "bn-BD"],
		"mn": ["mn-MN", "mn-Mong-CN", "mn-Cyrl", "mn-Mong"],
		"iu": ["iu-Cans-CA", "iu-Latn-CA", "iu-Cans", "iu-Latn"],
		"tzm": ["tzm-Latn-DZ", "tzm-Latn"],
		"ha": ["ha-Latn-NG", "ha-Latn"],
		"quz": ["quz-BO", "quz-EC", "quz-PE"],
		"zh-TW": ["zh-Hans", "zh-CN", "zh-HK", "zh-SG", "zh-MO", "zh", "zh-Hant", "zh-CHS", "zh-CHT"],
		"zh-CN": ["zh-Hans", "zh-TW", "zh-HK", "zh-SG", "zh-MO", "zh", "zh-Hant", "zh-CHS", "zh-CHT"],
		"sr-Latn-CS": ["sr-Cyrl-CS", "sr-Latn-BA", "sr-Cyrl-BA", "sr-Latn-RS", "sr-Cyrl-RS", "sr-Latn-ME", "sr-Cyrl-ME", "sr-Cyrl", "sr-Latn", "sr"],
		"zh-HK": ["zh-Hans", "zh-TW", "zh-CN", "zh-SG", "zh-MO", "zh", "zh-Hant", "zh-CHS", "zh-CHT"],
		"sr-Cyrl-CS": ["sr-Latn-CS", "sr-Latn-BA", "sr-Cyrl-BA", "sr-Latn-RS", "sr-Cyrl-RS", "sr-Latn-ME", "sr-Cyrl-ME", "sr-Cyrl", "sr-Latn", "sr"],
		"zh-SG": ["zh-Hans", "zh-TW", "zh-CN", "zh-HK", "zh-MO", "zh", "zh-Hant", "zh-CHS", "zh-CHT"],
		"smj-NO": ["smj-SE", "smj"],
		"zh-MO": ["zh-Hans", "zh-TW", "zh-CN", "zh-HK", "zh-SG", "zh", "zh-Hant", "zh-CHS", "zh-CHT"],
		"bs-Latn-BA": ["bs-Cyrl-BA", "bs-Cyrl", "bs-Latn", "bs"],
		"smj-SE": ["smj-NO", "smj"],
		"sr-Latn-BA": ["sr-Latn-CS", "sr-Cyrl-CS", "sr-Cyrl-BA", "sr-Latn-RS", "sr-Cyrl-RS", "sr-Latn-ME", "sr-Cyrl-ME", "sr-Cyrl", "sr-Latn", "sr"],
		"sma-NO": ["sma-SE", "sma"],
		"sr-Cyrl-BA": ["sr-Latn-CS", "sr-Cyrl-CS", "sr-Latn-BA", "sr-Latn-RS", "sr-Cyrl-RS", "sr-Latn-ME", "sr-Cyrl-ME", "sr-Cyrl", "sr-Latn", "sr"],
		"sma-SE": ["sma-NO", "sma"],
		"bs-Cyrl-BA": ["bs-Latn-BA", "bs-Cyrl", "bs-Latn", "bs"],
		"sr-Latn-RS": ["sr-Latn-CS", "sr-Cyrl-CS", "sr-Latn-BA", "sr-Cyrl-BA", "sr-Cyrl-RS", "sr-Latn-ME", "sr-Cyrl-ME", "sr-Cyrl", "sr-Latn", "sr"],
		"sr-Cyrl-RS": ["sr-Latn-CS", "sr-Cyrl-CS", "sr-Latn-BA", "sr-Cyrl-BA", "sr-Latn-RS", "sr-Latn-ME", "sr-Cyrl-ME", "sr-Cyrl", "sr-Latn", "sr"],
		"sr-Latn-ME": ["sr-Latn-CS", "sr-Cyrl-CS", "sr-Latn-BA", "sr-Cyrl-BA", "sr-Latn-RS", "sr-Cyrl-RS", "sr-Cyrl-ME", "sr-Cyrl", "sr-Latn", "sr"],
		"sr-Cyrl-ME": ["sr-Latn-CS", "sr-Cyrl-CS", "sr-Latn-BA", "sr-Cyrl-BA", "sr-Latn-RS", "sr-Cyrl-RS", "sr-Latn-ME", "sr-Cyrl", "sr-Latn", "sr"],
		"bs-Cyrl": ["bs-Latn-BA", "bs-Cyrl-BA", "bs-Latn", "bs"],
		"bs-Latn": ["bs-Latn-BA", "bs-Cyrl-BA", "bs-Cyrl", "bs"],
		"sr-Cyrl": ["sr-Latn-CS", "sr-Cyrl-CS", "sr-Latn-BA", "sr-Cyrl-BA", "sr-Latn-RS", "sr-Cyrl-RS", "sr-Latn-ME", "sr-Cyrl-ME", "sr-Latn", "sr"],
		"sr-Latn": ["sr-Latn-CS", "sr-Cyrl-CS", "sr-Latn-BA", "sr-Cyrl-BA", "sr-Latn-RS", "sr-Cyrl-RS", "sr-Latn-ME", "sr-Cyrl-ME", "sr-Cyrl", "sr"],
		"zh": ["zh-Hans", "zh-TW", "zh-CN", "zh-HK", "zh-SG", "zh-MO", "zh-Hant", "zh-CHS", "zh-CHT"],
		"bs": ["bs-Latn-BA", "bs-Cyrl-BA", "bs-Cyrl", "bs-Latn"],
		"sma": ["sma-NO", "sma-SE"],
		"sr": ["sr-Latn-CS", "sr-Cyrl-CS", "sr-Latn-BA", "sr-Cyrl-BA", "sr-Latn-RS", "sr-Cyrl-RS", "sr-Latn-ME", "sr-Cyrl-ME", "sr-Cyrl", "sr-Latn"],
		"smj": ["smj-NO", "smj-SE"]
	}
	/** A list of cultures, key is ISO language code, value is the corresponding text,
	 * @static
	 * @type {{"ky-KG": string, "iu-Cans-CA": string, ps: string, pt: string, fil: string, "es-BO": string, "ar-SY": string, "ta-IN": string, "iu-Latn-CA": string, "uz-Latn-UZ": string, "hr-BA": string, "sr-Latn-BA": string, "el-GR": string, "sr-Latn-RS": string, "zh-Hans": string, "nl-NL": string, "gd-GB": string, "zh-Hant": string, "zu-ZA": string, "en-AU": string, "he-IL": string, "mk-MK": string, "syr-SY": string, "ar-TN": string, "tg-Cyrl-TJ": string, "hu-HU": string, "ml-IN": string, af: string, "arn-CL": string, "es-SV": string, "tt-RU": string, "es-CR": string, am: string, "es-CL": string, "es-CO": string, ar: string, as: string, "pt-PT": string, "ar-EG": string, "bs-Latn": string, "cy-GB": string, az: string, "ar-DZ": string, "en-SG": string, rm: string, "fil-PH": string, ro: string, "en-BZ": string, ba: string, "nb-NO": string, "sr-Latn-CS": string, ru: string, be: string, bg: string, rw: string, "es-PR": string, "zh-MO": string, "af-ZA": string, bn: string, "es-PY": string, bo: string, sa: string, br: string, bs: string, se: string, si: string, sk: string, sl: string, arn: string, "en-PH": string, ca: string, sq: string, sr: string, "az-Cyrl": string, sv: string, "iu-Latn": string, sw: string, "ko-KR": string, "co-FR": string, "iu-Cans": string, "tzm-Latn": string, co: string, ta: string, "sma-NO": string, "ha-Latn-NG": string, cs: string, "ps-AF": string, te: string, "ru-RU": string, tg: string, "bo-CN": string, "qut-GT": string, th: string, "es-AR": string, cy: string, tk: string, "mn-Mong-CN": string, "mr-IN": string, "am-ET": string, tn: string, "da-DK": string, "az-Cyrl-AZ": string, da: string, tr: string, tt: string, "gsw-FR": string, de: string, "lv-LV": string, "sr-Cyrl-ME": string, "nl-BE": string, "zh-CHT": string, "ha-Latn": string, "te-IN": string, "en-MY": string, "zh-CHS": string, dv: string, ug: string, uk: string, "hi-IN": string, ur: string, "se-FI": string, "de-CH": string, uz: string, "ka-GE": string, tzm: string, el: string, "ar-QA": string, en: string, es: string, "hsb-DE": string, "nn-NO": string, et: string, eu: string, prs: string, "rw-RW": string, "es-PE": string, "fa-IR": string, "en-NZ": string, vi: string, "es-PA": string, hsb: string, "nso-ZA": string, "tr-TR": string, fa: string, "fr-FR": string, "vi-VN": string, fi: string, "kl-GL": string, "bs-Cyrl-BA": string, fo: string, "moh-CA": string, "ar-AE": string, fr: string, "sl-SI": string, syr: string, qut: string, "si-LK": string, "sah-RU": string, fy: string, "pa-IN": string, quz: string, "fr-CH": string, wo: string, ga: string, "tg-Cyrl": string, gd: string, "ar-SA": string, "de-DE": string, gl: string, "zh-HK": string, "pt-BR": string, "sv-FI": string, "kk-KZ": string, "ar-BH": string, "uz-Cyrl-UZ": string, gu: string, "es-MX": string, xh: string, "it-IT": string, "br-FR": string, "uz-Latn": string, "sma-SE": string, "bn-BD": string, "id-ID": string, ha: string, he: string, "es-NI": string, "th-TH": string, "ba-RU": string, hi: string, "en-IE": string, "ar-KW": string, moh: string, "ms-MY": string, "en-IN": string, hr: string, gsw: string, "en-ZA": string, "yo-NG": string, hu: string, hy: string, yo: string, "az-Latn-AZ": string, "ar-LB": string, id: string, "tk-TM": string, ig: string, "or-IN": string, ii: string, "en-ZW": string, "ar-LY": string, "ug-CN": string, "en-JM": string, is: string, it: string, "as-IN": string, iu: string, "oc-FR": string, "fy-NL": string, "eu-ES": string, "se-SE": string, "fr-CA": string, "sr-Cyrl-BA": string, zh: string, "en-029": string, "quz-PE": string, "smj-NO": string, "sr-Cyrl-RS": string, "pl-PL": string, "fr-BE": string, ja: string, "ga-IE": string, zu: string, "ar-MA": string, "ig-NG": string, "es-HN": string, "hr-HR": string, sma: string, nso: string, "gl-ES": string, "rm-CH": string, "de-AT": string, "is-IS": string, smj: string, smn: string, ka: string, sms: string, "bg-BG": string, "prs-AF": string, "cs-CZ": string, "lb-LU": string, kk: string, kl: string, km: string, kn: string, ko: string, "bs-Latn-BA": string, "zh-TW": string, "sk-SK": string, "sr-Latn-ME": string, ky: string, "ar-OM": string, "sr-Cyrl": string, "sq-AL": string, "dv-MV": string, lb: string, "sv-SE": string, "uz-Cyrl": string, "mn-MN": string, "uk-UA": string, "smj-SE": string, lo: string, "en-US": string, "gu-IN": string, "sa-IN": string, kok: string, lt: string, "quz-EC": string, lv: string, "zh-CN": string, "ur-PK": string, "hy-AM": string, mi: string, "fo-FO": string, mk: string, "ja-JP": string, ml: string, "se-NO": string, mn: string, "ar-YE": string, "ne-NP": string, mr: string, ms: string, mt: string, "es-GT": string, "mn-Cyrl": string, "smn-FI": string, "mi-NZ": string, "wo-SN": string, "be-BY": string, dsb: string, "ro-RO": string, "zh-SG": string, nb: string, "bs-Cyrl": string, ne: string, "mt-MT": string, "et-EE": string, "it-CH": string, nl: string, "km-KH": string, "en-GB": string, "fi-FI": string, "ii-CN": string, nn: string, no: string, "en-CA": string, "sms-FI": string, "lt-LT": string, "es-DO": string, "tn-ZA": string, "kok-IN": string, "ar-IQ": string, "bn-IN": string, oc: string, "quz-BO": string, "kn-IN": string, "es-EC": string, "es-US": string, "lo-LA": string, sah: string, "sr-Cyrl-CS": string, "tzm-Latn-DZ": string, "ca-ES": string, or: string, "en-TT": string, "de-LI": string, "fr-MC": string, "ms-BN": string, "es-UY": string, "sw-KE": string, "es-ES": string, "es-VE": string, "ar-JO": string, "az-Latn": string, "xh-ZA": string, "sr-Latn": string, pa: string, "de-LU": string, "fr-LU": string, pl: string, "mn-Mong": string, "dsb-DE": string}}
	 */
	static LIDS_CULTURES = {
		"ar": "العربية",
		"bg": "Български",
		"ca": "Català",
		"zh-Hans": "中文(简体)",
		"cs": "Čeština",
		"da": "Dansk",
		"de": "Deutsch",
		"el": "Ελληνικά",
		"en": "English",
		"es": "Español",
		"fi": "Suomi",
		"fr": "Français",
		"he": "עברית",
		"hu": "Magyar",
		"is": "Íslenska",
		"it": "Italiano",
		"ja": "日本語",
		"ko": "한국어",
		"nl": "Nederlands",
		"no": "Norsk",
		"pl": "Polski",
		"pt": "Português",
		"rm": "Rumantsch",
		"ro": "Română",
		"ru": "Русский",
		"hr": "Hrvatski",
		"sk": "Slovenčina",
		"sq": "Shqipe",
		"sv": "Svenska",
		"th": "ไทย",
		"tr": "Türkçe",
		"ur": "اُردو",
		"id": "Bahasa Indonesia",
		"uk": "Українська",
		"be": "Беларускі",
		"sl": "Slovenski",
		"et": "Eesti",
		"lv": "Latviešu",
		"lt": "Lietuvių",
		"tg": "Тоҷикӣ",
		"fa": "فارسى",
		"vi": "Tiếng Việt",
		"hy": "Հայերեն",
		"az": "Azərbaycan­ılı",
		"eu": "Euskara",
		"hsb": "Hornjoserbšćina",
		"mk": "Македонски јазик",
		"tn": "Setswana",
		"xh": "IsiXhosa",
		"zu": "IsiZulu",
		"af": "Afrikaans",
		"ka": "ქართული",
		"fo": "Føroyskt",
		"hi": "हिंदी",
		"mt": "Malti",
		"se": "Davvisámegiella",
		"ga": "Gaeilge",
		"ms": "Bahasa Melayu",
		"kk": "Қазақ",
		"ky": "Кыргыз",
		"sw": "Kiswahili",
		"tk": "Türkmençe",
		"uz": "U'zbek",
		"tt": "Татар",
		"bn": "বাংলা",
		"pa": "ਪੰਜਾਬੀ",
		"gu": "ગુજરાતી",
		"or": "ଓଡ଼ିଆ",
		"ta": "தமிழ்",
		"te": "తెలుగు",
		"kn": "ಕನ್ನಡ",
		"ml": "മലയാളം",
		"as": "অসমীয়া",
		"mr": "मराठी",
		"sa": "संस्कृत",
		"mn": "Монгол хэл",
		"bo": "བོད་ཡིག",
		"cy": "Cymraeg",
		"km": "ខ្មែរ",
		"lo": "ລາວ",
		"gl": "Galego",
		"kok": "कोंकणी",
		"syr": "ܣܘܪܝܝܐ",
		"si": "සිංහල",
		"iu": "Inuktitut",
		"am": "አማርኛ",
		"tzm": "Tamazight",
		"ne": "नेपाली",
		"fy": "Frysk",
		"ps": "پښتو",
		"fil": "Filipino",
		"dv": "ދިވެހިބަސް",
		"ha": "Hausa",
		"yo": "Yoruba",
		"quz": "Runasimi",
		"nso": "Sesotho sa Leboa",
		"ba": "Башҡорт",
		"lb": "Lëtzebuergesch",
		"kl": "Kalaallisut",
		"ig": "Igbo",
		"ii": "ꆈꌠꁱꂷ",
		"arn": "Mapudungun",
		"moh": "Kanien'kéha",
		"br": "Brezhoneg",
		"ug": "ئۇيغۇرچە",
		"mi": "Reo Māori",
		"oc": "Occitan",
		"co": "Corsu",
		"gsw": "Elsässisch",
		"sah": "Саха",
		"qut": "K'iche",
		"rw": "Kinyarwanda",
		"wo": "Wolof",
		"prs": "درى",
		"gd": "Gàidhlig",
		"ar-SA": "العربية (المملكة العربية السعودية)",
		"bg-BG": "Български (България)",
		"ca-ES": "Català (català)",
		"zh-TW": "中文(台灣)",
		"cs-CZ": "Čeština (Česká republika)",
		"da-DK": "Dansk (Danmark)",
		"de-DE": "Deutsch (Deutschland)",
		"el-GR": "Ελληνικά (Ελλάδα)",
		"en-US": "English (United States)",
		"fi-FI": "Suomi (Suomi)",
		"fr-FR": "Français (France)",
		"he-IL": "עברית (ישראל)",
		"hu-HU": "Magyar (Magyarország)",
		"is-IS": "Íslenska (Ísland)",
		"it-IT": "Italiano (Italia)",
		"ja-JP": "日本語 (日本)",
		"ko-KR": "한국어 (대한민국)",
		"nl-NL": "Nederlands (Nederland)",
		"nb-NO": "Norsk, bokmål (Norge)",
		"pl-PL": "Polski (Polska)",
		"pt-BR": "Português (Brasil)",
		"rm-CH": "Rumantsch (Svizra)",
		"ro-RO": "Română (România)",
		"ru-RU": "Русский (Россия)",
		"hr-HR": "Hrvatski (Hrvatska)",
		"sk-SK": "Slovenčina (Slovenská republika)",
		"sq-AL": "Shqipe (Shqipëria)",
		"sv-SE": "Svenska (Sverige)",
		"th-TH": "ไทย (ไทย)",
		"tr-TR": "Türkçe (Türkiye)",
		"ur-PK": "اُردو (پاکستان)",
		"id-ID": "Bahasa Indonesia (Indonesia)",
		"uk-UA": "Українська (Україна)",
		"be-BY": "Беларускі (Беларусь)",
		"sl-SI": "Slovenski (Slovenija)",
		"et-EE": "Eesti (Eesti)",
		"lv-LV": "Latviešu (Latvija)",
		"lt-LT": "Lietuvių (Lietuva)",
		"tg-Cyrl-TJ": "Тоҷикӣ (Тоҷикистон)",
		"fa-IR": "فارسى (ایران)",
		"vi-VN": "Tiếng Việt (Việt Nam)",
		"hy-AM": "Հայերեն (Հայաստան)",
		"az-Latn-AZ": "Azərbaycan­ılı (Azərbaycan)",
		"eu-ES": "Euskara (euskara)",
		"hsb-DE": "Hornjoserbšćina (Němska)",
		"mk-MK": "Македонски јазик (Македонија)",
		"tn-ZA": "Setswana (Aforika Borwa)",
		"xh-ZA": "IsiXhosa (uMzantsi Afrika)",
		"zu-ZA": "IsiZulu (iNingizimu Afrika)",
		"af-ZA": "Afrikaans (Suid Afrika)",
		"ka-GE": "ქართული (საქართველო)",
		"fo-FO": "Føroyskt (Føroyar)",
		"hi-IN": "हिंदी (भारत)",
		"mt-MT": "Malti (Malta)",
		"se-NO": "Davvisámegiella (Norga)",
		"ms-MY": "Bahasa Melayu (Malaysia)",
		"kk-KZ": "Қазақ (Қазақстан)",
		"ky-KG": "Кыргыз (Кыргызстан)",
		"sw-KE": "Kiswahili (Kenya)",
		"tk-TM": "Türkmençe (Türkmenistan)",
		"uz-Latn-UZ": "U'zbek (U'zbekiston Respublikasi)",
		"tt-RU": "Татар (Россия)",
		"bn-IN": "বাংলা (ভারত)",
		"pa-IN": "ਪੰਜਾਬੀ (ਭਾਰਤ)",
		"gu-IN": "ગુજરાતી (ભારત)",
		"or-IN": "ଓଡ଼ିଆ (ଭାରତ)",
		"ta-IN": "தமிழ் (இந்தியா)",
		"te-IN": "తెలుగు (భారత దేశం)",
		"kn-IN": "ಕನ್ನಡ (ಭಾರತ)",
		"ml-IN": "മലയാളം (ഭാരതം)",
		"as-IN": "অসমীয়া (ভাৰত)",
		"mr-IN": "मराठी (भारत)",
		"sa-IN": "संस्कृत (भारतम्)",
		"mn-MN": "Монгол хэл (Монгол улс)",
		"bo-CN": "བོད་ཡིག (ཀྲུང་ཧྭ་མི་དམངས་སྤྱི་མཐུན་རྒྱལ་ཁབ།)",
		"cy-GB": "Cymraeg (y Deyrnas Unedig)",
		"km-KH": "ខ្មែរ (កម្ពុជា)",
		"lo-LA": "ລາວ (ສ.ປ.ປ. ລາວ)",
		"gl-ES": "Galego (galego)",
		"kok-IN": "कोंकणी (भारत)",
		"syr-SY": "ܣܘܪܝܝܐ (سوريا)",
		"si-LK": "සිංහල (ශ්‍රී ලංකා)",
		"iu-Cans-CA": "ᐃᓄᒃᑎᑐᑦ (ᑲᓇᑕᒥ)",
		"am-ET": "አማርኛ (ኢትዮጵያ)",
		"ne-NP": "नेपाली (नेपाल)",
		"fy-NL": "Frysk (Nederlân)",
		"ps-AF": "پښتو (افغانستان)",
		"fil-PH": "Filipino (Pilipinas)",
		"dv-MV": "ދިވެހިބަސް (ދިވެހި ރާއްޖެ)",
		"ha-Latn-NG": "Hausa (Nigeria)",
		"yo-NG": "Yoruba (Nigeria)",
		"quz-BO": "Runasimi (Qullasuyu)",
		"nso-ZA": "Sesotho sa Leboa (Afrika Borwa)",
		"ba-RU": "Башҡорт (Россия)",
		"lb-LU": "Lëtzebuergesch (Luxembourg)",
		"kl-GL": "Kalaallisut (Kalaallit Nunaat)",
		"ig-NG": "Igbo (Nigeria)",
		"ii-CN": "ꆈꌠꁱꂷ (ꍏꉸꏓꂱꇭꉼꇩ)",
		"arn-CL": "Mapudungun (Chile)",
		"moh-CA": "Kanien'kéha",
		"br-FR": "Brezhoneg (Frañs)",
		"ug-CN": "ئۇيغۇرچە (جۇڭخۇا خەلق جۇمھۇرىيىتى)",
		"mi-NZ": "Reo Māori (Aotearoa)",
		"oc-FR": "Occitan (França)",
		"co-FR": "Corsu (France)",
		"gsw-FR": "Elsässisch (Frànkrisch)",
		"sah-RU": "Саха (Россия)",
		"qut-GT": "K'iche (Guatemala)",
		"rw-RW": "Kinyarwanda (Rwanda)",
		"wo-SN": "Wolof (Sénégal)",
		"prs-AF": "درى (افغانستان)",
		"gd-GB": "Gàidhlig (An Rìoghachd Aonaichte)",
		"ar-IQ": "العربية (العراق)",
		"zh-CN": "中文(中华人民共和国)",
		"de-CH": "Deutsch (Schweiz)",
		"en-GB": "English (United Kingdom)",
		"es-MX": "Español (México)",
		"fr-BE": "Français (Belgique)",
		"it-CH": "Italiano (Svizzera)",
		"nl-BE": "Nederlands (België)",
		"nn-NO": "Norsk, nynorsk (Noreg)",
		"pt-PT": "Português (Portugal)",
		"sr-Latn-CS": "Srpski (Srbija i Crna Gora (Prethodno))",
		"sv-FI": "Svenska (Finland)",
		"az-Cyrl-AZ": "Азәрбајҹан (Азәрбајҹан)",
		"dsb-DE": "Dolnoserbšćina (Nimska)",
		"se-SE": "Davvisámegiella (Ruoŧŧa)",
		"ga-IE": "Gaeilge (Éire)",
		"ms-BN": "Bahasa Melayu (Brunei Darussalam)",
		"uz-Cyrl-UZ": "Ўзбек (Ўзбекистон)",
		"bn-BD": "বাংলা (বাংলাদেশ)",
		"mn-Mong-CN": "ᠮᠤᠨᠭᠭᠤᠯ ᠬᠡᠯᠡ (ᠪᠦᠭᠦᠳᠡ ᠨᠠᠢᠷᠠᠮᠳᠠᠬᠤ ᠳᠤᠮᠳᠠᠳᠤ ᠠᠷᠠᠳ ᠣᠯᠣᠰ)",
		"iu-Latn-CA": "Inuktitut (Kanatami)",
		"tzm-Latn-DZ": "Tamazight (Djazaïr)",
		"quz-EC": "Runasimi (Ecuador)",
		"ar-EG": "العربية (مصر)",
		"zh-HK": "中文(香港特別行政區)",
		"de-AT": "Deutsch (Österreich)",
		"en-AU": "English (Australia)",
		"es-ES": "Español (España)",
		"fr-CA": "Français (Canada)",
		"sr-Cyrl-CS": "Српски (Србија и Црна Гора (Претходно))",
		"se-FI": "Davvisámegiella (Suopma)",
		"quz-PE": "Runasimi (Piruw)",
		"ar-LY": "العربية (ليبيا)",
		"zh-SG": "中文(新加坡)",
		"de-LU": "Deutsch (Luxemburg)",
		"en-CA": "English (Canada)",
		"es-GT": "Español (Guatemala)",
		"fr-CH": "Français (Suisse)",
		"hr-BA": "Hrvatski (Bosna i Hercegovina)",
		"smj-NO": "Julevusámegiella (Vuodna)",
		"ar-DZ": "العربية (الجزائر)",
		"zh-MO": "中文(澳門特別行政區)",
		"de-LI": "Deutsch (Liechtenstein)",
		"en-NZ": "English (New Zealand)",
		"es-CR": "Español (Costa Rica)",
		"fr-LU": "Français (Luxembourg)",
		"bs-Latn-BA": "Bosanski (Bosna i Hercegovina)",
		"smj-SE": "Julevusámegiella (Svierik)",
		"ar-MA": "العربية (المملكة المغربية)",
		"en-IE": "English (Ireland)",
		"es-PA": "Español (Panamá)",
		"fr-MC": "Français (Principauté de Monaco)",
		"sr-Latn-BA": "Srpski (Bosna i Hercegovina)",
		"sma-NO": "Åarjelsaemiengiele (Nöörje)",
		"ar-TN": "العربية (تونس)",
		"en-ZA": "English (South Africa)",
		"es-DO": "Español (República Dominicana)",
		"sr-Cyrl-BA": "Српски (Босна и Херцеговина)",
		"sma-SE": "Åarjelsaemiengiele (Sveerje)",
		"ar-OM": "العربية (عمان)",
		"en-JM": "English (Jamaica)",
		"es-VE": "Español (Republica Bolivariana de Venezuela)",
		"bs-Cyrl-BA": "Босански (Босна и Херцеговина)",
		"sms-FI": "Sääm´ǩiõll (Lää´ddjânnam)",
		"ar-YE": "العربية (اليمن)",
		"en-029": "English (Caribbean)",
		"es-CO": "Español (Colombia)",
		"sr-Latn-RS": "Srpski (Srbija)",
		"smn-FI": "Sämikielâ (Suomâ)",
		"ar-SY": "العربية (سوريا)",
		"en-BZ": "English (Belize)",
		"es-PE": "Español (Perú)",
		"sr-Cyrl-RS": "Српски (Србија)",
		"ar-JO": "العربية (الأردن)",
		"en-TT": "English (Trinidad y Tobago)",
		"es-AR": "Español (Argentina)",
		"sr-Latn-ME": "Srpski (Crna Gora)",
		"ar-LB": "العربية (لبنان)",
		"en-ZW": "English (Zimbabwe)",
		"es-EC": "Español (Ecuador)",
		"sr-Cyrl-ME": "Српски (Црна Гора)",
		"ar-KW": "العربية (الكويت)",
		"en-PH": "English (Philippines)",
		"es-CL": "Español (Chile)",
		"ar-AE": "العربية (الإمارات العربية المتحدة)",
		"es-UY": "Español (Uruguay)",
		"ar-BH": "العربية (البحرين)",
		"es-PY": "Español (Paraguay)",
		"ar-QA": "العربية (قطر)",
		"en-IN": "English (India)",
		"es-BO": "Español (Bolivia)",
		"en-MY": "English (Malaysia)",
		"es-SV": "Español (El Salvador)",
		"en-SG": "English (Singapore)",
		"es-HN": "Español (Honduras)",
		"es-NI": "Español (Nicaragua)",
		"es-PR": "Español (Puerto Rico)",
		"es-US": "Español (Estados Unidos)",
		"bs-Cyrl": "Босански",
		"bs-Latn": "Bosanski",
		"sr-Cyrl": "Српски",
		"sr-Latn": "Srpski",
		"smn": "Sämikielâ",
		"az-Cyrl": "Азәрбајҹан дили",
		"sms": "Sääm´ǩiõll",
		"zh": "中文",
		"nn": "Norsk (nynorsk)",
		"bs": "Bosanski",
		"az-Latn": "Azərbaycan­ılı",
		"sma": "Åarjelsaemiengiele",
		"uz-Cyrl": "Ўзбек",
		"mn-Cyrl": "Монгол хэл",
		"iu-Cans": "ᐃᓄᒃᑎᑐᑦ",
		"zh-Hant": "中文(繁體)",
		"nb": "Norsk (bokmål)",
		"sr": "Srpski",
		"tg-Cyrl": "Тоҷикӣ",
		"dsb": "Dolnoserbšćina",
		"smj": "Julevusámegiella",
		"uz-Latn": "U'zbek",
		"mn-Mong": "ᠮᠤᠨᠭᠭᠤᠯ ᠬᠡᠯᠡ",
		"iu-Latn": "Inuktitut",
		"tzm-Latn": "Tamazight",
		"ha-Latn": "Hausa",
		"zh-CHS": "中文(简体) 旧版",
		"zh-CHT": "中文(繁體) 舊版"
	}
	/** A list of write directions.
	 * @static
	 * @type {Array}
	 */
	static LIDS_RTL = ["ar", "he", "ur", "fa", "syr", "ps", "dv", "ug", "prs", "ar-SA", "he-IL", "ur-PK", "fa-IR", "syr-SY", "ps-AF", "dv-MV", "ug-CN", "prs-AF", "ar-IQ", "ar-EG", "ar-LY", "ar-DZ", "ar-MA", "ar-TN", "ar-OM", "ar-YE", "ar-SY", "ar-JO", "ar-LB", "ar-KW", "ar-AE", "ar-BH", "ar-QA"];
	/** A list to map localizations.
	 * @static
	 * @type {Object}
	 */
	static LIDS_MAPS = {
		"pt-PT": ["pt-BR", "es-ES"],
		"pt-BR": ["pt-PT", "es-ES"],
		"es-AR": ["es-MX", "es-BO", "es-CL", "es-CR", "es-DO", "es-EC", "es-GT", "es-HN", "es-NI", "es-PA", "es-PE", "es-PR", "es-PY", "es-SV", "es-US", "es-UY", "es-VE", "es-ES"],
		"es-BO": ["es-MX", "es-AR", "es-BO", "es-CL", "es-CR", "es-DO", "es-EC", "es-GT", "es-HN", "es-NI", "es-PA", "es-PE", "es-PR", "es-PY", "es-SV", "es-US", "es-UY", "es-VE", "es-ES"],
		"es-CL": ["es-MX", "es-AR", "es-BO", "es-CR", "es-DO", "es-EC", "es-GT", "es-HN", "es-NI", "es-PA", "es-PE", "es-PR", "es-PY", "es-SV", "es-US", "es-UY", "es-VE", "es-ES"],
		"es-CR": ["es-MX", "es-AR", "es-BO", "es-CL", "es-DO", "es-EC", "es-GT", "es-HN", "es-NI", "es-PA", "es-PE", "es-PR", "es-PY", "es-SV", "es-US", "es-UY", "es-VE", "es-ES"],
		"es-DO": ["es-MX", "es-AR", "es-BO", "es-CL", "es-CR", "es-EC", "es-GT", "es-HN", "es-NI", "es-PA", "es-PE", "es-PR", "es-PY", "es-SV", "es-US", "es-UY", "es-VE", "es-ES"],
		"es-EC": ["es-MX", "es-AR", "es-BO", "es-CL", "es-CR", "es-DO", "es-GT", "es-HN", "es-NI", "es-PA", "es-PE", "es-PR", "es-PY", "es-SV", "es-US", "es-UY", "es-VE", "es-ES"],
		"es-GT": ["es-MX", "es-AR", "es-BO", "es-CL", "es-CR", "es-DO", "es-EC", "es-HN", "es-NI", "es-PA", "es-PE", "es-PR", "es-PY", "es-SV", "es-US", "es-UY", "es-VE", "es-ES"],
		"es-HN": ["es-MX", "es-AR", "es-BO", "es-CL", "es-CR", "es-DO", "es-EC", "es-GT", "es-NI", "es-PA", "es-PE", "es-PR", "es-PY", "es-SV", "es-US", "es-UY", "es-VE", "es-ES"],
		"es-MX": ["es-AR", "es-BO", "es-CL", "es-CR", "es-DO", "es-EC", "es-GT", "es-HN", "es-NI", "es-PA", "es-PE", "es-PR", "es-PY", "es-SV", "es-US", "es-UY", "es-VE", "es-ES"],
		"es-NI": ["es-MX", "es-AR", "es-BO", "es-CL", "es-CR", "es-DO", "es-EC", "es-GT", "es-HN", "es-NI", "es-PA", "es-PE", "es-PR", "es-PY", "es-SV", "es-US", "es-UY", "es-VE", "es-ES"],
		"es-PA": ["es-MX", "es-AR", "es-BO", "es-CL", "es-CR", "es-DO", "es-EC", "es-GT", "es-HN", "es-NI", "es-PE", "es-PR", "es-PY", "es-SV", "es-US", "es-UY", "es-VE", "es-ES"],
		"es-PE": ["es-MX", "es-AR", "es-BO", "es-CL", "es-CR", "es-DO", "es-EC", "es-GT", "es-HN", "es-NI", "es-PA", "es-PR", "es-PY", "es-SV", "es-US", "es-UY", "es-VE", "es-ES"],
		"es-PR": ["es-MX", "es-AR", "es-BO", "es-CL", "es-CR", "es-DO", "es-EC", "es-GT", "es-HN", "es-NI", "es-PA", "es-PE", "es-PY", "es-SV", "es-US", "es-UY", "es-VE", "es-ES"],
		"es-PY": ["es-MX", "es-AR", "es-BO", "es-CL", "es-CR", "es-DO", "es-EC", "es-GT", "es-HN", "es-NI", "es-PA", "es-PE", "es-PR", "es-SV", "es-US", "es-UY", "es-VE", "es-ES"],
		"es-SV": ["es-MX", "es-AR", "es-BO", "es-CL", "es-CR", "es-DO", "es-EC", "es-GT", "es-HN", "es-NI", "es-PA", "es-PE", "es-PR", "es-PY", "es-US", "es-UY", "es-VE", "es-ES"],
		"es-US": ["es-MX", "es-AR", "es-BO", "es-CL", "es-CR", "es-DO", "es-EC", "es-GT", "es-HN", "es-NI", "es-PA", "es-PE", "es-PR", "es-PY", "es-SV", "es-UY", "es-VE", "es-ES"],
		"es-UY": ["es-MX", "es-AR", "es-BO", "es-CL", "es-CR", "es-DO", "es-EC", "es-GT", "es-HN", "es-NI", "es-PA", "es-PE", "es-PR", "es-PY", "es-SV", "es-US", "es-VE", "es-ES"],
		"es-VE": ["es-MX", "es-AR", "es-BO", "es-CL", "es-CR", "es-DO", "es-EC", "es-GT", "es-HN", "es-NI", "es-PA", "es-PE", "es-PR", "es-PY", "es-SV", "es-US", "es-UY", "es-ES"],
		"zh-CHS": ["zh-CN"],
		"zh-CHT": ["zh-CHS", "zh-CN"],
		"zh-HK": ["zh-CHS", "zh-CN"],
		"zh-Hans": ["zh-CHS", "zh-CN"],
		"zh-Hant": ["zh-CHT", "zh-CHS", "zh-CN"],
		"zh-MO": ["zh-CHS", "zh-CN"],
		"zh-SG": ["zh-CHS", "zh-CN"],
		"zh-TW": ["zh-CHS", "zh-CN"],
		"az-Latn-AZ": ["az-AZ"],
		"ky-KG": ["ky-KZ"],
		"ar-IQ": ["ar-SA"],
		"de-CH": ["de-DE"],
		"fr-BE": ["fr-FR"],
		"it-CH": ["it-IT"],
		"nl-BE": ["nl-NL"],
		"sr-Latn-CS": ["sr-SP"],
		"sv-FI": ["sv-SE"],
		"az-Cyrl-AZ": ["az-AZ"],
		"ms-BN": ["ms-MY"],
		"mn-Mong-CN": ["mn-MN"],
		"ar-EG": ["ar-SA"],
		"de-AT": ["de-DE"],
		"en-AU": ["en-GB", "en-US"],
		"fr-CA": ["fr-FR"],
		"sr-Cyrl-CS": ["sr-SP"],
		"ar-LY": ["ar-SA"],
		"de-LU": ["de-DE"],
		"en-CA": ["en-GB", "en-US"],
		"fr-CH": ["fr-FR"],
		"hr-BA": ["hr-HR"],
		"ar-DZ": ["ar-SA"],
		"de-LI": ["de-DE"],
		"en-NZ": ["en-GB", "en-US"],
		"fr-LU": ["fr-FR"],
		"ar-MA": ["ar-SA"],
		"en-IE": ["en-GB", "en-US"],
		"fr-MC": ["fr-FR"],
		"sr-Latn-BA": ["sr-SP"],
		"ar-TN": ["ar-SA"],
		"en-ZA": ["en-GB", "en-US"],
		"sr-Cyrl-BA": ["sr-SP"],
		"ar-OM": ["ar-SA"],
		"en-JM": ["en-GB", "en-US"],
		"ar-YE": ["ar-SA"],
		"en-US": ["en-GB", "en-US"],
		"en-GB": ["en-GB", "en-US"],
		"es-CO": ["es-ES"],
		"sr-Latn-RS": ["sr-SP"],
		"ar-SY": ["ar-SA"],
		"en-BZ": ["en-GB", "en-US"],
		"sr-Cyrl-RS": ["sr-SP"],
		"ar-JO": ["ar-SA"],
		"en-TT": ["en-GB", "en-US"],
		"sr-Latn-ME": ["sr-SP"],
		"ar-LB": ["ar-SA"],
		"en-ZW": ["en-GB", "en-US"],
		"sr-Cyrl-ME": ["sr-SP"],
		"ar-KW": ["ar-SA"],
		"en-PH": ["en-GB", "en-US"],
		"ar-AE": ["ar-SA"],
		"ar-BH": ["ar-SA"],
		"ar-QA": ["ar-SA"],
		"en-IN": ["en-GB", "en-US"],
		"en-MY": ["en-GB", "en-US"],
		"en-SG": ["en-GB", "en-US"],
		"sr-Cyrl": ["sr-SP"],
		"sr-Latn": ["sr-SP"],
		"az-Cyrl": ["az-AZ"],
		"az-Latn": ["az-AZ"],
		"mn-Cyrl": ["mn-MN"],
		"mn-Mong": ["mn-MN"]
	}

	/** Returns the language code (ISO-639) of a given localization id.
	 * @method language
	 * @static
	 * @param _lid  The localization id where to get the language code.
	 * @returns {string}    The language code (ISO-639).
	 */
	static language = function (_lid) {
		return _lid.split("-")[0];
	}

	/** Returns the country code (ISO-3166) of a given localization id.
	 * @method country
	 * @static
	 * @param _lid  The localization id where to get the country code.
	 * @returns {string}    The country code (ISO-3166).
	 */
	static country = function (_lid) {
		return _lid.split("-")[1];
	}

	/** Returns the main localization id (ISO-639 + ISO-3166) of a given localization id.
	 * @method mainCultureLid
	 * @static
	 * @param _lid  The localization id where to get the main localization code.
	 * @returns {string}    The main localization code (ISO-3166 + ISO-3166, e.g. "de-DE").
	 * @example
	 * i18x.mainCultureLid("de-AT");
	 * // Result "de-DE"
	 */
	static mainCultureLid = function (_lid) {
		var language = i18x.language(_lid);
		if (i18x.LIDS_MAIN_CULTURES.hasOwnProperty(language)) return language + "-" + i18x.LIDS_MAIN_CULTURES[language];
		return language;
	}

	/** Looks for the best available localization id for a given localization id.
	 * @method bestAvailableLid
	 * @static
	 * @param _wantedLid        {string}  The localization id to want.
	 * @param _availableLids    {object}   Optional, object with all available localization ids (key=id,value=description), default are the system given localizations.
	 * @return {string}    The best available localization id.
	 *
	 * @example
	 *  i18x.bestAvailableLid("pt-BR",{"en-US":"English (United States)","pt-PT":"Português (Portugal)"});
	 * // Result "pt-PT"
	 */
	static bestAvailableLid = function (_wantedLid, _availableLids = i18x.availableLids) {
		if (_availableLids.hasOwnProperty(_wantedLid)) return _wantedLid;
		if (i18x.LIDS_MAPS.hasOwnProperty(_wantedLid)) {
			let lidMap = i18x.LIDS_MAPS[_wantedLid], l, ll = lidMap.length;
			for (l = 0; l < ll; l++) if (_availableLids.hasOwnProperty(lidMap[l])) return lidMap[l];
		}
		let mainLid = i18x.mainCultureLid(_wantedLid);
		if (_availableLids.hasOwnProperty(mainLid)) return mainLid;
		if (_wantedLid == this.stdLid && _availableLids.hasOwnProperty(this.stdLid)) this.stdLid;
		return ObjectUtils.firstKey(_availableLids);
	}

	/** Get best available users localization id.
	 * @method userLid
	 * @static
	 * @returns {string|*}
	 */
	static userLid = function () {
		let lid = "auto";
		//#log("navigator.language "+navigator.language);
		lid = WebUtils.GetParameter("lid", "auto");
		if (lid == "auto") lid = localStorage.Get("lid", "auto", localStorage.LEVEL_APP)
		if (lid == "auto") lid = WebUtils.getCookie("lid", lid);
		if (lid == "auto") lid = i18x.browserLid();
		if (lid.indexOf("-") < 0) lid = i18x.mainCultureLid(lid);
		return lid;
	}


	/** Get best available browser based localization id.
	 * @method browserLid
	 * @static
	 * @returns {string|*}
	 */
	static browserLid = function () {
		let lid;
		lid = navigator.language;
		//#if(IS_SAFARI) if(bl.indexOf("-")) bl=bl.substr(0,2)+"-"+bl.substr(3,2).toUpperCase();
		if (lid.indexOf("-") < 0) lid = i18x.mainCultureLid(lid);
		return lid;
	}

	static createLid = function (_lid) {
		if (!i18x.i18xs.hasOwnProperty(_lid)) {
			i18x.lastHorDir = "ltr";
			i18x.lastVerDir = "ttb";
			i18x.i18xs[_lid] = {};
			i18x.i18xExpressions[_lid] = {};
			i18x.formats[_lid] = {};
			i18x.templates[_lid] = {};
		}
	}

	/** Loading the specified client localization.
	 * @method loadLid
	 * @static
	 * @param {string} _lid     The localization identifier to load.
	 * @return {void}
	 */
	static loadLid = function (_lid) {
		if (i18x.i18xs.hasOwnProperty(_lid)) return;
		//console.Log("Load LID: ", _lid);
		i18x.createLid(_lid);
		if (!i18x.availableLids.hasOwnProperty(_lid)) return;
		/*-- @<BUILD_ONLY_AT_RELEASES:Production ----
			ObjectUtils.mergeInto(JSON.loadSync(i18x.i18xFolder +"/prod/" + _lid + ".client.json?"), i18x.i18xs[_lid]);
			i18x.hyphens[_lid] = JSON.loadSync(i18x.i18xFolder + "/prod/" + _lid + ".hyphen.json");
		---- @>BUILD_ONLY_AT_RELEASES --*/
		/*-- @<BUILD_ONLY_AT_RELEASES:Test ----
			ObjectUtils.mergeInto(JSON.loadSync(i18x.i18xFolder +"/test/" + _lid + ".client.json?"), i18x.i18xs[_lid]);
			i18x.hyphens[_lid] = JSON.loadSync(i18x.i18xFolder + "/test/" + _lid + ".hyphen.json");
		---- @>BUILD_ONLY_AT_RELEASES --*/
		/*-- @<BUILD_NEVER_AT_RELEASES:Production,Test --*/
		ObjectUtils.mergeInto(JSON.loadSync(i18x.i18xFolder + "/dev/" + _lid + ".client.json"), i18x.i18xs[_lid]);
		i18x.hyphens[_lid] = JSON.loadSync(i18x.i18xFolder + "/dev/" + _lid + ".hyphen.json");
		/*-- @>BUILD_NEVER_AT_RELEASES --*/
		i18x.hypenCache[_lid] = {};
		for (let txt in i18x.i18xs[_lid]) if (txt.indexOf("<format") >= 0 || txt.indexOf("<template") >= 0) i18x.i18xs[_lid][txt].I18xRegister(_lid);
	}

	static setCurLid = function (_lid) {
		if (_lid == "auto") _lid = i18x.userLid();
		_lid = i18x.bestAvailableLid(_lid);
		i18x.curLid = _lid;
		if (!i18x.i18xs.hasOwnProperty(_lid)) i18x.loadLid(_lid);
	}

	static parse(_text, _filename = "") {
		let t = new Array(), r, i, l, s, parser, x, err, otext, suffix;
		suffix = _filename.suffix();
		switch (suffix) {
			case "php":
				otext = _text;
				_text = otext.str_replace("\r", "");
				_text = _text.str_replace("\n", "\\n");
				_text = _text.str_replace("\\\n", "\\n");
				//_text = _text.str_replace('""', '\\"');
				//console.Log(_text);
				s = /i18x\:\:(register|trans|rawTrans)\s*\(\s*\'([^\'\\]*(?:\\.[^\'\\]*)*)\'\s*(,|\))/mg;
				//while (r = s.exec(_text)) try { t.push(eval('"' + r[2] + '"')); } catch (err) { console.error("ParseError:" + err + ', "' + r[2] + '"') };
				while (r = s.exec(_text)) t.push(r[2]);
				s = /i18x\:\:(register|trans|rawTrans)\s*\(\s*\"([^\"\\]*(?:\\.[^\"\\]*)*)\"\s*(,|\))/mg;
				//while (r = s.exec(_text)) try { t.push(eval('"' + r[2] + '"')); } catch (err) { console.error("ParseError:" + err + ', "' + r[2] + '"') };
				while (r = s.exec(_text)) t.push(r[2]);

				l = t.length;
				//for(i=0;i<l;i++)console.Log("§§§§§§§§§ "+t[i].I18xKey());
				for (i = 0; i < l; i++) t[i] = t[i].replace(/\\\"/mg, "\"").replace(/\\\\n/mg, "\n").replace(/\\n/mg, "\n");
				for (i = 0; i < l; i++) t[i] = t[i].leftAlign();
				break;
			case "cs":
				otext = _text;
				_text = otext.str_replace("\r", "");
				_text = otext.str_replace("\n", "\\\n");
				_text = _text.str_replace("\\\n", "\\n");
				_text = _text.str_replace('""', '\\"');
				s = /i18x\.(Register|Trans|RawTrans)\s*\(\"([^\"\\]*(?:\\.[^\"\\]*)*)\"\s*(,|\))/mg;
				while (r = s.exec(_text)) try {
					t.push(eval('"' + r[2] + '"'));
				} catch (err) {
					console.error("ParseError at " + _filename);
					console.error(r);
					//console.error("ParseError:" + err.name + ',' + err.message + ', "' + r + '"' )
					//console.error("ParseError:" + err + ',"' + r[2] + '"');
				}
				s = /\"([^\"\\]*(?:\\.[^\"\\]*)*)\"\.i18x(Register|Trans|RawTrans)\(/mg;
				while (r = s.exec(_text)) try {
					t.push(eval('"' + r[1] + '"'));
				} catch (err) {
					console.error("ParseError at " + _filename);
					console.error(r);
					//console.error("ParseError:" + err.name + ',' + err.message + ', "' + r + '"' )
					//console.error("ParseError:" + err + ',"' + r[2] + '"');
				}

				//_text=otext.str_replace("\n","\\\n");
				//_text=_text.str_replace("\\\n","\\n");
				_text = otext.str_replace("\r", "");
				_text = _text.str_replace("\");\n", "\");♯\n");
				_text = _text.str_replace("\");\r", "\");♯\r");
				s = /i18x\.(Register|Trans|RawTrans)\s*\(\s*@\"(?:([^♯]*))\"\s*(,|\))/mg;
				while (r = s.exec(_text)) t.push(r[2].str_replace("\"\"", "\"").str_replace("\t", "").str_replace("\n", "").str_replace("\r", "").trim());

				l = t.length;
				for (i = 0; i < l; i++) t[i] = t[i].replace(/\\\r\n/mg, "\n").replace(/\\\r/mg, "\n").replace(/\\\n/mg, "\n");
				for (i = 0; i < l; i++) t[i] = t[i].leftAlign();
				//for(i=0;i<l;i++)log("========="+t[i].I18xKey());
				break;
			case "vue":
			case "json":
			case "cjs":
			case "mjs":
			case "js":
				otext = _text;
				_text = otext.str_replace("\r", "");
				_text = _text.str_replace("\\\n", "\\n");
				//console.Log(_text);
				s = /i18x\.(register|trans|rawTrans)\s*\(\s*\"([^\"\\]*(?:\\.[^\"\\]*)*)\"\s*(,|\))/mg;
				while (r = s.exec(_text)) try {
					t.push(eval('"' + r[2] + '"'));
				} catch (err) {
					console.error("ParseError:" + err + ',"' + r[2] + '"')
				}
				s = /i18x\.(register|trans|rawTrans)\s*\(\s*\'([^\'\\]*(?:\\.[^\'\\]*)*)\'\s*(,|\))/mg;
				while (r = s.exec(_text)) try {
					t.push(eval("'" + r[2] + "'"));
				} catch (err) {
					console.error("ParseError:" + err + ',"' + r[2] + '"')
				}
				s = /i18x\.(register|trans|rawTrans)\s*\(\s*\`([^\'\\]*(?:\\.[^\'\\]*)*)\`\s*(,|\))/mg;
				while (r = s.exec(_text)) try {
					t.push(eval("'" + r[2] + "'"));
				} catch (err) {
					console.error("ParseError:" + err + ',"' + r[2] + '"')
				}

				s = /\"([^\"\\]*(?:\\.[^\"\\]*)*)\"\.i18x(Register|Trans|RawTrans)\(/mg;
				while (r = s.exec(_text)) try {
					t.push(eval('"' + r[1] + '"'));
				} catch (err) {
					console.error("ParseError:" + err + ',"' + r[1] + '"')
				}
				//while(r=s.exec(_text)) t.push(eval('"'+r[1]+'"'));
				s = /\'([^\'\\]*(?:\\.[^\'\\]*)*)\'\.i18x(Register|Trans|RawTrans)\(/mg;
				while (r = s.exec(_text)) try {
					t.push(eval("'" + r[1] + "'"));
				} catch (err) {
					console.error("ParseError:" + err + ',"' + r[1] + '"')
				}
				//while(r=s.exec(_text)) t.push(eval("'"+r[1]+"'"));
				s = /\`([^\`\\]*(?:\\.[^\`\\]*)*)\`\.i18x(Register|Trans|RawTrans)\(/mg;
				while (r = s.exec(_text)) try {
					t.push(eval("`" + r[1] + "`"));
				} catch (err) {
					console.error("ParseErrorx:" + err + ',"' + r[1] + '"')
				}
				//while(r=s.exec(_text)) t.push(eval("'"+r[1]+"'"));

				l = t.length;
				//console.Log(t);
				//for(i=0;i<l;i++)console.Log("§§§§§§§§§ "+t[i].I18xKey());
				for (i = 0; i < l; i++) t[i] = t[i].replace(/\\\r\n/mg, "\n").replace(/\\\r/mg, "\n").replace(/\\\n/mg, "\n");
				for (i = 0; i < l; i++) t[i] = t[i].leftAlign();
				//for(i=0;i<l;i++)log("========="+_url+":"+t[i].I18xKey());
				//console.Log(t);
				break;
			case "html":
				break;
				parser = new DOMParser();
				if (typeof (_text) != UNDEFINED) if (_text.indexOf("i18x") > 0) {
					x = parser.parseFromString(_text, "text/html");
					if (x.documentElement.nodeName != "parsererror") {
						log(x, _text);
						x = xmlNodesContainsAttribute(x, "i18x");
						l = x.length;
						for (i = 0; i < l; i++) log(x[i]);
						for (i = 0; i < l; i++) {
							s = x[i].µNodeValue();
							if (typeof (s) == "string") if (s.trim() != "") t.push(s.str_replace("[[", "<").str_replace("]]", ">"))
						}
					}
				}
				break;
		}
		return t;
	}

	static replaceNatives(_text, _filename, _replaces) {
		let suffix = _filename.suffix(), s, t, r;
		let text = _text;
		switch (suffix) {
			case "php":
				break;
			case "vue":
			case "json":
			case "mjs":
			case "cjs":
			case "js":
				t = t.I18xReNotation();
				s = /\"([^\"\\]*(?:\\.[^\"\\]*)*)\"\.i18x(Register|Trans|RawTrans)\(/mg;
				while (r = s.exec(_text)) try {
					t.push(eval('"' + r[1] + '"'));
				} catch (err) {
					console.error("ParseError:" + err + ',"' + r[1] + '"')
				}
				break;
		}
		return text;
	}

	/** Text translation of a string into a specified or current language.
	 * @method trans
	 * @static
	 * @param _text           {string}  The text which should be translated.
	 * @param _placeholders   {array}    Optional, an associative array with placeholder values, the key represent the placeholder name, the corresponding values the replacements.
	 *                         A value of null can be used, if no placeholders are needed.
	 * @param _lid            {string}   Optional, a localization id of the destination language, a combination of iso-639 and iso-3166, e.g. "en-US".
	 *                         If not given, the current language will be used.
	 * @param _timezoneId     {string}   Optional, a string with timezone information. If not set, the server timezone will be used. Default is "", which means current server/client timezone.
	 *                         Timezone format format is .NET Timezone.
	 * @return {string}    The translated text, including placeholder replaces.
	 *
	 * _text can be also a MLJSON (multi localization json).
	 *
	 * Note: It is preferred to use the corresponding Sting.prototype method Sting.i18xTrans.
	 *
	 * @example
	 * // a call via static class method:
	 * i18x . trans("This is a text which have to translate.<context=\"example context\"/>");
	 *
	 * // a call via corresponding string prototype method:
	 * 'There <noOfApples if="1-">is no apple</noOfApples><noOfApples if="1">is one apple</noOfApples><noOfApples if="1+">are <noOfApples format="int"/> apples</noOfApples><context="button text"/>.' . i18xTrans({noOfApples:2});
	 *
	 * // Result
	 * // Da sind 2 Äpfel.
	 */
	static trans(_text, _placeholders = {}, _lid = null, _timezone = null, _doHtmlEntities = false) {
		let i, n, l, e, s, u, j, k, a, b, v, x, y, z, p, q, level = 0, splits, parts, tag,
			doinsertvalue,
			value, tagValue, attrs, attr, txts = [""], visibles = [true];
		let expr, frmt, txt, err, isClosingTag, isClosedTag, format, defstart, deflevel = 0,
			defattrs, removews = 0,
			removesw = 0, isIfIn = false;
		let openChar = "<", closeChar = ">";
		if (!i18x.templates.hasOwnProperty(_lid)) return _text;
		if (_lid === null) _lid = i18x.curLid;
		if (i18x.IS_I18XEDIT) {
			value = _text;
			value = value.I18xNotationNormalizeTranslation("", false);
		}
		_text = _text.I18xNotationNormalizeTranslation(_lid);

		if (i18x.IS_I18XEDIT) {
			i18x.lastTransIdCounter++;
			i18x.lastTransId = i18x.lastTransIdCounter;
			i18x.lastTransNativeId = i18x.transEditNativeIds.hasOwnProperty(value) ? i18x.transEditNativeIds[value] : 0;
			i18x.lastTransPrefix = (i18x.lastTransId == 0 ? "" : "{{{" + i18x.lastTransId + "}}}");
			i18x.lastState = "ok";
			i18x.lastContext = "";
			i18x.lastTransResult = "";
			i18x.lastFormat = "text";
			i18x.lastFormatName = "";
			i18x.lastPlaceholders = {};
			i18x.lastPlaceholderDefs = {};
			i18x.lastTransKey = value;
			i18x.lastTransPlaceholders = (_placeholders == null) ? {} : _placeholders;
			i18x.transEdits[i18x.lastTransIdCounter] = {
				id: i18x.lastTransIdCounter,
				nativeId: i18x.lastTransNativeId,
				placeholders: i18x.lastTransPlaceholders,
				transKey: i18x.lastTransKey
			};
			if (!i18x.transNativeEdits.hasOwnProperty(i18x.lastTransNativeId)) {
				i18x.transNativeEdits[i18x.lastTransNativeId] = [];
			}
			i18x.transNativeEdits[i18x.lastTransNativeId].push(i18x.lastTransIdCounter);
			if (_text.indexOf("<format") >= 0) i18x.lastFormat = "format";
			i18x.lastTransKeyExists = i18x.i18xs[_lid].hasOwnProperty(_text);
		}

		if (_text != "") {
			if (_text.indexOf(openChar) == -1) {
				if (i18x.IS_I18XEDIT) {
					i18x.lastTransResult = _text;
					return i18x.lastTransPrefix + _text;
				} else {
					return _text;
				}
			}
			n = ("<i18x>" + _text + "</i18x>").split(openChar);

			l = n.length;
			for (i = 0; i < l; i++) {
				doinsertvalue = false;
				e = n[i].indexOf(closeChar);
				if (e == -1) {
					// text node...
					//log("e==-1"+n[i]);
					txts[level] += _doHtmlEntities ? n[i].HtmlEntities() : n[i];
				} else {
					// tag node...
					txt = n[i].substr(e + 1);
					isClosingTag = n[i].charAt(0) == "/";
					isClosedTag = n[i].charAt(e - 1) == "/";
					s = 0;
					u = e;
					if (isClosedTag) u -= 1;
					if (isClosingTag) {
						s = 1;
						u -= 1;
					}

					// calculate tag and attributes...
					parts = n[i].substr(s, u).split('" ');
					splits = parts[0].split(" ");
					tag = splits[0];
					tagValue = "";
					let tagEqualPos = tag.indexOf("=");
					if (tagEqualPos >= 0) {
						tagValue = parts[0].substr(tagEqualPos + 1);
						if (tagValue.substr(0, 1) == "\"") {
							tagValue = tagValue.substr(1, tagValue.length - 2);
						}
						tag = tag.substr(0, tagEqualPos);
						splits = [];
					}

					if (splits[1]) {
						splits.shift();
						parts[0] = splits.join(" ");
						k = parts.length - 1;
						parts[k] = parts[k].substr(0, parts[k].length);
						parts[k] = parts[k].trim();
						y = parts[k].substr(parts[k].length - 1, 1);
						if (y == "/" || y == "\"" || y == closeChar) parts[k] = parts[k].substr(0, parts[k].length - 1);
						if (parts[k] == "") parts.pop();
					} else {
						parts = [];
					}

					k = parts.length;
					attrs = {};
					j = 0;
					while (j < k) {
						if (parts[j].indexOf('="') >= 0) {
							attr = parts[j].split('="');
							attrs[attr[0]] = attr[1];
							j++;
						} else {
							if (k > (j + 1)) {
								attrs[parts[j].substr(0, parts[j].length)] = parts[j + 1];
							} else {
								attrs[parts[j].substr(0, parts[j].length)] = "";
							}
							j += 2;
						}
					}

					//log("tag=");log(tag);log("attrs=");log(attrs);
					// ...now tag is set and attrs contains an object with key/value pairs of attributes of tag.
					let pdef = false;
					switch (typeof (_placeholders[tag])) {
						case "undefined":
							value = "";
							break;
						case "object":
							pdef = true;
							if (_placeholders[tag] instanceof Date) value = _placeholders[tag].getTime() / 1000;
							break;
						default:
							pdef = true;
							value = _placeholders[tag];
					}

					if (isClosingTag) {
						// ...is closing tag (</tag>).
						level--;
						txts[level] += visibles[level + 1] ? txts[level + 1] : "";
					} else if (isClosedTag) {
						// ...is closed tag (<tag/>).
						doinsertvalue = true;
					} else {
						// ...is an open tag (<tag>).
						level++;
						txts[level] = "";
						visibles[level] = true;
					}
					if (i18x.templates[_lid].hasOwnProperty(tag)) {
						value = i18x.templates[_lid][tag].I18xTrans(_placeholders, _lid, _timezone);
						pdef = false;
					}
					if (!pdef) {
						// process tag...
						switch (tag) {
							// general tags
							case "i18x":
								break;
							case "context":
								if (!isClosingTag && !isClosedTag) value = "";
								if (i18x.IS_I18XEDIT) i18x.lastContext = tagValue;
								break;
							// BIDI tags, unicode characters
							case "LRM":
								value = "\u200E";
								break;
							case "RLM":
								value = "\u200F";
								break;
							case "ALM":
								value = "\u061C";
								break;
							case "LRE":
								value = "\u202A";
								break;
							case "LRO":
								value = "\u202D";
								break;
							case "RLE":
								value = "\u202B";
								break;
							case "RLO":
								value = "\u202E";
								break;
							case "PDF":
								value = "\u202C";
								break;
							case "LRI":
								value = "\u2066";
								break;
							case "RLI":
								value = "\u2067";
								break;
							case "FSI":
								value = "\u2068";
								break;
							case "PDI":
								value = "\u2069";
								break;
							// ritch text tags, e.g. Unity3D TextMeshPro
							case "b":
								value = isClosingTag ? "</b>" : "<b" + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "i":
								value = isClosingTag ? "</i>" : "<i" + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "u":
								value = isClosingTag ? "</u>" : "<u" + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "s":
								value = isClosingTag ? "</s>" : "<s" + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "lowercase":
								value = isClosingTag ? "</lowercase>" : "<lowercase" + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "uppercase":
								value = isClosingTag ? "</uppercase>" : "<uppercase" + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "smallcaps":
								value = isClosingTag ? "</smallcaps>" : "<smallcaps" + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "sup":
								value = isClosingTag ? "</sup>" : "<sup" + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "sub":
								value = isClosingTag ? "</sub>" : "<sub" + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "size":
								value = isClosingTag ? "</size>" : "<size" + (tagValue == "" ? "" : "=" + tagValue) + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "voffset":
								value = isClosingTag ? "</voffset>" : "<voffset" + (tagValue == "" ? "" : "=" + tagValue) + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "color":
								value = isClosingTag ? "</color>" : "<color" + (tagValue == "" ? "" : "=\"" + tagValue + "\"") + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "mark":
								value = isClosingTag ? "</mark>" : "<mark" + (tagValue == "" ? "" : "=\"" + tagValue + "\"") + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "font":
								value = isClosingTag ? "</font>" : "<font" + (tagValue == "" ? "" : "=\"" + tagValue + "\"") + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "sprite":
								value = isClosingTag ? "</sprite>" : "<sprite" + (tagValue == "" ? "" : "=\"" + tagValue + "\"") + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "icon":
								value = i18x.icons.indexOf(tagValue) ? i18x.icons[tagValue] : "";
								doinsertvalue = true;
								break;
							case "alpha":
								value = isClosingTag ? "</alpha>" : "<alpha" + (tagValue == "" ? "" : "=\"" + tagValue + "\"") + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "cspace":
								value = isClosingTag ? "</cspace>" : "<cspace" + (tagValue == "" ? "" : "=\"" + tagValue + "\"") + (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "mspace":
								value = isClosingTag ? "</mspace>" : "<mspace" + (tagValue == "" ? "" : "=\"" + tagValue + "\"")
									+ (isClosedTag ? "/>" : ">");
								doinsertvalue = true;
								break;
							case "space":
								value = isClosingTag ? "</space>" : (tagValue == "" ? " " : "<space=" + tagValue + (isClosedTag ? "/>" : ">"));
								doinsertvalue = true;
								break;
							// others standards...
							case "whitespaceclear":
								if (!isClosingTag && !isClosedTag) removews = txts[level - 1].length;
								if (isClosingTag) txts[level] = txts[level].substr(0, removews) + txts[level].substr(removews).replace(/\s/g, '');
								break;
							case "singlewhitespace":
								if (!isClosingTag && !isClosedTag) removesw = txts[level - 1].length;
								if (isClosingTag) txts[level] = (txts[level].substr(0, removesw) + txts[level].substr(removesw).replace(/\s+/g, ' ')).trim();
								break;
							case "format":
								// collect only top level "format"-tags (deflevel)...
								if (!isClosingTag && !isClosedTag) {
									visibles[level] = false;
									deflevel++;
									if (deflevel == 1) {
										defstart = i;
										format = "";
									}
								}
								if (isClosingTag) {
									deflevel--;
									if (deflevel == 0) {
										format = [];
										for (j = defstart; j < i; j++) format.push(n[j]);
										defstart = n[i].indexOf(closeChar);
										format = openChar + format.join(openChar) + openChar + n[i].substr(0, defstart + 1);
									}
								}

								if (isClosedTag) {
									if (deflevel == 0) {
										defstart = n[i].indexOf(closeChar);
										format = openChar + n[i].substr(0, defstart + 1);
									}
								}
								if (((!isClosingTag && !isClosedTag) && deflevel == 1) || (isClosedTag && deflevel == 0)) {
									defattrs = attrs;
									if (!defattrs.base) defattrs.base = 10;
									if (!defattrs.ifillchr) defattrs.ifillchr = "";
									if (!defattrs.ffillchr) defattrs.ffillchr = "";
									if (!defattrs.rfillchr) defattrs.rfillchr = "";
									if (!defattrs.Ifillchr) defattrs.Ifillchr = "";
									if (!defattrs.Ffillchr) defattrs.Ffillchr = "";
									if (!defattrs.Efillchr) defattrs.Efillchr = "";
									if (!defattrs.hordir) defattrs.hordir = "ltr";
									if (!defattrs.verdir) defattrs.verdir = "ttb";
								}
								if (isClosingTag || isClosedTag) {
									if (deflevel == 0) {
										//log("format text="+format+" type="+defattrs['type']);
										frmt = new i18xFormat(format);
										if (i18x.formats[_lid]) {
											//if(!i18x.formats[_lid][frmt.name])
											i18x.formats[_lid][frmt.name] = frmt;
											if (i18x.IS_I18XEDIT) i18x.lastFormatName = frmt.name;
										} else {
											value = "i18x Format Error (Language not available).";
										}
									}
								}
								doinsertvalue = false;
								break;
							case "expression":
								// collect only top level "format"-tags (deflevel)...
								if (!isClosingTag && !isClosedTag) {
									visibles[level] = false;
									deflevel++;
									if (deflevel == 1) {
										defstart = i;
										format = "";
									}
								}
								if (isClosingTag) {
									deflevel--;
									if (deflevel == 0) {
										format = [];
										for (j = defstart; j < i; j++) format.push(n[j]);
										defstart = n[i].indexOf(closeChar);
										format = openChar + format.join(openChar) + openChar + n[i].substr(0, defstart + 1);
									}
								}

								if (isClosedTag) {
									if (deflevel == 0) {
										defstart = n[i].indexOf(closeChar);
										format = openChar + n[i].substr(0, defstart + 1);
									}
								}
								if (((!isClosingTag && !isClosedTag) && deflevel == 1) || (isClosedTag && deflevel == 0)) {
									defattrs = attrs;
									if (!defattrs.base) defattrs.base = 10;
									if (!defattrs.ifillchr) defattrs.ifillchr = "";
									if (!defattrs.ffillchr) defattrs.ffillchr = "";
									if (!defattrs.rfillchr) defattrs.rfillchr = "";
									if (!defattrs.Ifillchr) defattrs.Ifillchr = "";
									if (!defattrs.Ffillchr) defattrs.Ffillchr = "";
									if (!defattrs.Efillchr) defattrs.Efillchr = "";
									if (!defattrs.hordir) defattrs.hordir = "ltr";
									if (!defattrs.verdir) defattrs.verdir = "ttb";
								}
								if (isClosingTag || isClosedTag) {
									if (deflevel == 0) {
										//log("format text="+format+" type="+defattrs['type']);
										expr = new i18xExpression(defattrs['expression'].substr(1));
										if (i18x.i18xExpressions[_lid]) {
											if (!i18x.i18xExpressions[_lid][defattrs['name']]) i18x.i18xExpressions[_lid][defattrs['name']] = expr;
										} else {
											value = "i18x Expression Error (Language not available).";
										}
									}
								}
								doinsertvalue = false;
								break;
							case "directions":
								// collect only top level "format"-tags (deflevel)...
								if (!isClosingTag && !isClosedTag) {
									visibles[level] = false;
									deflevel++;
									if (deflevel == 1) {
										defstart = i;
										format = "";
									}
								}
								if (isClosingTag) {
									deflevel--;
									if (deflevel == 0) {
										format = [];
										for (j = defstart; j < i; j++) format.push(n[j]);
										defstart = n[i].indexOf(closeChar);
										format = openChar + format.join(openChar) + openChar + n[i].substr(0, defstart + 1);
									}
								}

								if (isClosedTag) {
									if (deflevel == 0) {
										defstart = n[i].indexOf(closeChar);
										format = openChar + n[i].substr(0, defstart + 1);
									}
								}
								if (((!isClosingTag && !isClosedTag) && deflevel == 1) || (isClosedTag && deflevel == 0)) {
									defattrs = attrs;
									if (!defattrs.base) defattrs.base = 10;
									if (!defattrs.ifillchr) defattrs.ifillchr = "";
									if (!defattrs.ffillchr) defattrs.ffillchr = "";
									if (!defattrs.rfillchr) defattrs.rfillchr = "";
									if (!defattrs.Ifillchr) defattrs.Ifillchr = "";
									if (!defattrs.Ffillchr) defattrs.Ffillchr = "";
									if (!defattrs.Efillchr) defattrs.Efillchr = "";
									if (!defattrs.hordir) defattrs.hordir = "ltr";
									if (!defattrs.verdir) defattrs.verdir = "ttb";
								}
								if (isClosingTag || isClosedTag) {
									if (deflevel == 0) {
										//log("format text="+format+" type="+defattrs['type']);

										i18x.lastHorDir = defattrs.hordir;
										i18x.lastVerDir = defattrs.verdir;
										break;
									}
								}
								doinsertvalue = false;
								break;
							// i18x notations
							case "xmlq":
							case "xmls":
							case "xmlg":
							case "xmlq":
							case "cbnq":
							case "cbns":
							case "cbng":
							case "cbnq":
							case "sbnq":
							case "sbns":
							case "sbng":
								value = "";
							case "bpnq":
							case "bpns":
							case "bpng":
								break;
							// i18x notations
							case "info":
								value = "";
								break;
							case "lid":
								break;
							case "now":
								value = value - Date.nowTicks();
								break;
							case "app":
								// not implemented yet!
								break;
							// characters
							case "lt":
								value = "<";
								break;
							case "gt":
								value = ">";
								break;
							case "obrc":
								value = "{";
								break;
							case "cbrc":
								value = "}";
								break;
							case "brl":
								value = "◄";
								break;
							case "brr":
								value = "►";
								break;
							case "br":
								value = "<br/>";
								break;
							case "newline":
								value = "\n";
								break;
							case "slashnewline":
								value = "\\n";
								break;
							case "quot":
								value = '"';
								break;
							case "apos":
								value = "'";
								break;
							case "space":
								value = " ";
								break;
							case "whitespace":
								value = " ";
								break;
							case "amp":
								value = "\u0026";
								break;
							case "nbsp":
								value = "\u00A0";
								break;
							case "nbspchr":
								value = " ";
								break;
							case "tab":
								value = "\t";
								break;
							case "-":
							case "hyphen":
								value = "\u00AD";
								break;
							case "newpage":
								value = "\u21A1";
								break;
							default:
								if (i18x.IS_I18XEDIT) if (deflevel == 0) this.lastPlaceholderDefs[tag] = tag;
						}
						// process attributes...
						// prefered attr orders: value,expression,if,format
						//console.Log("BBBB",tag,attrs);
					}
					for (attr in attrs) {
						//log("attr:"+attr+"="+attrs[attr]);
						x = attrs[attr];
						switch (attr) {
							case "i18x":
								value = i18x.trans(value, _placeholders, _lid, _timezone);
								break;
							case "i18xfor":
								let newValue = "", phs, keyNo = 0, iterates = _placeholders[x];
								for (let key in iterates) {
									phs = ObjectUtils.clone(_placeholders);
									phs = ObjectUtils.Merge(phs, iterates[key]);
									phs.key = key;
									phs.keyNo = keyNo;
									phs.count = ObjectUtils.count(iterates[key]);
									newValue += i18x.trans(value, phs, _lid, _timezone);
									keyNo++;
								}
								value = newValue;
								break;
							case "context":
								if (i18x.IS_I18XEDIT) i18x.lastContext = x;
								break;
							case "state":
								if (i18x.IS_I18XEDIT) i18x.lastState = x;
								break;
							case "value":
								value = x;
								break;
							case "repeat":
								value = value.repeat(x == null ? 1 : x);
								break;
							case "ucase":
								value = value.toUpperCase();
								break;
							case "lcase":
								value = value.toLowerCase();
								break;
							case "default":
								if (_placeholders[tag] == null) value = x;
								break;
							case "format":
								try {
									value = i18x.formats[_lid][x].exec(value);
								} catch (err) {
									if (i18x.formats[_lid].hasOwnProperty(x)) {
										value = "i18x Format Error:" + err.message + " (" + value + "," + _lid + ", format " + x + " is not defined)\n";
									} else {
										value = "i18x Format Error:" + err.message + " (" + value + "," + _lid + "," + x + ")\n";
									}
								}
								break;
							case "enumeration":
								value = x.split("|")[value];
								break;
							case "charreplace":
								break;
							case "expression":
								try {
									if (x.substr(0, 1) == "=") {
										expr = new i18xExpression(x.substr(1, x.length - 1));
										value = expr.exec(value);
									} else {
										value = i18x.i18xExpressions[_lid][x].exec(value);
										//log("expression eval="+x+"="+value);
									}
								} catch (err) {
									value = "i18x Expression Error:" + err.message + " (" + _lid + "," + x + ")\n";
								}
								break;
							case "if":
							case "ifnot":
							case "ifin":
							case "ifnotin":
								isIfIn = attr == "ifin" || attr == "ifnotin";
								v = value;
								switch (typeof (value)) {
									case "boolean":
										v = value;
										break;
									case "number":
										v = value;
										break;
									case "string":
										if (v == "true") {
											v = true;
										} else if (v == "false") {
											v = false;
										} else {
											v = parseInt(value, 10);
											if (isNaN(v)) v = value;
										}
										break;
								}
								if (isNaN(v)) v = value;
								z = x.split("|");
								b = false;
								for (a = 0; a < z.length; a++) {
									y = z[a];
									p = z[a].charAt(z[a].length - 1);
									switch (p) {
										case '~':
										case '=':
										case '-':
										case '+':
										case '*':
											y = y.substr(0, y.length - 1);
											break;
									}
									if (y == "true") {
										y = true;
									} else if (y == "false") {
										y = false;
									} else {
										q = parseInt(y, 10);
										if (!isNaN(q)) y = q;
									}
									switch (p) {
										case '+':
											b |= v > y;
											break;
										case '-':
											b |= v < y;
											break;
										case '=':
											b |= v == y;
											break;
										case '~':
											b |= v != y;
											break;
										case '*':
											b |= v.indexOf(y) >= 0;
											break;
										default:
											if (isIfIn) {
												b |= v.indexOf(y) >= 0;
											} else {
												b |= v == y;
											}
											break;
									}
								}
								if (attr == "ifnot" || attr == "ifnotin") b = !b;
								visibles[level] = b;
								break;

							default:
								if (tag.split("=")[0] == "context") value = "";
						}
					}

					//log("tag="+tag);
					//log("txt="+txt);
					//log("value="+value);
					//log("deflevel="+deflevel);
					txts[level] += (doinsertvalue ? value : "") + txt;
					//log("level="+level+":"+txts[level]);

				}
			}
		}
		if (i18x.IS_I18XEDIT) {
			i18x.lastTransResult = txts[level];
			return i18x.lastTransPrefix + txts[level];
		} else {
			return txts[level];
		}
	}

	/** With this method a text can be registered for localization.
	 * There are generally two use cases:
	 * 1. Register a format format.
	 * 2. Register a text for later (delayed) use.
	 *
	 * Note: It is preferred to use the corresponding Sting.prototype method Sting.i18xRegister.
	 *
	 * @example
	 *
	 * // delayed use case example...
	 * let text=i18x.register('There <noOfApples if="1-"/>is no apple</noOfApples><noOfApples if="1"/>is one apple</noOfApples><noOfApples if="1+"/>is <noOfApples format="int"/> apples</noOfApples>');
	 * let placeholders=array();
	 * for(let i=0;i<10;i++){
	 *  placeholders["noOfApples"]=i;
	 *  console.Log(i18x.trans(text,placeholders));
	 * }
	 *
	 * // format format
	 * i18x . register('\
	 * <format name="stdtime" type="format" context="standard time display format">\
	 *  <format name="twodigits" type="format" ifillchr="0"><i1/><i0/></format>\
	 *  <x if="0+">\
	 *   <hour format="twodigits" expression="=(x+11)%12+1"/>:<minute format="twodigits"/> <hour expression="=floor(x/12)" enumeration="AM|PM"/>\
	 *  </x>\
	 * </format>');
	 *
	 * @method register
	 * @static
	 * @param _text        {string}    The text which should be registered.
	 * @param _lid        {string}    Optional, the text which should be registered.
	 * @param _nativeText   {string}    Optional, the text which should be registered.
	 * @return {string}  Same as input parameter $_text.
	 */
	static register(_text, _lid = undefined, _nativeText = undefined) {
		if (_text !== undefined) _text = _text.replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "");
		//if (_text !== undefined) _text = _text.I18xKey();
		_text = _text.I18xNotationNormalizeTranslation();
		let key = _text.I18xKey(), isStartUp = (_lid === undefined), l;
		//errlog("i18xRegister:",_text,_lid);
		if (isStartUp) _lid = i18x.stdLid;
		if (!i18x.i18xs.hasOwnProperty(_lid)) i18x.loadLid(_lid);
		if (_nativeText !== undefined) i18x.i18xs[_lid][_nativeText.I18xKey()] = key;
		if (_text.indexOf("<format") >= 0) {
			let format = /<format name="([^"]*)"/gm.exec(_text);
			if (format.length > 0) {
				for (l in this.i18xs) {
					if (l !== undefined) {
						if (!i18x.formats[l].hasOwnProperty(format[1])) {
							i18x.i18xs[l][key] = _text;
							i18x.trans(key, {}, l);
							//if(!this.i18xs[l].hasOwnProperty(key)) this.i18xs[l][key]=_text;
							//this.trans(key,{},l);
						}
					}
				}
			}
		}
		if (_text.indexOf("<template") >= 0) {
			let template = /<template name="([^"]*)"/gm.exec(_text);
			if (template.length > 0) {
				for (l in this.i18xs) {
					if (l !== undefined) {
						if (!i18x.templates[l].hasOwnProperty(template[1])) {
							i18x.i18xs[l][key] = _text;
							i18x.templates[l][template[1]] = _text.replace(/\<template\=[^\<]*\>/, "").replace(/\<\/template\>/, "");
							//console.Log(_text);
							//i18x.trans(key, {}, l);
							//if(!this.i18xs[l].hasOwnProperty(key)) this.i18xs[l][key]=_text;
							//this.trans(key,{},l);
						}
					}
				}
			}
		}
		return key;
	}

	/** Format a value based on defined formats and given localization.
	 * @method format
	 * @static
	 * @param _value    {*}         The value to format.
	 * @param _format   {string}    The format identifier (former defined with register method).
	 * @param _lid      {string}    Optional, the localization id to use (default current localization i18x.curLid).
	 * @param _timezone {string}    Optional, the timezone to use by date calculations.
	 * @return {string} The formatted value.
	 *
	 * Note: The preferred method to format values is to use the corresponding prototypes of String, Number or Date object.
	 * @example
	 * i18x.Format(12345,"int");
	 * // result: 12,345
	 * (12345).Format("int");
	 * // result: 12,345
	 * new Date().Format("stddate");
	 * // result: 05/12/2022
	 */
	static format(_value, _format, _lid = undefined, _timezone = undefined) {
		let isUndefined = false;
		if (!_lid) _lid = i18x.curLid;
		if (!i18x.formats.hasOwnProperty(_lid) || !i18x.formats[_lid].hasOwnProperty(_format)) {
			isUndefined = true;
			_lid = "en-US";
		}
		try {
			return i18x.formats[_lid][_format].exec(this.valueOf()) + ((isUndefined) ? ' (Localization format missing!)' : '');
		} catch (e) {
			return "i18x format error :" + e.message + "," + this.toString() + "(" + _format + ")";
		}
	}

	static rawTrans(_text, _lid) {
		return _text;
	}

	static updateTransEditTextNodes(_node = null) {
		let textNodes = [];

		function _convertAllTextNodes(el) {
			let n, a = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
			while (n = walk.nextNode()) {
				let s = n.nodeValue.trim();
				if (s != "") {
					//console.Log("AA",n.nodeValue.match(/^\{{3}(\d+)\}{3}(.*)/gm),n);
					//console.Log(n.nodeValue);
					if (/^\{{3}(\d+)\}{3}(.*)/gm.test(s)) {
						textNodes.push(n);
						//console.Log("BBB"+n.nodeValue);
					}
				}
			}
			//console.Log(textNodes);
			for (let t = 0; t < textNodes.length; t++) {
				let n = textNodes[t];
				let matches = /^\{{3}(\d+)\}{3}(.*)/gm.exec(n.nodeValue.trim());
				let tooltipMatches = /^\{{3}(\d+)\}{3}(.*)/gm.exec(n.parentNode.title.trim());
				//console.Log(n.nodeValue);
				//console.Log(matches);
				let tooltipTransEditId = -1;
				let tooltipTransEdit = null;
				if (tooltipMatches != null) {
					tooltipTransEditId = parseInt(tooltipMatches[1], 10);
					if (i18x.transEdits.hasOwnProperty(tooltipTransEditId)) {
						tooltipTransEdit = i18x.transEdits[tooltipTransEditId];
					}
				}
				if (matches != null) {
					//n.nodeValue = "" + matches[2];
					//n.nodeValue =  matches[2];
					let replacementNode = document.createElement('span');
					let transEditId = parseInt(matches[1], 10);
					let transEdit = null;
					if (i18x.transEdits.hasOwnProperty(transEditId)) {
						transEdit = i18x.transEdits[transEditId];
					}
					if (transEdit != null) {
						let title = "";
						title += 'Native Id: ' + ((transEdit.nativeId == 0) ? "not yet scanned" : transEdit.nativeId);
						let context = transEdit.transKey.I18xGetContext();
						//console.Log(transEdit.transKey);
						if (context != "") title += "\n" + "Context: " + transEdit.transKey.I18xGetContext();
						title += "\n" + "Original Text: " + transEdit.transKey.I18xRemoveContext();
						for (let pl in transEdit.placeholders) {
							title += "\nPlaceholder '" + pl + "': '" + transEdit.placeholders[pl] + "'";
						}
						let name = "";
						if (tooltipTransEdit != null) {
							n.parentNode.title = tooltipMatches[2];
							name = 'name="tetool_' + tooltipTransEditId + '" ';
						}
						let mis = i18x.i18xs[i18x.curLid].hasOwnProperty(transEdit.transKey) ? "" : "mis";
						replacementNode.innerHTML = '<span id="tebut_' + transEdit.id + '" ' + name + 'class="transreddot ' + mis + ' cursor_handpointer" onclick="TRANSEDIT.edit(event,' + transEdit.id + ',' + tooltipTransEditId + ');" title="' + title.tHtmlEntities() + '"></span><span id="tetxt_' + transEdit.id + '">' + matches[2].HtmlEntities() + '</span>';
						n.parentNode.insertBefore(replacementNode, n);
						n.parentNode.removeChild(n);
						//console.Log(parseInt(matches[1], 10));
					} else if (tooltipTransEdit != null) {
						if (tooltipTransEdit != null) {
							n.parentNode.title = tooltipMatches[2];
						}
					}
				}
			}
		}

		//console.Log("updateTransEditTextNodes");
		if (_node != null) {
			//console.Log("AAA",_node);
			if (_node.hasOwnProperty("addNodes")) {
				//console.Log("BBB");
				for (let n = 0; n < _node.addNodes.length; n++) {
					_convertAllTextNodes(_node[n]);
				}
			}
			if (_node.hasOwnProperty("removeNodes")) {
				//console.Log("CCC");
				for (let n = 0; n < _node.removeNodes.length; n++) {
					//_convertAllTextNodes(_node[n]);
				}
			}
			if (!_node.hasOwnProperty("addNodes") && !_node.hasOwnProperty("removeNodes")) {
				//console.Log("EEE");
				_convertAllTextNodes(document.getElementsByTagName("body")[0]);
			}
		} else {
			//console.Log("DDD");
			_convertAllTextNodes(document.getElementsByTagName("body")[0]);
		}
	}

	static activateTransEdit() {
		if (!i18x.IS_I18XEDIT) {
			i18x.IS_I18XEDIT = true;
			localStorage.Set("IS_I18XEDIT", i18x.IS_I18XEDIT);
			/*-- @<BUILD_ONLY_AT_RELEASES:Production ----
				i18x.transEditNativeIds = JSON.loadSync(i18x.i18xFolder + "/prod/index.json");
			---- @>BUILD_ONLY_AT_RELEASES --*/
			/*-- @<BUILD_ONLY_AT_RELEASES:Test ----
				i18x.transEditNativeIds = JSON.loadSync(i18x.i18xFolder + "/test/index.json");
			---- @>BUILD_ONLY_AT_RELEASES --*/
			/*-- @<BUILD_NEVER_AT_RELEASES:Production,Test --*/
			i18x.transEditNativeIds = JSON.loadSync(i18x.i18xFolder + "/dev/index.json");
			/*-- @>BUILD_NEVER_AT_RELEASES --*/
			let style = document.createElement('style');
			style.type = 'text/css';
			let classes = "";
			classes += 'span.transreddot { ' +
				'position: relative;' +
				'}';
			classes += 'span.transreddot:before {' +
				'content:"";' +
				'position:absolute;' +
				'display:block;' +
				'background-color: red;' +
				'border: 2px solid;' +
				'border-color: red;' +
				'border-radius: 50%;' +
				'width:8px;' +
				'height: 8px;' +
				'bottom: 0px;' +
				'left: 0px;' +
				'opacity: 0.5;' +
				'}';
			classes += 'span.transreddot.mis { ' +
				'position: relative;' +
				'}';
			classes += 'span.transreddot.mis:before {' +
				'content:"";' +
				'position:absolute;' +
				'display:block;' +
				'background-color: red;' +
				'border: 4px solid;' +
				'border-color: orange;' +
				'border-radius: 50%;' +
				'width: 6px;' +
				'height: 6px;' +
				'bottom: 0px;' +
				'left: 0px;' +
				'opacity: 0.5;' +
				'}';

			style.innerHTML = classes;
			document.getElementsByTagName('head')[0].appendChild(style);

			// Options for the observer (which mutations to observe)
			const config = { attributes: true, characterData: true, childList: true, subtree: true };

			// Callback function to execute when mutations are observed
			const callback = (mutationList, observer) => {
				//console.Log(mutationList);
				for (const mutation of mutationList) {
					if (mutation.type === "childList") {
						i18x.updateTransEditTextNodes(mutation.target);
						//console.Log(mutation);
						//console.Log(mutation.target.nodeType+"XX");
						//if(mutation.target.nodeType==Node.TEXT_NODE){
						//    console.Log(mutation.target.nodeValue+"XX");
						//    mutation.target.nodeValue = "aaa";
						//}
						//console.Log("A child node has been added or removed.");
						//} else if (mutation.type === "attributes") {
						//console.Log(`The ${mutation.attributeName} attribute was modified.`);
					}
				}
			};


			// Create an observer instance linked to the callback function
			const observer = new MutationObserver(callback);
			const targetNode = document.getElementsByTagName("body")[0];
			// Start observing the target node for configured mutations
			observer.observe(targetNode, config);
		}
	}

	static deActivateTransEdit() {
		localStorage.Set("IS_I18XEDIT", false);
		i18x.IS_I18XEDIT = false;
	}

	static flagEmojiOfCountryCode(_countryCode) {
		const codePoints = _countryCode
			.toUpperCase()
			.split('')
			.map(char => 127397 + char.charCodeAt());
		return String.fromCodePoint(...codePoints);
	}

	static flagEmojiOfLanguageCode(_languageCode) {
		return i18x.FlagEmojiOfCountryCode(i18x.country(_languageCode));
	}

	static init() {
		i18x.loadLid("en-US");
		if (localStorage.Get("IS_I18XEDIT", WebUtils.GetParameter("i18xEdit", false))) {
			// ROLES_ALL_TRANSLATORS | ROLES_ALL_TESTERS | ROLES_ALL_DEVELOPERS | ROLES_ALL_ADMINS
			//console.Log("Users.curUser",Users.curUser);
			i18x.activateTransEdit();
		}
	}
}

if (typeof window !== 'undefined') window.i18x = i18x;


// ============================
// TRANSEDIT Functions
// ============================

function TRANSEDIT() {
}

TRANSEDIT.editWindow = null;
TRANSEDIT.edit = function (_ev, _editId, _editTooltipId = -1) {
	let transEdit = null;
	let toolTipTransEdit = null;
	let err;
	if (i18x.transEdits.hasOwnProperty(_editId)) {
		transEdit = i18x.transEdits[_editId];
	}
	if (i18x.transEdits.hasOwnProperty(_editTooltipId)) {
		toolTipTransEdit = i18x.transEdits[_editTooltipId];
	}
	if (TRANSEDIT.editWindow != null) if (TRANSEDIT.editWindow.closed) TRANSEDIT.editWindow = null;
	if (TRANSEDIT.editWindow == null) {
		window.addEventListener("message", (event) => {
			let msg = {}, err;
			//console.Log("message", event);
			try {
				msg = JSON.parse(event.data);
			} catch (err) {
			}
			if (msg.hasOwnProperty("action")) {
				console.Log("message", event.data);
				switch (msg.action) {
					case "transChanged":
						let receivedTransEdit = null, err;
						let nativeId = -1;
						if (i18x.transEdits.hasOwnProperty(msg.id)) {
							receivedTransEdit = i18x.transEdits[msg.id];
							nativeId = receivedTransEdit.nativeId;
						}
						if (receivedTransEdit != null) {
							if (i18x.curLid == msg.lid) {
								if (nativeId == i18x.activeEditNativeId) {
									if (i18x.transNativeEdits.hasOwnProperty(nativeId)) {
										for (let te = 0; te < i18x.transNativeEdits[nativeId].length; te++) {
											let msgId = i18x.transNativeEdits[nativeId][te];
											receivedTransEdit = i18x.transEdits[msgId];
											//i18x.transNativeEdits
											let otag = document.getElementById("tetxt_" + msgId);
											let otitle = document.getElementsByName("tetool_" + msgId);
											if (otag) {
												i18x.i18xs[msg.lid][receivedTransEdit.transKey] = msg.foreignText;
												let s = receivedTransEdit.transKey.I18xTrans(receivedTransEdit.placeholders);
												let matches = /^\{{3}(\d+)\}{3}(.*)/gm.exec(s.trim());
												if (matches != null) otag.innerText = matches.length > 2 ? matches[2] : "";
											}
											if (otitle.length > 0) {
												i18x.i18xs[msg.lid][receivedTransEdit.transKey] = msg.foreignText;
												let s = receivedTransEdit.transKey.I18xTrans(receivedTransEdit.placeholders);
												let matches = /^\{{3}(\d+)\}{3}(.*)/gm.exec(s.trim());
												if (matches != null) otitle[0].parentNode.title = matches.length > 2 ? matches[2] : "";
											}
										}
									}
								}
							}
						}
						break;
				}
			}
		});
		window.addEventListener("unload", (event) => {
			if (TRANSEDIT.editWindow != null) TRANSEDIT.editWindow.close();
		});
		TRANSEDIT.editWindow = window.open(i18x.serverUrl + "?sitemap=i18x&appId=" + i18x.i18xeServerAPIAppId, 'i18x',
			'status=no,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,fullscreen=no,location=no');
		//'status=yes,resizable=yes,scrollbars=yes,toolbar=yes,menubar=yes,fullscreen=no,location=yes');
		setTimeout(function () {
			TRANSEDIT.edit(_ev, _editId);
		}, 1000);
		_ev.preventDefault();
		_ev.stopPropagation();
		return;
	} else {
		if (transEdit != null) {
			let msg = {
				action: "editTrans",
				lid: i18x.curLid,
				nativeId: transEdit.nativeId,
				id: _editId,
				placeholder: transEdit.placeholder,
			};
			i18x.activeEditNativeId = transEdit.nativeId;
			if (_ev.altKey && toolTipTransEdit != null) {
				msg = {
					action: "editTrans",
					appId: i18x.i18xeServerAPIAppId,
					lid: i18x.curLid,
					nativeId: toolTipTransEdit.nativeId,
					id: _editTooltipId,
					placeholder: toolTipTransEdit.placeholder,
				};
				i18x.activeEditNativeId = toolTipTransEdit.nativeId;
			}
			TRANSEDIT.editWindow.postMessage(JSON.stringify(msg), i18x.serverUrl);
			TRANSEDIT.editWindow.focus();
			_ev.preventDefault();
			_ev.stopPropagation();
		}
	}
}

if (typeof window !== 'undefined') window.TRANSEDIT = TRANSEDIT;

// ============================================
// i18x String Prototypes
// ============================================

/** i18x String extensions.
 * @class String
 */


String.prototype.I18xGetContext = function () {
	let ret = "";
	let matches = /\<context\=\"([^\"]*)\".*\/\>/gm.exec(this.valueOf());
	if (matches != null) return matches[1];
	return "";
}


String.prototype.I18xRemoveContext = function () {
	return this.valueOf().replace(/(\<context\=\"[^\"]*\".*\/\>)/gm, "");
}

/** Text translation of a string into a specified or current localization.
 * Prototype method of i18x.trans.
 * @param _placeholders   {array}    Optional, an associative array with placeholder values, the key represent the placeholder name, the corresponding values the replacements.
 *                         A value of null can be used, if no placeholders are needed.
 * @param _lid            {string}   Optional, alocalization id of the destination language, a combination of iso-639 and iso-3166, e.g. "en-US".
 *                         If not given, the current language will be used.
 * @param _timezoneId     {string}   Optional, a string with timezone information. If not set, the server timezone will be used. Default is "", which means current server/client timezone.
 *                         Timezone format format is .NET Timezone.
 * @return {string}    The translated text, including placeholder replaces.
 *
 * String can be also a MLJSON (multi localization json).
 *
 * @example
 *  'There <noOfApples if="1-">is no apple</noOfApples><noOfApples if="1">is one apple</noOfApples><noOfApples if="1+">are <noOfApples format="int"/> apples</noOfApples><context="button text"/>.'.I18xTrans({noOfApples:2});
 *
 * // Result
 * // Da sind 2 Äpfel.
 */
String.prototype.I18xTrans = function (_placeholders = {}, _lid = undefined, _timezone = undefined) {
	return i18x.trans(this.valueOf(), _placeholders, _lid, _timezone);
}

String.prototype.I18xTransHtmlEntities = function (_placeholders = {}, _lid = undefined, _timezone = undefined) {
	return i18x.trans(this.valueOf(), _placeholders, _lid, _timezone, true);
}


/**
 *
 */
String.prototype.I18xRawTrans = function (_lid = undefined) {
	return i18x.rawTrans(this.valueOf(), _lid);
}

/** Text translation of a string into a specified or current language. Same as trans methode, but the given text will not be scanned by node module i18xe-sync.
 * @method trans
 * @static
 * @param _text           {string}  The text which should be translated.
 * @param _placeholders   {array}    Optional, an associative array with placeholder values, the key represent the placeholder name, the corresponding values the replacements.
 *                         A value of null can be used, if no placeholders are needed.
 * @param _lid            {string}   Optional, a localization id of the destination language, a combination of iso-639 and iso-3166, e.g. "en-US".
 *                         If not given, the current language will be used.
 * @param _timezoneId     {string}   Optional, a string with timezone information. If not set, the server timezone will be used. Default is "", which means current server/client timezone.
 *                         Timezone format format is .NET Timezone.
 * @return {string}    The translated text, including placeholder replaces.
 *
 * @see {i18xTrans}
 */
String.prototype.I18xOpaqueTrans = function (_placeholders = {}, _lid = undefined, _timezone = undefined) {
	return i18x.trans(this.valueOf(), _placeholders, _lid, _timezone);
}


/** With this method a text can be registered for localization.
 * Prototype method of i18x.register.
 * There are generally two use cases:
 * 1. Register a format format.
 * 2. Register a text for later (delayed) use.
 *
 * @example
 *
 * // delayed use case example...
 * let text='There <noOfApples if="1-"/>is no apple</noOfApples><noOfApples if="1"/>is one apple</noOfApples><noOfApples if="1+"/>is <noOfApples format="int"/> apples</noOfApples>').i18x.Register();
 * let placeholders=array();
 * for(let i=0;i<10;i++){
 *  placeholders["noOfApples"]=i;
 *  console.Log(text.I18xTrans(placeholders));
 * }
 *
 * // format format
 * '\
 * <format name="stdtime" context="standard time display format">\
 *  <format name="twodigits" ifillchr="0"><i1/><i0/></format>\
 *  <x if="0+">\
 *   <hour format="twodigits" expression="=(x+11)%12+1"/>:<minute format="twodigits"/> <hour expression="=floor(x/12)" enumeration="AM|PM"/>\
 *  </x>\
 * </format>' . i18xRegister();
 *
 * @param _lid  {string} Optional, the text which should be registered.
 * @param _nativetext   {string} Optional, the text which should be registered.
 * @return {string}  Same as input parameter $_text.
 */
String.prototype.I18xRegister = function (_lid = undefined) {
	return i18x.register(this.valueOf(), _lid);
}

String.prototype.I18xOpaqueRegister = function (_lid = undefined) {
	return i18x.register(this.valueOf(), _lid);
}

/** Calculation of a i18x key. This key is a normalized string without multiple serial white characters.
 * This key is used to identify the corresponding string from the JSON translation table.
 * @return {string}     A string normalized string.
 */
String.prototype.I18xKey = function () {
	return this.replace(/(\t|\n\s*|\r)/g, "").replace(/(\s+)/g, " ").trim();
}

/** Returns the notation standardized formatted and translated i18x text (default format notation <xmlq/> ).
 * The returned format will be used bei i18x to store a text into database.
 * Supported i18x format notations:
 * ```js
 *
 * A string beginning with:
 * <xmlq/> xml notation with double quotes for attribute values (default), e.g. <tag attr="test"/>.
 * <xmlg/> xml notation with accent graves for attribute values, e.g. <tag attr=`test`/>.
 * <xmls/> xml notation with single quotes for attribute values, e.g. <tag attr='test'/>.
 * {cbnq/} curly braces notation with double quotes for attribute values, e.g. {tag attr="test"/}.
 * {cbng/} curly braces notation with accent graves for attribute values, e.g. {tag attr=`test`/}.
 * {cbns/} curly braces notation with single quotes for attribute values, e.g. {tag attr='test'/}.
 * [sbnq/] square bracket notation with double quotes for attribute values, e.g. [tag attr="test"/].
 * [sbnq/] square bracket notation with accent graves for attribute values, e.g. [tag attr=`test`/].
 * [sbnq/] square bracket notation with single quotes for attribute values, e.g. [tag attr='test'/].
 * ◄bpnq/► black pointer notation (U+25C4 U+25BA) with double quotes for attribute values, e.g. ◄tag attr="test"/►.
 * ◄bpnq/► black pointer notation (U+25C4 U+25BA) with accent graves for attribute values, e.g. ◄tag attr=`test`/►.
 * ◄bpnq/► black pointer notation (U+25C4 U+25BA) with single quotes for attribute values, e.g. ◄tag attr='test'/►.
 *
 * or
 *
 * A json included localization of form {"en-US":{},"xx-XX":{}...}.
 *
 * any else
 *
 * A <xmlq/> formatted i18x text.
 * ```
 * @return {string}     The notation free i18x string.
 
 * Note: To use this prototype is not needed in application. This prototype is used by the i18x class to convert
 * i18x texts while translation.
 */
String.prototype.I18xNotationNormalizeTranslation = function (_lid = "", _doTrans = true) {
	let s = this.valueOf().trim();
	let c = s.substr(0, 1);
	if (c == "{") {
		c = s.substr(0, 7);
		if (c == "{cbnq/}") {
			let repl = { "{": "<", "}": ">", "<": "<lt/>", ">": "<gt/>" };
			s = s.substr(7).replace(/(\{|\}|\<|\>)/gm, c => repl[c]);
		} else if (c == "{cbns/}") {
			let repl = {
				"{": "<",
				"}": ">",
				"\"": "<quot/>",
				"'": "\"",
				"<": "<lt/>",
				">": "<gt/>"
			};
			s = s.substr(7).replace(/(\{|\}|\"|'|\<|\>)/gm, c => repl[c]);
		} else if (c == "{cbng/}") {
			let repl = {
				"{": "<",
				"}": ">",
				"\"": "<quot/>",
				"`": "\"",
				"<": "<lt/>",
				">": "<gt/>"
			};
			s = s.substr(7).replace(/(\{|\}|\"|\`|\<|\>)/gm, c => repl[c]);
		} else {
			// JSON notation with included localizations? ...
			try {
				//# if (_lid == null) _lid = i18x.isAutoLid ? i18x.i18nLid : i18x.bestAvailableLid;
				let lids = JSON.parse(s);
				if (lids.hasOwnProperty(_lid)) {
					// ...correct language available, get it...
					s = lids[_lid];
					// .split("|")[0];
					_lid = "";
					//...prevent multiple translations
				} else {
					// ...have to find best language...
					if (i18x.LIDS_MAPS.hasOwnProperty(_lid)) {
						// ...language mapping available, search for best available...
						let lidMap = i18x.LIDS_MAPS[_lid], l, ll = lidMap.length,
							lidMapFound = false;
						for (l = 0; l < ll; l++) {
							if (lids.hasOwnProperty(lidMap[l])) {
								s = lids[lidMap[l]];
								lidMapFound = true;
							}
						}
						if (!lidMapFound) {
							// ...mapping not found (main culture already in map checked), get default language...
							if (lids.hasOwnProperty("en-US")) {
								// return lids["en-US"].split("|")[0];
								//s= ("<i18x>" + lids["en-US"].split("|")[0] + "</i18x>").split(openChar);
								s = lids["en-US"];
							} else if (Object.keys(lids).length > 0) {
								// fallback, use first...
								//return lids[Object.keys(lids)[0]].split("|")[0];
								//s = lids[Object.keys(lids)[0]];
								s = this.valueOf().trim();
							} else {
								s = "";
							}
						}
						_lid = "";
						//...prevent multiple translations...
					} else {
						// look for main culture...
						//console.Log("AAA", _lid);
						let mainLid = i18x.mainCultureLid(_lid);
						if (lids.hasOwnProperty(mainLid)) {
							//return lids[mainLid].split("|")[0];
							s = lids[mainLid];
						} else if (lids.hasOwnProperty("en-US")) {
							// ...no main culture language available, get default language...
							//return lids["en-US"].split("|")[0];
							s = lids["en-US"];
						} else if (Object.keys(lids).length > 0) {
							// fallback, use first...
							//return lids[Object.keys(lids)[0]].split("|")[0];
							//s = lids[Object.keys(lids)[0]]+"";
							s = this.valueOf().trim();
						} else {
							s = "";
						}
						_lid = "";
						//...prevent multiple translations...
					}
				}
			} catch (err) {
				//...it's no json...
			}
		}
	} else if (c == "◄") {
		c = s.substr(0, 7);
		if (c == "◄bpnq/►") {
			let repl = { "◄": "<", "►": ">", "<": "{lt/}", ">": "{gt/}" };
			s = s.substr(7).replace(/(◄|►|\<|\>)/gm, c => repl[c]);
		} else if (c == "◄bpns/►") {
			let repl = {
				"◄": "<",
				"►": ">",
				"\"": "{quot/}",
				"'": "\"",
				"<": "{lt/}",
				">": "{gt/}"
			};
			s = s.substr(7).replace(/(◄|►|\"|'|\<|\>)/gm, c => repl[c]);
		} else if (c == "◄bpng/►") {
			let repl = {
				"◄": "<",
				"►": ">",
				"\"": "{quot/}",
				"`": "\"",
				"<": "{lt/}",
				">": "{gt/}"
			};
			s = s.substr(7).replace(/(◄|►|\"|`|\<|\>)/gm, c => repl[c]);
		}
	} else if (c == "[") {
		c = s.substr(0, 7);
		if (c == "[sbnq/]") {
			let repl = { "[": "<", "]": ">", "<": "{lt/}", ">": "{gt/}" };
			s = s.substr(7).replace(/(\[|\]|\<|\>)/gm, c => repl[c]);
		} else if (c == "[sbns/]") {
			let repl = {
				"[": "<",
				"]": ">",
				"\"": "{quot/}",
				"'": "\"",
				"<": "{lt/}",
				">": "{gt/}"
			};
			s = s.substr(7).replace(/(\[|\]|\"|'|\<|\>)/gm, c => repl[c]);
		} else if (c == "[sbng/]") {
			let repl = {
				"[": "<",
				"]": ">",
				"\"": "{quot/}",
				"`": "\"",
				"<": "{lt/}",
				">": "{gt/}"
			};
			s = s.substr(7).replace(/(\[|\]|\"|`|\<|\>)/gm, c => repl[c]);
		}
	} else if (c == "<") {
		c = s.substr(0, 7);
		if (c == "<xmlq/>") {
			s = s.substr(7);
		} else if (c == "<xmls/>") {
			let repl = { "\"": "<quot/>", "'": "\"" };
			s = s.substr(7).replace(/(\[|\]|\"|')/gm, c => repl[c]);
		} else if (c == "<xmlg/>") {
			let repl = { "\"": "<quot/>", "`": "\"" };
			s = s.substr(7).replace(/(\[|\]|\"|`)/gm, c => repl[c]);
		}
	}
	s = s.replace(/(\t|\n\s*|\r)/gm, "").replace(/(\s+)/g, " ").trim();
	if (_doTrans && i18x.i18xs.hasOwnProperty(_lid)) {
		if (i18x.i18xs[_lid].hasOwnProperty(s)) {
			s = i18x.i18xs[_lid][s];
		}
	}
	//console.Log( s.replace(/(\t|\n|\r)/g, "").replace(/(\s+)/g, " ").trim());
	return s;
}

String.prototype.I18xNotationGet = function () {
	let s = this.valueOf().trim();
	let c = s.substr(0, 1);
	if (c == "{") {
		c = s.substr(0, 7);
		if (c == "{cbnq/}") {
			return c;
		} else if (c == "{cbns/}") {
			return c;
		} else if (c == "{cbng/}") {
			return c;
		} else {
			// JSON notation with included localizations? ...
			try {
				//# if (_lid == null) _lid = i18x.isAutoLid ? i18x.i18nLid : i18x.bestAvailableLid;
				let _lid = "en-US";
				let lids = JSON.parse(s);
				if (lids.hasOwnProperty(_lid)) {
					// ...correct language available, get it...
					s = lids[_lid];
					// .split("|")[0];
					//...prevent multiple translations
				} else {
					// ...have to find best language...
					if (i18x.LIDS_MAPS.hasOwnProperty(_lid)) {
						// ...language mapping available, search for best available...
						let lidMap = i18x.LIDS_MAPS[_lid], l, ll = lidMap.length,
							lidMapFound = false;
						for (l = 0; l < ll; l++) {
							if (lids.hasOwnProperty(lidMap[l])) {
								s = lids[lidMap[l]];
								lidMapFound = true;
							}
						}
						if (!lidMapFound) {
							// ...mapping not found (main culture already in map checked), get default language...
							if (lids.hasOwnProperty("en-US")) {
								// return lids["en-US"].split("|")[0];
								//s= ("<i18x>" + lids["en-US"].split("|")[0] + "</i18x>").split(openChar);
								s = lids["en-US"];
							} else if (Object.keys(lids).length > 0) {
								// fallback, use first...
								//return lids[Object.keys(lids)[0]].split("|")[0];
								//s = lids[Object.keys(lids)[0]];
								s = this.valueOf().trim();
							} else {
								s = "";
							}
						}
						//...prevent multiple translations...
					} else {
						// look for main culture...
						//console.Log("AAA", _lid);
						let mainLid = i18x.mainCultureLid(_lid);
						if (lids.hasOwnProperty(mainLid)) {
							//return lids[mainLid].split("|")[0];
							s = lids[mainLid];
						} else if (lids.hasOwnProperty("en-US")) {
							// ...no main culture language available, get default language...
							//return lids["en-US"].split("|")[0];
							s = lids["en-US"];
						} else if (Object.keys(lids).length > 0) {
							// fallback, use first...
							//return lids[Object.keys(lids)[0]].split("|")[0];
							//s = lids[Object.keys(lids)[0]]+"";
							s = this.valueOf().trim();
						} else {
							s = "";
						}
						//...prevent multiple translations...
					}
				}
				return "JSON";
			} catch (err) {
				return "<xmlg/>";
			}
		}
	} else if (c == "◄") {
		c = s.substr(0, 7);
		if (c == "◄bpnq/►") {
			return c;
		} else if (c == "◄bpns/►") {
			return c;
		} else if (c == "◄bpng/►") {
			return c;
		}
	} else if (c == "[") {
		c = s.substr(0, 7);
		if (c == "[sbnq/]") {
			return c;
		} else if (c == "[sbns/]") {
			return c;
		} else if (c == "[sbng/]") {
			return c;
		}
	} else if (c == "<") {
		c = s.substr(0, 7);
		if (c == "<xmlq/>") {
			return c;
		} else if (c == "<xmls/>") {
			return c;
		} else if (c == "<xmlg/>") {
			return c;
		}
	}
	return "<xmlg/>";
}

//console.Log('{cbng/}...user <{firstNames/} {lastName/}>{context=`user avatar tooltip`/}...'.i18xNotationFree());
String.prototype.I18xReNotation = function (_notation = "") {
	let ret = this.valueOf();
	let repl;
	if (_notation == "") {
		_notation = ret.substr(0, 7);
	}
	switch (_notation) {
		case "{cbnq/}":
			repl = { "<": "{", ">": "}", "<lt/>": "<", "<gt/>": ">" };
			ret = _notation + ret.replace(/(\<gt\/\>|\<lt\/\>|\<|\>)/gm, c => repl[c]);
			break;
		case "{cbns/}":
			repl = { "<": "{", ">": "}", "{quot/}": "\"", "\"": "'", "<lt/>": "<", "<gt/>": ">" };
			ret = _notation + ret.replace(/(\<gt\/\>|\<lt\/\>|\{quot\/\}|\"|\<|\>)/gm, c => repl[c]);
			break;
		case "{cbng/}":
			repl = { "<": "{", ">": "}", "{quot/}": "\"", "\"": "`", "<lt/>": "<", "<gt/>": ">" };
			ret = _notation + ret.replace(/(\<gt\/\>|\<lt\/\>|\{quot\/\}|\"|<|>)/gm, c => repl[c]);
			break;
	}
	return ret;
}

/** Formatting a string.
 * @param _format       {string}        The format identifier to use for formatting.
 * @param _lid          {string}        Optional, the language (ISO code) which have to use, if not set, the users selected language will be used.
 * @param _timezone     {string}        Optional, currently not supported (local timezone is used), The timezone which have to use.
 * @return {string}     A string with the formatted string.
 */
String.prototype.Format = function (_format = undefined, _lid = undefined, _timezone = undefined) {
	return this.valueOf();
}


// ============================================
// i18x Number Prototypes
// ============================================
/** i18x Number extensions.
 * @class Number
 */

/** Formatting a number.
 * @param _format        {string}       The format identifier to use for formatting.
 * @param _lid          {string}        Optional, the language (ISO code) which have to use, if not set, the users selected language will be used.
 * @param _timezone     {string}        Optional, currently not supported (local timezone is used), The timezone which have to use.
 * @return {string}     A string with the formatted number.
 */
Number.prototype.Format = function (_format, _lid = undefined, _timezone = undefined) {
	if (!_lid) _lid = i18x.curLid;
	if (!i18x.formats.hasOwnProperty(_lid) || !i18x.formats[_lid].hasOwnProperty(_format)) _lid = "en-US";
	if (!i18x.formats.hasOwnProperty(_lid) || !i18x.formats[_lid].hasOwnProperty(_format)) return "(Localization format missing!)";
	try {
		return i18x.formats[_lid][_format].exec(this.valueOf());
	} catch (e) {
		return "i18x format error :" + e.message + "," + this.toString() + "(" + _format + ")";
	}
}

/** Formatting a unix timestamp.
 * @param _format        {string}       he format identifier to use for formatting.
 * @param _lid          {string}        Optional, the language (ISO code) which have to use, if not set, the users selected language will be used.
 * @param _timezone     {string}        Optional, currently not supported (local timezone is used), The timezone which have to use.
 * @return {string}     A string with the formatted number.
 */
Number.prototype.FormatTimestamp = function (_format, _lid = undefined, _timezone = undefined) {
	return new Date(this.valueOf()).Ticks().Format(_format, _lid, _timezone);
}

/** Formatting ticks (.NET).
 * @param _format        {string}       he format identifier to use for formatting.
 * @param _lid          {string}        Optional, the language (ISO code) which have to use, if not set, the users selected language will be used.
 * @param _timezone     {string}        Optional, currently not supported (local timezone is used), The timezone which have to use.
 * @return {string}     A string with the formatted ticks (.NET).
 */
Number.prototype.FormatTicks = function (_format, _lid = undefined, _timezone = undefined) {
	//let t = (this.valueOf() - 621355968000000000) / 10000, d;
	//d = new Date(this.valueOf() );
	return this.valueOf().Format(_format, _lid);
}

// ============================================
// i18x Date Prototypes
// ============================================
/** i18x Date extensions.
 * @class Date
 */

/** Formatting a Date Object.
 * @param _format        {string}       The format identifier to use for formatting.
 * @param _lid          {string}        Optional, the language (ISO code) which have to use, if not set, the users selected language will be used.
 * @param _timezone     {string}        Optional, currently not supported (local timezone is used), The timezone which have to use.
 * @return {string}     A string with the formatted date/time.
 */
Date.prototype.Format = function (_format, _lid = undefined, _timezone = undefined) {
	if (!_lid) _lid = i18x.curLid;
	if (!i18x.formats.hasOwnProperty(_lid) || !i18x.formats[_lid].hasOwnProperty(_format)) _lid = "en-US";
	if (!i18x.formats.hasOwnProperty(_lid) || !i18x.formats[_lid].hasOwnProperty(_format)) return "(Localization format missing!)";
	try {
		//console.Log(this);
		//console.Log(this.Ticks().Format(_format,_lid,_timezone));
		return this.Ticks().Format(_format, _lid, _timezone);
	} catch (e) {
		return "i18x format error :" + e.message + "," + this.toString() + "(" + _format + ")";
	}
}

// ============================================
// Hyphenation String Prototypes
// ============================================
/** Hyphenation String extensions.
 * @class String
 */

String.prototype.WordHyphenation = function (_lid = "") {
	let word = this.valueOf();
	let lower = word.toLowerCase(), l, myword, vals, i, sylbs, sylb, j, exceptions, minSylbs,
		maxSylbs, sl, k, sylbVals,
		m, ret = word, w, c;
	if (_lid == "") _lid = i18x.curLid;
	if (!i18x.i18xs.hasOwnProperty(_lid)) i18x.loadLid(_lid);
	if (!i18x.i18xs.hasOwnProperty(_lid)) return word;
	if (!i18x.hyphens[_lid].exist) return word;
	if (i18x.hypenCache.hasOwnProperty(_lid)) if (i18x.hypenCache[_lid].hasOwnProperty(word)) return i18x.hypenCache[_lid][word];
	if (!i18x.hyphens[_lid].exceptions.hasOwnProperty(lower)) {
		sylbs = i18x.hyphens[_lid].sylbs;
		minSylbs = i18x.hyphens[_lid].minSylbs;
		maxSylbs = i18x.hyphens[_lid].maxSylbs;
		l = word.length + 1;
		myword = "." + lower;
		vals = new Array(l + 1).fill(0);
		for (i = 0; i < l; i++) {
			sylb = "";
			for (j = 0; (i + j) < l; j++) {
				sylb += myword.substr(i + j, 1);
				if (j >= minSylbs && j <= maxSylbs) {
					// echo$sylb.'<BR>';
					if (sylbs.hasOwnProperty(sylb)) {
						sylbVals = sylbs[sylb];
						sl = sylb.length;
						for (k = -1; k <= sl; k++) vals[i + k] = Math.max(sylbVals[k + 1], vals[i + k]);
					}
				} else if (j > maxSylbs) {
					break;
				}
			}
		}
		ret = "";
		k = l - 3;
		m = 2;
		//c =  i18x.HYPHENCHAR;
		l--;
		for (i = 0; i < l; i++) {
			if ((vals[i] % 2) == 1 && i > m && i < k) ret += i18x.HYPHENCHAR;
			//if($vals[$i]!=0)$ret.=$vals[$i];
			ret += word.charAt(i); //substr(i, 1);
		}
	} else {
		exceptions = i18x.hyphens[_lid].exceptions;
		ret = "";
		w = exceptions[lower];
		c = w.length;
		j = 0;
		for (i = 0; i < c; i++) {
			if (w.substr(i, 1) == i18x.HYPHENCHAR) {
				ret += i18x.HYPHENCHAR;
			} else {
				ret += word.substr(j, 1);
				j++;
			}
		}
	}
	i18x.hypenCache[_lid][word] = ret;
	return ret;
}

String.prototype.Hyphenation = function (_lid = "") {
	let t, txts = this.valueOf(), ret = [], i;
	if (_lid == "") _lid = i18x.curLid;
	if (txts.indexOf("<") >= 0 && txts.indexOf(">") >= 0) {
		// xml text...
		let tags = {};
		let matches = txts.match(/(\<[^\>]+\>)/gm);
		if (matches != null) {
			for (let i = 0; i < matches.length; i++) {
				tags[matches[i]] = "17041963" + Math.minMaxRandom(0, 10000000) + i;
				txts = txts.replace(matches[i], tags[matches[i]]);
			}
		}
		txts = txts.split(" ");
		for (i = 0; i < txts.length; i++) {
			t = txts[i].trim();
			if (t != "") {
				ret.push(t.WordHyphenation(_lid));
			} else {
				ret.push(t);
			}
		}
		txts = ret.join(" ");
		if (matches != null) {
			for (let i = 0; i < matches.length; i++) {
				txts = txts.replace(tags[matches[i]], matches[i]);
			}
		}
		return txts.str_replace("\xAD", "&shy;");
	} else {
		txts = txts.split(" ");
		for (i = 0; i < txts.length; i++) {
			t = txts[i].trim();
			if (t != "") {
				ret.push(t.WordHyphenation(_lid));
			} else {
				ret.push(t);
			}
		}
	}
	return ret.join(" ");
}

String.prototype.FlagEmojiOfCountryCode = function () {
	return i18x.FlagEmojiOfCountryCode(this.valueOf());
}

String.prototype.FlagEmojiOfLanguageCode = function () {
	return i18x.FlagEmojiOfLanguageCode(this.valueOf());
}


