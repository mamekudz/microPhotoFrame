// ===========================================
// MathAniUtils.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================


/** Math extensions to handle animations.
 * @module MathAniUtils
 */

/** Math extensions to handle animations.
 * @class Math
 */

/** Returns a linear interpolated value.
 * Simple linear tweening - no easing, no acceleration.
 * @param _t    Time.
 * @param _b    The minimum value to clamp to.
 * @param _c    The maximum value to clamp to.
 * @param _d    The maximum value to clamp to.
 * @returns {number}    The interpolated value.
 */
Math.linearTween = function (_t, _b, _c, _d) {
	// simple linear tweening - no easing, no acceleration
	return _c * _t / _d + _b;
}

/** Returns a quadration into interpolated value.
 * Simple linear tweening - no easing, no acceleration.
 * @param _t    Time.
 * @param _b    The minimum value to clamp to.
 * @param _c    The maximum value to clamp to.
 * @param _d    The maximum value to clamp to.
 * @returns {number}    The interpolated value.
 */
Math.easeInQuad = function (t, b, c, d) {
	// quadratic easing in - accelerating from zero velocity
	t /= d;
	return c * t * t + b;
}

/** Returns a quadration out interpolated value.
 * Simple linear tweening - no easing, no acceleration.
 * @param _t    Time.
 * @param _b    The minimum value to clamp to.
 * @param _c    The maximum value to clamp to.
 * @param _d    The maximum value to clamp to.
 * @returns {number}    The interpolated value.
 */
Math.easeOutQuad = function (t, b, c, d) {
	// quadratic easing out - decelerating to zero velocity
	t /= d;
	return -c * t * (t - 2) + b;
}

/** Returns a quadration into/out interpolated value.
 * Simple linear tweening - no easing, no acceleration.
 * @param _t    Time.
 * @param _b    The minimum value to clamp to.
 * @param _c    The maximum value to clamp to.
 * @param _d    The maximum value to clamp to.
 * @returns {number}    The interpolated value.
 */
Math.easeInOutQuad = function (t, b, c, d) {
	// quadratic easing in/out - acceleration until halfway, then deceleration
	t /= d / 2;
	if (t < 1) return c / 2 * t * t + b;
	t--;
	return -c / 2 * (t * (t - 2) - 1) + b;
}

/** Returns a in cubic  interpolated value.
 * Simple linear tweening - no easing, no acceleration.
 * @param _t    Time.
 * @param _b    The minimum value to clamp to.
 * @param _c    The maximum value to clamp to.
 * @param _d    The maximum value to clamp to.
 * @returns {number}    The interpolated value.
 */
Math.easeInCubic = function (t, b, c, d) {
	// cubic easing in - accelerating from zero velocity
	t /= d;
	return c * t * t * t + b;
}

/** Returns a out cubic  interpolated value.
 * Simple linear tweening - no easing, no acceleration.
 * @param _t    Time.
 * @param _b    The minimum value to clamp to.
 * @param _c    The maximum value to clamp to.
 * @param _d    The maximum value to clamp to.
 * @returns {number}    The interpolated value.
 */
Math.easeOutCubic = function (t, b, c, d) {
	//cubic easing out - decelerating to zero velocity
	t /= d;
	t--;
	return c * (t * t * t + 1) + b;
}

/** Returns a in/out cubic  interpolated value.
 * Simple linear tweening - no easing, no acceleration.
 * @param _t    Time.
 * @param _b    The minimum value to clamp to.
 * @param _c    The maximum value to clamp to.
 * @param _d    The maximum value to clamp to.
 * @returns {number}    The interpolated value.
 */
Math.easeInOutCubic = function (t, b, c, d) {
	// cubic easing in/out - acceleration until halfway, then deceleration
	t /= d / 2;
	if (t < 1) return c / 2 * t * t * t + b;
	t -= 2;
	return c / 2 * (t * t * t + 2) + b;
}

Math.easeInQuart = function (t, b, c, d) {
	// quartic easing in - accelerating from zero velocity
	t /= d;
	return c * t * t * t * t + b;
}

Math.easeOutQuart = function (t, b, c, d) {
	// quartic easing out - decelerating to zero velocity
	t /= d;
	t--;
	return -c * (t * t * t * t - 1) + b;
}

Math.easeInOutQuart = function (t, b, c, d) {
	// quartic easing in/out - acceleration until halfway, then deceleration
	t /= d / 2;
	if (t < 1) return c / 2 * t * t * t * t + b;
	t -= 2;
	return -c / 2 * (t * t * t * t - 2) + b;
}

Math.easeInQuint = function (t, b, c, d) {
	// quintic easing in - accelerating from zero velocity
	t /= d;
	return c * t * t * t * t * t + b;
}

Math.easeOutQuint = function (t, b, c, d) {
	// quintic easing out - decelerating to zero velocity	t/=d;
	t--;
	return c * (t * t * t * t * t + 1) + b;
}

