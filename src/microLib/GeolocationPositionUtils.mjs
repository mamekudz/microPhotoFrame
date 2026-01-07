// ===========================================
// GeolocationPositionUtils.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

/**
 * A class extension of Javascript GeolocationPosition object.
 * @module GeolocationPositionUtils
 */
import './MathUtils.mjs';

/** Class with extended geolocation methods.
 * This class is an extension of Geolocation.
 * @class GeolocationPosition
 */

/** Calculates the distance between this geolocation position and a given geolocation position.
 * @method distanceTo
 * @instance
 * @param _toGeoPos        The GeolocationPosition to get the distance to.
 * @returns {number}    The distance in meter to the given geolocation.
 */
GeolocationPosition.prototype.DistanceTo = function (_toGeoPos) {
	const r = 6371
	let dLat = (_toGeoPos.coords.latitude - this.coords.latitude).toRad(),
		dLon = (_toGeoPos.coords.longitude - this.coords.longitude).toRad(),
		a, c;
	a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(this.coords.latitude.toRad()) * Math.cos(_toGeoPos.latitude.toRad()) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return r * c * 1000;
}

/** Returns a new GeolocationPosition object where the location is moved by meters in latitude and longitude.
 * @method move
 * @instance
 * @param _mLat        Latitude meters to move.
 * @param _mLng        Longitude meters to move.
 * @returns {object}   A new GeolocationPosition object with new geo coordinates.
 */
GeolocationPosition.prototype.Move = function (_mLat, _mLng) {
	const r = 6371;
	let ret = Object.assign(new GeolocationPosition(),this);
	ret.coords.latitude=this.coords.latitude + (_mLat * 1000 / r) * (180 / Math.PI);
	ret.coords.longitude= this.coords.longitude + (_mLng * 1000 / r) * (180 / Math.PI) / Math.cos(this.coords.latitude * Math.PI / 180)
	return ret;
}
