// ===============================================
// RESTX.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

/** Functions and classes for RESTX communication.
 * @module RESTX
 */

import './MathUtils.mjs';
import './WebUtils.mjs';
import './JSONUtils.mjs';
import ObjectUtils from './ObjectUtils.mjs';
import WebUtils from "./WebUtils.mjs";
import Users from "./Users.mjs";

let REST_ERROR_ENUMERATOR = 0;

/** Class to manage extended and standardized REST (Representational State Transfer) services.
 * This class is an extension of XMLHttpRequest.
 * The RESTX communication used a standardized JSON object to handle inputs, outputs, errors and debugging.
 * Additional keys will handle user data and browser information. RESTX uses only POST communication and
 * can handle multiple messages for long time requests (hanging requests).
 * @class RESTX
 * @see <a target="i18x" ref="https://de.wikipedia.org/wiki/Representational_State_Transfer">Wikipedia</a> *
 */
export default class RESTX extends XMLHttpRequest {
  static lastRestRequestTime = 0;
  static hostUrl = "/webservice";
  static restErrorHandler = null;
  static onMaintanceWorkChangeEvents = {};
  static onMaintanceWorkChangeEventsObjects = {};

  /** @constant ERROR {array} A rest error. */
  static ERROR = {
    /** ERROR.NONE {number} No RESTX error. */
    NONE: REST_ERROR_ENUMERATOR--,
    /** ERROR.UNKNOWN {number} An unknown REST error. */
    UNKNOWN: REST_ERROR_ENUMERATOR--,
    /** ERROR.UNKNOWN_ACTION {number} An unknown REST action/webservice. */
    UNKNOWN_ACTION: REST_ERROR_ENUMERATOR--,
    /** ERROR.MAINTENANCE_WORK_ACTIVE {number} Servers maintenance mode is active. */
    MAINTENANCE_WORK_ACTIVE: REST_ERROR_ENUMERATOR--,
    /** ERROR.INVALID_JSON {number} An invalid json was received. */
    INVALID_JSON: REST_ERROR_ENUMERATOR--,
    /** ERROR.INVALID_SESSION_ID {number} An invalid server session was received. */
    INVALID_SESSION_ID: REST_ERROR_ENUMERATOR--,
    /** ERROR.SESSION_ID_EXPIRED {number} The server session is expired. */
    SESSION_ID_EXPIRED: REST_ERROR_ENUMERATOR--,
    /** ERROR.SESSION_ID_EXPECTED {number} A server session was expected. */
    SESSION_ID_EXPECTED: REST_ERROR_ENUMERATOR--,
    /** ERROR.DB_CONNECTION_FAILED {number} A database connection failed. */
    DB_CONNECTION_FAILED: REST_ERROR_ENUMERATOR--,
    /** ERROR.DB_REQUEST_FAILED {number} A database request failed. */
    DB_REQUEST_FAILED: REST_ERROR_ENUMERATOR--,

    /** ERROR.FAILED_MAILSEND {number} A mail sending failed. */
    FAILED_MAILSEND: REST_ERROR_ENUMERATOR--,

    /** ERROR.WRONG_CAPTCHA {number} The captcha which was sent is wrong. */
    WRONG_CAPTCHA: REST_ERROR_ENUMERATOR--,
    /** ERROR.WRONG_USERNAME {number} The user's name which was sent is wrong. */
    WRONG_USERNAME: REST_ERROR_ENUMERATOR--,
    /** ERROR.WRONG_EMAIL {number} The user's e-mail which was sent is wrong. */
    WRONG_EMAIL: REST_ERROR_ENUMERATOR--,
    /** ERROR.WRONG_PASSWORD {number} The user's password which was sent is wrong. */
    WRONG_PASSWORD: REST_ERROR_ENUMERATOR--,
    /** ERROR.WRONG_USERNAME_OR_PASSWORD {number} The user's password or the user's name which was sent is wrong. */
    WRONG_USERNAME_OR_PASSWORD: REST_ERROR_ENUMERATOR--,

    /** ERROR.BLOCKED_IP {number} The ip from where the request was sent is blocked. */
    BLOCKED_IP: REST_ERROR_ENUMERATOR--,
    /** ERROR.BLOCKED_DOMAIN {number} The domain from where the request was sent is blocked. */
    BLOCKED_DOMAIN: REST_ERROR_ENUMERATOR--,

    /** ERROR.BLOCKED_ACCOUNT {number} The account from which the request was sent is blocked. */
    BLOCKED_ACCOUNT: REST_ERROR_ENUMERATOR--,
    /** ERROR.DELETED_ACCOUNT {number} The account from which the request was sent is deleted. */
    DELETED_ACCOUNT: REST_ERROR_ENUMERATOR--,
    /** ERROR.UNREGISTERED_ACCOUNT {number} The account from which the request was sent is not registered. */
    UNREGISTERED_ACCOUNT: REST_ERROR_ENUMERATOR--,
    /** ERROR.UNCONFIRMED_ACCOUNT {number} The account from which the request was sent is registered but not confirmed. */
    UNCONFIRMED_ACCOUNT: REST_ERROR_ENUMERATOR--,
    /** ERROR.ACCOUNT_ALREADY_EXISTS {number} The account which will be registered already exist. */
    ACCOUNT_ALREADY_EXISTS: REST_ERROR_ENUMERATOR--,
    /** ERROR.NICKNAME_ALREADY_EXISTS {number} While changing user data or register an account: the wanted nickname ist already used by another account. */
    NICKNAME_ALREADY_EXISTS: REST_ERROR_ENUMERATOR--,

    /** ERROR.UNKNOWN_CONFIRMATION {number} While user account confirmation: The confirmation action id is unknown. */
    UNKNOWN_CONFIRMATION: REST_ERROR_ENUMERATOR--,
    /** ERROR.CONFIRMATION_EXPIRED {number} While user account confirmation: The confirmation request is expired. */
    CONFIRMATION_EXPIRED: REST_ERROR_ENUMERATOR--,
    /** ERROR.INVALID_CONFIRMATION {number} While user account confirmation: The confirmation id is invalid. */
    INVALID_CONFIRMATION: REST_ERROR_ENUMERATOR--,
    /** ERROR.CONFIRMATION_ALREADY_DONE {number} While user account confirmation: The confirmation was already done. */
    CONFIRMATION_ALREADY_DONE: REST_ERROR_ENUMERATOR--,

    /** ERROR.SMTP_ERROR {number} While a mail sending: A smtp error occurred. */
    SMTP_ERROR: REST_ERROR_ENUMERATOR--,
    /** ERROR.SMTP_WRONG_ADDRESS_FORMAT {number} While a mail sending: The email address has a wrong format. */
    SMTP_WRONG_ADDRESS_FORMAT: REST_ERROR_ENUMERATOR--,

    /** ERROR.INVALID_IDNAME {number} The id name of the request was wrong. */
    INVALID_IDNAME: REST_ERROR_ENUMERATOR--,
    /** ERROR.INVALID_PZN {number} The pzn of the request was wrong. */
    INVALID_PZN: REST_ERROR_ENUMERATOR--,
    /** ERROR.NEEDLESS_PROCEDURE {number} The pzn of the request was wrong. */
    NEEDLESS_PROCEDURE: REST_ERROR_ENUMERATOR--,
    /** ERROR.PROCESS_BLOCKED {number} The requested process was blocked. */
    PROCESS_BLOCKED: REST_ERROR_ENUMERATOR--,
    /** ERROR.ENTRY_NOTFOUND {number} The requested entry not found. */
    ENTRY_NOTFOUND: REST_ERROR_ENUMERATOR--,

    /** ERROR.DLN_CANNOTDELETE_PRODUCTSREGISTERED {number} At delivery notes: product registration can not delete. */
    DLN_CANNOTDELETE_PRODUCTSREGISTERED: REST_ERROR_ENUMERATOR--,
    /** ERROR.DLN_CANNOTDELETE_LOCKED {number} At delivery notes: product registration can not delete because it is locked. */
    DLN_CANNOTDELETE_LOCKED: REST_ERROR_ENUMERATOR--,
    /** ERROR.DLN_CANNOTDELETE_LOCKED {number} At delivery notes: invalid operation. */
    DLN_INVALID_OPERATION: REST_ERROR_ENUMERATOR--,
    /** ERROR.DLN_CANNOTDELETE_LOCKED {number} At delivery notes: error because manufacture name is empty. */
    DLN_EMPTY_MANUFACTURERNAME: REST_ERROR_ENUMERATOR--,
    /** ERROR.DLN_CANNOTDELETE_LOCKED {number} At delivery notes: error because a product conflict occurs. */
    DLN_PRODUCT_CONFIRMORDER_CONFLICT: REST_ERROR_ENUMERATOR--,
    /** ERROR.DLN_CANNOTDELETE_LOCKED {number} At delivery notes: error because title was not unique. */
    DLN_DOUBLE_TITLE: REST_ERROR_ENUMERATOR--,

    /** ERROR.INVALID_OPERATION {number} Invalid operation. */
    INVALID_OPERATION: REST_ERROR_ENUMERATOR--,
    /** ERROR.OPERATION_FAILED {number} Operation failed. */
    OPERATION_FAILED: REST_ERROR_ENUMERATOR--,

    /** ERROR.INVALID_OPERATION {number} Signing operation failed because of a missing signature. */
    SIGNING_FAILED_SIGNATURE_MISSING: REST_ERROR_ENUMERATOR--,
    /** ERROR.SIGNING_FAILED_ALREADY_SIGNED {number} Signing operation failed because of document was already signed. */
    SIGNING_FAILED_ALREADY_SIGNED: REST_ERROR_ENUMERATOR--,
    /** ERROR.SIGNING_FAILED_SAME_USER_AS_CREATED {number} Signing operation failed because of signature iuser s same as creator user. */
    SIGNING_FAILED_SAME_USER_AS_CREATED: REST_ERROR_ENUMERATOR--,

    /** ERROR.SIGNING_FAILED_SAME_USER_AS_CREATED {number} While mail send: Information mail sending not allowed by user. */
    MISSING_MAIL_ALLOWEDS: REST_ERROR_ENUMERATOR--,

    /** ERROR.WEBSERVICE_NONE_CONCURRENT_WEBSERVICE_VIOLATION {number} If a running webservice is started which can not run multiple times. */
    WEBSERVICE_NONE_CONCURRENT_WEBSERVICE_VIOLATION: REST_ERROR_ENUMERATOR--,

    /** ERROR.WEBSERVICE_NONE_CONCURRENT_TASK_VIOLATION {number} If there are none concurrent task already running. */
    WEBSERVICE_NONE_CONCURRENT_TASK_VIOLATION: REST_ERROR_ENUMERATOR--,

    UNAUTHORIZED: REST_ERROR_ENUMERATOR--,
    CONFLICT: REST_ERROR_ENUMERATOR--,
    DUAL_CONTROL_VIOLATED: REST_ERROR_ENUMERATOR--,
    WRONG_USER_CANCEL: REST_ERROR_ENUMERATOR--
  };

