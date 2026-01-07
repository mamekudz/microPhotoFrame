// ===========================================
// ObjectUtils.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

/** A class to handle javascript Objects.
 * @module ObjectUtils
 */

import "./JSONUtils.mjs";
import "./StringUtils.mjs";

/** A class to handle javascript Objects.
 * @class ObjectUtils
 */
export default class ObjectUtils {
	
	static joinFlatValues(_obj, _clue, _pre = "", _post = "") {
		// old version...
		let o, r = "";
		for (o in _obj) if (_obj[o] != "") r += ((r == "") ? "" : _clue) + _obj[o];
		if (r != "") r = _pre + r + _post;
		return r;
	}
	
	static cloneExtended(_o1) {
		return JSON.extendedParse(JSON.extendedStringify(_o1));
	}
	
	static clone(_o1) {
		return JSON.parse(JSON.stringify(_o1));
	}
	
	static copyProperties(_o1, _o2) {
		let a;
		for (a in _o1) _o2[a] = _o1[a];
	}
	
	static copyMissingProperties(_o1, _o2) {
		let a;
		for (a in _o1) if (!_o2.hasOwnProperty(a)) _o2[a] = _o1[a];
	}
	
	static anyMissingKeys(_o1, _o2) {
		let a;
		for (a in _o2) if (!_o1.hasOwnProperty(a)) return true;
		return false;
	}
	
	/** Creating a new object containing all keys of two objects.
	 * @method merge
	 * @instance
	 * @static
	 * @param {object} _o1       Object to copy.
	 * @param {object} _o2       Object to copy.
	 * @return {object}          he new object.
	 */
	static merge(_o1, _o2) {
		let a, ret = {};
		for (a in _o1) ret[a] = _o1[a];
		for (a in _o2) ret[a] = _o2[a];
		return ret;
	}
	
	/** Copying all keys from object _fromObj into object _toObj and returns _toObj.
	 * @method mergeTo
	 * @instance
	 * @static
	 * @param {object} _toObj       Object to copy to.
	 * @param {object} _fromObj     Object to copy from.
	 * @return {object}             The new _toObj.
	 */
	static mergeTo(_toObj, _fromObj) {
		let a;
		for (a in _fromObj) _toObj[a] = _fromObj[a];
		return _toObj;
	}
	
	/** Copying all keys from object _fromObj into object _toObj.
	 * @method mergeInto
	 * @instance
	 * @static
	 * @param {object} _fromObj   Object to copy from.
	 * @param {object} _toObj   Object to copy to.
	 * @return {void}
	 */
	static mergeInto(_fromObj, _toObj) {
		let a;
		for (a in _fromObj) _toObj[a] = _fromObj[a];
	}
	
	static mergePropsTo(_o1, _ps, _o2) {
		let a;
		for (a in _o1) if (_ps.indexOf(a) >= 0) _o2[a] = _o1[a];
		return _o2;
	}
	
	static mergeSavedMode(_o1, _o2) {
		let a, ret = {}, err;
		for (a in _o1) {
			try {
				ret[a] = _o1[a];
			} catch (err) {
			}
		}
		for (a in _o2) {
			try {
				ret[a] = _o2[a];
			} catch (err) {
			}
		}
		return ret;
	}
	
	static isEmpty(_o) {
		if (_o == null) return true;
		if (typeof (_o.length) !== "undefined") {
			if (_o.length > 0) return false;
			if (_o.length === 0) return true;
		}
		for (let key in _o) {
			if (Object.prototype.hasOwnProperty.call(_o, key)) return false;
		}
		return true;
	}
	
	static propExists(_o, _p) {
		if (_o === undefined) return false;
		if (_o[_p] === undefined) return false;
		if (_o[_p] == null) return false;
		return !ObjectUtils.isEmpty(_o[_p]);
	}
	
	static add(_addto1, _o2) {
		let a, ret = {};
		for (a in _o2) _addto1[a] = _o2[a];
	}
	
	static count(_o){
		if(Array.isArray(_o)){
			return _o.length;
		}else if(Object.is(_o)){
			return Object.keys(_o).length;
		}
		return 0;
	}
	
	static sort(o, _func = null) {
		let sorted = {}, key, a = [];
		for (key in o) if (o.hasOwnProperty(key)) a.push(key);
		if (_func == null) {
			a.sort();
		} else {
			a.sort(_func);
		}
		for (key = 0; key < a.length; key++) sorted[a[key]] = o[a[key]];
		return sorted;
	}
	
	static sortByProperty(o, _func) {
		let sorted = {}, key, a = [], k;
		for (key in o) o[key].key = key;
		for (key in o) if (o.hasOwnProperty(key)) a.push(o[key]);
		a.sort(_func);
		for (key = 0; key < a.length; key++) {
			k = a[key].key;
			sorted[k] = o[k];
			delete sorted[k].key;
		}
		return sorted;
	}
	
	static insertFirstProperty(o, pn, pv) {
		let ret = {};
		ret[pn] = pv;
		for (let key in o) ret[key] = o[key];
		return ret;
	}
	
