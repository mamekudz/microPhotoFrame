// ===========================================
// DateUtils.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================


/** Number and Date prototype extensions to handle date and time.
 * @module DateUtils
 */

/** Number prototype extensions to handle numbers of date.
 * @class Number
 */

/** Returns a Date object given by a ticks number.
 * @returns {Date}    Date of Ticks.
 */
Number.prototype.DateOfTicks = function () {
	let v = this.valueOf();
	if (v == 0) return new Date(0);
	var d = new Date((v - 621355968000000000) / 10000);
	return d;
};
Number.prototype.Ticks = function () {
	return this.valueOf() * 10000 + 621355968000000000;
};
Number.prototype.TicksToMilliSeconds = function () {
	if (this.valueOf() == 0) return 0;
	return Math.floor((this.valueOf() - 621355968000000000) / 10000);
}


/** Date prototype extensions to handle date and time.
 * @class Date
 */

/** Number of ticks per day: 864000000000 */
Date.TICKS_PER_DAY = 864000000000;
/** Number of ticks per hour: 36000000000 */
Date.TICKS_PER_HOUR = 36000000000;
/** Number of ticks per minute: 600000000 */
Date.TICKS_PER_MINUTE = 600000000;
/** Number of ticks per second: 10000000 */
Date.TICKS_PER_SECOND = 10000000;
/** Number of ticks per millisecond: 10000 */
Date.TICKS_PER_MILLISECOND = 10000;
/** Number of ticks per µsec: 10 */
Date.TICKS_PER_MICROSECOND = 10;
/** Zero ticks (1900-01-01 00:00:00) */
Date.TICKS_ZERO = 0;
/** Number of ticks per week: 7*864000000000 */
Date.TICKS_PER_WEEK = 6048000000000;
/** Number of ticks per month: 30*864000000000 */
Date.TICKS_PER_MONTH = 25920000000000;


/** Returns the ticks of a Date object.
 * @returns {Date}    Ticks of Date.
 */
Date.prototype.Ticks = function () {
	return this.getTime() * 10000 + 621355968000000000;
}

Date.prototype.SetTicks = function (_ticks) {
	this.setTime((_ticks - 621355968000000000) / 10000);
	return this;
}

/**
 * Converts a UTC date string to a local time string in the format YYYY-MM-DDTHH:mm
 * for the German time zone (handles daylight saving time automatically).
 * @param {string} utcDateString - The UTC date string to convert (e.g., '2024-09-16T10:12:00.000Z').
 * @returns {string} - The local time string in the format 'YYYY-MM-DDTHH:mm'.
 */
