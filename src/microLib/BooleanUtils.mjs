// ===========================================
// BooleanUtils.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

/**
 * Boolean prototype extensions.
 * @module ArrayUtils
 */

/** General Boolean extensions.
 * @class Array
 */
export default class BooleanUtils {
	static trueString = 'yes<context="boolean standard text">'.I18xTrans();
	static falseString = 'no<context="boolean standard text">'.I18xTrans()
}

/** Boolean to String.
 */
Boolean.prototype.asString = function (_trueString = null, _falseString = null) {
	if (_trueString == null) _trueString = BooleanUtils.trueString;
	if (_falseString == null) _falseString = BooleanUtils.falseString;
	return this.valueOf() ? _trueString : _falseString;
}

Boolean.prototype.asNumber = function () {
	return this.valueOf() ? 1 : 0;
}