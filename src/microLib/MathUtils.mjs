// ===========================================
// MathUtils.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

/** General Math extensions.
 * @module MathUtils
 */

/** General Math extensions.
 * @class Math
 */

/** PI2 {number} Math.PI * 2.
 */
Math.PI2 = Math.PI * 2;

/** PI05 {number} Math.PI / 2.
 */
Math.PI05 = Math.PI / 2;

/** PI025 {number} Math.PI / 4.
 */
Math.PI025 = Math.PI / 4;

/** Math.PI075 {number} Math.PI / 4 * 3.
 */
Math.PI075 = Math.PI / 4 * 3;


/** Returns a value inside given range.
 * @param _value    The value to clamp.
 * @param _min    The minimum value to clamp to.
 * @param _max    The maximum value to clamp to.
 * @return {number}    the clamped value.
 */
Math.Clamp = function (_value, _min, _max) {
    if (_value < _min) return _min;
    if (_value > _max) return _max;
    return _value;
}

/** Returns the fraction of a floating number.
 * @param _v    The value to calculate the fraction from.
 * @return The fraction of the given value.
 */
Math.Frac = function (_v) {
    _v = Math.abs(_v)
    return _v - Math.floor(_v);
}

/** Returns an integer random number in range of a given minimum and a given maximum value.
 * @param _min    The minimum value.
 * @param _max    The maximum value.
 * @return     An integer random number between _min and _max.
 * @see Math.minMaxFloatRandom
 */
Math.minMaxRandom = function (_min, _max) {
    return Math.floor(Math.random() * (_max - _min + 1)) + _min;
}

/** Returns a float random number in range of a given minimum and a given maximum value.
 * @param _min    The minimum value.
 * @param _max    The maximum value.
 * @return     A float random number between _min and _max.
 * @see Math.minMaxRandom
 */
Math.minMaxFloatRandom = function (_min, _max) {
    return (Math.random() * (_max - _min)) + _min;
}

Math.probability = function (_percent) {
    return Math.random() <= (_percent / 100);
}

Math.OverLineCheck = function (_x, _y, _lx1, _ly1, _lx2, _ly2, _precision) {
    if (_x < Math.min(_lx1, _lx2) || _x > Math.max(_lx1, _lx2) || _y < Math.min(_ly1, _ly2) || _y > Math.max(_ly1, _ly2)) return false;
    let y2my1 = (_ly2 - _ly1), x2mx1 = (_lx2 - _lx1);
    let distance = Math.abs(y2my1 * _x - x2mx1 * _y + _lx2 * _ly1 - _ly2 * _lx1) / Math.sqrt(y2my1 * y2my1 + x2mx1 * x2mx1);
    return distance < _precision;
}

/*
 * Vectors
 */

Math.vectorLength = function (_xs, _ys, _xe, _ye) {
	let dx = _xs - _xe, dy = _ys - _ye;
	return Math.sqrt(dx * dx + dy * dy);
}