Date.prototype.ConvertUtcToLocal = function (utcDateString) {
	const date = new Date(utcDateString); // Convert the UTC string to a JavaScript Date object
	
	// Get the local time in the German time zone (UTC+2 during DST, otherwise UTC+1)
	const options = {
		timeZone: 'Europe/Berlin',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	};
	
	// Format the date in the desired format: YYYY-MM-DDTHH:mm
	const formatter = new Intl.DateTimeFormat('en-GB', options);
	const parts = formatter.formatToParts(date);
	
	// Extract the parts (year, month, day, hour, minute) and build the string
	const year = parts.find(part => part.type === 'year').value;
	const month = parts.find(part => part.type === 'month').value;
	const day = parts.find(part => part.type === 'day').value;
	const hour = parts.find(part => part.type === 'hour').value;
	const minute = parts.find(part => part.type === 'minute').value;
	
	return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Converts .NET ticks to a human-readable local time string (German time zone).
 * @param {number} ticks - .NET ticks to convert (e.g., 638622622028834625).
 * @returns {string} - The local time string in the format 'YYYY-MM-DDTHH:mm'.
 */
Number.prototype.ConvertTicksToLocalTime = function () {
	// Convert ticks to Date object using existing dateOfTicks method
	const date = this.DateOfTicks();
	
	// Convert the date object to a local time string in the German time zone
	return date.ConvertUtcToLocal(date.toISOString());
}


Number.prototype.Ticks2UTCDateStr = function () {
	const date = this.DateOfTicks();
	return date.getUTCFullYear().PadStart(4, '0') + "-" + (date.getUTCMonth()+1).PadStart(2, '0') + "-" + date.getUTCDate().PadStart(2, '0');
}


function dateTimeToTicks(_date) {
	// 2016:02:15 19:08:20 +0000"
	let e;
	try {
		if (isNaN(_date)) {
			let d = new Date(Date.UTC(_date.substr(0, 4), _date.substr(5, 2) - 1, _date.substr(8, 2), _date.substr(11, 2), _date.substr(14, 2), _date.substr(17, 2)));
			let ret = d.getTime();
			if (_date.length > 19) {
				ret += parseInt(_date.substr(20), 10) * 60 * 1000;
				//!!! minutes calculations
			}
			return ret * 10000 + 621355968000000000;
		} else {
			if (_date > 621355968000000000) {
				// are already .NET ticks...
				return _date;
			} else {
				// it's a unix timestamp...
				return ret * 10000 + 621355968000000000;
			}
		}
		
	} catch (e) {
		return 0;
	}
}

Date.prototype.Timestamp = function (_asFloat) {
	if (_asFloat === undefined) _asFloat = false;
	return ((_asFloat) ? this.getTime() / 1000 : Math.round(this.getTime() / 1000));
}

Date.prototype.LocalTimestamp = function (_timezone) {
	if (_timezone === undefined) _timezone = this.getTimezoneOffset() * 60;
	return Math.floor(this.getTime() / 1000) + _timezone;
}

Date.prototype.AsLocalTime = function (_timeMinutesOffsetToGMT) {
	var ret = new Date(this);
	if (_timeMinutesOffsetToGMT === undefined) _timeMinutesOffsetToGMT = this.getTimezoneOffset();
	ret.setTime(ret.getTime() - _timeMinutesOffsetToGMT * 60 * 1000);
	return ret;
}

Date.prototype.UtcDateAsLocalDate = function () {
	return new Date(this.getUTCFullYear(), this.getUTCMonth(), this.getUTCDate(), 12, 0, 0);
}

Date.prototype.StartOfDay = function () {
	return new Date(this.getFullYear(), this.getMonth(), this.getDate(), 0, 0, 0);
}

Date.prototype.ToLocalTime = function (_timeMinutesOffsetToGMT) {
	var ret = new Date(this);
	if (_timeMinutesOffsetToGMT === undefined) _timeMinutesOffsetToGMT = this.getTimezoneOffset();
	ret.setTime(ret.getTime() - _timeMinutesOffsetToGMT * 60 * 1000);
	return ret;
}

Date.prototype.MillisecondsFrom = function (_from) {
	return _from.getTime() - this.getTime();
}

Date.prototype.Log = function (_txt) {
	if (_txt !== undefined) {
		console.Log(_txt, this);
	} else {
		console.Log(this);
	}
}

Date.prototype.SetTimestamp = function (_unixTimestamp) {
	return this.setTime(_unixTimestamp * 1000);
}

Date.prototype.Timestamp = function () {
	return Math.floor(Date.UTC(this.getUTCFullYear(), this.getUTCMonth(), this.getUTCDate(), this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds()) / 1000);
}

Date.prototype.GetWeekOfYear = function () {
	let d = new Date(+this);
	d.setHours(0, 0, 0);
	d.setDate(d.getDate() + 4 - (d.getDay() || 7));
	return Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 8.64e7) + 1) / 7);
}

Date.prototype.GetDayOfYear = function () {
	let d = new Date(this.getFullYear(), 0, 0);
	return Math.floor((this - d) / 8.64e+7);
}

Date.prototype.GetLastDayOfMonthUTCDate = function () {
	let d = new Date(Date.UTC(this.getUTCFullYear(), this.getUTCMonth() + 1, 0, 0, 0));
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds()));
}

Date.prototype.GetUpToNowTicks = function () {
	//return this.Ticks() - Date.nowTicks();
	return Date.nowTicks() - this.Ticks();
}

//function now() {
//	return Math.round(new Date().getTime() / 1000);
//}

Date.nowTimestamp = function () {
	return Date.now();
}

Date.nowTicks = function () {
	return Date.now().Ticks();
}

String.prototype.ReleaseDate2DateTime = function () {
	let d = this.valueOf();
	return new Date(d.substr(0, 4), d.substr(5, 2) - 1, d.substr(8, 2), d.substr(11, 2), d.substr(14, 2), 0);
}

String.prototype.ReleaseDateYear = function () {
	let d = this.valueOf();
	return parseInt(d.substr(0, 4), 10);
}

export function convertToGermanDateTimeString(isoDateTimeString) {
	const date = new Date(isoDateTimeString); // Parse the ISO string to Date object
	
	// Convert to German date-time format
	const day = String(date.getDate()).PadStart(2, '0');
	const month = String(date.getMonth() + 1).PadStart(2, '0'); // Months are zero-based in JS
	const year = date.getFullYear();
	const hours = String(date.getHours()).PadStart(2, '0');
	const minutes = String(date.getMinutes()).PadStart(2, '0');
	
	return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export function calculateEaster(year) {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31);
	const day = ((h + l - 7 * m + 114) % 31) + 1;
	
	return new Date(Date.UTC(year, month - 1, day));
}