  /** The constructor of the RESTX object.
   * @constructor
   */
  constructor(_vueComponent = null) {
    super();
    this.vueComponent = _vueComponent;
    this.isRunning = false;
    this.timeout = undefined;
    this.wasAbortedByUser = false;
    this.wasAbortedBySystem = false;
  }

  sendBeacon = function (_serviceName, _input = {}) {
    let d = new Date();
    let uri = RESTX.hostUrl + "?action=" + _serviceName + "&nocache=" + d.getTime() + "" + Math.minMaxRandom(0, 10000);
    let data = {
      ok: true,
      action: _serviceName,
      error: {
        msg: "",
        details: "",
        code: RESTX.ERROR.NONE
      },
      //#eMail: (userpwActions.indexOf(_serviceName) >= 0) ? curUser.eMail : "",
      //#password: (userpwActions.indexOf(_serviceName) >= 0) ? curUser.password : "",
      //#usersId: curUser.usersId,
      //#platform: PLATFORM,
      userMD5: Users.curUser.md5,
      lid: i18x.curLid,
      nlid: navigator.language,
      //#timezone: TIMEZONE,
      timezone: "GMT",
      noOfLogins: 0,
      debug: {},
      input: _input,
      output: {}
    }
    navigator.sendBeacon(uri, JSON.stringify(data));
  }

