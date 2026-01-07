// ===========================================
// JSONProtocol.js
// ©2022-2025 Dosing GmbH
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

/** Module to manage json protocol data.
 * @module JSONProtocol
 */

import './i18x.mjs';
import './RESTX.mjs';
import User from "./User.mjs";
import RESTX from "./RESTX.mjs";

/** Class which represents a json protocol.
 * @class JSONProtocol
 */
export default class JSONProtocol {
	
	/** STATIC: All loaded JSON protocol configurations.
	 * @static
	 * @type  {object}
	 */
	static jsonProtocolDefinitionCache = {};
	s
	/** STATIC: Gets a JSON protocol configuration from server.
	 * @method getJSONProtocolDefinition
	 * @static
	 * @param {string} _protocolIdName   	The JSON protocol configuration to load.
	 * @param {boolean} _forceReload   		true, if configuration should be reload (defualt = false).
	 * @return {Promise}
	 */
	static getJSONProtocolDefinition = function (_protocolIdName, _forceReload = false) {
		if (_forceReload && _userId <= 0) _forceReload = false;
		if (JSONProtocol.jsonProtocolDefinitionCache.hasOwnProperty(_protocolIdName) && !_forceReload) {
			return new Promise(
				function (_resolve, _reject) {
					_resolve(JSONProtocol.jsonProtocolDefinitionCache[_protocolIdName]);
				})
		} else {
			let rest = new RESTX(this);
			return rest.promiseCall("getJSONProtocolDefinition", {protocolIdName: _protocolIdName})
				.then(
					function (_res) {
						JSONProtocol.jsonProtocolDefinitionCache[_protocolIdName] = _res.output.definition;
						return _res.output.definition;
					},
					function (_res) {
						JSONProtocol.jsonProtocolDefinitionCache[_protocolIdName] = null;
						this.reject();
					});
		}
	}
}