/** Object of unix timestamps of holidays of each year.
 *  This object is updated by updateHolidaysOfYear function.
 */
export let holidays = {};

export function getHolidaysOfYear(_year) {
	// List of fixed holidays
	let ret = {};
	ret[new Date(Date.UTC(_year, 1 - 1, 1)).Ticks()] = [{
		type: 2,
		info: "New Year's Day<context=\"holiday name\"/>".I18xRegister()
	}];
	ret[new Date(Date.UTC(_year, 1 - 1, 6)).Ticks()] = [{
		type: 2,
		info: "Holy Kings<context=\"holiday name\"/>".I18xRegister()
	}];
	ret[new Date(Date.UTC(_year, 5 - 1, 1)).Ticks()] = [{
		type: 2,
		info: "Labor Day<context=\"holiday name\"/>".I18xRegister()
	}];
	ret[new Date(Date.UTC(_year, 10 - 1, 3)).Ticks()] = [{
		type: 2,
		info: "German Unity Day<context=\"holiday name\"/>".I18xRegister()
	}];
	ret[new Date(Date.UTC(_year, 11 - 1, 1)).Ticks()] = [{
		type: 2,
		info: "All Saints Day<context=\"holiday name\"/>".I18xRegister()
	}];
	ret[new Date(Date.UTC(_year, 12 - 1, 25)).Ticks()] = [{
		type: 2,
		info: "Christmas Day<context=\"holiday name\"/>".I18xRegister()
	}];
	ret[new Date(Date.UTC(_year, 12 - 1, 26)).Ticks()] = [{
		type: 2,
		info: "Boxing Day<context=\"holiday name\"/>".I18xRegister()
	}];
	
	// Calculate Easter Sunday for the current year
	const easterDate = calculateEaster(_year);
	ret[easterDate.Ticks()] = [{type: 2, info: "Easter Sunday<context=\"holiday name\"/>".I18xRegister()}];
	
	// Good Friday (2 days before Easter)
	const goodFriday = new Date(easterDate);
	goodFriday.setDate(easterDate.getDate() - 2);
	ret[goodFriday.Ticks()] = [{type: 2, info: "Good Friday<context=\"holiday name\"/>".I18xRegister()}];
	
	// Easter Monday (1 day after Easter)
	const easterMonday = new Date(easterDate);
	easterMonday.setDate(easterDate.getDate() + 1);
	ret[easterMonday.Ticks()] = [{type: 2, info: "Easter Monday<context=\"holiday name\"/>".I18xRegister()}];
	
	// Ascension Day (39 days after Easter)
	const ascensionDay = new Date(easterDate);
	ascensionDay.setDate(easterDate.getDate() + 39);
	ret[ascensionDay.Ticks()] = [{type: 2, info: "Ascension Day<context=\"holiday name\"/>".I18xRegister()}];
	
	// Pentecost Sunday (49 days after Easter)
	const pentecostSunday = new Date(easterDate);
	pentecostSunday.setDate(easterDate.getDate() + 49);
	ret[pentecostSunday.Ticks()] = [{type: 2, info: "Pentecost Sunday<context=\"holiday name\"/>".I18xRegister()}];
	
	// Pentecost Monday (50 days after Easter)
	const pentecostMonday = new Date(easterDate);
	pentecostMonday.setDate(easterDate.getDate() + 50);
	ret[pentecostMonday.Ticks()] = [{type: 2, info: "Pentecost Monday<context=\"holiday name\"/>".I18xRegister()}];
	
	// Corpus Christi (60 days after Easter)
	const corpusChristi = new Date(easterDate);
	corpusChristi.setDate(easterDate.getDate() + 60);
	ret[corpusChristi.Ticks()] = [{type: 2, info: "Corpus Christi<context=\"holiday name\"/>".I18xRegister()}];
	
	return ret;
}

export function updateHolidaysOfYear(_year) {
	if (!holidays.hasOwnProperty(_year)) {
		holidays[_year] = getHolidaysOfYear(_year);
	}
	return "";
}

Date.prototype.GetHoliday = function () {
	let y = this.getFullYear(), t = this.Ticks();
	updateHolidaysOfYear(y);
	if (holidays[y].hasOwnProperty(t)) {
		return holidays[y][t];
	}
	return [];
}