	/** Returns the number of keys in object.
	 * @method countKeys
	 * @instance
	 * @static
	 * @param {object} _o   Object where to count keys.
	 * @return {number}     The number of keys in object.
	 */
	static countKeys(_o) {
		if (!_o) return 0;
		return Object.keys(_o).length;
	}
	
	/** Returns whether the given value is available in the given object.
	 * @method containsValue
	 * @instance
	 * @static
	 * @param {object} _o   Object to check.
	 * @param {*} _v        Value to search for.
	 * @return {boolean}    true, if the given value is available in object.
	 */
	static containsValue(_o, _v) {
		let key;
		for (key in _o) if (_o[key] == _v) return true;
		return false;
	}
	
	/** Returns the first key of in object.
	 * @method lastKey
	 * @instance
	 * @static
	 * @param {object} _o   Object to convert.
	 * @return {string}     undefined, if the object is empty or the first key in object.
	 */
	static firstKey(_o) {
		for (let key in _o) if (_o.hasOwnProperty(key)) return key;
		return undefined;
	}
	
	/** Returns the value of the first key in object.
	 * @method first
	 * @instance
	 * @static
	 * @param {object} _o   Object to convert.
	 * @return {*}          undefined, if the object is empty or the value of the first key in object.
	 */
	static first(_o) {
		for (let key in _o) if (_o.hasOwnProperty(key)) return _o[key];
		return undefined;
	}
	
	/** Returns the last key of in object.
	 * @method lastKey
	 * @instance
	 * @static
	 * @param {object} _o   Object to get the key from.
	 * @return {string}     The last key in object.
	 */
	static lastKey(_o) {
		let ret = null;
		for (let key in _o) if (_o.hasOwnProperty(key)) ret = key;
		return ret;
	}
	
	/** Returns the value of the last key in object.
	 * @method last
	 * @instance
	 * @static
	 * @param {object} _o    Object to get the value from.
	 * @return {*}           undefined, if the object is empty or the value of the last key in object.
	 */
	static last(_o) {
		let ret = undefined;
		for (let key in _o) if (_o.hasOwnProperty(key)) ret = key;
		if (ret != null) {
			return _o[ret];
		} else {
			return ret;
		}
	}
	
	/** Returns the key at position _pos.
	 * @method keyOfPos
	 * @instance
	 * @static
	 * @param {object} _o   Object to search in.
	 * @param {number} _pos The position of the searched key.
	 * @return {*}          undefined, if object is empty or the key from position _pos.
	 */
	static keyOfPos(_o, _pos) {
		let i = 0;
		for (let key in _o) {
			if (i == _pos) return key;
			i++;
		}
		return undefined;
	}
	
	/** Returns the value of the key at position _pos.
	 * @method valueOfKeyPos
	 * @instance
	 * @static
	 * @param {object} _o   Object to search in.
	 * @param {number} _pos The search value.
	 * @return {*}          undefined, if object is empty or the value of the key at position _pos.
	 */
	static valueOfKeyPos(_o, _pos) {
		let i = 0;
		for (let key in _o) {
			if (i == _pos) return _o[key];
			i++;
		}
		return undefined;
	}
	
	/** Checks whether a value is given in an object, returns false or the first key with the given value.
	 * @method keyOfValue
	 * @instance
	 * @static
	 * @param {object} _o   Object to search in.
	 * @param {*} _value    The search value.
	 * @return {boolean}    undefined, if key is not present in object or the key was found the key.
	 */
	static keyOfValue(_o, _value) {
		if (_o == null) return undefined;
		for (let key in _o) if (_value === _o[key]) return key;
		return undefined;
	}
	
	/** Converts the keys of an object to an array, where the values will be lost.
	 * @method keys2Array
	 * @instance
	 * @static
	 * @param {object} _o   Object to convert.
	 * @return {array}      The resulting array of object keys.
	 */
	static keys2Array(_o) {
		let ret = [];
		for (let key in _o) if (_o.hasOwnProperty(key)) ret.push(key);
		return ret;
	}
	
	/** Converts an object to an array, where the keys will be lost.
	 * @method toArray
	 * @instance
	 * @static
	 * @param {object} _o   Object to convert.
	 * @return {array}      The resulting array of the object.
	 */
	static toArray(_o) {
		let ret = [];
		for (let key in _o) if (_o.hasOwnProperty(key)) ret.push(_o[key]);
		return ret;
	}
	
	/** Checks whether two objects contains exactly same keys.
	 * @method sameKeys
	 * @instance
	 * @static
	 * @param {object} _ao    Object to check.
	 * @param {object} _bo    Object to compare with.
	 * @return {boolean} true, if both objects contains exactly same keys.
	 */
	static sameKeys(_ao, _bo) {
		let at = typeof _ao, bt = typeof _bo, key;
		if (_ao === false && _bo === false) return true;
		if (at == bt) {
			if (at == "object") {
				if (Object.keys(_ao).length == Object.keys(_bo).length) {
					for (key in _ao) if (!_bo.hasOwnProperty(key)) return false;
					return true;
				}
			}
		}
		return false;
	}
	