  /** The AJAX central call function.
   * @method call
   * @instance
   * @param _serviceName  {string}    The service name to call from server.
   * @param _input   {object}         The RESTX input object.
   * @param _limit    {string}
   * @param _async     {string}
   * @param _cache     {string}
   * @param _byRestart    {string}
   */
  call = function (_serviceName, _input = {}, _timeout = 0, _limit = true, _async = true, _cache = false, _byRestart = false) {
    this.wasAbortedBySystem = false;
    this.serviceName = _serviceName;
    if (this.isRunning) this.abort();
    if (this.timeout !== undefined) this.timeout = clearTimeout(this.timeout);
    if (_limit && _async && !_byRestart) {
      if (RESTX.lastRestRequestTime + 100 < Date.now()) {
        this.isRunning = true;
        this.timeout = setTimeout(RESTX.#restartRest, 100, this, _serviceName, _input, _timeout, _limit, true, _cache);
        return;
      }
    }
    let userpwActions = ["logIn", "userRegister", "userNewPassword"];
    let uri, rest = {
      ok: true,
      action: _serviceName,
      error: {
        msg: "",
        details: "",
        code: RESTX.ERROR.NONE
      },
      //#eMail: (userpwActions.indexOf(_serviceName) >= 0) ? curUser.eMail : "",
      //#password: (userpwActions.indexOf(_serviceName) >= 0) ? curUser.password : "",
      //#usersId: curUser.usersId,
      //#platform: PLATFORM,
      userMD5: (Users.curUser) ? Users.curUser.md5 : "",
      lid: i18x.curLid,
      nlid: navigator.language,
      //#timezone: TIMEZONE,
      timezone: "GMT",
      noOfLogins: 0,
      debug: {},
      input: _input,
      output: {}
    }
    //#curUser.password = "";
    if (_timeout != 0) this.timeout = _timeout;
    this.serviceName = _serviceName;
    let d = new Date();
    //#uri = CONF_WEBSERVICE_URL + "?action=" + _action + "&nocache=" + d.getTime() + "" + Math.minMaxRandom(0, 10000);
    uri = RESTX.hostUrl + "?action=" + _serviceName + "&nocache=" + d.getTime() + "" + Math.minMaxRandom(0, 10000);
    /*-- @<BUILD_NEVER_AT_RELEASES:Production --*/
    if (WebUtils.GetParameterExists("nonelocal")) uri += "&nonelocal=true";
    if (WebUtils.GetParameterExists("adLogin")) uri += "&adLogin=" + WebUtils.GetParameter("adLogin", "");
    /*-- @>BUILD_NEVER_AT_RELEASES --*/
    this.open("POST", uri, _async);
    //this.setRequestHeader('accept-encoding','deflate');
    this.setHeader();
    this.startTime = new Date().getTime();
    //log("REST ACTION=",CONF_WEBSERVICE_URL+"?action="+_action,rest);
    //log("Request size:",JSON.stringify(rest).length);
    //JSON.isCyclic(rest);
    //console.Log("call rest ",this.isRunning);
    this.isRunning = true;
    this.send(JSON.stringify(rest));
    RESTX.lastRestRequestTime = Date.now();
  }

  /** Makes a rest call and returns a promise for it.
   * @method promiseCall
   * @instance
   * @return {Promise}  A promise.
   *
   * @example
   * function RestPromiseTest() {
   *   let rest = new RESTX(this);
   *   rest.promiseCall("getMyText")
   *       .then(_res => document.getElementById("myText").innerText = _res.output,
   *           function(_res){throw new Error("_res");})
   *       .catch(_err => console.Log("Error on rest call 'getMyText'!",_err));
   * }
   */
  promiseCall = function (_serviceName, _input = {}, _preMessageCallback = null) {
    let oldmsgNo = -1;
    let self = this;
    let ret = new Promise(
      function (_resolve, _reject) {
        self.onprogress = function (_ev) {
        }
        self.onreadystatechange = function (_ev) {
          //console.Log("A");
          if (_preMessageCallback != null) {
            //console.Log("B");
            if (true) {
              let pms = self.getPreMsgsStrs();
              if (oldmsgNo != pms.length) {
                for (let m = oldmsgNo + 1; m < pms.length; m++) {
                  let msg = self.getPreMsgNo(m, pms);
                  if (msg != null) _preMessageCallback(msg.msg);
                }
              }
              oldmsgNo = pms.length - 1;
            } else {
              let output = self.getLastPreMsg();
              //console.Log(self.responseText);
              if (output != null) {
                //console.Log("C");
                if (oldmsgNo != output.no) {
                  //console.Log(output.msg)
                  _preMessageCallback(JSON.parse(output.msg));
                  //console.Log(output.msg.output);
                  //ClientLog.Html(output.msg.output);
                  oldmsgNo = output.no;
                }
              }
            }
          }
          if (self.readyState == RESTX.DONE) {
            let res = self.finish();
            if (res.hasOwnProperty("maintenances")) {
              //console.Log("readyState",res);
              let oma = Config.maintenanceActive;
              Config.maintenanceActive = res.maintenances != null;
              if (oma != Config.maintenanceActive) {
                RESTX.onMaintanceWorkChanged();
              }
            }
            if (res.ok) {
              _resolve(res);
            } else {
              if (res.error.code != 0 && res.error.msg != "" && (Config.generalServerErrorHandler != null || self.vueComponent != null)) {
                if (Config.generalServerErrorHandler != null) {
                  Config.generalServerErrorHandler(res,
                    function () {
                      _reject(res);
                    });
                }
                if (self.vueComponent != null) {
                  self.vueComponent.$root.$refs.TheModalOverlay.hideOverlay();
                  let alertHtml = '<b>' + res.error.msg.HtmlEntities();
                  alertHtml += '</b>';
                  if (res.error.details && res.error.details !== '') {
                    alertHtml += '<br>' + res.error.details;
                  }
                  self.vueComponent.$root.$refs.TheModalAlert.showAlert(alertHtml, res.error.title,
                    function () {
                      _reject(res);
                    });
                }
              } else {
                _reject(res);
              }
            }
          }
        }
        self.onabort = function () {
          self.wasAbortedBySystem = true;
          //console.Log("aborted",self);
          let res = self.finish();
          res.wasAbort = true;
          _reject(res);
        }
        self.onerror = function () {
          if (self.wasAbortedBySystem) return;
          let res = self.finish();
          _reject(res);
        }
      }
    )
    self.call(_serviceName, _input);
    return ret;
  }

  /** Finishing a rest call.
   * @method finish
   * @instance
   * @return {string}  Same as input parameter $_text.
   *
   * Example
   */
  finish = function () {
    this.isRunning = false;
    let err, ret = {
      ok: false,
      error: { msg: "", code: 0 },
      statusCode: this.status,
      statusText: this.statusText
    },
      om = "", msg;

    try {
      const mainMsg = this.getMsgs().mainmsg;
      if (mainMsg) {
        ret = ObjectUtils.clone(mainMsg);
        // Ensure error object exists
        if (!ret.hasOwnProperty("error") || ret.error == null) {
          ret.error = { msg: "", code: 0 };
        }
      } else {
        ret.ok = false;
      }
    } catch (err) {
      ret = this.setError(RESTX.ERROR.INVALID_JSON, ret);
    }

    if (this.status === 200) {
      switch (this.action) {
        case "logIn":
          //curUserName=CONF_USERNAME;
          //curPassword=CONF_PASSWORD;
          break;
        case "logOut":
          //curUserName=CONF_USERNAME;
          //curPassword=CONF_PASSWORD;
          break;
      }
      /*-- @<BUILD_NEVER_AT_RELEASES:Production --*/
      if (!ret.ok) console.error("ajax error, request status=" + this.status, ret);
      /*-- @>BUILD_NEVER_AT_RELEASES --*/
      if (ret.ok) {
        //#if (ret.usersId != curUser.usersId) DisposeCurrentUser();
        if (ret.hasOwnProperty("changedUser")) {
          //console.error("changedUser");
          Users.curUser = new User(ret.changedUser);
          Users.usersCache[Users.curUser.usersId] = Users.curUser;
          Users.onUserChanged();
        }
      } else {
        // Ensure error object exists before accessing it
        if (!ret.hasOwnProperty("error") || ret.error == null) {
          ret.error = { msg: "", code: 0 };
        }
        om = ret.error.msg || "";
        ret = this.setError(ret.error.code || 0, ret);
        if (om != ret.error.msg) ret.error.omsg = om;
        if (ret.error.code == RESTX.ERROR.INVALID_SESSION_ID || ret.error.code == RESTX.ERROR.SESSION_ID_EXPIRED || ret.error.code == RESTX.ERROR.SESSION_ID_EXPECTED) Users.disposeCurrentUser();
      }
    } else {
      /*-- @<BUILD_NEVER_AT_RELEASES:Production,Test --*/
      if (this.action != "startUpCheck") {
        if (this.responseText.trim() != "") {
          //#let w = window.open("REST Errors", APPID + ":REST Errors", "resizable=yes,scrollbars=yes");
          let w = window.open("", "REST_ERROR", "resizable=yes,scrollbars=yes");
          if (w !== undefined && w !== null && typeof (w) !== "undefined") w.document.write(this.responseText);
          console.error(this.status, ret, this.responseText);
        }
      }
      /*-- @>BUILD_NEVER_AT_RELEASES --*/
      ret = this.setError(ret.error.code, ret);
      if (this.restErrorHandler != null) {
        this.restErrorHandler(ret);
      }
      //if (this.status == 403 && this.action != "logOut") {
      //	Users.disposeCurrentUser();
      //	//#curGUI.ShowAlert('Authentification Required.<context="general server error message"/>'.I18xTrans(), 'Sorry, but you have to login for this action.<context="general server error message"/>'.I18xTrans());
      //}
    }

    if (ret == null) ret = { ok: false, error: { msg: "", code: 0 } };
    if (!ret.hasOwnProperty("output")) ret.output = {};
    this.elapsedTime = new Date().getTime() - this.startTime;
    //log("RequestTime="+this.elapsedTime+"ms",ret);
    ret.status = this.status;
    return ret;
  }

  restart(_action, _input, _timeout, _limit) {
    this.call(_action, _input, _timeout, _limit);
  }

  abortByUser = function () {
    this.wasAbortedByUser = true;
    this.abort();
  }

  /** Aborts a rest call which was started by method promiseCall.
   * @method abortPromiseCall
   * @instance
   * @see {@link promiseCall}
   */
  abortPromiseCall = function (_withError = true) {
    this.wasAbortedBySystem = true;
    let wasTimer = false;
    if (this.timeout !== undefined) {
      this.timeout = clearTimeout(this.timeout);
      wasTimer = true;
    }
    if (this.isRunning) {
      if (!_withError) this.onerror = null;
      this.abort();
      if (_withError) if (this.onerror) this.onerror();
    } else if (wasTimer) {
      if (!_withError) this.onerror = null;
      if (_withError) if (this.onerror) this.onerror();
    }
    this.isRunning = false;
  }

  /** Returns an object of all received messages:
   * ```js
   * {
   *     prevmsgs:[],
   *     mainmsg:null,
   *     postmsgs[],
   * }
   * ```
   * @method getMsgs
   * @instance
   * @return {array}  An object with server messages.
   */
  getMsgs = function () {
    let msgs, msg, m, err, ret = { prevmsgs: [], mainmsg: null, postmsgs: [] };
    if (this.responseText !== null) {
      if (this.responseText.indexOf("\n//###AJAX-MESSAGE###//\n") >= 0) {
        msgs = this.responseText.split("\n//###AJAX-MESSAGE###//\n");
        if (msgs.length > 0) {
          for (m = msgs.length - 1; m >= 0; m--) {
            try {
              msg = msgs[m].substr(13);
              switch (msgs[m].substr(0, 12)) {
                case "//PREVMSG://":
                  ret.prevmsgs.push(msg.JsonParse());
                  break;
                case "//MAINMSG://":
                  ret.mainmsg = msg.JsonParse();
                  ret.mainmsg = ObjectUtils.Merge({
                    ok: false,
                    error: { msg: "", code: 0 }
                  }, msg.JsonParse());
                  break
                case "//POSTMSG://":
                  ret.postmsgs.push(msg.JsonParse());
                  break;
              }
            } catch (err) {
              console.error("!!!!PARSE RESTX.ERROR ON MESSAGE!!!!!", msg.substr(0, 20) + "....");
              console.Log(msg);
              console.error(err);
            }
          }
        }
      }else{
        ret.mainmsg = this.responseText.JsonParse();
      }
    }
    return ret;
  }

  /** Returns an object of all received messages:
   * ```js
   * {
   *     no:0,        // message number
   *     msg:null     // object of received json, null
   * }
   * ```
   * @method getLastPreMsg
   * @instance
   * @return {array}  An object with server messages or null if no messages available.
   */
  getLastPreMsg = function () {
    let msgs, msg, m, err, mso = null;
    if (this.responseText !== null) {
      //log("lastMessage",this.responseText);
      if (this.responseText.indexOf("//###AJAX-MESSAGE###//\n") >= 0) {
        msgs = this.responseText.split("//###AJAX-MESSAGE###//\n");
        //log(this.responseText);
        if (msgs.length > 0) {
          for (m = msgs.length - 1; m >= 0; m--) {
            try {
              msg = msgs[m].substr(13);
              if (msgs[m].substr(0, 12) == "//PREVMSG://") {
                mso = msg.JsonParse();
                return { no: m, msg: mso };
              }
            } catch (err) {
            }
          }
        }
      }
    }
    return null;
  }

  getPreMsgsStrs = function () {
    let msgs, msg, m, mso = null, ret = [];
    if (this.responseText !== null) {
      //log("lastMessage",this.responseText);
      if (this.responseText.indexOf("//###AJAX-MESSAGE###//\n") >= 0) {
        msgs = this.responseText.split("//###AJAX-MESSAGE###//\n");
        //log(this.responseText);
        if (msgs.length > 0) {
          for (m = 0; m < msgs.length; m++) {
            msg = msgs[m].substr(13);
            if (msgs[m].substr(0, 12) == "//PREVMSG://") {
              ret.push(msg);
            }
          }
        }
      }
    }
    return ret;
  }

  getPreMsgNo = function (_no, _preMsgStrs = null) {
    let err;
    if (_preMsgStrs == null) _preMsgStrs = this.getPreMsgsStrs();
    try {
      if (_preMsgStrs.length > 0 && _preMsgStrs.length > _no) {
        return { no: _no, msg: _preMsgStrs[_no].JsonParse() };
      }
    } catch (err) {
    }
    return null;
  }

  setError = function (_errno, _ret, _errmsgadd) {
    if (_errmsgadd === undefined) _errmsgadd = "";
    if (_ret == null) _ret = { ok: false, error: { msg: "", title: "", code: 0 } }
    _ret.ok = false;
    if (parseInt(_errmsgadd, 10) == -11802) _errno = 403;
    if (_errno > 0 || _errno == RESTX.ERROR.INVALID_JSON) {
      _ret.error.title = 'Server Error<context="server error title"/>'.I18xTrans();
      switch (_errno) {
        case RESTX.ERROR.INVALID_JSON:
          _ret.error.msg = 'JSON error<context="server error"/>'.I18xTrans();
          break;
        case 401:
          _ret.error.msg = 'Session timed out. Please log in again.<context="server error"/>'.I18xTrans();
          break;
        case 403:
          _ret.error.msg = 'Forbidden access.<context="server error"/>'.I18xTrans();
          break;
        //case 403:_ret.error.msg='Wrong password or username.<context=\"server error"/>'.I18xTrans();break;
        case 404:
          _ret.error.msg = 'Server data not available.<context="server error"/>'.I18xTrans();
          break;
        case 408:
          _ret.error.msg = 'Server time out.<context="server error"/>'.I18xTrans();
          break;
        case 500:
          _ret.error.msg = 'Internal server error.<context="server error"/>'.I18xTrans();
          break;
        case 503:
          _ret.error.msg = 'Proxy error, please check network connection.<context="server error"/>'.I18xTrans();
          break;
      }
      /*-- @<BUILD_NEVER_AT_RELEASES:Production --*/
      if (_ret.details !== undefined) _ret.error.msg += _ret.details;
      /*-- @>BUILD_NEVER_AT_RELEASES --*/
      _ret.error.code = _errno;
    }
    if (_errno < 0) {
      _ret.error.title = 'Server Error<context="server error title"/>'.I18xTrans();
      switch (_errno) {
        case RESTX.ERROR.SESSION_ID_EXPECTED:
        case RESTX.ERROR.INVALID_SESSION_ID:
        case RESTX.ERROR.SESSION_ID_EXPIRED:
          _ret.error.msg = 'Session timed out.<context="server error text"/>'.I18xTrans();
          break;
        case RESTX.ERROR.DLN_CANNOTDELETE_PRODUCTSREGISTERED:
          _ret.error.msg = 'There are always products registered to this delivery note.<context="server error text"/>'.I18xTrans();
          break;
        case RESTX.ERROR.DLN_CANNOTDELETE_LOCKED:
          _ret.error.msg = 'Delivery note is locked.<context="server error text"/>'.I18xTrans();
          break;
        case RESTX.ERROR.DLN_INVALID_OPERATION:
          _ret.error.msg = 'This operation is not allowed.<context="server error text"/>'.I18xTrans();
          break;
        case RESTX.ERROR.DLN_EMPTY_MANUFACTURERNAME:
          _ret.error.msg = 'There is no manufacturer name defined.<context="server error text"/>'.I18xTrans();
          break;
        case RESTX.ERROR.DLN_DOUBLE_TITLE:
          _ret.error.msg = 'Delivery note title already exists.<context="server error text">'.I18xTrans();
          break;
        case RESTX.ERROR.MAINTENANCE_WORK_ACTIVE:
          _ret.error.title = 'Maintenance Mode<context="server error title"/>'.I18xTrans();
          _ret.error.msg = 'Sorry, maintenance mode is currently active on server.<newline/>Please try again later.<context="server error text"/>'.I18xTrans();
          break;
        case RESTX.ERROR.WEBSERVICE_NONE_CONCURRENT_WEBSERVICE_VIOLATION:
          _ret.error.title = 'Webservice Same Time Running Violation<context="server error title"/>'.I18xTrans();
          _ret.error.msg = 'The webservice can only run once at the same time on server or a none concurrent web service is just running.<newline/>Please try again later.<context="server error text"/>'.I18xTrans();
          break;
        case RESTX.ERROR.WEBSERVICE_NONE_CONCURRENT_TASK_VIOLATION:
          _ret.error.title = 'Concurrent Webservice Run<context="server error title"/>'.I18xTrans();
          _ret.error.msg = 'A concurrent web service is already running on server.<newline/>Please try again later.<context="server error text"/>'.I18xTrans();
          break;
        case RESTX.ERROR.INVALID_OPERATION:
          _ret.error.msg = 'Invalid operation.<context="server error text"/>'.I18xTrans();
          break;
        case RESTX.ERROR.OPERATION_FAILED:
          _ret.error.msg = 'Operation failed.<context="server error text"/>'.I18xTrans();
          break;
        case RESTX.ERROR.CONFLICT:
          _ret.error.msg = 'Conflict with the current state of the target resource.<context="server error text"/>'.I18xTrans();
          break;
        case RESTX.ERROR.DUAL_CONTROL_VIOLATED:
          _ret.error.msg = 'Dual control principle violated.<context="server error text"/>'.I18xTrans();
          break;
        case RESTX.ERROR.WRONG_USER_CANCEL:
          _ret.error.msg = 'You are not authorized to cancel this action.<context="server error text"/>'.I18xTrans();
          break;
        case RESTX.ERROR.UNKNOWN_ACTION:
          _ret.error.msg = 'Unknown action.<context="server error text"/>'.I18xTrans();
          break;
        default:
          _ret.error.title = 'Unknown Server Error<context="server error title"/>'.I18xTrans();
          _ret.error.msg = 'Unknown server error, please try again later.<context="server error text"/>'.I18xTrans();
      }
    }

    console.Log(_ret);

    return _ret;
  }

  setHeader = function (_contenttype = "application/json", _cache = false) {
    this.setRequestHeader("Content-Type", _contenttype);
    if (!_cache) {
      this.setRequestHeader("Content-Type", _contenttype);
      this.setRequestHeader("pragma", "no-cache");
      this.setRequestHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate, no-transform");
      this.setRequestHeader("pragma", "no-cache");
      this.setRequestHeader("Expires", -1);
    }
  }

  static serverRequest = null;
  static serverCommandRequest = function (_command, _params, _callBack = null, _silent = false) {
    let oldmsgNo = -1;
    //#ClientLog.Html("start " + _command);
    if (RESTX.serverRequest != null) if (RESTX.serverRequest.readyState != 4) {
      RESTX.serverRequest.abort();
      RESTX.serverRequest = null;
    }
    RESTX.serverRequest = new RESTX();
    RESTX.serverRequest.onreadystatechange = function () {
      let output = this.getLastPreMsg();
      //console.Log(this.responseText);
      if (output != null) {
        if (oldmsgNo != output.no) {
          if (output.msg.hasOwnProperty("output")) {
            ClientLog.Html(output.msg.output);
          }
          oldmsgNo = output.no;
        }
      }
      if (this.readyState == RESTX.DONE) {
        curGUI.RemoveModalContent();
        let res = this.finish();
        if (this.status == 200) {
          //#if (res.output.hasOwnProperty("result")) ClientLog.Html(res.output.result);
          //#ClientLog.Html("ok");
        } else {
          //#ClientLog.Html("error");
        }
        if (res.error.code != 0) {
          //#ClientLog.Html("Error: " + res.error.code + ":" + res.error.msg.HtmlEntities());
          //#if (!_silent) curGUI.ShowAlert('Server Execution Error<context="Alert Message Title"/>'.I18xTrans(), "Error: " + res.error.code + " : " + res.error.msg);
        }
        if (_callBack != null) _callBack(this.status == 200, res);
      }
    }

    if (_params === undefined) _params = {};
    //#if (!_silent) curGUI.ShowWaitMessage('Execute server command "<cmd/>", please wait...<context="Wait Message"/>'.I18xTrans({cmd: _command}));
    RESTX.serverRequest.call(_command, _params);
  }

  static #restartRest = function (_this, _serviceName, _input, _timeout, _limit, _async, _cache) {
    //console.Log("RESTX RestartRest");
    _this.call(_serviceName, _input, _timeout, _limit, _async, _cache, true);
  }

  static config = function (_hostURL) {
    RESTX.hostUrl = _hostURL;
  }

  static onMaintanceWorkChanged() {
    for (let id in RESTX.onMaintanceWorkChangeEvents) {
      RESTX.onMaintanceWorkChangeEvents[id](RESTX.onMaintanceWorkChangeEventsObjects[id]);
    }
  }

  static registerMaintanceWorkChanged = function (_id, _event, _info) {
    RESTX.onMaintanceWorkChangeEvents[_id] = _event;
    RESTX.onMaintanceWorkChangeEventsObjects[_id] = _info;
  }

  static unRegisterMaintanceWorkChanged = function (_id) {
    if (RESTX.onMaintanceWorkChangeEvents.hasOwnProperty(_id)) {
      delete RESTX.onMaintanceWorkChangeEvents[_id];
      delete RESTX.onMaintanceWorkChangeEventsObjects[_id];
    }
  }

  static init = function () {
    RESTX.onMaintanceWorkChanged();
  }
}

window.RESTX = RESTX;