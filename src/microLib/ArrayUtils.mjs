// ===========================================
// ArrayUtils.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

import ObjectUtils from "./ObjectUtils.mjs";

/**
 * Array prototype extensions.
 * @module ArrayUtils
 */

/** General Array extensions.
 * @class Array
 */

/** Clears the array.
 */
Array.prototype.Clear = function () {
	this.length = 0;
}

/** Push a value if it is not currently in this array.
 * @param {*} _n    Any value to push.
 */
Array.prototype.PushIfNotIn = function (_n) {
	if (this.indexOf(_n) < 0) this.push(_n);
}

/** Checks whether there is an intersection of this array and the array _a.
 * @param {array} _a    An array to check an intersection.
 * @return {boolean}    True, if there is an intersection of both arrays.
 */
Array.prototype.IsIntersection = function (_a) {
	let i, l = this.length;
	for (i = 0; i < l; i++) if (_a.indexOf(this[i]) >= 0) return true;
	return false;
}

/** Checls whether this array contains all values of the array _a.
 * @param {array} _a    An array to check an containing values.
 * @return {boolean}    True, if all elements of this array are contains in array _a.
 */
Array.prototype.ContainsAll = function (_a) {
	// true => this array contains all of _a...
	let i, l = this.length;
	for (i = 0; i < l; i++) if (_a.indexOf(this[i]) < 0) return false;
	return true;
}

Array.prototype.AddJSON = function (_json) {
	let i;
	for (i in _json) this[i] = _json[i];
}

Array.prototype.RemoveElement = function (_e) {
	let i, l = this.length;
	for (i = 0; i < l; i++) if (_e == this[i]) this.splice(i, 1);
}

Array.prototype.CleanMultiple = function () {
	// !!!!!!!!!!!!!!!!!!!!!!!!!!  WRONG !!!!!!!!!!!!!!!
	let i, ret = this, l = ret.length;
	this.length = 0;
	for (i = 0; i < l; i++) if (!this.indexOf(ret[i])) this.push(ret[i]);
}

Array.prototype.RemoveElements = function (_e) {
	let i, l = this.length;
	for (i = 0; i < l; i++) if (_e.indexOf(this[i]) >= 0) this.splice(i, 1);
}

Array.prototype.RemoveAt = function (_n) {
	this.splice(_n, 1);
}

Array.prototype.Kjoin = function (_e) {
	let i, n = "";
	for (i in this) if (!(this[i] instanceof Function)) n += i + ":" + this[i] + _e;
	return n;
}

Array.prototype.Copy = function () {
	let i, ret = [];
	for (i in this) if (!(this[i] instanceof Function)) ret[i] = this[i];
	return ret;
}

Array.prototype.IsEqualTo = function (_ary) {
	let i, l = this.length;
	if (l !== _ary.length) return false;
	for (i = 0; i < l; i++) {
		// Check if both elements are objects before using areEqual
		if (typeof this[i] === 'object' && this[i] !== null && typeof _ary[i] === 'object' && _ary[i] !== null) {
			if (!ObjectUtils.areEqual(this[i], _ary[i])) return false;
		} else {
			// Use strict equality for non-object types
			if (this[i] !== _ary[i]) return false;
		}
	}
	return true;
}

Array.prototype.Log = function (_txt) {
	if (_txt !== undefined) {
		console.Log(_txt, this);
	} else {
		console.Log(this);
	}
}

Array.prototype.Merge = function (_ary) {
	let i, l = this.length, res = {}, ret = [];
	for (i = 0; i < l; i++) res[this[i]] = true;
	l = _ary.length;
	for (i = 0; i < l; i++) res[_ary[i]] = true;
	for (a in res) ret.push(a);
	return ret;
}

Array.prototype.ToObject = function () {
	let i, l = this.length, ret = {};
	for (i = 0; i < l; i++) ret[this[i]] = true;
	return ret;
}

Array.prototype.IntegerContent = function () {
	let i, l = this.length, ret = [];
	for (i = 0; i < l; i++) ret.push(parseInt(this[i], 10));
	return ret;
}

Array.prototype.MoveUp = function (_i) {
	let l = this.length, old;
	if (l == 0) return -1;
	if (_i == l - 1) return l - 1;
	old = this[_i + 1];
	this[_i + 1] = this[_i];
	this[_i] = old;
	return _i + 1;
}

Array.prototype.MoveDown = function (_i) {
	let l = this.length, old;
	if (l == 0) return -1;
	if (_i == 0) return 0;
	old = this[_i - 1];
	this[_i - 1] = this[_i];
	this[_i] = old;
	return _i - 1;
}

Array.prototype.MoveEnd = function (_i) {
	let l = this.length, old;
	if (l == 0) return -1;
	if (_i == l - 1) return l - 1;
	old = this[_i];
	this.splice(_i, 1);
	this.push(old);
	return l - 1;
}

Array.prototype.MoveBegin = function (_i) {
	let l = this.length, old;
	if (l == 0) return -1;
	if (_i == 0) return 0;
	old = this[_i];
	this.splice(_i, 1);
	this.unshift(old);
	return 0;
}

Array.prototype.InsertAt = function (_at, _v) {
	this.splice(_at, 0, _v);
}

Array.prototype.ToInt = function () {
	let l = this.length, i;
	for (i = 0; i < l; i++) this[i] = this[i] | 0;
	return this;
}

Array.prototype.First = function () {
	if (this.length == 0) {
		return null;
	} else {
		return this[0];
	}
}

Array.prototype.JoinWithoutEmpty = function (_clue) {
	let r = [], i, l = this.length;
	for (i = 0; i < l; i++) if (this[i] != "") r.push(this[i]);
	return r.join(_clue);
}

/**
 * Extension to convert Uint8Array to Base64.
 * @returns {string} Base64 string
 */
Uint8Array.prototype.ToBase64 = function () {
	const CHUNK_SZ = 0x8000; // 32KB Chunks gegen Stack-Overflow
	const chunks = [];
	for (let i = 0; i < this.length; i += CHUNK_SZ) {
		chunks.push(String.fromCharCode.apply(null, this.subarray(i, i + CHUNK_SZ)));
	}
	return btoa(chunks.join(""));
}