	static nextKey(_o, _key) {
		let key, wasLast = false, first, wasFirst = false;
		if (Object.keys(_o).length == 0) return "";
		for (key in _o) {
			if (!wasFirst) {
				wasFirst = true;
				first = key;
			}
			if (wasLast) return key;
			if (_key == key) wasLast = true;
		}
		return first;
	}
	
	static previousKey(_o, _key) {
		let key, last = null, first, wasFirst = false;
		if (Object.keys(_o).length == 0) return "";
		for (key in _o) {
			if (!wasFirst) {
				wasFirst = true;
				first = key;
			}
			if (_key == key) {
				if (last != null) return last;
			}
			last = key;
		}
		return first;
	}
	
	static removeFirstAtCount(_o, _count) {
		let key;
		if (Object.keys(_o).length > _count) {
			for (key in _o) {
				delete _o[key];
				break;
			}
		}
	}
	
	/** Changing the key order in object. The key _key will be moved one position down.
	 * @method moveDownProperty
	 * @instance
	 * @static
	 * @param {object} _o       Object to change.
	 * @param {string} _key     The key which have to move down.
	 * @return {object}         The changed object.
	 */
	static moveDownProperty(_o, _key) {
		let ret = {}, v, k, state = 0, key;
		for (key in _o) {
			switch (state) {
				case 0:
					if (key == _key) {
						k = key;
						v = _o[key];
						state = 1;
					} else {
						ret[key] = _o[key];
					}
					break;
				case 1:
					ret[key] = _o[key];
					ret[k] = v;
					state = 2;
					break;
				case 2:
					ret[key] = _o[key];
					break;
			}
		}
		if (state == 1) ret[k] = v;
		return ret;
	}
	
	/** Changing the key order in object. The key _key will be moved one position up.
	 * @method moveUpProperty
	 * @instance
	 * @static
	 * @param {object} _o       Object to change.
	 * @param {string} _key     The key which have to move up.
	 * @return {object}         The changed object.
	 */
	static moveUpProperty(_o, _key) {
		let ret = {}, kp, kpf, i = 0, key;
		for (key in _o) {
			i++;
			if (key == _key) {
				if (i == 1) return _o;
				kpf = kp;
				break;
			} else {
				kp = key;
			}
		}
		for (key in _o) {
			if (key == kpf) {
				ret[_key] = _o[_key];
				ret[kpf] = _o[kpf];
			} else if (key != _key) {
				ret[key] = _o[key];
			}
		}
		return ret;
	}
	
	/** Mixing the key order in object.
	 * @method rndKeys
	 * @instance
	 * @static
	 * @param {object} _o       Object to change.
	 * @return {object}         The mixed object.
	 */
	static rndKeys(_o) {
		let n = Object.keys(_o).length, r = {}, a = [], key;
		for (key in _o) a.push(key);
		while (a.length > 0) {
			n = Math.minMaxRandom(0, a.length - 1);
			key = a[n];
			a.splice(n, 1);
			r[key] = _o[key];
		}
		r = _o;
		return r;
	}
	
	/** Converts all object values to htmlEntities-strings.
	 * @method htmlEntities
	 * @instance
	 * @static
	 * @param {object} _o       Object to convert values to htmlEntities-strings.
	 * @return {object}         A converted object.
	 */
	static htmlEntities(_o) {
		let key, ret = {};
		for (key in _o) ret[key] = (_o[key] + "").HtmlEntities();
		return ret;
	}
	
	/** Checks whether two objects are equal
	 * @method areEqual
	 * @instance
	 * @static
	 * @param {object} _o1   First object.
	 * @param {object} _o2   Second object.
	 * @return {boolean}    true, if the objects are equal.
	 */
	static areEqual(_o1, _o2) {
		if (_o1 === _o2) return true;
		
		if (typeof _o1 !== 'object' || _o1 === null || typeof _o2 !== 'object' || _o2 === null) {
			return false;
		}
		
		if (Array.isArray(_o1) && Array.isArray(_o2)) {
			if (_o1.length !== _o2.length) return false;
			
			for (let i = 0; i < _o1.length; i++) {
				if (!this.areEqual(_o1[i], _o2[i])) {
					return false;
				}
			}
			return true;
		}
		
		if (Array.isArray(_o1) || Array.isArray(_o2)) {
			return false;
		}
		
		let keys1 = Object.keys(_o1);
		let keys2 = Object.keys(_o2);
		
		if (keys1.length !== keys2.length) return false;
		if (this.anyMissingKeys(_o2, _o1)) return false;
		
		for (let key of keys1) {
			if (!this.areEqual(_o1[key], _o2[key])) {
				return false;
			}
		}
		
		return true;
	}
	
}

if (typeof window !== 'undefined') window.ObjectUtils = ObjectUtils;