Math.easeInOutQuint = function (t, b, c, d) {
	// quintic easing in/out - acceleration until halfway, then deceleration
	t /= d / 2;
	if (t < 1) return c / 2 * t * t * t * t * t + b;
	t -= 2;
	return c / 2 * (t * t * t * t * t + 2) + b;
}

Math.easeInSine = function (t, b, c, d) {
	// sinusoidal easing in - accelerating from zero velocity
	return -c * Math.cos(t / d * Math.PI05) + c + b;
}

Math.easeOutSine = function (t, b, c, d) {
	// sinusoidal easing out - decelerating to zero velocity
	return c * Math.sin(t / d * Math.PI05) + b;
}

Math.easeInOutSine = function (t, b, c, d) {
	// sinusoidal easing in/out - accelerating until halfway, then decelerating
	return -c / 2 * (Math.cos(2 * Math.PI * t / d) - 1) + b;
}

Math.easeInExpo = function (t, b, c, d) {
	// exponential easing in - accelerating from zero velocity
	return c * Math.pow(2, 10 * (t / d - 1)) + b;
}

Math.easeOutExpo = function (t, b, c, d) {
	// exponential easing out - decelerating to zero velocity
	return c * (-Math.pow(2, -10 * t / d) + 1) + b;
}

Math.easeInOutExpo = function (t, b, c, d) {
	// exponential easing in/out - accelerating until halfway, then decelerating
	t /= d / 2;
	if (t < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
	t--;
	return c / 2 * (-Math.pow(2, -10 * t) + 2) + b;
}

Math.easeInCirc = function (t, b, c, d) {
	// circular easing in - accelerating from zero velocity
	t /= d;
	return -c * (Math.sqrt(1 - t * t) - 1) + b;
}

Math.easeOutCirc = function (t, b, c, d) {
	// circular easing out - decelerating to zero velocity
	t /= d;
	t--;
	return c * Math.sqrt(1 - t * t) + b;
}

Math.easeInOutCirc = function (t, b, c, d) {
	// circular easing in/out - acceleration until halfway, then deceleration
	t /= d / 2;
	if (t < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
	t -= 2;
	return c / 2 * (Math.sqrt(1 - t * t) + 1) + b;
}

Math.ANILINEARTWEEN = 0;
Math.ANIEASEINQUAD = 1;
Math.ANIEASEOUTQUAD = 2;
Math.ANIEASEINOUTQUAD = 3;
Math.ANIEASEINCUBIC = 4;
Math.ANIEASEOUTCUBIC = 5;
Math.ANIEASEINOUTCUBIC = 6;
Math.ANIANIEASEINQUART = 7;
Math.ANIEASEOUTQUART = 8;
Math.ANIEASEINOUTQUART = 9;
Math.ANIEASEINQUINT = 10;
Math.ANIEASEOUTQUINT = 11;
Math.ANIEASEINOUTQUINT = 12;
Math.ANIEASEINSINE = 13;
Math.ANIEASEOUTSINE = 14;
Math.ANIEASEINOUTSINE = 15;
Math.ANIEASEINEXPO = 16;
Math.ANIEASEOUTEXPO = 17;
Math.ANIEASEINOUTEXPO = 18;
Math.ANIEASEINCIRC = 19;
Math.ANIEASEOUTCIRC = 20;
Math.ANIEASEINOUTCIRC = 21;

Math.animate = function (_t, _mint, _maxt, _minv, _maxv, _mode) {
	if (_t < _mint) _t = _mint;
	if (_t > _maxt) _t = _maxt;
	switch (_mode) {
		case Math.ANILINEARTWEEN:
			return Math.linearTween(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEINQUAD:
			return Math.easeInQuad(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEOUTQUAD:
			return Math.easeOutQuad(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEINOUTQUAD:
			return Math.easeInOutQuad(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEINCUBIC:
			return Math.easeInCubic(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEOUTCUBIC:
			return Math.easeOutCubic(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEINOUTCUBIC:
			return Math.easeInOutCubic(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIANIEASEINQUART:
			return Math.easeInQuart(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEOUTQUART:
			return Math.easeOutQuart(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEINOUTQUART:
			return Math.easeInOutQuart(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEINQUINT:
			return Math.easeInQuint(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEOUTQUINT:
			return Math.easeOutQuint(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEINOUTQUINT:
			return Math.easeInOutQuint(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEINSINE:
			return Math.easeInSine(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEOUTSINE:
			return Math.easeOutSine(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEINOUTSINE:
			return Math.easeInOutSine(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEINEXPO:
			return Math.easeInExpo(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEOUTEXPO:
			return Math.easeOutExpo(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEINOUTEXPO:
			return Math.easeInOutExpo(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEINCIRC:
			return Math.easeInCirc(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEOUTCIRC:
			return Math.easeOutCirc(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		case Math.ANIEASEINOUTCIRC:
			return Math.easeInOutCirc(_t - _mint, 0, _maxv - _minv, _maxt - _mint) + _minv;
		default:
			return (_maxv - _minv) / 2 + _minv;
	}
}