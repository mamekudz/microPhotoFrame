//	===============================================
//	GUI.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

// * TO DO:
// * Curve Input: Undo/ReUndo
// * FullScreen: border:none padding:0px

var EFFECTLAYER = document.getElementById("effectlayer");

// ===================
// PARTICLES
// ===================
function GUIParticles(_particleClassName, _params) {
	this.divs = [];
	this.particleClassName = _particleClassName;
	this.runMode = _params.hasOwnProperty("runMode") ? _params.runMode : GUIParticles.RUNMODE_RNDRADIAL;
	this.maxNoOfParticles = _params.hasOwnProperty("maxNoOfParticles") ? _params.maxNoOfParticles : 20;
	this.minDuration = _params.hasOwnProperty("minDuration") ? _params.minDuration : -1;
	this.maxDuration = _params.hasOwnProperty("maxDuration") ? _params.maxDuration : -1;
	this.minRadius = Math.sqrt(_params.hasOwnProperty("minRadius") ? _params.minRadius : 10);
	this.maxRadius = Math.sqrt(_params.hasOwnProperty("maxRadius") ? _params.maxRadius : 80);

	this.Init = function () {
		var i, o;
		for (i = 0; i < this.maxNoOfParticles; i++) {
			o = document.createElement("div");
			o.className = this.particleClassName + " hidden";
			o.dataset.no = i;
			o.dataset.particleClassName = this.particleClassName;
			o.dataset.used = 0;
			o.addEventListener("animationend", GUIParticles.AnimationEnd, { capture: false, passive: false });
			this.divs.push(o);
		};
	};
	this.Init();
};
ENUMERATOR = 0;
GUIParticles.RUNMODE_POINT = ENUMERATOR++;
GUIParticles.RUNMODE_RNDRADIAL = ENUMERATOR++;
GUIParticles.AnimationEnd = function (_ev) {
	var o = _ev.target, b = EFFECTLAYER;
	o.className = o.dataset.particleClassName + " hidden";
	o.dataset.used = 0;
	b.removeChild(o);
};
GUIParticles.prototype.Run = function (_ev) {
	var i, l = this.divs.length, o = null, b = EFFECTLAYER;
	for (i = 0; i < l; i++)if (this.divs[i].dataset.used == 0) { o = this.divs[i]; break; };
	if (o != null) {
		b.appendChild(o);
		o.dataset.used = 1;
		switch (this.runMode) {
			case GUIParticles.RUNMODE_POINT:
				o.style.top = _ev.pageY + "px";
				o.style.left = _ev.pageX + "px";
				if (this.minDuration != -1) o.style.animationDuration = Math.minMaxFloatRandom(this.minDuration, this.maxDuration) + "s";
				break;
			case GUIParticles.RUNMODE_RNDRADIAL:
				i = Math.minMaxFloatRandom(0, Math.PI2);
				l = Math.minMaxFloatRandom(this.minRadius, this.maxRadius);
				l = l * l;
				if (this.minDuration != -1) o.style.animationDuration = Math.minMaxFloatRandom(this.minDuration, this.maxDuration) + "s";
				o.style.top = (_ev.pageY + Math.sin(i) * l) + "px";
				o.style.left = (_ev.pageX + Math.cos(i) * l) + "px";
				break;
		};
		o.className = this.particleClassName;
	};
};

// ====================================
// MENUS
// ====================================

function Menu(_id, _title, _key, _func, _type, _iconClass) {
	if (_title === undefined) {
		_title = "";
		_type = Menu.TYPE_SEPARATION;
	};
	if (_key === undefined) _key = 0x0000;
	if (_type === undefined) _type = Menu.TYPE_FUNC;
	if (_iconClass === undefined) _iconClass = "";
	if (_func === undefined) _func = null;
	this.gui = null;
	this.parentMenu = null;
	this.id = _id;
	this.level = -1;
	this.iconClass = _iconClass;
	this.title = _title;
	this.titlePlaceholders = {};
	this.type = _type;
	this.visible = true;
	this.enabled = true;
	this.toggle = false;
	this.doAutoToggle = true;
	this.key = _key;
	this.func = _func;
	this.subs = null;
};
ENUMERATOR = 0;
Menu.TYPE_FUNC = ENUMERATOR++;
Menu.TYPE_TOGGLE = ENUMERATOR++;
Menu.TYPE_SEPARATION = ENUMERATOR++;

Menu.prototype.Call = function () {
	var oldtog, o;
	//log("Call");
	if (this.func != null && this.enabled && this.visible) {
		if (this.type == Menu.TYPE_TOGGLE) {
			oldtog = this.toggle;
			//log("Call1",this.toggle);
			if (this.doAutoToggle) this.toggle = !this.toggle;
			//log("Call2",this.toggle,this.func);
			this.func(this);
			if (oldtog != this.toggle) {
				o = document.getElementById("menuicon_" + this.id);
				if (this.iconClass == "") {
					o.innerHTML = (this.toggle ? '•' : '');
				} else {
					o.className = o.className.boolClass("notsel", !this.toggle);
				};
			};
		} else {
			setTimeout(this.func, 10, this);
			//this.func(this);
		};
	};
	return this.func != null && this.enabled && this.visible;
};

Menu.prototype.Add = function (_menu) {
	if (this.subs == null) this.subs = [];
	this.subs.push(_menu);
	return _menu;
};
Menu.prototype.RemoveSubMenus = function (_menu) {
	var o;
	this.subs = null;
	o = document.getElementById(this.fullId);
	if (o) o.innerHTML = "";
};
Menu.Find = function (_menuId) {
	if (curGUI != null) {
		return curGUI.menus['menu_' + curGUI.id + "_" + _menuId];
	} else {
		return null;
	};
};
Menu.GeneralActiveByMouseDown = false;
Menu.lastVisibleMenuDiv = null;
Menu.OnMouseUp = function (_ev, _fullId) {
	var gui, menu, comp = _fullId.split("_"), div = document.getElementById(_fullId), subdiv = document.getElementById(_fullId + "_submenus");
	//Menu.GeneralActiveByMouseDown=false;
	//log("Menu.OnMouseUp",comp);
	PlaySound("button_up");
	gui = GUIS[comp[1]];
	menu = gui.menus[_fullId];
	//log("OnMouseUp",comp,menu.level,Menu.GeneralActiveByMouseDown);
	menu.Call();
	if (!subdiv) {
		_fullId = 'menu_' + menu.gui.id + "_" + menu.parentMenu.id;
		subdiv = document.getElementById(_fullId + "_submenus");
	};
	if (subdiv) {
		if (Menu.lastVisibleMenuDiv != null) Menu.lastVisibleMenuDiv.className = Menu.lastVisibleMenuDiv.className.addClass("hidden");
		Menu.lastVisibleMenuDiv = null;
		subdiv.className = subdiv.className.addClass("hidden");
	};
};
Menu.GeneralDummyMouseOver = false;
Menu.OnDummyMouseOver = function (_ev) {
	//Menu.GeneralActiveByMouseDown=false;
	//log("OnDummyMouseOver",Menu.GeneralActiveByMouseDown);
	PlaySound("button_up");
	Menu.GeneralDummyMouseOver = true;
};
Menu.OnMouseOver = function (_ev, _fullId) {
	var gui, menu, comp = _fullId.split("_"), div = document.getElementById(_fullId), subdiv = document.getElementById(_fullId + "_submenus");
	Menu.GeneralDummyMouseOver = false;
	gui = GUIS[comp[1]];
	menu = gui.menus[_fullId];
	//log("OnMouseOver",comp,menu.level,Menu.GeneralActiveByMouseDown);
	if (subdiv) if (menu.level > 1 || Menu.GeneralActiveByMouseDown) {
		if (Menu.lastVisibleMenuDiv != null) Menu.lastVisibleMenuDiv.className = Menu.lastVisibleMenuDiv.className.addClass("hidden");
		Menu.lastVisibleMenuDiv = subdiv;
		subdiv.className = subdiv.className.removeClass("hidden");
	};
};
Menu.OnMouseDown = function (_ev, _fullId) {
	var gui, menu, comp = _fullId.split("_"), parentMenu, div = document.getElementById(_fullId), subdiv = document.getElementById(_fullId + "_submenus");
	Menu.GeneralDummyMouseOver = false;
	PlaySound("button_down");
	if (IS_SAFARI) _ev.buttons = _ev.which;
	if ((_ev.buttons & 1) == 0) return;
	gui = GUIS[comp[1]];
	menu = gui.menus[_fullId];
	parentMenu = gui.menus[_ev.target.parentNode.id];
	//log("Menu.OnMouseDown",comp);
	if (menu.level == 1) Menu.GeneralActiveByMouseDown = true;
	//log("OnMouseDown",comp,menu.level,Menu.GeneralActiveByMouseDown);
	if (subdiv) {
		if (subdiv.className.hasClass("hidden")) {
			if (Menu.lastVisibleMenuDiv != null) Menu.lastVisibleMenuDiv.className = Menu.lastVisibleMenuDiv.className.addClass("hidden");
			Menu.lastVisibleMenuDiv = subdiv;
			subdiv.className = subdiv.className.removeClass("hidden");
		} else if (parentMenu !== undefined) {
			if (parentMenu.id == menu.id) {
				if (Menu.lastVisibleMenuDiv != null) Menu.lastVisibleMenuDiv.className = Menu.lastVisibleMenuDiv.className.addClass("hidden");
				Menu.lastVisibleMenuDiv = null;
				subdiv.className = subdiv.className.addClass("hidden");
			};
		};
	};
};
Menu.OnMouseLeave = function (_ev, _fullId) {
	var gui, menu, comp = _fullId.split("_"), div = document.getElementById(_fullId), subdiv = document.getElementById(_fullId + "_submenus");
	gui = GUIS[comp[1]];
	menu = gui.menus[_fullId];
	//log("OnMouseLeave",menu.level,Menu.GeneralActiveByMouseDown);
	Menu.GeneralActiveByMouseDown = false;
	if (menu.level > 1) Menu.GeneralActiveByMouseDown = false;
	if (!Menu.GeneralDummyMouseOver) if (subdiv) {
		if (Menu.lastVisibleMenuDiv != null) Menu.lastVisibleMenuDiv.className = Menu.lastVisibleMenuDiv.className.addClass("hidden");
		Menu.lastVisibleMenuDiv = null;
		subdiv.className = subdiv.className.addClass("hidden");
	};
	Menu.GeneralDummyMouseOver = false;
};

Menu.prototype.SetUpPanelMenuReferences = function (_gui) {
	var pi = this.id.split("_"), i;
	if (this.func == Panel.MenuHandler) {
		this.doAutoToggle = true;
		if (_gui.panels[pi[1]]) {
			_gui.panels[pi[1]].menu = this;
		};
	};
	if (this.subs != null) for (i = 0; i < this.subs.length; i++)this.subs[i].SetUpPanelMenuReferences(_gui);
};
Menu.prototype.HTML = function (_level, _gui, _parentMenu) {
	var h = "", i, l, attrStr = "", keyInfoStr = "", iconStr = '<span class="icon"></span>';
	Menu.GeneralActiveByMouseDown = false;
	this.gui = _gui;
	this.level = _level;
	this.parentMenu = _parentMenu;
	this.fullId = 'menu_' + this.gui.id + "_" + this.id;
	this.gui.menus[this.fullId] = this;
	if (this.key != 0) {
		this.gui.menuKeys[this.key] = this;
		keyInfoStr = '<span class="keyinfo">' + GUI.KeyToStr(this.key) + '</span>';
	} else {
		keyInfoStr = '<span class="nokeyinfo"></span>';
	};
	if (this.func != null) {
		attrStr += ' onmouseup="Menu.OnMouseUp(event,\'' + this.fullId + '\');" ';
	} else {
		attrStr += ' onmouseup="Menu.OnDummyMouseOver(event);" ';
	};
	attrStr += ' id="' + this.fullId + '" onmousedown="Menu.OnMouseDown(event,\'' + this.fullId + '\');" onmouseover="Menu.OnMouseOver(event,\'' + this.fullId + '\');" onmouseleave="Menu.OnMouseLeave(event,\'' + this.fullId + '\');" ';
	switch (_level) {
		case 0:
			h += '<div id="' + this.fullId + '" class="menu' + ((this.visible) ? '' : ' hidden') + ((this.enabled) ? '' : ' disabled') + ((_gui.topMenuClass == "") ? "" : " " + _gui.topMenuClass) + '">';
			if (this.subs != null) for (i = 0; i < this.subs.length; i++)h += this.subs[i].HTML(1, _gui, this);
			h += '</div>';
			break;
		case 1:
			h += '<div' + attrStr + 'class="mainmenu' + ((this.visible) ? '' : ' hidden') + ((this.enabled) ? '' : ' disabled') + '"><span class="title" id="menutitle_' + this.id + '">' + this.title.I18xTrans(this.titlePlaceholders).HtmlEntities() + '</span>';
			if (this.subs != null) {
				h += '<div id="' + this.fullId + '_submenus" class="normmenus hidden">';
				for (i = 0; i < this.subs.length; i++)h += this.subs[i].HTML(2, _gui, this);
				h += '</div>';
			};
			h += '</div>';
			break;
		case 2:
			switch (this.type) {
				case Menu.TYPE_TOGGLE:
					iconStr = '<span class="icon' + (this.iconClass != "" ? " " + this.iconClass + (this.toggle ? "" : " notsel") : "") + '" id="menuicon_' + this.id + '">' + (this.iconClass == "" ? (this.toggle ? '•' : '') : "") + '</span>'
				case Menu.TYPE_FUNC:
					h += '<div' + attrStr + 'class="normmenu' + ((this.visible) ? '' : ' hidden') + ((this.enabled) ? '' : ' disabled') + '">' + iconStr + '<span class="title" id="menutitle_' + this.id + '">' + this.title.I18xTrans(this.titlePlaceholders).HtmlEntities() + '</span>' + keyInfoStr;
					if (this.subs != null) {
						h += '<div class="sidemenus">';
						for (i = 0; i < this.subs.length; i++)h += this.subs[i].HTML(3, _gui, this);
						h += '</div>';
					};
					h += '</div>';
					break;
				case Menu.TYPE_SEPARATION:
					h += '<div' + attrStr + 'class="normmenu' + ((this.visible) ? '' : ' hidden') + ((this.enabled) ? '' : ' disabled') + ' separation"></div>';
					break;
			};
			break;
		case 3:
			h += '<div' + attrStr + 'class="sidemenu' + ((this.visible) ? '' : ' hidden') + ((this.enabled) ? '' : ' disabled') + '">' + iconStr + '<span class="title" id="menutitle_' + this.id + '">' + this.title.I18xTrans(this.titlePlaceholders).HtmlEntities() + '</span>' + keyInfoStr + '</div>';
			//for(i=0;i<this.subs.length;i++)h+=this.subs.HTML(3,this);
			break;
	};
	return h;
}

Menu.prototype.SetEnable = function (_enabled) {
	var o;
	if (_enabled != this.enabled) {
		this.enabled = _enabled;
		o = document.getElementById(this.fullId);
		if (o) o.className = _enabled ? o.className.removeClass("disabled") : o.className.addClass("disabled");
		//if(o)log(o.className);
	};
};
Menu.prototype.SetVisible = function (_visible) {
	var o;
	if (_visible != this.visible) {
		this.visible = _visible;
		o = document.getElementById(this.fullId);
		if (o) o.className = _visible ? o.className.removeClass("hidden") : o.className.addClass("hidden");
	};
};
Menu.prototype.SetToggle = function (_toggle) {
	var o;
	//log("SetToggle",_toggle);
	if (_toggle != this.toggle) {
		o = document.getElementById("menuicon_" + this.id);
		//log("SetToggle tog ok",_toggle);
		this.toggle = _toggle;
		if (o) {
			//log("SetToggle ob ok",_toggle);
			//this.toggle=_toggle;
			if (this.iconClass == "") {
				o.innerHTML = (this.toggle ? '•' : '');
			} else {
				o.className = o.className.boolClass("notsel", !this.toggle);
			};
		};
	};
};
Menu.prototype.SwitchToggle = function () {
	this.SetToggle(!this.toggle);
};

Menu.prototype.ChangeTitle = function (_title, _menuPlaceHolders) {
	var o, ot = this.title, op = this.titlePlaceholders;
	if (_title != undefined) this.title = _title;
	if (_menuPlaceHolders === undefined) _menuPlaceHolders = {};
	this.titlePlaceholders = _menuPlaceHolders;
	if (_title != ot || this.titlePlaceholders != op) {
		o = document.getElementById("menutitle_" + this.id);
		if (o) o.innerHTML = this.title.I18xTrans(this.titlePlaceholders).HtmlEntities();
	};
};


// ====================================
// PANELS
// ====================================

function Panel(_id, _title, _type = Panel.TYPE_NORMAL, _eventHandler = null, _extraContentClass = "", _extraPanelClass = "", _defWidth = 150, _defHeight = 200) {
	this.id = _id;
	this.type = _type;
	this.title = _title;
	this.titlePlaceholders = {};
	this.eventHandler = _eventHandler;
	this.defWidth = _defWidth;
	this.defHeight = _defHeight;
	this.extraContentClass = _extraContentClass;
	this.extraPanelClass = _extraPanelClass;
	this.prefContainer = "float,center";

	this.visible = this.type == Panel.TYPE_MAIN;
	this.mainWithHeader = false;
	this.isDocked = false;
	this.isFolded = false;
	this.isModal = false;
	this.isMarked = false;
	this.top = 0;
	this.left = 0;
	this.width = 100;
	this.height = 100;

	this.menu = null;
	this.toolBar = null;
	this.menus = null;

	this.contentDiv = document.createElement("div");
	this.contentDiv.id = 'panel_' + this.id + '_content';
	this.contentDiv.className = "content" + ((this.extraContentClass == "") ? "" : " " + this.extraContentClass);
	this.loadId = 0;
};
ENUMERATOR = 0;
Panel.TYPE_NORMAL = ENUMERATOR++;
Panel.TYPE_PALETTE = ENUMERATOR++;
Panel.TYPE_MAIN = ENUMERATOR++;
Panel.TYPE_MODAL = ENUMERATOR++;
Panel.TYPE_MODALCLOUD = ENUMERATOR++;
ENUMERATOR = 0;
Panel.EVENTTYPE_VISIBLECHANGED = ENUMERATOR++;
Panel.EVENTTYPE_SIZECHANGED = ENUMERATOR++;
Panel.EVENTTYPE_DOCKCHANGED = ENUMERATOR++;
Panel.EVENTTYPE_APPEARSINDOM = ENUMERATOR++;
Panel.EVENTTYPE_WILLREMOVEDFROMDOM = ENUMERATOR++;
Panel.EVENTTYPE_AFTERWORKSPACECHANGE = ENUMERATOR++;
Panel.EVENTTYPE_WILLCLOSED = ENUMERATOR++;

Panel.prototype.Dispose = function () {
	delete this.eventHandler;
	delete this.menu;
	delete this.contentDiv;
};
Panel.prototype.ChangeTitle = function (_title, _placeholders) {
	var o = document.getElementById('panel_' + this.id + '_title');
	if (_placeholders === undefined) _placeholders = {};
	this.title = _title;
	this.titlePlaceholders = _placeholders;
	if (o) o.innerHTML = _title.I18xTrans(_placeholders).HtmlEntities();
};
Panel.prototype.SetMarked = function (_marked) {
	var o = document.getElementById('panel_' + this.id + '_header');
	this.isMarked = _marked;
	if (o) o.className = o.className.boolClass("marked", _marked);
};
Panel.prototype.SetBlackBgrd = function (_onOff) {
	var o = document.getElementById('panel_' + this.id);
	if (o) o.className = o.className.boolClass("black", _onOff);
};
Panel.EndOfFoldTransition = function (_ev) {
	this.style.maxHeight = "";
};
Panel.prototype.SetUpFold = function (_folded) {
	var o, fbo;
	this.isFolded = _folded;
	o = document.getElementById("panel_" + this.id);
	if (o) {
		fbo = document.getElementById("panel_" + this.id + "_foldbutton");
		if (this.isFolded) {
			o.addEventListener("transitionend", Panel.EndOfFoldTransition, { capture: false, passive: false });
			o.style.maxHeight = o.parentElement.clientHeight + "px";
			o.className = o.className.addClass("folded");
			//o.style.height=this.isDocked?"":this.height+"px";
			fbo.className = fbo.className.exchangeClass("foldin", "foldout");
			PlaySound("foldin", 0.2);
		} else {
			o.addEventListener("transitionend", Panel.EndOfFoldTransition, { capture: false, passive: false });
			o.style.height = this.isDocked ? "" : this.height + "px";
			o.style.maxHeight = o.parentElement.clientHeight + "px";
			o.className = o.className.removeClass("folded");
			fbo.className = fbo.className.exchangeClass("foldout", "foldin");
			PlaySound("foldout", 0.2);
		};
	};
};
Panel.Fold = function (_ev, _id) {
	var p, o, pcInfo, container = null;
	if (curGUI != null) if (curGUI.isActive) {
		p = curGUI.panels[_id];
		p.SetUpFold(!p.isFolded);
		//curGUI.Panel2Front(p);
		pcInfo = curGUI.GetPanelContainerInfoOfPanelId(_id);
		switch (pcInfo.container) {
			case "left": container = curGUI.leftPanelContainers[pcInfo.no]; break;
			case "right": container = curGUI.rightPanelContainers[pcInfo.no]; break;
			case "top": container = curGUI.topPanelContainers[pcInfo.no]; break;
			case "bottom": container = curGUI.bottomPanelContainers[pcInfo.no]; break;
		};
		if (container != null) {
			if (_ev.altKey && !p.isFolded) container.FoldAllPanels(!p.isFolded, _id);
			container.SetUpContainerGrid(1000);
		};
		//if(p.eventHandler!=null)p.eventHandler({type:Panel.EVENTTYPE_SIZECHANGED,panel:p});
	};
	_ev.stopPropagation();
};
Panel.Undock = function (_ev, _id) {
	var p = curGUI.panels[_id];
	Panel.CloseButtonEvent(_ev, _id, true);
	_ev.stopPropagation();
	if (p.eventHandler != null) {
		p.eventHandler({ type: Panel.EVENTTYPE_DOCKCHANGED, panel: p });
		p.eventHandler({ type: Panel.EVENTTYPE_SIZECHANGED, panel: p });
	};
};
Panel.prototype.Close = function (_rememberResultInWorkSpace = false) {
	Panel.CloseButtonEvent(false, this.id, false, _rememberResultInWorkSpace);
};
Panel.CloseButtonEvent = function (_ev, _id, _noCloseDoUndock, _rememberResultInWorkSpace = false) {
	var p, o, pcInfo, pc, pco, np, pos;
	if (_noCloseDoUndock === undefined) _noCloseDoUndock = false;
	if (curGUI != null) if (curGUI.isActive) {
		p = curGUI.panels[_id];
		if (p.eventHandler != null) p.eventHandler({ type: Panel.EVENTTYPE_WILLCLOSED, panel: p });
		o = document.getElementById("panel_" + _id);
		if (o == null) return;
		pos = AbsPositionOfElement(o);
		pco = p.parent;
		if (!_noCloseDoUndock) {
			if (!_rememberResultInWorkSpace) curGUI.SetLocalStorageWorkSpace(undefined, false);
			p.visible = false;
			//log("CloseButtonEvent",p.menu);
			if (p.menu != null) p.menu.SetToggle(p.visible);
		};
		pcInfo = curGUI.GetPanelContainerInfoOfPanelId(_id);
		if (p.eventHandler != null) p.eventHandler({ type: Panel.EVENTTYPE_WILLREMOVEDFROMDOM, panel: p });
		switch (pcInfo.container) {
			case "left":
				delete curGUI.leftPanelContainers[pcInfo.no].panels[_id];
				o.outerHTML = "";
				if (ObjIsEmpty(curGUI.leftPanelContainers[pcInfo.no].panels)) {
					SetOuterHTML("topgrip_left_" + curGUI.leftPanelContainers[pcInfo.no].id);
					SetOuterHTML("rightgrip_left_" + curGUI.leftPanelContainers[pcInfo.no].id);
					SetOuterHTML("bottomgrip_left_" + curGUI.leftPanelContainers[pcInfo.no].id);
					SetOuterHTML("panelcontainer_" + curGUI.leftPanelContainers[pcInfo.no].id);
					curGUI.leftPanelContainers.splice(pcInfo.no, 1);
					curGUI.gridTemplateCols.splice(1 + pcInfo.no * 2, 2);
					curGUI.noOfGridCols -= 2;
					curGUI._SetUpGUIGrid();
				} else {
					curGUI.leftPanelContainers[pcInfo.no].SetUpContainerGrid();
				};
				break;
			case "right":
				delete curGUI.rightPanelContainers[pcInfo.no].panels[_id];
				o.outerHTML = "";
				if (ObjIsEmpty(curGUI.rightPanelContainers[pcInfo.no].panels)) {
					SetOuterHTML("leftgrip_right_" + curGUI.rightPanelContainers[pcInfo.no].id);
					SetOuterHTML("topgrip_right_" + curGUI.rightPanelContainers[pcInfo.no].id);
					SetOuterHTML("bottomgrip_right_" + curGUI.rightPanelContainers[pcInfo.no].id);
					SetOuterHTML("panelcontainer_" + curGUI.rightPanelContainers[pcInfo.no].id);
					curGUI.rightPanelContainers.splice(pcInfo.no, 1);
					curGUI.gridTemplateCols.splice(curGUI.leftPanelContainers.length * 2 + 2 + pcInfo.no * 2, 2);
					curGUI.noOfGridCols -= 2;
					curGUI._SetUpGUIGrid();
				} else {
					curGUI.rightPanelContainers[pcInfo.no].SetUpContainerGrid();
				};
				break;
			case "top":
				delete curGUI.topPanelContainers[pcInfo.no].panels[_id];
				o.outerHTML = "";
				if (ObjIsEmpty(curGUI.topPanelContainers[pcInfo.no].panels)) {
					SetOuterHTML("bottomgrip_top_" + curGUI.topPanelContainers[pcInfo.no].id);
					SetOuterHTML("panelcontainer_" + curGUI.topPanelContainers[pcInfo.no].id);
					curGUI.topPanelContainers.splice(pcInfo.no, 1);
					curGUI.gridTemplateRows.splice(2 + pcInfo.no * 2, 2);
					curGUI.noOfGridRows -= 2;
					curGUI._SetUpGUIGrid();
				} else {
					curGUI.topPanelContainers[pcInfo.no].SetUpContainerGrid();
				};
				break;
			case "bottom":
				delete curGUI.bottomPanelContainers[pcInfo.no].panels[_id];
				o.outerHTML = "";
				if (ObjIsEmpty(curGUI.bottomPanelContainers[pcInfo.no].panels)) {
					SetOuterHTML("topgrip_bottom_" + curGUI.bottomPanelContainers[pcInfo.no].id);
					SetOuterHTML("panelcontainer_" + curGUI.bottomPanelContainers[pcInfo.no].id);
					curGUI.bottomPanelContainers.splice(pcInfo.no, 1);
					curGUI.gridTemplateRows.splice(curGUI.topPanelContainers.length * 2 + 3 + pcInfo.no * 2, 2);
					curGUI.noOfGridRows -= 2;
					curGUI._SetUpGUIGrid();
				} else {
					curGUI.bottomPanelContainers[pcInfo.no].SetUpContainerGrid();
				};
				break;
			case "float":
				curGUI.floatPanels.splice(pcInfo.pos, 1);
				o.outerHTML = "";
				break;
		};
	};
	if (_noCloseDoUndock) {
		np = document.createElement("div");
		np.innerHTML = p.HTML(true);
		p.isDocked = false;
		curGUI.floatPanels.push(p);
		document.getElementById("guifloatpanels").appendChild(np.firstChild);
		np = document.getElementById("panel_" + p.id);
		np.style.top = (pos.y - 80 + 5) + "px";
		np.style.left = (pos.x + 5) + "px";
		np.style.width = p.defWidth + "px";
		np.style.height = p.defHeight + "px";
		curGUI.Panel2Front(p);
		if (!_rememberResultInWorkSpace) curGUI.SetLocalStorageWorkSpace(undefined, false);
	} else {
		if (curGUI) if (curGUI.isActive) if (p.eventHandler != null) p.eventHandler({ type: Panel.EVENTTYPE_VISIBLECHANGED, panel: p });
	};
	if (_ev) _ev.stopPropagation();
};
Panel.prototype.ShowAsFloat = function (_x, _y, _w, _h) {
	var np;
	//log("ShowAsFloat");
	if (_w === undefined) _w = this.defWidth;
	if (_h === undefined) _h = this.defHeight;
	if (_x === undefined) _x = this.left;
	if (_y === undefined) _y = this.top;
	this.top = _y;
	this.left = _x;
	this.width = _w;
	this.height = _h;
	np = document.createElement("div");
	np.innerHTML = this.HTML(true);
	this.isDocked = false;
	this.visible = true;
	if (this.menu != null) this.menu.SetToggle(this.visible);
	curGUI.floatPanels.push(this);
	document.getElementById("guifloatpanels").appendChild(np.firstChild);
	np = document.getElementById("panel_" + this.id);
	np.style.top = (_y - 80 + 5) + "px";
	np.style.left = (_x + 5) + "px";
	np.style.width = _w + "px";
	np.style.height = _h + "px";
	this.FitToGUI();
	curGUI.Panel2Front(this);
};
Panel.prototype.ShowAsModal = function () {
	var oo = document.getElementById("overlay"), om = document.getElementById("modalcontent"), np;
	oo.className = oo.className.removeClass("hidden");
	om.className = om.className.removeClass("hidden");
	np = document.createElement("div");
	np.innerHTML = this.HTML(true);
	curGUI.panels[this.id] = this;
	this.isDocked = false;
	this.visible = true;
	this.isModal = true;
	om.appendChild(np.firstChild);
	np = document.getElementById("panel_" + this.id);
};

Panel.prototype.SetUpScrollArea = function (_sm, _sa, _setMaxHeight = true, _panelHeightMax = "75vh") {
	var os = document.getElementById(_sa), op = document.getElementById("panel_" + this.id), sh, ph;
	if (os) if (op) {
		sh = os.scrollHeight;
		os.style.display = "none";
		os.style.height = "auto";
		os.style.maxHeight = "none";
		if (true) {
			//if(IS_FIREFOX&&IS_WINDOWS||IS_IOS||IS_ANDROID){
			if (_sm == null) {
				os.style.overflow = "hidden";
				_sm = new SmartScroll(os, SYSTEM_SMARTSCROLL_STD_VERTICAL);
				_sm.Init();
				_sm.Activate();
			};
		};
		ph = op.scrollHeight + 80;
		// ...40px panel padding
		os.style.display = "block";
		os.style.height = "calc(" + _panelHeightMax + " - " + ph + "px)";
		if (_setMaxHeight) os.style.maxHeight = sh + "px";
	};
	return _sm;
};
Panel.prototype.RemoveScrollArea = function (_sm) {
	if (_sm == null) return null;
	_sm.Deactivate();
	_sm.Exit();
	return null;
};
Panel.prototype.FitToGUI = function () {
	var og, np, x, y, w, h;
	if (this.visible && !this.isDocked) {
		//log("FIT");
		og = document.getElementById("guifloatpanels");
		np = document.getElementById("panel_" + this.id);
		y = parseInt(np.style.top, 10);
		x = parseInt(np.style.left, 10);
		w = parseInt(np.style.width, 10);
		h = parseInt(np.style.height, 10);
		x = Math.range(x, 0 - og.clientWidth + 20, og.clientWidth - 20);
		y = Math.range(y, 0, og.clientHeight - 20);
		w = Math.range(w, 40, og.clientWidth - 20);
		h = Math.range(h, 40, og.clientHeight - 40);
		np.style.width = w + "px";
		np.style.height = h + "px";
		np.style.left = x + "px";
		np.style.top = y + "px";
		this.top = y;
		this.left = x;
		this.width = w;
		this.height = h;
	};
};
Panel.OnHeaderMouseUp = function (_ev, _id) {
	//log("Panel.OnHeaderMouseUp");
	PlaySound("button_up");
};
Panel.OnHeaderMouseDown = function (_ev, _id) {
	var p, o, og = document.getElementById("guifloatpanels");
	if (curGUI != null) if (curGUI.isActive) {
		PlaySound("button_down");
		p = curGUI.FloatPanelOfId(_id);
		if (p != null) {
			o = document.getElementById("panel_" + p.id);
			o.className = o.className.addClass("drag");
			curGUI.generalMouseMode = GUI.GENERALMOUSEMODE_FLOATPANELDRAG;
			if (MCEFreeze !== undefined) MCEFreeze();
			GUI.SetGeneralCursor("pointermove");
			curGUI.SelectableForSizingGrips(false);
			curGUI.floatDragPanel = { panel: p, offX: _ev.clientX - parseInt(o.style.left, 10), offY: _ev.clientY - parseInt(o.style.top, 10) };
			curGUI.Panel2Front(p);
			_ev.preventDefault();
			_ev.stopPropagation();
		};
	};
};
Panel.OnFloatSizerMouseDown = function (_ev, _id) {
	var p, o, og = document.getElementById("guifloatpanels");
	if (curGUI != null) if (curGUI.isActive) {
		PlaySound("button_down");
		p = curGUI.FloatPanelOfId(_id);
		if (p != null) {
			o = document.getElementById("panel_" + p.id);
			o.className = o.className.addClass("drag");
			curGUI.generalMouseMode = GUI.GENERALMOUSEMODE_FLOATPANELSIZE;
			if (MCEFreeze !== undefined) MCEFreeze();
			GUI.SetGeneralCursor("panelsize");
			curGUI.SelectableForSizingGrips(false);
			curGUI.floatSizePanel = { panel: p, startX: _ev.clientX, startY: _ev.clientY, startWidth: o.clientWidth, startHeight: o.clientHeight };
			curGUI.Panel2Front(p);
			_ev.preventDefault();
		};
	};
};
Panel.SetContentDiv = function (_this, _id, _loadId) {
	var p, pn;
	if (curGUI != null) if (curGUI.isActive) {
		p = curGUI.panels[_id];
		if (p) {
			if (p.contentDiv) {
				if (p.loadId == _loadId) {
					pn = _this.parentNode;
					pn.insertBefore(p.contentDiv, _this);
					pn.removeChild(_this);
					if (p.eventHandler != null) p.eventHandler({ type: Panel.EVENTTYPE_APPEARSINDOM, panel: p });
					if (p.eventHandler != null) p.eventHandler({ type: Panel.EVENTTYPE_SIZECHANGED, panel: p });
				};
			};
		};
	};
};
Panel.OnMouseDown = function (_ev, _id) {
	var p, o;
	// OnHeaderMouseDown
	if (curGUI != null) if (curGUI.isActive) {
		p = curGUI.FloatPanelOfId(_id);
		if (p != null) {
			if (curGUI.floatPanels[curGUI.floatPanels.length - 1] != p) {
				curGUI.Panel2Front(p);
				_ev.preventDefault();
				_ev.stopPropagation();
			};
		};
	};
};
Panel.prototype.HTML = function (_asFloatPanel = false, _zIndex = 0) {
	var h = "";
	this.loadId++;
	if (_asFloatPanel) {
		switch (this.type) {
			case Panel.TYPE_NORMAL:
				h += '<div id="panel_' + this.id + '" class="panel normal float' + (this.isFolded ? " folded" : "") + (this.extraPanelClass == '' ? '' : ' ' + this.extraPanelClass) + '" onmousedown="Panel.OnMouseDown(event,\'' + this.id + '\');" style="top:' + this.top + 'px;left:' + this.left + 'px;width:' + this.width + 'px;height:' + ((this.height == -1) ? "100px" : this.height + "px") + ';z-index:' + (GUI.FLOATPANELZINDEXSTART + _zIndex + 1) + ';">';
				h += '<div id="panel_' + this.id + '_foldbutton" class="headerbutton ' + (this.isFolded ? "foldout" : "foldin") + '" ' + ButtonAttributes("Panel.Fold(event,'" + this.id + "');") + '"></div>';
				h += '<div class="headerbutton closer" onmousedown="Panel.CloseButtonEvent(event,\'' + this.id + '\');"></div>';
				h += '<div id="panel_' + this.id + '_header" class="header' + (this.isMarked ? ' marked' : '') + '" onmousedown="Panel.OnHeaderMouseDown(event,\'' + this.id + '\');" onmouseup="Panel.OnHeaderMouseUp(event,\'' + this.id + '\');">';
				h += '<div class="title">' + this.title.I18xTrans(this.titlePlaceholders).HtmlEntities() + '</div>';
				h += '</div>';
				h += '<img src="./skins/' + SKIN + '/imgs/empty.png" class="empty" onload="Panel.SetContentDiv(this,\'' + this.id + '\',' + this.loadId + ');">';
				h += '<div class="footerbutton sizer" onmousedown="Panel.OnFloatSizerMouseDown(event,\'' + this.id + '\');"></div>';
				h += '</div>';
				break;
			case Panel.TYPE_PALETTE:
				h += '<div id="panel_' + this.id + '" class="panel normal float' + (this.isFolded ? " folded" : "") + (this.extraPanelClass == '' ? '' : ' ' + this.extraPanelClass) + '" style="top:' + this.top + 'px;left:' + this.left + 'px;width:' + this.width + 'px;height:' + ((this.height == -1) ? "100px" : this.height + "px") + ';z-index:' + (GUI.FLOATPANELZINDEXSTART - _zIndex + 1) + ';">';
				h += '<div id="panel_' + this.id + '_foldbutton" class="headerbutton ' + (this.isFolded ? "foldout" : "foldin") + '" ' + ButtonAttributes("Panel.Fold(event,'" + this.id + "');") + '"></div>';
				h += '<div class="headerbutton closer" onclick="Panel.CloseButtonEvent(event,\'' + this.id + '\');"></div>';
				h += '<div id="panel_' + this.id + '_header" class="header" ' + (this.isMarked ? ' marked' : '') + 'onmousedown="Panel.OnHeaderMouseDown(event,\'' + this.id + '\');"></div>';
				h += '<img src="./skins/' + SKIN + '/imgs/empty.png" class="empty" onload="Panel.SetContentDiv(this,\'' + this.id + '\',' + this.loadId + ');">';
				h += '<div class="footerbutton sizer" onmousedown="Panel.OnFloatSizerMouseDown(event,\'' + this.id + '\');"></div>';
				h += '</div>';
				break;
			case Panel.TYPE_MODAL:
				h += '<div id="panel_' + this.id + '" class="panel modal' + (this.extraPanelClass == '' ? '' : ' ' + this.extraPanelClass) + '">';
				h += ImgLoadHTML('Panel.SetContentDiv(this,\'' + this.id + '\',' + this.loadId + ');');
				//h+='<img src="./skins/'+SKIN+'/imgs/empty.png" class="empty" onload="Panel.SetContentDiv(this,\''+this.id+'\','+this.loadId+');">';
				h += '</div>';
				break;
			case Panel.TYPE_MODALCLOUD:
				h += '<div id="panel_' + this.id + '" class="panel modal cloud' + (this.extraPanelClass == '' ? '' : ' ' + this.extraPanelClass) + '">';
				h += ImgLoadHTML('Panel.SetContentDiv(this,\'' + this.id + '\',' + this.loadId + ');');
				//h+='<img src="./skins/'+SKIN+'/imgs/empty.png" class="empty" onload="Panel.SetContentDiv(this,\''+this.id+'\','+this.loadId+');">';
				h += '</div>';
				break;
		};
	} else {
		switch (this.type) {
			case Panel.TYPE_NORMAL:
				h += '<div id="panel_' + this.id + '" class="panel normal' + (this.isFolded ? " folded" : "") + (this.extraPanelClass == '' ? '' : ' ' + this.extraPanelClass) + '" style="z-index:' + (GUI.FLOATPANELZINDEXSTART - _zIndex - 1) + ';">';
				h += '<div id="panel_' + this.id + '_foldbutton" class="headerbutton ' + (this.isFolded ? "foldout" : "foldin") + '" ' + ButtonAttributes("Panel.Fold(event,'" + this.id + "');") + '"></div>';
				h += '<div class="headerbutton docker" onclick="Panel.Undock(event,\'' + this.id + '\');"></div>';
				h += '<div class="headerbutton closer" onclick="Panel.CloseButtonEvent(event,\'' + this.id + '\');"></div>';
				h += '<div id="panel_' + this.id + '_header" class="header' + (this.isMarked ? ' marked' : '') + '">';
				h += '<div id="panel_' + this.id + '_title" class="title">' + this.title.I18xTrans(this.titlePlaceholders).HtmlEntities() + '</div>';
				h += '</div>';
				h += '<img src="./skins/' + SKIN + '/imgs/empty.png" class="empty" onload="Panel.SetContentDiv(this,\'' + this.id + '\',' + this.loadId + ');">';
				h += '</div>';
				break;
			case Panel.TYPE_PALETTE:
				h += '<div id="panel_' + this.id + '" class="panel palette' + (this.isFolded ? " folded" : "") + (this.extraPanelClass == '' ? '' : ' ' + this.extraPanelClass) + '" style="z-index:' + (GUI.FLOATPANELZINDEXSTART - _zIndex - 1) + ';">';
				h += '<div id="panel_' + this.id + '_foldbutton" class="headerbutton ' + (this.isFolded ? "foldout" : "foldin") + '" ' + ButtonAttributes("Panel.Fold(event,'" + this.id + "');") + '"></div>';
				h += '<div class="headerbutton docker" onclick="Panel.Undock(event,\'' + this.id + '\');"></div>';
				h += '<div class="headerbutton closer" onclick="Panel.CloseButtonEvent(event,\'' + this.id + '\');"></div>';
				h += '<div id="panel_' + this.id + '_header" class="header' + (this.isMarked ? ' marked' : '') + '"></div>';
				h += '<img src="./skins/' + SKIN + '/imgs/empty.png" class="empty" onload="Panel.SetContentDiv(this,\'' + this.id + '\',' + this.loadId + ');">';
				h += '</div>';
				break;
			case Panel.TYPE_MAIN:
				h += '<div id="panel_' + this.id + '" class="panel main' + (this.extraPanelClass == '' ? '' : ' ' + this.extraPanelClass) + '">';
				if (this.mainWithHeader) {
					h += '<div id="panel_' + this.id + '_header" class="header' + (this.isMarked ? ' marked' : '') + '">';
					h += '<div id="panel_' + this.id + '_title" class="title">' + this.title.I18xTrans(this.titlePlaceholders).HtmlEntities() + '</div>';
					h += '</div>';
				};
				h += ImgLoadHTML('Panel.SetContentDiv(this,\'' + this.id + '\',' + this.loadId + ');');
				//h+='<img src="./skins/'+SKIN+'/imgs/empty.png" class="empty" onload="Panel.SetContentDiv(this,\''+this.id+'\','+this.loadId+');">';
				h += '</div>';
				break;
		};
	};
	return h;
};
Panel.prototype.ResizeIfFloat = function (_width, _height) {
	var i = curGUI.GetPanelContainerInfoOfPanelId(this.id);
	if (i.container == "float") {
		this.width = _width;
		this.height = _height;
		np = document.getElementById("panel_" + this.id);
		np.style.width = _width + "px";
		np.style.height = _height + "px";
		this.FitToGUI();
	};
};
Panel.prototype.ShowIfNotVisible = function (_width = -1, _height = -1) {
	var pref = [], cno, cnop;
	if (!this.visible) {
		if (this.prefContainer === undefined) this.prefContainer = "float,center";
		if (this.prefContainer == "") this.prefContainer = "float,center";
		pref = this.prefContainer.split(",");
		switch (pref[0]) {
			case "float":
				switch (pref[1]) {
					case "center":
						this.ShowAsFloat();
						break;
					case "pos":
						this.ShowAsFloat(parseInt(pref[2], 10), parseInt(pref[3], 10), _width == -1 ? parseInt(pref[4], 10) : _width, _height == -1 ? parseInt(pref[5], 10) : _height);
						break;
					case "topleft":
						this.ShowAsFloat(10, 10, parseInt(pref[4], 10), parseInt(pref[5], 10));
						break;
				};
				break;
			case "left":
				cno = parseInt(pref[1], 10);
				cnop = parseInt(pref[2], 10);
				if (cno < curGUI.leftPanelContainers.length) {
					GUI.InsertPanelIntoContainer("left", curGUI.leftPanelContainers, curGUI.leftPanelContainers[cno].id, this, true);
				} else {
					GUI.InsertPanelIntoContainer("left", curGUI.leftPanelContainers, GUI.CreateNewPanelContainer("left", -1), this, true);
				};
				break;
			case "right":
				cno = parseInt(pref[1], 10);
				cnop = parseInt(pref[2], 10);
				if (cno < curGUI.rightPanelContainers.length) {
					GUI.InsertPanelIntoContainer("right", curGUI.rightPanelContainers, curGUI.rightPanelContainers[curGUI.rightPanelContainers.length - cno - 1].id, this, true);
				} else {
					GUI.InsertPanelIntoContainer("right", curGUI.rightPanelContainers, GUI.CreateNewPanelContainer("right", -1), this, true);
				};
				break;
			case "top":
				cno = parseInt(pref[1], 10);
				cnop = parseInt(pref[2], 10);
				if (cno < curGUI.topPanelContainers.length) {
					GUI.InsertPanelIntoContainer("top", curGUI.topPanelContainers, curGUI.topPanelContainers[cno].id, this, true);
				} else {
					GUI.InsertPanelIntoContainer("top", curGUI.topPanelContainers, GUI.CreateNewPanelContainer("top", -1), this, true);
				};
				break;
			case "bottom":
				cno = parseInt(pref[1], 10);
				cnop = parseInt(pref[2], 10);
				if (cno < curGUI.bottomPanelContainers.length) {
					GUI.InsertPanelIntoContainer("bottom", curGUI.bottomPanelContainers, curGUI.bottomPanelContainers[curGUI.bottomPanelContainers.length - cno - 1].id, this, true);
				} else {
					GUI.InsertPanelIntoContainer("bottom", curGUI.bottomPanelContainers, GUI.CreateNewPanelContainer("bottom", -1), this, true);
				};
				break;
		};
	};
};

Panel.prototype.GetElementById = function (_id) {
	return this.contentDiv.GetElementById(_id);
};

Panel.MenuHandler = function (_menu) {
	var p, pi = _menu.id.split("_");
	p = curGUI.panels[pi[1]];
	//log("A");
	if (p) {
		//log("B",p);
		if (p.visible) {
			p.Close();
		} else {
			p.ShowIfNotVisible();
		};
	};
};
Panel.prototype.SetToolBar = function (_toolBar) {
	this.toolBar = _toolBar;
};
Panel.prototype.SetUpToolBar = function () {
	this.toolBar.SetUp(this);
};
Panel.prototype.SetToolBarGroup = function (_groupNo, _value) {
	this.toolBar.toolBarGroups[_groupNo].Set(_value);
};
Panel.prototype.SetToolBarGroupEnables = function (_groupNo, _enables) {
	this.toolBar.toolBarGroups[_groupNo].SetEnables(_enables);
};

// =========================================
// PANEL DB TABLE UTILS
// =========================================
Panel.prototype.InitPanelDBReqs = function (_def) {
	this.curDBResults = {};
	this.curDBResultsCount = 0;
	this.curDBRequestParams = { limit: 100, offset: 0, filter: "", orders: "" };
	this.DBReqsAction = _def.requestAction;
	this.DBReqsFailedErrorMsgTitle = _def.failedErrorMsgTitle;
	this.DBReqsWaitMsg = _def.waitMsg;
	this.DBReqsNoResultMsg = _def.noResultMsg;
};
Panel.prototype.GetPanelDBReqsPageEndButtons = function () {
	var p = this.curDBRequestParams;
	pagebutgroups = [[
		GUI.ButtonHTML(this.id + "_firstpage_button", false, 'icon-first', "curGUI.panels['" + this.id + "'].DBReqsDoRequestPage(event,this);", { data: 0, disabled: p.offset == 0, tooltip: '...show first page...<info context="general page select button tooltip text"/>'.I18xTrans() }),
		GUI.ButtonHTML(this.id + "_prevpage_button", false, 'icon-backward2', "curGUI.panels['" + this.id + "'].DBReqsDoRequestPage(event,this);", { data: (p.offset - p.limit) < 0 ? 0 : (p.offset - p.limit), disabled: p.offset == 0, tooltip: '...show previous page...<info context="general page select button tooltip text"/>'.I18xTrans() }),
		GUI.ButtonHTML(this.id + "_nextpage_button", false, 'icon-forward3', "curGUI.panels['" + this.id + "'].DBReqsDoRequestPage(event,this);", { data: (p.offset + p.limit), disabled: ((p.offset + p.limit) >= this.curDBResultsCount), tooltip: '...show next page...<info context="general page select button tooltip text"/>'.I18xTrans() }),
		GUI.ButtonHTML(this.id + "_lastpage_button", false, 'icon-last', "curGUI.panels['" + this.id + "'].DBReqsDoRequestPage(event,this);", { data: (this.curDBResultsCount - p.limit), disabled: ((p.offset + p.limit) >= this.curDBResultsCount), tooltip: '...show last page...<info context="general page select button tooltip text"/>'.I18xTrans() })
	]];
	return GUI.ButtonBarsHTML(
		pagebutgroups,
		{ buttonsAligns: ["center wrap noglass", "right"], containerAlign: "center", fullContainer: true, texts: ['Page <pageno/> of <totalnoofpages/><info context="general page select dialog text"/>'.I18xTrans({ pageno: Math.ceil(p.offset / p.limit) + 1, totalnoofpages: (this.curDBResultsCount <= p.limit) ? 1 : Math.ceil(this.curDBResultsCount / p.limit) }), ""] }
	);
};
Panel.prototype.DBReqsLoad = function (_resetOffset = false) {
	var request = new XMLHttpRequest(), self = this, p = self.curDBRequestParams, o;
	if (_resetOffset) p.offset = 0;
	p.limit = self.TextInputIntValue(this.id + "_dbreqs_limit", 100);
	p.filter = self.TextInputValue(this.id + "_dbreqs_filter", "");
	request.onreadystatechange = function () {
		if (this.readyState == 4) {
			var res = this.finish();
			self.HideOverlay();
			self.curDBResults = {};
			if (res.ok) {
				self.curDBResults = res.output.results;
				self.curDBResultsCount = res.output.totalResultsCount;
				self.ShowDBResults();
			} else {
				curGUI.ShowAlert(self.DBReqsFailedErrorMsgTitle, 'Please try again later<info context="Alert Message"/>'.I18xTrans(), this.ShowDBResults);
			};
		};
	};
	//o=this.contentDiv.GetElementById(this.id+"_resultDisplay");
	//if(o)o.innerHTML="";
	//o=this.contentDiv.GetElementById(this.id+"_resultControl");
	//if(o)o.innerHTML="";
	self.ShowWaitMessage(self.DBReqsWaitMsg);
	request.rest(self.DBReqsAction, { filter: p.filter, offset: p.offset, orders: p.orders, limit: p.limit });
};
Panel.prototype.DBReqsDoRequestPage = function (_ev, _o) {
	this.curDBRequestParams.offset = parseInt(_o.dataset.value, 10);
	this.DBReqsLoad();
};
Panel.prototype.GetDBReqsHeader = function (_cols) {
	var l = _cols.length, i, h = "";
	for (i = 0; i < l; i++)h += '<th' + ((_cols[i].class == '') ? '' : ' class="' + _cols[i].class + '"') + '>' + _cols[i].title.HtmlEntities() + '</th>';
	return h;
};

// ========================
// TABVIEWS
// ========================

// TabView
var CREATETABVIEWID = 0;
function TabView(_p) {
	this.id = (_p.id === undefined) ? "" : _p.id;
	this.type = (_p.type === undefined) ? TabView.TABVIEWTYPE_NONE : _p.type;
	this.title = (_p.title === undefined) ? "Unnamed" : _p.title;
	this.isClosable = (_p.isClosable === undefined) ? false : _p.isClosable;
	this.contentClass = (_p.contentClass === undefined) ? "" : _p.contentClass;

	this.marked = false;
	this.selected = false;
	this.contentDiv = document.createElement("div");
	this.contentDiv.className = "innercontent";
	this.loadId = 0;

	this.subTabViews = null;
};
TabView.SetContentDiv = function (_this, _loadId) {
	var err, h;
	try {
		var ids = _this.parentNode.id.split("_"), tvs = eval(_this.dataset.accessCode), tv = tvs.tabViews[ids[2]];
		if (tv.loadId != _loadId) return;
		//_this.parentNode.replaceChild(tv.contentDiv,_this);
		//return;
		// !!!!!!!??????? I don't know why....
		//log(tv.id,this.title);
		var t = document.createElement("div");
		//if(_this.dataset.accessCode=="curEditLandscapes.configTabViews"){
		//	log("AAAA:",tv.contentDiv.innerHTML,tv,tvs,ids);
		//};
		t.innerHTML = tv.contentDiv.innerHTML;
		t.id = tv.contentDiv.id;
		t.className = tv.contentDiv.className;
		tv.contentDiv = t;
		_this.parentNode.replaceChild(tv.contentDiv, _this);
		if (tv.subTabViews != null) {
			tv.subTabViews.UpdateHTML();
			if (t.innerHTML.trim() == tv.subTabViews.HTMLUnLoaded().trim() || t.innerHTML == tv.subTabViews.HTMLWithImg().trim()) {
				tv.contentDiv.innerHTML = tv.subTabViews.HTMLLoaded(tv.subTabViews.ContentHTML());
				//log("!TABVIEW PROBLEM!");
			};
		};
	} catch (err) { };
};
TabView.TabButtonSelect = function (_this) {
	var err;
	try {
		var ids = _this.id.split("_"), tvs = eval(_this.dataset.accessCode), tv = tvs.tabViews[ids[2]]; //
		tvs.SelectTabViewId(ids[2]);
	} catch (err) { };
};
TabView.TabButtonClose = function (_this) {
	var err;
	try {
		var ids = _this.id.split("_"), tvs = eval(_this.parentNode.dataset.accessCode), tv = tvs.tabViews[ids[2]]; //
		tvs.RemoveTabViewOfId(tv.id);
	} catch (err) { };
};
TabView.prototype.ContentHTML = function (_tabViews) {
	var h = "";
	this.loadId++;
	h += '<div id="tabview_' + this.tabViews.id + '_' + this.id + '" class="content' + (this.selected ? " sel" : "") + ((this.contentClass != "") ? ' ' + this.contentClass : "") + '">';
	h += '<img src="./skins/' + SKIN + '/imgs/empty.png" class="empty" data-access-code="' + _tabViews.accessCode + '" onload="TabView.SetContentDiv(this,' + this.loadId + ');">';
	h += '</div>';
	return h;
};
TabView.prototype.TabHTML = function (_tabViews) {
	var h = "";
	h += '<div id="tab_' + this.tabViews.id + '_' + this.id + '" data-access-code="' + _tabViews.accessCode + '" title="' + this.title.I18xTrans().HtmlEntities(µTESUP) + '" class="tab' + (this.selected ? " sel" : "") + (this.marked ? " marked" : "") + (this.isClosable ? " withCloser" : "") + '" ' + ButtonAttributes("TabView.TabButtonSelect(this);") + '>' + (this.isClosable ? '<div id="tab_' + this.tabViews.id + '_' + this.id + '_closer" class="closer"' + ButtonAttributes("TabView.TabButtonClose(this);") + '></div>' : "") + '<div class="title" id="tab_' + this.tabViews.id + '_' + this.id + '_title">' + this.title.I18xTrans().HtmlEntities() + '</div></div>';
	return h;
};
ENUMERATOR = 0;
TabView.TABVIEWTYPE_NONE = ENUMERATOR++;

// TabViews
function TabViews(_id, _type, _contentsAddClass, _accessCode, _eventHandler) {
	this.id = _id;
	this.type = (_type === undefined) ? TabViews.TABVIEWSTYPE_NORMALTABS : _type;
	this.contentsAddClass = (_contentsAddClass === undefined) ? "" : _contentsAddClass;
	this.eventHandler = (_eventHandler === undefined) ? null : _eventHandler;
	this.accessCode = _accessCode;
	this.tabViews = {};
	this.selectedTabView = null;

	this.contentDiv = document.createElement("div");
	this.contentDiv.className = "tabviews";
	this.contentDiv.innerHTML = this.ContentHTML();
	this.loadId = 0;
};

TabViews.prototype.AddTabView = function (_tabView, _selectIt = true, _doUpdateHTML = true) {
	this.tabViews[_tabView.id] = _tabView;
	_tabView.tabViews = this;
	_tabView.contentDiv.tabViews = this;
	this.tabViews[_tabView.id].selected = false;
	if (_selectIt || this.selectedTabView == null) {
		this.tabViews[_tabView.id].selected = true;
		if (this.selectedTabView != null) this.selectedTabView.selected = false;
		this.selectedTabView = this.tabViews[_tabView.id];
	};
	if (_doUpdateHTML) this.UpdateHTML();
};
TabViews.prototype.RemoveTabViewOfId = function (_id, _noBeforeEvent) {
	var nextsel = this.GetViewIdOfPrePostId(_id), ev;
	if (_noBeforeEvent === undefined) _noBeforeEvent = false;
	if (!_noBeforeEvent) {
		ev = { type: TabView.TABVIEWEVENT_BEFORECLOSE, id: _id, tabviews: this };
		// on true supress closing...
		if (this.eventHandler != null) if (this.eventHandler(ev)) return;
	};
	delete this.tabViews[_id];
	this.UpdateHTML();
	this.SelectTabViewId(nextsel);
	ev = { type: TabView.TABVIEWEVENT_AFTERCLOSE, id: _id };
	if (this.eventHandler != null) this.eventHandler(ev);
};
TabViews.prototype.GetViewIdOfPrePostId = function (_id) {
	var o, last = null, pre = null, post = null;
	for (o in this.tabViews) {
		if (o == _id) pre = last;
		if (last == _id) post = o;
		last = o;
	};
	if (pre != null) last = pre;
	if (post != null) last = post;
	if (last == null) last = "";
	return last;
};
TabViews.prototype.MarkTabViewId = function (_id, _marked) {
	var o;
	if (this.tabViews.hasOwnProperty(_id)) {
		if (this.tabViews[_id].marked != _marked) {
			this.tabViews[_id].marked = _marked;
			o = this.contentDiv.GetElementById('tab_' + this.id + '_' + _id);
			if (o) o.className = o.className.boolClass("marked", _marked);
		};
	};
};
TabViews.prototype.ChangeTitleOfViewId = function (_id, _newTitle) {
	var o;
	if (this.tabViews.hasOwnProperty(_id)) {
		this.tabViews[_id].title = _newTitle;
		o = this.contentDiv.GetElementById('tab_' + this.id + '_' + _id + "_title");
		if (o) {
			o.innerHTML = _newTitle.HtmlEntities();
			o.title = _newTitle.HtmlEntities();
		};
	};
};
TabViews.prototype.ChangeContentInnerHTMLOfViewId = function (_id, _newContent) {
	var o;
	if (this.tabViews.hasOwnProperty(_id)) {
		this.tabViews[_id].contentDiv.innerHTML = _newContent;
	};
};
TabViews.prototype.SelectTabViewId = function (_id) {
	var o, ev;
	if (this.tabViews.hasOwnProperty(_id)) {
		if (!this.tabViews[_id].selected) {
			if (this.selectedTabView != null) {
				ev = { type: TabView.TABVIEWEVENT_BEFOREDESELECT, id: this.selectedTabView.id };
				if (this.eventHandler != null) this.eventHandler(ev);
				this.selectedTabView.selected = false;
				o = this.contentDiv.GetElementById('tab_' + this.id + '_' + this.selectedTabView.id);
				if (o) o.className = o.className.removeClass("sel");
				o = this.contentDiv.GetElementById('tabview_' + this.id + '_' + this.selectedTabView.id);
				if (o) o.className = o.className.removeClass("sel");
			};
			ev = { type: TabView.TABVIEWEVENT_BEFORESELECT, id: _id };
			if (this.eventHandler != null) this.eventHandler(ev);
			this.tabViews[_id].selected = true;
			this.selectedTabView = this.tabViews[_id];
			o = this.contentDiv.GetElementById('tab_' + this.id + '_' + _id);
			if (o) o.className = o.className.addClass("sel");
			o = this.contentDiv.GetElementById('tabview_' + this.id + '_' + _id);
			if (o) o.className = o.className.addClass("sel");
		};
	};
};

TabViews.SetContentDiv = function (_this, _loadId) {
	var err;
	try {
		var tvs = eval(_this.dataset.accessCode);
		if (tvs.loadId != _loadId) return;
		_this.parentNode.replaceChild(tvs.contentDiv, _this);
		tvs.UpdateHTML();
	} catch (err) { };
};
TabViews.prototype.ContentHTML = function () {
	var h = "", t;
	if (this.type != TabViews.TABVIEWSTYPE_NOTABS) {
		h += '<div id="tabviews_' + this.id + '_tabs" class="tabs">';
		for (t in this.tabViews) {
			h += this.tabViews[t].TabHTML(this);
		};
		h += '</div>';
	};
	h += '<div id="tabviews_' + this.id + '_contents" class="contents ' + this.contentsAddClass + '">';
	for (t in this.tabViews) {
		h += this.tabViews[t].ContentHTML(this);
	};
	h += '</div>';
	return h;
};
TabViews.prototype.HTML = function () {
	var h = "";
	this.loadId++;
	h += '<div id="tabviews_' + this.id + '_container" class="tabviews">';
	h += '<img src="./skins/' + SKIN + '/imgs/empty.png" data-access-code="' + this.accessCode + '" class="empty" onload="TabViews.SetContentDiv(this,' + this.loadId + ');">';
	h += '</div>';
	return h;
};
TabViews.prototype.HTMLWithImg = function () {
	var h = "";
	h += '<div id="tabviews_' + this.id + '_container" class="tabviews">';
	h += '<img src="./skins/' + SKIN + '/imgs/empty.png" data-access-code="' + this.accessCode + '" class="empty" onload="TabViews.SetContentDiv(this,' + this.loadId + ');">';
	h += '</div>';
	return h;
};
TabViews.prototype.HTMLUnLoaded = function () {
	return '<div id="tabviews_' + this.id + '_container" class="tabviews"></div>';
};
TabViews.prototype.HTMLLoaded = function (_loadHTML) {
	return '<div id="tabviews_' + this.id + '_container" class="tabviews">' + _loadHTML + '</div>';
};
TabViews.prototype.UpdateHTML = function () {
	var ret = true, h, t, tto = this.contentDiv.GetElementById('tabviews_' + this.id + '_tabs'), tco = this.contentDiv.GetElementById('tabviews_' + this.id + '_contents');
	//log("TabViewsUpdateHTML",this.id);
	if (tto) {
		h = "";
		for (t in this.tabViews) {
			//log(this.tabViews[t].id);
			h += this.tabViews[t].TabHTML(this);
		};
		tto.innerHTML = h;
	} else {
		ret = false;
	};
	if (tco) {
		h = "";
		for (t in this.tabViews) {
			h += this.tabViews[t].ContentHTML(this);
		};
		tco.innerHTML = h;
	} else {
		ret = false;
	};
	//log("TabViewsUpdateHTML h ",h);
	return ret;
};


ENUMERATOR = 0;
TabViews.TABVIEWSTYPE_NOTABS = ENUMERATOR++;
TabViews.TABVIEWSTYPE_NORMALTABS = ENUMERATOR++;

ENUMERATOR = 0;
TabView.TABVIEWEVENT_UDNEFINED = ENUMERATOR++;
TabView.TABVIEWEVENT_BEFORECLOSE = ENUMERATOR++;
TabView.TABVIEWEVENT_AFTERCLOSE = ENUMERATOR++;
TabView.TABVIEWEVENT_BEFORESELECT = ENUMERATOR++;
TabView.TABVIEWEVENT_BEFOREDESELECT = ENUMERATOR++;


// ========================
// TOOLBAR
// ========================

// TOOLBAR BUTTON
function ToolBarButton(_p) {
	this.id = typeof (_p.id) == "undefined" ? ToolBarButton.NEXTID++ : _p.id;
	ToolBarButton.ALL[this.id] = this;
	this.class = (_p.class === undefined) ? "" : _p.class;
	this.tooltip = (_p.tooltip === undefined) ? "" : _p.tooltip;
	this.value = (_p.value === undefined) ? 0 : _p.value;
	this.enabled = true;
	this.selected = false;

	this.menu = null;
	this.toolBarGroup = null;
};
ToolBarButton.prototype.Dispose = function () {
	delete ToolBarButton.ALL[this.id];
};
ToolBarButton.NEXTID = 0;
ToolBarButton.ALL = {};
ToolBarButton.OnSelect = function (_event, _id) {
	var tb = ToolBarButton.ALL[_id], tg, v, i, l, ret = false;
	if (tb) {
		tg = tb.toolBarGroup;
		l = tg.toolBarButtons.length;
		if (tg.isMultiSelect) {
			if (_event == null) {
				tb.selected = !tb.selected;
			} else {
				if (curGUI.altKeyPressed) {
					for (i = 0; i < l; i++)tg.toolBarButtons[i].selected = false;
					tb.selected = true;
				} else if (curGUI.ctrlKeyPressed) {
					for (i = 0; i < l; i++)tg.toolBarButtons[i].selected = true;
					tb.selected = false;
				} else {
					tb.selected = !tb.selected;
				};
			};
			v = 0;
			for (i = 0; i < l; i++)if (tg.toolBarButtons[i].selected) v |= tg.toolBarButtons[i].value;
			if (tg.value != v) {
				tg.value = v;
				tg.event({ type: ToolBar.EVENTTYPE_SELECTIONCHANGED, value: v, toolbarGroup: tg, toolbutton: tb });
			};
		} else {
			for (i = 0; i < l; i++)tg.toolBarButtons[i].selected = false;
			tb.selected = true;
			tg.value = tb.value;
			v = tb.value;
			tg.event({ type: ToolBar.EVENTTYPE_SELECTIONCHANGED, value: v, toolbarGroup: tg, toolbutton: tb });
		};
		tg.UpdateHTML();
		ret = tb.selected;
	};
	return ret;
};
ToolBarButton.prototype.HTML = function () {
	var h = "";
	h += '<div id="toolbarbutton_' + this.id + '" class="button notouch ' + this.class + '" title="' + this.tooltip.HtmlEntities(µTESUP) + '" ' + ButtonAttributes("ToolBarButton.OnSelect(event,'" + this.id + "');") + '></div>';
	return h;
};

ToolBarButton.prototype.SetEnable = function (_enable) {
	this.enabled = _enable;
	this.UpdateHTML();
};

ToolBarButton.Select = function (_id) {
	return ToolBarButton.OnSelect(null, _id);
};

// TOOLBAR GROUP
function ToolBarGroup(_id, _isMultiSelect, _eventHandler) {
	this.id = _id;
	this.toolBarButtons = [];
	this.isMultiSelect = (_isMultiSelect) === undefined ? false : _isMultiSelect;
	this.event = (_isMultiSelect) === undefined ? null : _eventHandler;
	this.value = 0;

	this.toolBar = null;
};
ToolBarButton.prototype.Dispose = function () {
	var i, l = this.toolBarButtons.length;
	for (i = 0; i < l; i++)this.toolBarButtons[i].Dispose();
};
ToolBarGroup.prototype.AddToolBarButton = function (_toolBarButton) {
	this.toolBarButtons.push(_toolBarButton);
	_toolBarButton.toolBarGroup = this;
};
ToolBarGroup.prototype.Set = function (_value) {
	var i, l = this.toolBarButtons.length;
	if (this.isMultiSelect) {
		this.value = _value;
		for (i = 0; i < l; i++)this.toolBarButtons[i].selected = (_value & this.toolBarButtons[i].value);
	} else {
		for (i = 0; i < l; i++)this.toolBarButtons[i].selected = (this.toolBarButtons[i].value == _value);
		this.value = _value;
	};
	this.UpdateHTML();
	this.event({ type: ToolBar.EVENTTYPE_SELECTIONCHANGED, value: this.value, toolbarGroup: this });
};
ToolBarGroup.prototype.SetEnables = function (_enables) {
	var i, l = this.toolBarButtons.length;
	if (!this.isMultiSelect) {
		for (i = 0; i < l; i++)this.toolBarButtons[i].enabled = _enables.indexOf(this.toolBarButtons[i].value) >= 0;
		this.UpdateHTML();
	};
};
ToolBarGroup.prototype.HTML = function () {
	var h = "", i;
	h += '<div id="toolbargroup_' + this.id + '" class="group">';
	for (i = 0; i < this.toolBarButtons.length; i++) {
		h += this.toolBarButtons[i].HTML();
	};
	h += '</div>';
	return h;
};
ToolBarGroup.prototype.UpdateHTML = function () {
	var i, l = this.toolBarButtons.length, o;
	for (i = 0; i < l; i++) {
		o = document.getElementById('toolbarbutton_' + this.toolBarButtons[i].id);
		if (o) {
			if (this.toolBarButtons[i].selected) {
				o.className = o.className.addClass("sel");
			} else {
				o.className = o.className.removeClass("sel");
			};
			if (this.toolBarButtons[i].enabled) {
				o.className = o.className.removeClass("disabled");
			} else {
				o.className = o.className.addClass("disabled");
			};
		};
	};
};

// TOOLBAR
function ToolBar(_id) {
	this.id = _id;
	this.toolBarGroups = [];
};
ToolBar.prototype.Dispose = function () {
	var i, l = this.toolBarGroups.length;
	for (i = 0; i < l; i++)this.toolBarGroups[i].Dispose();
};

ToolBar.prototype.AddToolBarGroup = function (_toolBarGroup) {
	this.toolBarGroups.push(_toolBarGroup);
	_toolBarGroup.toolBar = this;
};

ToolBar.prototype.HTML = function () {
	var h = "", gr = [], i, l = this.toolBarGroups.length;
	h += '<div class="toolbar">';
	for (i = 0; i < l; i++)gr.push(this.toolBarGroups[i].HTML());
	h += gr.join('<div class="groupdiv"></div>');
	h += '</div>';
	return h;
};

ToolBar.prototype.SetUp = function (_panel) {
	_panel.contentDiv.innerHTML = this.HTML();
};

ToolBar.MenuHandler = function (_menu) {
	var p, pi = _menu.id.split("_"), tog = false;
	tog = ToolBarButton.Select(pi[1]);
	_menu.SetToggle(tog);
};

ENUMERATOR = 0;
ToolBar.EVENTTYPE_SELECTIONCHANGED = ENUMERATOR++;


// ========================
// TREEVIEW
// ========================
function TreeViewEntry(_id = "", _title, _value) {
	this.title = (_title == undefined) ? "" : _title;
	//this.id=(_id=="")?TreeViewEntry.IDCOUNTER++:_title.md5();
	this.id = TreeViewEntry.IDCOUNTER++;
	this.value = _value;
	this.subs = [];
};
TreeViewEntry.IDCOUNTER = 0;
TreeViewEntry.prototype.Add = function (_tve) {
	this.subs.push(_tve);
};
TreeViewEntry.prototype.HTML = function (_treeView, _thisEntryNo, _ofMaxEntryNo, _level, _prelevelsymbols) {
	var h = "", i, l, c, onclick = "";
	l = this.subs.length;
	if (_level == 1) {
		if (l > 0) {
			if (_thisEntryNo == _ofMaxEntryNo) {
				if (_thisEntryNo == 0) {
					c = "p1";
				} else {
					c = "pe";
				};
			} else if (_thisEntryNo == 0) {
				c = "pb";
			} else {
				c = "p";
			};
			onclick = 'TreeView.OnSwitchClick(event,this);';
		} else {
			c = "t";
			if (_ofMaxEntryNo == 0) {
				c = "-";
			} else if (_thisEntryNo == _ofMaxEntryNo) {
				c = "e";
			} else if (_thisEntryNo == 0) {
				c = "b";
			};
		};
	} else {
		if (l > 0) {
			if (_thisEntryNo == _ofMaxEntryNo) {
				if (_thisEntryNo == 0) {
					c = "pe";
				} else {
					c = "pe";
				};
			} else if (_thisEntryNo == 0) {
				c = "p";
			} else {
				c = "p";
			};
			onclick = 'TreeView.OnSwitchClick(event,this);';
		} else {
			if (_thisEntryNo == _ofMaxEntryNo) {
				c = "e";
			} else if (_thisEntryNo == 0) {
				c = "t";
			} else {
				c = "t";
			};
		};
	};
	if (_level > 0) {
		h += '<div id="treeentry_' + _treeView.id + '_' + this.id + '" class="entry">';
		h += _prelevelsymbols;
		h += '<div class="' + c + '"' + ButtonAttributes(onclick) + '></div>';
		h += '<div class="text" ' + ButtonAttributes("TreeView.OnSelectClick(event,this);") + '>' + this.title.concat('<info context="model catalog entry"/>').I18xTrans().HtmlEntities() + '</div>';
		h += '</div>';
	};
	if (l > 0) {
		h += '<div id="treeentries_' + _treeView.id + '_' + this.id + '" class="subentries' + ((_level > 0) ? ' hidden' : '') + '">';
		for (i = 0; i < l; i++)h += this.subs[i].HTML(_treeView, i, l - 1, _level + 1, ((_level == 0) ? "" : (_prelevelsymbols + ((_thisEntryNo == _ofMaxEntryNo) ? '<div class="x"></div>' : '<div class="l"></div>'))));
		h += '</div>';
	};
	return h;
};
TreeViewEntry.prototype.EntryOfId = function (_id) {
	var i, l, ret = null;
	if (this.id == _id) return this;
	l = this.subs.length;
	for (i = 0; i < l; i++) {
		ret = this.subs[i].EntryOfId(_id);
		if (ret != null) return ret;
	};
	return null;
};
function TreeView(_id, _eventHandler) {
	this.id = _id;
	this.eventHandler = (_eventHandler === undefined) ? null : _eventHandler;
	this.topnode = null;
	this.selectedEntry = null;
	TreeView.ALL[this.id] = this;
};
ENUMERATOR = 0;
TreeView.EVENTTYPE_SELECTIONCHANGED = ENUMERATOR++;
TreeView.ALL = {};

TreeView.prototype.EntryOfId = function (_id) {
	var i, l;
	if (this.topnode.id == _id) return this.topnode;
	return this.topnode.EntryOfId(_id);
};
TreeView.prototype.Set = function (_tve) {
	this.topnode = _tve;
};
TreeView.prototype.HTML = function () {
	var h = "";
	h += '<div id="treeview_' + this.id + '" class="treecontainer">';
	h += this.topnode.HTML(this, 0, 0, 0, "");
	h += '</div>';
	return h;
};
TreeView.prototype.ShowTitle = function (_title) {
	//!!!!
};

TreeView.OnSelectClick = function (_ev, _this) {
	var ids = _this.parentNode.id.split("_"), o, tv = TreeView.ALL[ids[1]], tve;
	if (tv) {
		if (tv.selectedEntry != null) {
			//tv.selectedEntry.selected=false;
			o = document.getElementById("treeentry_" + tv.id + "_" + tv.selectedEntry.id);
			if (o) o.className = o.className.removeClass("sel");
			tv.selectedEntry = null;
		};
		tve = tv.EntryOfId(ids[2]);
		if (tve) {
			//tve.selected=true;
			tv.selectedEntry = tve;
			_this.parentNode.className = _this.parentNode.className.addClass("sel");
			if (tv.eventHandler != null) tv.eventHandler({ type: TreeView.EVENTTYPE_SELECTIONCHANGED, entry: tv.selectedEntry });
		};
	};
};
TreeView.OnSwitchClick = function (_ev, _this) {
	var ids = _this.parentNode.id.split("_"), o = document.getElementById("treeentries_" + ids[1] + "_" + ids[2]), foldme = false, cn = _this.className.split(" ");
	switch (cn[0]) {
		case 'p1':
			cn[0] = 'm1';
			break;
		case 'pb':
			cn[0] = 'mb';
			break;
		case 'pe':
			cn[0] = 'me';
			break;
		case 'p':
			cn[0] = 'm';
			break;
		case 'm1':
			foldme = true;
			cn[0] = 'p1';
			break;
		case 'mb':
			foldme = true;
			cn[0] = 'pb';
			break;
		case 'me':
			foldme = true;
			cn[0] = 'pe';
			break;
		case 'm':
			foldme = true;
			cn[0] = 'p';
			break;
	};
	_this.className = cn.join(" ");
	if (o) {
		if (foldme) {
			o.className = o.className.boolClass("hidden", true);
		} else {
			o.className = o.className.boolClass("hidden", false);
		};
	};
};

// ====================================
// PANEL CONTAINERS
// ====================================
var panelIdCounter = 0;
function PanelContainer(_size) {
	this.id = panelIdCounter++;
	this.size = _size;
	this.panels = {};
};
PanelContainer.prototype.AddPanel = function (_panel) {
	this.panels[_panel.id] = _panel;
};
PanelContainer.prototype.CloseAllPanels = function (_panel) {
	var p;
	for (p in this.panels) {
		this.panels[p].Close(true);
	};
	return;
	p = ObjFirstKey(this.panels);
	while (p != null) {
		this.panels[p].Close(true);
		p = ObjFirstKey(this.panels);
	};
};
PanelContainer.prototype.HTML = function () {
	var h = "", p;
	h += '<div id="panelcontainer_' + this.id + '" class="panelContainer" style="grid-template-cols:100%;grid-template-rows:1fr;">';
	for (p in this.panels) {
		h += this.panels[p].HTML(false, 0);
	};
	h += '</div>';
	return h;
};
PanelContainer.SizeChangeEvents = function (_this) {
	var p;
	for (p in _this.panels) if (_this.panels[p].eventHandler != null) _this.panels[p].eventHandler({ type: Panel.EVENTTYPE_SIZECHANGED, panel: _this.panels[p] });
};
PanelContainer.prototype.SetUpContainerGrid = function (_eventDelay = 0) {
	var o = document.getElementById("panelcontainer_" + this.id), p, q, lastNotFolded = null, template = [];
	for (p in this.panels) { q = p; if (!this.panels[p].isFolded) lastNotFolded = p; };
	if (lastNotFolded == null) lastNotFolded = q;
	for (p in this.panels) if (p == lastNotFolded) { template.push("1fr"); } else { template.push("auto"); };
	//for(p in this.panels)if(p==lastNotFolded){template.push("auto");}else{template.push("auto");};
	o.style.gridTemplateRows = template.join(" ");
	//log(template.join(" "),this.panels);
	if (_eventDelay == 0) {
		PanelContainer.SizeChangeEvents(this);
	} else {
		setTimeout(PanelContainer.SizeChangeEvents, _eventDelay, this);
	};
};
PanelContainer.prototype.FoldAllPanels = function (_folded, _doNotPanelId = "") {
	var p;
	for (p in this.panels) if (p != _doNotPanelId) this.panels[p].SetUpFold(_folded);
}
// ====================================
// GUI
// ====================================
var GUIS = {};
var curGUI = null, lastGUI = null;
function GUI(_id, _title, _stdWorkSpace, _topMenuClass) {
	this.id = _id;
	this.title = _title;
	GUIS[this.id] = this;
	this.isMainFull = false;
	this.isActive = false;
	this.isInit = false;
	this.isWorkSpaceApply = false;

	this.mode = GUI.GENERALMOUSEMODE_NONE;
	this.floatDragPanel = {
		panel: null,
		offX: 0,
		offY: 0
	};
	this.floatSizePanel = {
		panel: null,
		startX: 0,
		startY: 0,
		startWidth: 0,
		startHeight: 0
	};
	this.sizePanelContainer = {
		dir: "",
		domElement: null,
		no: 0,
		rcno: 0,
		startX: 0,
		startY: 0,
		size: 0,
		maxSize: 0,
	};

	this.stdWorkSpace = (_stdWorkSpace === undefined) ? ObjCopySimple(GUI.EMPTYWORKSPACE) : _stdWorkSpace;
	this.topMenu = new Menu(_id, _id);
	this.topMenuClass = (_topMenuClass === undefined) ? "" : _topMenuClass;
	this.menuKeys = {};
	this.menus = {};

	this.lastLx = -1;
	this.lastLy = -1;

	this.panels = {};

	this.noOfGridCols = 3;
	this.noOfGridRows = 1;
	this.gridTemplateCols = [];
	this.gridTemplateColsStr = "";
	this.gridTemplateColsSum = 0;
	this.gridTemplateRows = [];
	this.gridTemplateRowsStr = "";
	this.gridTemplateRowsSum = 0;
	this.mainPanelContainer = new PanelContainer(0);
	this.leftPanelContainers = [];
	this.topPanelContainers = [];
	this.bottomPanelContainers = [];
	this.rightPanelContainers = [];
	this.floatPanels = [];
	this.modalPanel = null;
	this.modalPanelData = [];
	this.modalMode = false;

	this.domElementId = "";

	this.OldOnKeyDown;
	this.OldOnKeyUp;
	this.OldOnMouseDown;
	this.OldOnMouseUp;
	this.OldOnMouseMove;
	this.OldOnMouseWheel;
	this.OldOnContextMenu;

	this.extraKeyDownEvent = null;
	this.extraKeyUpEvent = null;
	this.extraMouseMoveEvent = null;
	this.extraMouseWheelEvent = null;
	this.extraRresizeEvent = null;

	this.keyDowns = {};
	this.ctrlKeyPressed = false;
	this.cmdKeyPressed = false;
	this.altKeyPressed = false;
	this.shiftKeyPressed = false;
	this.specialKeyChange = 0x00;
};
GUI.interGUIPanels = {};
ENUMERATOR = 0;
GUI.GENERALMOUSEMODE_NONE = ENUMERATOR++;
GUI.GENERALMOUSEMODE_FLOATPANELDRAG = ENUMERATOR++;
GUI.GENERALMOUSEMODE_FLOATPANELSIZE = ENUMERATOR++;
GUI.GENERALMOUSEMODE_PANELCONTAINERSIZE = ENUMERATOR++;
GUI.FLOATPANELZINDEXSTART = 9000;

GUI.modalKeyEvents = {};
GUI.modalKeyEventButtonObjects = {};

// Key Handling
GUI.KEY = {
	A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73, J: 74, K: 75, L: 76, M: 77, N: 78, O: 79, P: 80, Q: 81, R: 82, S: 83, T: 84, U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90,
	_0: 48, _1: 49, _2: 50, _3: 51, _4: 52, _5: 53, _6: 54, _7: 55, _8: 56, _9: 57,
	SPACE: 32, TAB: 9, BACKSPACE: 8, ENTER: 13, ESCAPE: 27, PAGEUP: 33, PAGEDOWN: 34, END: 35, HOME: 36,
	LEFTARROW: 37, UPARROW: 38, RIGHTARROW: 39, DOWNARROW: 40, INSERT: 45, DELETE: 46, PAUSE: 19,
	ADD: 107, SUBTRACT: 109, MULTIPLY: 106, DIVIDE: 111,
	F1: 112, F2: 113, F3: 114, F4: 115, F5: 116, F6: 117, F7: 118, F8: 119, F9: 120, F10: 121, F11: 122, F12: 123,
	COMMA: 188, PERIOD: 190,
	CTRL: 0x0200, SHIFT: 0x0400,
	ALT: 0x0100, WIN: 0x0800, // Win only
	OPT: 0x0100, CMD: 0x0800, // Mac only
	KEYCTRL: 0x0011, KEYALT: 0x0012, KEYSHIFT: 0x0010, KEYCMD: 0x0013, KEYCMDMACLEFT: 0x005B, KEYCMDMACRIGHT: 0x005D
};
GUI.KEYSTRMAC = {
	TAB: "&#8677;", BACKSPACE: "&#x232b;", ENTER: "&#x23ce;", ESCAPE: "&#9099;",
	CTRL: "^", SHIFT: "&#x21E7;",
	OPT: "&#x2325;", CMD: "&#x2318;"
}
GUI.KEYSTRMAC_BYCODE = {};
GUI.KEYSTR = {
	A: "A", B: "B", C: "C", D: "D", E: "E", F: "F", G: "G", H: "H", I: "I", J: "J", K: "K", L: "L", M: "M", N: "N", O: "O", P: "P", Q: "Q", R: "R", S: "S", T: "T", U: "U", V: "V", W: "W", X: "X", Y: "Y", Z: "Z",
	_0: "0", _1: "1", _2: "2", _3: "3", _4: "4", _5: "5", _6: "6", _7: "7", _8: "8", _9: "9",
	SPACE: 'Space<info context="key name"/>'.I18xRegister(), TAB: 'Tab<info context="key name"/>'.I18xRegister(), BACKSPACE: '&#x232b;<info context="key name backspace"/>'.I18xRegister(), ENTER: 'Enter<info context="key name"/>'.I18xRegister(), ESCAPE: 'ESC<info context="key name"/>'.I18xRegister(), PAGEUP: 'Page up<info context="key name"/>'.I18xRegister(), PAGEDOWN: 'Page down<info context="key name"/>'.I18xRegister(), END: 'End<info context="key name"/>'.I18xRegister(), HOME: 'Home<info context="key name"/>'.I18xRegister(),
	LEFTARROW: '←<info context="key name"/>'.I18xRegister(), UPARROW: '↑<info context="key name"/>'.I18xRegister(), RIGHTARROW: '→<info context="key name"/>'.I18xRegister(), DOWNARROW: '↓<info context="key name"/>'.I18xRegister(), INSERT: 'Insert<info context="key name"/>'.I18xRegister(), DELETE: 'Delete<info context="key name"/>'.I18xRegister(), PAUSE: 'Pause<info context="key name"/>'.I18xRegister(),
	ADD: "+", SUBTRACT: "-", MULTIPLY: "*", DIVIDE: "/",
	F1: "F1", F2: "F2", F3: "F3", F4: "F4", F5: "F5", F6: "F6", F7: "F7", F8: "F8", F9: "F9", F10: "F10", F11: "F11", F12: "F12",
	COMMA: ",", PERIOD: ".",
	CTRL: 'Ctrl<info context="key name"/>'.I18xRegister(), SHIFT: 'Shift<info context="key name"/>'.I18xRegister(),
	// Win only...
	ALT: 'Alt<info context="key name"/>'.I18xRegister(), WIN: 'Win<info context="key name"/>'.I18xRegister()
};
GUI.KEYSTR_BYCODE = {};
GUI.KEYCODECHARS = { KeyA: "A", KeyB: "B", KeyC: "C", KeyD: "D", KeyE: "E", KeyF: "F", KeyG: "G", KeyH: "H", KeyI: "I", KeyJ: "J", KeyK: "K", KeyL: "L", KeyM: "M", KeyN: "N", KeyO: "Q", KeyP: "R", KeyQ: "S", KeyR: "R", KeyS: "S", KeyT: "T", KeyU: "U", KeyV: "V", KeyW: "W", KeyX: "X", KeyY: "Y", KeyZ: "Z" };
GUI.KEYCODESPECIALS = { "@": 81 + GUI.KEY.ALT + GUI.KEY.CTRL, "µ": 77 + GUI.KEY.ALT + GUI.KEY.CTRL, "€": 69 + GUI.KEY.ALT + GUI.KEY.CTRL };
if (IS_MAC) GUI.KEYCODESPECIALS = { "@": 76 + GUI.KEY.ALT + GUI.KEY.CTRL, "µ": 77 + GUI.KEY.ALT + GUI.KEY.CTRL, "€": 69 + GUI.KEY.ALT + GUI.KEY.CTRL };
GUI.KEYCODEMAP = {
	KeyA: 65, KeyB: 66, KeyC: 67, KeyD: 68, KeyE: 69, KeyF: 70, KeyG: 71, KeyH: 72, KeyI: 73, KeyJ: 74, KeyK: 75, KeyL: 76, KeyM: 77, KeyN: 78, KeyO: 79, KeyP: 80, KeyQ: 81, KeyR: 82, KeyS: 83, KeyT: 84, KeyU: 85, KeyV: 86, KeyW: 87, KeyX: 88, KeyY: 89, KeyZ: 90,
	Digit0: 48, Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, Digit6: 54, Digit7: 55, Digit8: 56, Digit9: 57,
	Space: 32, Tab: 9, Backspace: 8, Enter: 13, Escape: 27, PageUp: 33, PageDown: 34, End: 35, Home: 36,
	ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Insert: 45, Delete: 46, Pause: 19,
	NumpadAdd: 107, NumpadSubtract: 109, NumpadMultiply: 106, NumpadDivide: 111,
	F1: 112, F2: 113, F3: 114, F4: 115, F5: 116, F6: 117, F7: 118, F8: 119, F9: 120, F10: 121, F11: 122, F12: 123,
	Comma: 188, Period: 190
};
GUI.GETKEYMAPPING = function (_ev) {
	var key = 0, menu, tn, keyCode = 0, c;
	if (GUI.KEYCODECHARS.hasOwnProperty(_ev.code)) {
		c = _ev.key.toUpperCase();
		if (GUI.KEYCODECHARS[_ev.code] != c) {
			if (GUI.KEYCODEMAP.hasOwnProperty("Key" + c)) {
				keyCode = GUI.KEYCODEMAP["Key" + c];
			} else {
				keyCode = GUI.KEYCODEMAP[_ev.code];
			};
		} else {
			if (GUI.KEYCODEMAP.hasOwnProperty(_ev.code)) keyCode = GUI.KEYCODEMAP[_ev.code];
		};
	} else {
		if (GUI.KEYCODEMAP.hasOwnProperty(_ev.code)) keyCode = GUI.KEYCODEMAP[_ev.code];
	};
	if (GUI.KEYCODESPECIALS.hasOwnProperty(_ev.key)) {
		key = GUI.KEYCODESPECIALS[_ev.key];
	} else {
		if (IS_MAC) {
			key = (_ev.ctrlKey ? GUI.KEY.CTRL : 0) | (_ev.shiftKey ? GUI.KEY.SHIFT : 0) | (_ev.altKey ? GUI.KEY.OPT : 0) | (_ev.metaKey ? GUI.KEY.CMD : 0) | keyCode;
		} else {
			key = (_ev.ctrlKey ? GUI.KEY.CTRL : 0) | (_ev.shiftKey ? GUI.KEY.SHIFT : 0) | (_ev.altKey ? GUI.KEY.ALT : 0) | (_ev.metaKey ? GUI.KEY.WIN : 0) | keyCode;
		};
	};
	return key;
};
GUI.KeyToStr = function (_key) {
	if (_key == 0) return "";
	var s = [];
	if (IS_MAC) {
		if (_key & GUI.KEY.CTRL) s.push(GUI.KEYSTRMAC_BYCODE[_key & GUI.KEY.CTRL]);
		if (_key & GUI.KEY.OPT) s.push(GUI.KEYSTRMAC_BYCODE[_key & GUI.KEY.OPT]);
		if (_key & GUI.KEY.SHIFT) s.push(GUI.KEYSTRMAC_BYCODE[_key & GUI.KEY.SHIFT]);
		if (_key & GUI.KEY.CMD) s.push(GUI.KEYSTRMAC_BYCODE[_key & GUI.KEY.CMD]);
		s.push(GUI.KEYSTRMAC.hasOwnProperty(_key & 0xFF) ? GUI.KEYSTRMAC_BYCODE[_key & 0xFF] : GUI.KEYSTR_BYCODE[_key & 0xFF]);
		s = s.join("");
	} else {
		if (_key & GUI.KEY.ALT) s.push(GUI.KEYSTR_BYCODE[_key & GUI.KEY.ALT]);
		if (_key & GUI.KEY.SHIFT) s.push(GUI.KEYSTR_BYCODE[_key & GUI.KEY.SHIFT]);
		if (_key & GUI.KEY.CTRL) s.push(GUI.KEYSTR_BYCODE[_key & GUI.KEY.CTRL]);
		if (_key & GUI.KEY.WIN) s.push(GUI.KEYSTR_BYCODE[_key & GUI.KEY.WIN]);
		s.push(GUI.KEYSTR_BYCODE[_key & 0xFF]);
		s = s.join("+");
	};
	return s;
};
GUI.AddInterGUIPanel = function (_panel) {
	GUI.interGUIPanels[_panel.id] = _panel;
};
GUI.RemoveInterGUIPanel = function (_panel) {
	delete GUI.interGUIPanels[_panel.id];
};
// Menu Handling
GUI.prototype.MenuHTML = function () {
	this.menuKeys = {};
	this.menus = {};
	return this.topMenu.HTML(0, this, this.topMenu);
};
// General Handling
GUI.OnBeforeUnload = function (_ev) {
	var g, msgs = [], m;
	for (g in GUIS) {
		if (GUIS[g].isInit) {
			if (GUIS[g].hasOwnProperty("UnloadCheck")) {
				m = GUIS[g].UnloadCheck();
				if (m != "") msgs.push(m);
			};
		};
	};
	if (msgs.length > 0) {
		_ev.returnValue = msgs.join("\n");
		PlaySound("confirm");
		return _ev.returnValue;
	};
	return null;
};
GUI.OnError = function (_errorMsg, _url, _lineNumber, _column, _errorObj) {
	var e;
	try { PlaySound("error"); } catch (e) { };
	try {
		curGUI.ShowAlert('Javascript Error<info context="Alert Message Title"/>'.I18xTrans(), 'A Javascript error occurred: Error: <error/><newline/>Script:<script/><newline/>Line:<line/><newline/>Column:<column/><newline/>StackTrace:<stacktrace/><info context="Alert Message"/>'.I18xTrans({ error: _errorMsg, script: _url, line: _lineNumber, column: _column, stacktrace, _errorObj }));
	} catch (e) {
		/*-- @<BUILD_ONLY_ON_BUILDS:Debug --*/
		alert('Error: ' + _errorMsg + ' Script: ' + _url + ' Line: ' + _lineNumber + ' Column: ' + _column + ' StackTrace: ' + _errorObj);
		/*-- @>BUILD_ONLY_ON_BUILDS --*/
		/*-- @<BUILD_NEVER_ON_BUILDS:Release ----
			document.location.ref="./serverexceptions/exceptionjs.html";
		---- @>BUILD_NEVER_ON_BUILDS --*/
	};
};
GUI.InitAll = function () {
	var g;
	window.onbeforeunload = GUI.OnBeforeUnload;
	/*-- @<BUILD_ONLY_ON_BUILDS:Release,Debug ----
		window.onerror=GUI.OnError;
	---- @>BUILD_ONLY_ON_BUILDS --*/
	for (g in GUIS) if (!GUIS[g].isInit) if (GUIS[g].hasOwnProperty("Init")) { GUIS[g].Init(); GUIS[g].isInit = true; };
};
GUI.ExitAll = function () {
	var g;
	for (g in GUIS) {
		GUIS[g].topMenu = new Menu(GUIS[g].id, GUIS[g].id);
		GUIS[g].menus = {};
		GUIS[g].panels = {};
		if (GUIS[g].isInit) if (GUIS[g].hasOwnProperty("Exit")) { GUIS[g].Exit(); GUIS[g].isInit = false; };
	};
};
GUI.OnUserChangedAll = function () {
	var g;
	for (g in GUIS) if (GUIS[g].isInit) if (GUIS[g].hasOwnProperty("OnUserChanged")) { GUIS[g].OnUserChanged(); };
};
GUI.prototype.ReBuildMenu = function () {
	var o = document.getElementById(this.topMenu.fullId);
	if (o) {
		o.innerHTML = this.MenuHTML();
	};
};
GUI.prototype.HTML = function () {
	var h = "", i, l, attrOnlyDropStr = ' name="guigrip" onmouseenter="GUI.OnGripMouseEnter(event,this);" onmouseleave="GUI.OnGripMouseLeave(event,this);" onmouseup="GUI.OnGripMouseUp(event,this);" ', attrGripStr = ' name="guigrip" onmouseenter="GUI.OnGripMouseEnter(event,this);" onmouseleave="GUI.OnGripMouseLeave(event,this);" onmousedown="GUI.OnGripMouseDown(event,this);" onmouseup="GUI.OnGripMouseUp(event,this);" ';
	var dropSize = 3, gripSize = 5, menuHeight = 20;
	h += '<div id="gui" class="guiContainer">';
	h += this.MenuHTML();
	this.noOfGridCols = 3;
	this.noOfGridRows = 4;
	this.gridTemplateCols = [];
	this.gridTemplateRows = [menuHeight];
	//...20px for menu...

	l = this.leftPanelContainers.length;
	this.noOfGridCols += 2 * l;
	h += '<div id="leftgrip_main" ' + attrOnlyDropStr + 'class="verPanelContainerGrip onlyDropper"></div>';
	this.gridTemplateCols.push(dropSize);
	for (i = 0; i < l; i++) {
		h += '<div id="topgrip_left_' + this.leftPanelContainers[i].id + '" ' + attrOnlyDropStr + 'class="horPanelContainerGrip onlyDropper"></div>';
		h += this.leftPanelContainers[i].HTML();
		this.gridTemplateCols.push(this.leftPanelContainers[i].size);
		h += '<div id="rightgrip_left_' + this.leftPanelContainers[i].id + '" ' + attrGripStr + 'class="verPanelContainerGrip"></div>';
		this.gridTemplateCols.push(gripSize);
		h += '<div id="bottomgrip_left_' + this.leftPanelContainers[i].id + '" ' + attrOnlyDropStr + 'class="horPanelContainerGrip onlyDropper"></div>';
	};

	l = this.topPanelContainers.length;
	h += '<div id="topgrip_main" ' + attrOnlyDropStr + 'class="horPanelContainerGrip onlyDropper"></div>';
	this.gridTemplateRows.push(dropSize);
	this.noOfGridRows += 2 * l;
	for (i = 0; i < l; i++) {
		h += this.topPanelContainers[i].HTML();
		this.gridTemplateRows.push(this.topPanelContainers[i].size);
		h += '<div id="bottomgrip_top_' + this.topPanelContainers[i].id + '" ' + attrGripStr + 'class="horPanelContainerGrip"></div>';
		this.gridTemplateRows.push(gripSize);
	};

	this.gridTemplateCols.push(-1);
	this.gridTemplateRows.push(-1);
	h += this.mainPanelContainer.HTML();

	l = this.bottomPanelContainers.length;
	this.noOfGridRows += 2 * l;
	for (i = 0; i < l; i++) {
		h += '<div id="topgrip_bottom_' + this.bottomPanelContainers[i].id + '" ' + attrGripStr + 'class="horPanelContainerGrip"></div>';
		this.gridTemplateRows.push(gripSize);
		h += this.bottomPanelContainers[i].HTML();
		this.gridTemplateRows.push(this.bottomPanelContainers[i].size);
	};
	h += '<div id="bottomgrip_main" ' + attrOnlyDropStr + 'class="horPanelContainerGrip onlyDropper"></div>';
	this.gridTemplateRows.push(dropSize);

	l = this.rightPanelContainers.length;
	this.noOfGridCols += 2 * l;
	for (i = 0; i < l; i++) {
		h += '<div id="leftgrip_right_' + this.rightPanelContainers[i].id + '" ' + attrGripStr + 'class="verPanelContainerGrip"></div>';
		h += '<div id="topgrip_right_' + this.rightPanelContainers[i].id + '" ' + attrOnlyDropStr + 'class="horPanelContainerGrip onlyDropper"></div>';
		this.gridTemplateCols.push(gripSize);
		h += this.rightPanelContainers[i].HTML();
		this.gridTemplateCols.push(this.rightPanelContainers[i].size);
		h += '<div id="bottomgrip_right_' + this.rightPanelContainers[i].id + '" ' + attrOnlyDropStr + 'class="horPanelContainerGrip onlyDropper"></div>';
	};
	h += '<div id="rightgrip_main" ' + attrOnlyDropStr + 'class="verPanelContainerGrip onlyDropper"></div>';
	this.gridTemplateCols.push(dropSize);

	h += '</div>';

	h += '<div id="guifloatpanels" class="guiFloatPanels">';
	l = this.floatPanels.length;
	for (i = 0; i < l; i++) {
		h += this.floatPanels[i].HTML(true, i);
	};
	h += '</div>';

	//if(IS_SAFARI){
	//	h+='<div id="appleshit" style="position:fixed;top:60px;width:100%;z-index:10001;">';
	//		h+=this.MenuHTML();
	//	h+='</div>';
	//};
	return h;
};

GUI.LastDownKey = 0;
GUI.prototype.SetUpWindowEvents = function (_events) {
	this.extraKeyUpEvent = (_events.hasOwnProperty("keyup") ? _events.keyup : null);
	this.extraKeyDownEvent = (_events.hasOwnProperty("keydown") ? _events.keydown : null);
	this.extraMouseMoveEvent = (_events.hasOwnProperty("mousemove") ? _events.mousemove : null);
	this.extraMouseWheelEvent = (_events.hasOwnProperty("mousewheel") ? _events.mousewheel : null);
	this.extraResizeEvent = (_events.hasOwnProperty("resize") ? _events.resize : null);
};

GUI.prototype.OnKeyDown = function (_ev) {
	var key = 0, menu, tn;
	//GUI.FixKeyEventBullShitTimer=setTimeout(GUI.FixKeyEventBullShitTimer,1000);
	if (curGUI.keyDowns[_ev.keyCode]) return;
	//if(!_ev.metaKey&&_ev.keyCode!=GUI.KEY.KEYCMDMACRIGHT&&_ev.keyCode!=GUI.KEY.KEYCMDMACLEFT)curGUI.keyDowns[_ev.keyCode]=true;
	if (curGUI.modalMode) return;
	tn = document.activeElement.tagName;
	if (tn == "INPUT" || tn == "TEXTAREA") return;
	if (_ev.target.nodeName == "TEXTAREA") return;
	key = GUI.GETKEYMAPPING(_ev);
	//log(GUI.KeyToStr(key).I18xTrans(),_ev);
	curGUI.specialKeyChange = 0;
	switch (_ev.keyCode) {
		case GUI.KEY.KEYCTRL:
			curGUI.ctrlKeyPressed = true;
			curGUI.specialKeyChange = GUI.KEY.KEYCTRL;
			break;
		case GUI.KEY.KEYALT:
			curGUI.altKeyPressed = true;
			curGUI.specialKeyChange = GUI.KEY.KEYALT;
			break;
		case GUI.KEY.KEYCMD:
			curGUI.cmdKeyPressed = true;
			curGUI.specialKeyChange = GUI.KEY.KEYCMD;
			break;
		case GUI.KEY.KEYCMDMACLEFT:
			curGUI.cmdKeyPressed = !curGUI.keyDowns[GUI.KEY.KEYCMDMACRIGHT];
			curGUI.specialKeyChange = GUI.KEY.KEYCMD;
			break;
		case GUI.KEY.KEYCMDMACRIGHT:
			curGUI.cmdKeyPressed = !curGUI.keyDowns[GUI.KEY.KEYCMDMACLEFT];
			curGUI.specialKeyChange = GUI.KEY.KEYCMD;
			break;
		case GUI.KEY.KEYSHIFT:
			curGUI.shiftKeyPressed = true;
			curGUI.specialKeyChange = GUI.KEY.KEYSHIFT;
			break;
	};
	GUI.LastDownKey = key;
	//log("DOKEY DOWN",key);
	if (curGUI.menuKeys.hasOwnProperty(key)) {
		menu = curGUI.menuKeys[key];
		//log("menuKeys.hasOwnProperty(key)");
		if (menu.Call()) _ev.preventDefault();
	};
	//log("DOWN2",key,_ev);
	if (curGUI.extraKeyDownEvent != null) curGUI.extraKeyDownEvent(_ev, key);
	_ev.preventDefault();
};
GUI.prototype.OnKeyUp = function (_ev) {
	var key = 0, menu, tn;
	key = GUI.GETKEYMAPPING(_ev);
	tn = document.activeElement.tagName;
	if (tn == "INPUT" || tn == "TEXTAREA") return;
	if (_ev.target.nodeName == "TEXTAREA") return;
	curGUI.keyDowns[_ev.keyCode] = false;
	if (curGUI.modalMode) {
		if (GUI.modalKeyEvents.hasOwnProperty(key)) {
			if (!GUI.modalKeyEventButtonObjects[key].className.hasClass("disabled")) GUI.modalKeyEvents[key]({}, GUI.modalKeyEventButtonObjects[key]);
		};
		return;
	};
	//log("UP",key,_ev);
	switch (_ev.keyCode) {
		case GUI.KEY.KEYCTRL:
			curGUI.ctrlKeyPressed = false;
			curGUI.specialKeyChange = GUI.KEY.KEYCTRL;
			break;
		case GUI.KEY.KEYALT:
			curGUI.altKeyPressed = false;
			curGUI.specialKeyChange = GUI.KEY.KEYALT;
			break;
		case GUI.KEY.KEYCMD:
			curGUI.cmdKeyPressed = false;
			curGUI.specialKeyChange = GUI.KEY.KEYCMD;
			break;
		case GUI.KEY.KEYCMDMACLEFT:
			curGUI.cmdKeyPressed = !curGUI.keyDowns[GUI.KEY.KEYCMDMACRIGHT];
			curGUI.specialKeyChange = GUI.KEY.KEYCMD;
			break;
		case GUI.KEY.KEYCMDMACRIGHT:
			curGUI.cmdKeyPressed = !curGUI.keyDowns[GUI.KEY.KEYCMDMACLEFT];
			curGUI.specialKeyChange = GUI.KEY.KEYCMD;
			break;
		case GUI.KEY.KEYSHIFT:
			curGUI.shiftKeyPressed = false;
			curGUI.specialKeyChange = GUI.KEY.KEYSHIFT;
			break;
	};
	if (key != GUI.LastDownKey) {
		//log("DOKEY UP",key);
		GUI.LastDownKey = 0;
		if (curGUI.menuKeys.hasOwnProperty(key)) {
			menu = curGUI.menuKeys[key];
			if (menu.Call()) _ev.preventDefault();
		};
	};
	if (curGUI.extraKeyUpEvent != null) curGUI.extraKeyUpEvent(_ev, key);
	_ev.preventDefault();
};
GUI.prototype.OnMouseDown = function (_ev) {
	if (curGUI.modalMode) return;
};
GUI.prototype.OnMouseUp = function (_ev) {
	var p, o;
	if (curGUI.modalMode) return;
	switch (curGUI.generalMouseMode) {
		case GUI.GENERALMOUSEMODE_FLOATPANELDRAG:
			PlaySound("button_up");
			p = curGUI.floatDragPanel.panel;
			o = document.getElementById("panel_" + p.id);
			o.className = o.className.removeClass("drag");
			o.className = o.className.removeClass("paneldock");
			curGUI.generalMouseMode = GUI.GENERALMOUSEMODE_NONE;
			GUI.SetGeneralCursor("");
			curGUI.SelectableForSizingGrips(true);
			curGUI.RemoveSelectableForDockingGrips();
			_ev.preventDefault();
			if (MCEUnFreeze !== undefined) MCEUnFreeze();
			break;
		case GUI.GENERALMOUSEMODE_FLOATPANELSIZE:
			PlaySound("button_up");
			p = curGUI.floatSizePanel.panel;
			o = document.getElementById("panel_" + p.id);
			o.className = o.className.removeClass("drag");
			curGUI.generalMouseMode = GUI.GENERALMOUSEMODE_NONE;
			GUI.SetGeneralCursor("");
			curGUI.SelectableForSizingGrips(true);
			if (curGUI) if (curGUI.isActive) if (p.eventHandler != null) {
				//p.eventHandler({type:Panel.EVENTTYPE_DOCKCHANGED,panel:p});
				p.eventHandler({ type: Panel.EVENTTYPE_SIZECHANGED, panel: p });
			}
			_ev.preventDefault();
			if (MCEUnFreeze !== undefined) MCEUnFreeze();
			break;
		case GUI.GENERALMOUSEMODE_PANELCONTAINERSIZE:
			curGUI.sizePanelContainer.domElement.className = curGUI.sizePanelContainer.domElement.className.removeClass("sel");
			PlaySound("button_up");
			curGUI.generalMouseMode = GUI.GENERALMOUSEMODE_NONE;
			_ev.preventDefault();
			break;
	};
};
GUI.prototype.OnMouseMove = function (_ev) {
	var o, panelHeaderAndMenuHeight = 80, og, size, x, y, w, h, p;
	if (curGUI.modalMode) return;
	switch (curGUI.generalMouseMode) {
		case GUI.GENERALMOUSEMODE_FLOATPANELDRAG:
			og = document.getElementById("guifloatpanels");
			o = document.getElementById("panel_" + curGUI.floatDragPanel.panel.id);
			x = (_ev.clientX - curGUI.floatDragPanel.offX); // +panelHeaderAndMenuHeight
			y = (_ev.clientY - curGUI.floatDragPanel.offY);
			x = Math.range(x, 0 - og.clientWidth + 20, og.clientWidth - 20);
			y = Math.range(y, 0, og.clientHeight - 20);
			o.style.left = x + "px";
			o.style.top = y + "px";
			p = curGUI.floatDragPanel.panel;
			p.top = y;
			p.left = x;
			_ev.preventDefault();
			break;
		case GUI.GENERALMOUSEMODE_FLOATPANELSIZE:
			og = document.getElementById("guifloatpanels");
			o = document.getElementById("panel_" + curGUI.floatSizePanel.panel.id);
			w = (_ev.clientX - curGUI.floatSizePanel.startX + curGUI.floatSizePanel.startWidth);
			h = (_ev.clientY - curGUI.floatSizePanel.startY + curGUI.floatSizePanel.startHeight);
			w = Math.range(w, 40, og.clientWidth - 20);
			h = Math.range(h, 40, og.clientHeight - 40);
			o.style.width = w + "px";
			o.style.height = h + "px";
			p = curGUI.floatSizePanel.panel;
			p.width = w;
			p.height = h;
			if (p.eventHandler != null) p.eventHandler({ type: Panel.EVENTTYPE_SIZECHANGED, panel: p });
			_ev.preventDefault();
			break;
		case GUI.GENERALMOUSEMODE_PANELCONTAINERSIZE:
			switch (curGUI.sizePanelContainer.dir) {
				case "left":
					size = _ev.clientX - curGUI.sizePanelContainer.startX + curGUI.sizePanelContainer.size;
					if (size < 20) size = 20;
					if (size > curGUI.sizePanelContainer.maxSize) size = curGUI.sizePanelContainer.maxSize;
					curGUI.leftPanelContainers[curGUI.sizePanelContainer.no].size = size;
					curGUI.gridTemplateCols[curGUI.sizePanelContainer.rcno] = size;
					curGUI._SetUpGUIGridTemplate();
					_ev.preventDefault();
					break;
				case "right":
					size = curGUI.sizePanelContainer.startX - _ev.clientX + curGUI.sizePanelContainer.size;
					if (size < 20) size = 20;
					if (size > curGUI.sizePanelContainer.maxSize) size = curGUI.sizePanelContainer.maxSize;
					curGUI.rightPanelContainers[curGUI.sizePanelContainer.no].size = size;
					curGUI.gridTemplateCols[curGUI.sizePanelContainer.rcno] = size;
					curGUI._SetUpGUIGridTemplate();
					_ev.preventDefault();
					break;
				case "top":
					size = _ev.clientY - curGUI.sizePanelContainer.startY + curGUI.sizePanelContainer.size;
					if (size < 20) size = 20;
					if (size > curGUI.sizePanelContainer.maxSize) size = curGUI.sizePanelContainer.maxSize;
					curGUI.topPanelContainers[curGUI.sizePanelContainer.no].size = size;
					curGUI.gridTemplateRows[curGUI.sizePanelContainer.rcno] = size;
					curGUI._SetUpGUIGridTemplate();
					_ev.preventDefault();
					break;
				case "bottom":
					size = curGUI.sizePanelContainer.startY - _ev.clientY + curGUI.sizePanelContainer.size;
					if (size < 20) size = 20;
					if (size > curGUI.sizePanelContainer.maxSize) size = curGUI.sizePanelContainer.maxSize;
					curGUI.bottomPanelContainers[curGUI.sizePanelContainer.no].size = size;
					curGUI.gridTemplateRows[curGUI.sizePanelContainer.rcno] = size;
					curGUI._SetUpGUIGridTemplate();
					_ev.preventDefault();
					break;
			};
			break;
	};
	if (curGUI.extraMouseMoveEvent != null) curGUI.extraMouseMoveEvent(_ev);
};
GUI.prototype.OnMouseWheel = function (_ev) {
	if (curGUI.modalMode) return;
	if (curGUI.extraMouseWheelEvent != null) curGUI.extraMouseWheelEvent(_ev);
};

GUI.prototype.OnContextMenu = function (_ev) {
	_ev.preventDefault();
};

GUI.InsertPanelIntoContainer = function (_cName, _containers, _cid, _panel, _atBegin) {
	var no = curGUI.GetPanelContainerNoOfId(_containers, _cid), mno = no, np = document.createElement("div"), i, l, o;
	_panel.isDocked = true;
	curGUI.floatPanels.RemoveElement(_panel);
	o = document.getElementById("panel_" + _panel.id);
	if (o) o.outerHTML = "";
	np.innerHTML = _panel.HTML(false);
	//log(no,_containers);
	if (_atBegin) {
		_containers[no].panels = ObjInsertFirstProperty(_containers[no].panels, _panel.id, _panel);
		document.getElementById("panelcontainer_" + _cid).insertBefore(np.firstChild, document.getElementById("panelcontainer_" + _cid).firstChild);
		if (_cName == "right" || _cName == "bottom") no = _containers.length - no - 1;
		_panel.prefContainer = _cName + "," + no + ",0";
	} else {
		_containers[no].panels[_panel.id] = _panel;
		document.getElementById("panelcontainer_" + _cid).appendChild(np.firstChild);
		if (_cName == "right" || _cName == "bottom") no = _containers.length - no - 1;
		_panel.prefContainer = _cName + "," + no + ",99";
	};
	_panel.visible = true;
	if (_panel.menu != null) _panel.menu.SetToggle(_panel.visible);
	if (_panel.eventHandler != null) _panel.eventHandler({ type: Panel.EVENTTYPE_DOCKCHANGED, panel: _panel });
	switch (_cName) {
		case "left": curGUI.leftPanelContainers[mno].SetUpContainerGrid(); break;
		case "right": curGUI.rightPanelContainers[mno].SetUpContainerGrid(); break;
		case "top": curGUI.topPanelContainers[mno].SetUpContainerGrid(); break;
		case "bottom": curGUI.bottomPanelContainers[mno].SetUpContainerGrid(); break;
	};
};
GUI.CreateNewPanelContainer = function (_caryName, _cid, _size) {
	var cno, ogui = document.getElementById("gui"), nc = document.createElement("div"), h = "", ncc, i, l;
	var attrOnlyDropStr = ' name="guigrip" onmouseenter="GUI.OnGripMouseEnter(event,this);" onmouseleave="GUI.OnGripMouseLeave(event,this);" onmouseup="GUI.OnGripMouseUp(event,this);" ', attrGripStr = ' name="guigrip" onmouseenter="GUI.OnGripMouseEnter(event,this);" onmouseleave="GUI.OnGripMouseLeave(event,this);" onmousedown="GUI.OnGripMouseDown(event,this);" onmouseup="GUI.OnGripMouseUp(event,this);" ';
	var ret = -1, l, wasGridChange = false;
	wasGridChange = true;
	if (_size === undefined) _size = 150;
	switch (_caryName) {
		case "left":
			if (_cid == -1) {
				curGUI.leftPanelContainers.unshift(new PanelContainer(_size));
				cno = 0;
			} else {
				cno = curGUI.GetPanelContainerNoOfId(curGUI.leftPanelContainers, _cid) + 1;
				curGUI.leftPanelContainers.splice(cno, 0, new PanelContainer(_size));
			};
			curGUI.gridTemplateCols.splice(cno * 2 + 1, 0, _size, 5);
			curGUI.noOfGridCols += 2;
			h += '<div id="topgrip_left_' + curGUI.leftPanelContainers[cno].id + '" ' + attrOnlyDropStr + 'class="horPanelContainerGrip onlyDropper"></div>';
			h += curGUI.leftPanelContainers[cno].HTML();
			h += '<div id="rightgrip_left_' + curGUI.leftPanelContainers[cno].id + '" ' + attrGripStr + 'class="verPanelContainerGrip"></div>';
			h += '<div id="bottomgrip_left_' + curGUI.leftPanelContainers[cno].id + '" ' + attrOnlyDropStr + 'class="horPanelContainerGrip onlyDropper"></div>';
			ret = curGUI.leftPanelContainers[cno].id;
			break;
		case "right":
			if (_cid == -1) {
				curGUI.rightPanelContainers.push(new PanelContainer(_size));
				cno = curGUI.rightPanelContainers.length - 1;
			} else {
				cno = curGUI.GetPanelContainerNoOfId(curGUI.rightPanelContainers, _cid);
				curGUI.rightPanelContainers.splice(cno, 0, new PanelContainer(_size));
			};
			l = curGUI.rightPanelContainers.length;
			curGUI.gridTemplateCols.splice(curGUI.leftPanelContainers.length * 2 + 2 + (cno) * 2, 0, 5, _size);
			curGUI.noOfGridCols += 2;
			h += '<div id="leftgrip_right_' + curGUI.rightPanelContainers[cno].id + '" ' + attrGripStr + 'class="verPanelContainerGrip"></div>';
			h += '<div id="topgrip_right_' + curGUI.rightPanelContainers[cno].id + '" ' + attrOnlyDropStr + 'class="horPanelContainerGrip onlyDropper"></div>';
			h += curGUI.rightPanelContainers[cno].HTML();
			h += '<div id="bottomgrip_right_' + curGUI.rightPanelContainers[cno].id + '" ' + attrOnlyDropStr + 'class="horPanelContainerGrip onlyDropper"></div>';
			ret = curGUI.rightPanelContainers[cno].id;
			break;
		case "top":
			if (_cid == -1) {
				curGUI.topPanelContainers.unshift(new PanelContainer(_size));
				cno = 0;
			} else {
				cno = curGUI.GetPanelContainerNoOfId(curGUI.topPanelContainers, _cid) + 1;
				curGUI.topPanelContainers.splice(cno, 0, new PanelContainer(_size));
			};
			curGUI.gridTemplateRows.splice(cno * 2 + 2, 0, _size, 5);
			curGUI.noOfGridRows += 2;
			h += curGUI.topPanelContainers[cno].HTML();
			h += '<div id="bottomgrip_top_' + curGUI.topPanelContainers[cno].id + '" ' + attrGripStr + 'class="horPanelContainerGrip"></div>';
			ret = curGUI.topPanelContainers[cno].id;
			break;
		case "bottom":
			if (_cid == -1) {
				curGUI.bottomPanelContainers.push(new PanelContainer(_size));
				cno = curGUI.bottomPanelContainers.length - 1;
			} else {
				cno = curGUI.GetPanelContainerNoOfId(curGUI.bottomPanelContainers, _cid);
				curGUI.bottomPanelContainers.splice(cno, 0, new PanelContainer(_size));
			};
			l = curGUI.bottomPanelContainers.length;
			curGUI.gridTemplateRows.splice(curGUI.topPanelContainers.length * 2 + 3 + (cno) * 2, 0, 5, _size);
			curGUI.noOfGridRows += 2;
			h += '<div id="topgrip_bottom_' + curGUI.bottomPanelContainers[cno].id + '" ' + attrGripStr + 'class="horPanelContainerGrip"></div>';
			h += curGUI.bottomPanelContainers[cno].HTML();
			ret = curGUI.bottomPanelContainers[cno].id;
			break;
	};
	nc.innerHTML = h;
	ncc = nc.childNodes;
	l = ncc.length;
	for (i = 0; i < l; i++)ogui.appendChild(ncc[0]);
	if (wasGridChange) curGUI._SetUpGUIGrid();
	return ret;
};

GUI.OnGripMouseUp = function (_ev, _this) {
	var g, p;
	if (curGUI != null) if (curGUI.isActive) {
		if (curGUI.generalMouseMode == GUI.GENERALMOUSEMODE_FLOATPANELDRAG) {
			// dock panel...
			PlaySound("button_up");
			p = curGUI.floatDragPanel.panel;
			if (p.eventHandler != null) p.eventHandler({ type: Panel.EVENTTYPE_WILLREMOVEDFROMDOM, panel: p });
			switch (curGUI.generalMouseMode) {
				case GUI.GENERALMOUSEMODE_FLOATPANELDRAG:
					g = _this.id.split("_");
					switch (g[1]) {
						case "main":
							switch (g[0]) {
								case "leftgrip":
									GUI.InsertPanelIntoContainer("left", curGUI.leftPanelContainers, GUI.CreateNewPanelContainer("left", -1), p, true);
									break;
								case "rightgrip":
									GUI.InsertPanelIntoContainer("right", curGUI.rightPanelContainers, GUI.CreateNewPanelContainer("right", -1), p, true);
									break;
								case "topgrip":
									GUI.InsertPanelIntoContainer("top", curGUI.topPanelContainers, GUI.CreateNewPanelContainer("top", -1), p, true);
									break;
								case "bottomgrip":
									GUI.InsertPanelIntoContainer("bottom", curGUI.bottomPanelContainers, GUI.CreateNewPanelContainer("bottom", -1), p, true);
									break;
							};
							break;
						case "left":
							switch (g[0]) {
								case "rightgrip":
									GUI.InsertPanelIntoContainer("left", curGUI.leftPanelContainers, GUI.CreateNewPanelContainer("left", parseInt(g[2], 10)), p, true);
									break;
								case "topgrip":
									GUI.InsertPanelIntoContainer("left", curGUI.leftPanelContainers, parseInt(g[2], 10), p, true);
									break;
								case "bottomgrip":
									GUI.InsertPanelIntoContainer("left", curGUI.leftPanelContainers, parseInt(g[2], 10), p, false);
									break;
							};
							break;
						case "right":
							switch (g[0]) {
								case "leftgrip":
									GUI.InsertPanelIntoContainer("right", curGUI.rightPanelContainers, GUI.CreateNewPanelContainer("right", parseInt(g[2], 10)), p, true);
									break;
								case "topgrip":
									GUI.InsertPanelIntoContainer("right", curGUI.rightPanelContainers, parseInt(g[2], 10), p, true);
									break;
								case "bottomgrip":
									GUI.InsertPanelIntoContainer("right", curGUI.rightPanelContainers, parseInt(g[2], 10), p, false);
									break;
							};
							break;
						case "top":
							switch (g[0]) {
								case "bottomgrip":
									GUI.InsertPanelIntoContainer("top", curGUI.topPanelContainers, parseInt(g[2], 10), p, false);
									break;
							};
							break;
						case "bottom":
							switch (g[0]) {
								case "topgrip":
									GUI.InsertPanelIntoContainer("bottom", curGUI.bottomPanelContainers, parseInt(g[2], 10), p, false);
									break;
							};
							break;
					};
					curGUI.generalMouseMode = GUI.GENERALMOUSEMODE_NONE;
					GUI.SetGeneralCursor("");
					curGUI.SelectableForSizingGrips(true);
					curGUI.RemoveSelectableForDockingGrips();
					break;
			};
		};
	};
};
GUI.OnGripMouseEnter = function (_ev, _this) {
	var po;
	if (curGUI != null) if (curGUI.isActive) {
		if (curGUI.generalMouseMode == GUI.GENERALMOUSEMODE_FLOATPANELDRAG) {
			switch (curGUI.generalMouseMode) {
				case GUI.GENERALMOUSEMODE_FLOATPANELDRAG:
					_this.className = _this.className.addClass("selectableForDocking");
					po = document.getElementById("panel_" + curGUI.floatDragPanel.panel.id);
					if (po) po.className = po.className.addClass("paneldock");
					_this.className = _this.className.addClass("selectableForDocking");
					//document.getElementById("body").className=document.getElementById("body").className.addClass("cursor_paneldock");
					break;
			};
		};
	};
};
GUI.OnGripMouseLeave = function (_ev, _this) {
	var po;
	if (curGUI != null) if (curGUI.isActive) {
		if (curGUI.generalMouseMode == GUI.GENERALMOUSEMODE_FLOATPANELDRAG) {
			switch (curGUI.generalMouseMode) {
				case GUI.GENERALMOUSEMODE_FLOATPANELDRAG:
					_this.className = _this.className.removeClass("selectableForDocking");
					po = document.getElementById("panel_" + curGUI.floatDragPanel.panel.id);
					if (po) po.className = po.className.removeClass("paneldock");
					break;
			};
		};
	};
};
GUI.prototype.GetPanelContainerNoOfId = function (_pcAry, _id) {
	var ret = -1, i, l;
	l = _pcAry.length;
	for (i = 0; i < l; i++)if (_pcAry[i].id == _id) return i;
	return -1;
};
GUI.prototype.GetPanelContainerInfoOfPanelId = function (_id) {
	var i, l, j, p;
	l = this.leftPanelContainers.length;
	for (i = 0; i < l; i++) {
		j = 0;
		for (p in this.leftPanelContainers[i].panels) {
			if (p == _id) return { container: "left", no: i, pos: j };
			j++;
		};
	};
	l = this.rightPanelContainers.length;
	for (i = 0; i < l; i++) {
		j = 0;
		for (p in this.rightPanelContainers[i].panels) {
			if (p == _id) return { container: "right", no: i, pos: j };
			j++;
		};
	};
	l = this.topPanelContainers.length;
	for (i = 0; i < l; i++) {
		j = 0;
		for (p in this.topPanelContainers[i].panels) {
			if (p == _id) return { container: "top", no: i, pos: j };
			j++;
		};
	};
	l = this.bottomPanelContainers.length;
	for (i = 0; i < l; i++) {
		j = 0;
		for (p in this.bottomPanelContainers[i].panels) {
			if (p == _id) return { container: "bottom", no: i, pos: j };
			j++;
		};
	};
	l = this.floatPanels.length;
	for (i = 0; i < l; i++) {
		if (this.floatPanels[i].id == _id) return { container: "float", no: 0, pos: i };
	};
	return { container: "", no: 0, pos: 0 };
};
GUI.OnGripMouseDown = function (_ev, _this) {
	var p, pn, og, i, l, maxWidth = 0, maxHeight = 0;
	if (curGUI != null) if (curGUI.isActive) {
		curGUI.Resize(true);
		PlaySound("button_down");
		og = document.getElementById("gui");
		l = curGUI.gridTemplateCols.length;
		for (i = 0; i < l; i++)if (curGUI.gridTemplateCols[i] != -1) maxWidth += curGUI.gridTemplateCols[i];
		maxWidth = og.clientWidth - 40 - maxWidth;
		l = curGUI.gridTemplateRows.length;
		for (i = 0; i < l; i++)if (curGUI.gridTemplateRows[i] != -1) maxHeight += curGUI.gridTemplateRows[i];
		maxHeight = og.clientHeight - 40 - 20 - maxHeight;
		curGUI.generalMouseMode = GUI.GENERALMOUSEMODE_PANELCONTAINERSIZE;
		_this.className = _this.className.addClass("sel");
		p = _this.id.split("_");
		pn = { dir: p[1], no: 0, rcno: 0, startX: _ev.clientX - 0, startY: _ev.clientY - 0, size: 0, maxSize: 0 };
		switch (p[1]) {
			case "left":
				pn.no = curGUI.GetPanelContainerNoOfId(curGUI.leftPanelContainers, parseInt(p[2], 10));
				pn.rcno = pn.no * 2 + 1;
				pn.size = curGUI.leftPanelContainers[pn.no].size;
				pn.maxSize = maxWidth + pn.size;
				break;
			case "right":
				pn.no = curGUI.GetPanelContainerNoOfId(curGUI.rightPanelContainers, parseInt(p[2], 10));
				pn.rcno = curGUI.leftPanelContainers.length * 2 + 2 + pn.no * 2 + 1;
				pn.size = curGUI.rightPanelContainers[pn.no].size;
				pn.maxSize = maxWidth + pn.size;
				break;
			case "top":
				pn.no = curGUI.GetPanelContainerNoOfId(curGUI.topPanelContainers, parseInt(p[2], 10));
				pn.rcno = pn.no * 2 + 2;
				pn.size = curGUI.topPanelContainers[pn.no].size;
				pn.maxSize = maxHeight + pn.size;
				break;
			case "bottom":
				pn.no = curGUI.GetPanelContainerNoOfId(curGUI.bottomPanelContainers, parseInt(p[2], 10));
				pn.rcno = curGUI.topPanelContainers.length * 2 + 4 + pn.no * 2;
				pn.size = curGUI.bottomPanelContainers[pn.no].size;
				pn.maxSize = maxHeight + pn.size;
				break;
		};
		pn.domElement = _this;
		curGUI.sizePanelContainer = pn;
	};
};
// Panel Handling
GUI.prototype.AddPanel = function (_panel, _optNewPanelHandler) {
	if (_optNewPanelHandler !== undefined) _panel.eventHandler = _optNewPanelHandler;
	this.panels[_panel.id] = _panel;
	if (_panel.hasOwnProperty("Init")) this.panels[_panel.id].Init();
};
GUI.prototype.RemovePanel = function (_panel) {
	if (_panel.visible) if (_panel.hasOwnProperty("Close")) t_panel.Close(true);
	delete this.panels[_panel.id];
};
GUI.prototype.Panel2Front = function (_panel) {
	var i, l = this.floatPanels.length, f = [], o;
	for (i = 0; i < l; i++)if (this.floatPanels[i].id != _panel.id) f.push(this.floatPanels[i]);
	f.push(_panel);
	this.floatPanels = f;
	if (this.isActive) {
		for (i = 0; i < l; i++) {
			if (this.floatPanels[i]) {
				o = document.getElementById("panel_" + this.floatPanels[i].id);
				if (o) o.style.zIndex = GUI.FLOATPANELZINDEXSTART + i;
			};
		};
	};
};
GUI.prototype.FloatPanelOfId = function (_id) {
	var i, l = this.floatPanels.length;
	for (i = 0; i < l; i++)if (this.floatPanels[i].id == _id) return this.floatPanels[i];
	return null;
};

// Workspace Handling
GUI.prototype._ApplyContainerPanels = function (_info, _prefId) {
	var i, l, pc, p, q, containerAry = [], anyThere, w, z;
	l = _info.length;
	for (i = 0; i < l; i++) {
		anyThere = false;
		q = _info[i].panels.length;
		for (p = 0; p < q; p++)if (this.panels.hasOwnProperty(_info[i].panels[p].name)) { anyThere = true; break; };
		if (anyThere) {
			pc = new PanelContainer(_info[i].size);
			for (p = 0; p < q; p++) {
				if (this.panels.hasOwnProperty(_info[i].panels[p].name)) {
					w = _info[i].panels[p];
					z = this.panels[w.name];
					pc.AddPanel(z);
					z.isDocked = true;
					z.visible = true;
					if (z.menu != null) z.menu.SetToggle(z.visible);
					if (curGUI) if (curGUI.isActive) if (z.eventHandler != null) z.eventHandler({ type: Panel.EVENTTYPE_VISIBLECHANGED, panel: z });
					if (_prefId == "bottom" || _prefId == "right") {
						z.prefContainer = _prefId + "," + (l - i - 1) + "," + p;
					} else {
						z.prefContainer = _prefId + "," + i + "," + p;
					};
				};
			};
			containerAry.push(pc);
		};
	};
	return containerAry;
};
GUI.prototype.ApplyWorkSpace = function (_workSpace, _callAWSEvent = false) {
	var i, l, p, f;
	this.isWorkSpaceApply = true;

	this.isMainFull = false;
	for (i in GUI.interGUIPanels) GUI.interGUIPanels[i].visible = false;
	this.RemovePanels();

	//log("ApplyWorkSpace",_workSpace);
	if (_workSpace === undefined) return;
	if (_workSpace.main.hasOwnProperty("name")) if (_workSpace.main.name != "") {
		if (this.panels.hasOwnProperty(_workSpace.main.name)) {
			this.panels[_workSpace.main.name].visible = true;
			this.mainPanelContainer.AddPanel(this.panels[_workSpace.main.name])
		};
	};
	this.leftPanelContainers = this._ApplyContainerPanels(_workSpace.lefts, "left");
	this.topPanelContainers = this._ApplyContainerPanels(_workSpace.tops, "top");
	this.bottomPanelContainers = this._ApplyContainerPanels(_workSpace.bottoms, "bottom");
	this.rightPanelContainers = this._ApplyContainerPanels(_workSpace.rights, "right");
	l = _workSpace.floats.length;
	this.floatPanels = [];
	for (i = 0; i < l; i++) {
		if (this.panels.hasOwnProperty(_workSpace.floats[i].name)) {
			f = _workSpace.floats[i];
			p = this.panels[f.name];
			this.floatPanels.push(p);
			p.top = f.top;
			p.left = f.left;
			p.width = f.width;
			p.height = f.height;
			p.isDocked = false;
			p.visible = true;
			if (p.menu != null) p.menu.SetToggle(p.visible);
			if (curGUI) if (curGUI.isActive) if (p.eventHandler != null) p.eventHandler({ type: Panel.EVENTTYPE_VISIBLECHANGED, panel: p });
			p.prefContainer = "float,pos," + f.left + "," + f.top + "," + f.width + "," + f.height;
		};
	};
	//log(_workSpace);
	f = _workSpace.prefs.panels;
	for (p in f) {
		if (this.panels[p]) if (f[p].container !== undefined) this.panels[p].prefContainer = f[p].container;
	};

	if (this.isActive) {
		document.getElementById(this.domElementId).innerHTML = this.HTML();
		this._SetUpGUIGrid();
		this.SelectableForSizingGrips(true);
		setTimeout(ResizeViewPort, 10, {}, _callAWSEvent);
	};
	this.isWorkSpaceApply = false;
};
GUI.EMPTYWORKSPACE = { main: {}, tops: [], lefts: [], rights: [], bottoms: [], floats: [], prefs: { panels: {} } };
GUI.prototype.GetWorkSpace = function () {
	var ret = ObjCopySimple(GUI.EMPTYWORKSPACE), i, l, panels, panel, p;
	if (ObjCount(this.mainPanelContainer.panels) > 0) {
		ret.main.name = this.mainPanelContainer.panels[ObjFirstKey(this.mainPanelContainer.panels)].id;
	};
	l = this.leftPanelContainers.length;
	for (i = 0; i < l; i++) {
		panels = [];
		for (p in this.leftPanelContainers[i].panels) {
			panels.push({ name: this.leftPanelContainers[i].panels[p].id });
		};
		ret.lefts.push({ panels: panels, size: this.leftPanelContainers[i].size });
	};
	l = this.rightPanelContainers.length;
	for (i = 0; i < l; i++) {
		panels = [];
		for (p in this.rightPanelContainers[i].panels) {
			panels.push({ name: this.rightPanelContainers[i].panels[p].id });
		};
		ret.rights.push({ panels: panels, size: this.rightPanelContainers[i].size });
	};
	l = this.topPanelContainers.length;
	for (i = 0; i < l; i++) {
		panels = [];
		for (p in this.topPanelContainers[i].panels) {
			panels.push({ name: this.topPanelContainers[i].panels[p].id });
		};
		ret.tops.push({ panels: panels, size: this.topPanelContainers[i].size });
	};
	l = this.bottomPanelContainers.length;
	for (i = 0; i < l; i++) {
		panels = [];
		for (p in this.bottomPanelContainers[i].panels) {
			panels.push({ name: this.bottomPanelContainers[i].panels[p].id });
		};
		ret.bottoms.push({ panels: panels, size: this.bottomPanelContainers[i].size });
	};
	l = this.floatPanels.length;
	for (i = 0; i < l; i++) {
		if (!this.floatPanels[i].isDocked) {
			// ...!!!! workaround: error on other place in code!!!!
			this.floatPanels[i].prefContainer = "float,pos," + this.floatPanels[i].left + "," + this.floatPanels[i].top + "," + this.floatPanels[i].width + "," + this.floatPanels[i].height;
			ret.floats.push({ name: this.floatPanels[i].id, top: this.floatPanels[i].top, left: this.floatPanels[i].left, width: this.floatPanels[i].width, height: this.floatPanels[i].height });
		};
	};
	for (p in this.panels) {
		ret.prefs.panels[p] = this.panels[p].prefContainer;
	};
	return ret;
};
GUI.prototype.GetLocalStorageWorkSpace = function (_defaultWorkSpace) {
	var ws = StorageItemGet("WorkSpace_" + this.id, _defaultWorkSpace);
	//errlog("GetLocalStorageWorkSpace",this.id,ws);
	this.ApplyWorkSpace(ws);
	this.SetLocalStorageWorkSpace(ws);
};
GUI.prototype.SetLocalStorageWorkSpace = function (_defaultWorkSpace, _doApply) {
	var ws;
	if (_doApply === undefined) _doApply = true;
	if (_defaultWorkSpace === undefined) {
		ws = this.GetWorkSpace();
	} else {
		ws = _defaultWorkSpace;
	};
	//errlog("SetLocalStorageWorkSpace",this.id,ws);
	StorageItemSet("WorkSpace_" + this.id, ws);
	if (_doApply) this.ApplyWorkSpace(ws, true);
};
GUI.prototype._SetUpGUIGridTemplate = function () {
	var i, l, c = [], r = [], og = document.getElementById("gui"), oc = document.getElementById("content"), p, po, w, ll, q;
	this.gridTemplateColsStr = "";
	this.gridTemplateColsSum = 0;
	this.gridTemplateRowsStr = "";
	this.gridTemplateRowsSum = 0;

	l = this.gridTemplateCols.length;
	for (i = 0; i < l; i++) {
		if (this.gridTemplateCols[i] == -1) {
			c.push("calc");
			// 1fr
		} else {
			c.push(this.gridTemplateCols[i] + "px");
			this.gridTemplateColsSum += this.gridTemplateCols[i];
		};
	};
	l = this.gridTemplateRows.length;
	for (i = 0; i < l; i++) {
		if (this.gridTemplateRows[i] == -1) {
			r.push("calc");
			// 1fr
		} else {
			r.push(this.gridTemplateRows[i] + "px");
			this.gridTemplateRowsSum += this.gridTemplateRows[i];
		};
	};

	q = this.mainPanelContainer.panels[ObjFirstKey(this.mainPanelContainer.panels)]
	if (q != null) if (q.eventHandler != null) q.eventHandler({ type: Panel.EVENTTYPE_SIZECHANGED, panel: q });

	this.gridTemplateColsStr = c.join(" ");
	og.style.gridTemplateColumns = this.gridTemplateColsStr.replace("calc", (oc.clientWidth - this.gridTemplateColsSum) + "px");
	this.gridTemplateRowsStr = r.join(" ");
	og.style.gridTemplateRows = this.gridTemplateRowsStr.replace("calc", (oc.clientHeight - this.gridTemplateRowsSum) + "px");

	// Set up panel widths...
	l = this.leftPanelContainers.length;
	for (i = 0; i < l; i++) {
		w = this.gridTemplateCols[i * 2 + 1];
		for (p in this.leftPanelContainers[i].panels) {
			q = this.leftPanelContainers[i].panels[p];
			po = document.getElementById("panel_" + q.id);
			po.style.width = w + "px";
			if (q.eventHandler != null) q.eventHandler({ type: Panel.EVENTTYPE_SIZECHANGED, panel: q });
		};
	};
	ll = l;
	l = this.rightPanelContainers.length;
	for (i = 0; i < l; i++) {
		w = this.gridTemplateCols[ll * 2 + 3 + i * 2];
		for (p in this.rightPanelContainers[i].panels) {
			q = this.rightPanelContainers[i].panels[p];
			po = document.getElementById("panel_" + q.id);
			po.style.width = w + "px";
			if (q.eventHandler != null) q.eventHandler({ type: Panel.EVENTTYPE_SIZECHANGED, panel: q });
		};
	};
	l = this.topPanelContainers.length;
	for (i = 0; i < l; i++)for (p in this.topPanelContainers[i].panels) { q = this.topPanelContainers[i].panels[p]; if (q.eventHandler != null) q.eventHandler({ type: Panel.EVENTTYPE_SIZECHANGED, panel: q }); };
	l = this.bottomPanelContainers.length;
	for (i = 0; i < l; i++)for (p in this.bottomPanelContainers[i].panels) { q = this.bottomPanelContainers[i].panels[p]; if (q.eventHandler != null) q.eventHandler({ type: Panel.EVENTTYPE_SIZECHANGED, panel: q }); };

};

GUI.prototype._SetUpGUIGrid = function () {
	var om, opc, i, l, leftOff, topOff,
		om = document.getElementById("menu_" + this.id + "_" + this.id);

	this._SetUpGUIGridTemplate();

	l = this.leftPanelContainers.length;
	leftOff = l;
	for (i = 0; i < l; i++) {
		opc = document.getElementById("panelcontainer_" + this.leftPanelContainers[i].id);
		opc.style.gridColumnStart = i * 2 + 2;
		opc.style.gridColumnEnd = i * 2 + 3;
		opc.style.gridRowStart = 3;
		opc.style.gridRowEnd = this.noOfGridRows;
		opc = document.getElementById("topgrip_left_" + this.leftPanelContainers[i].id);
		opc.style.gridColumnStart = i * 2 + 2;
		opc.style.gridColumnEnd = i * 2 + 3;
		opc.style.gridRowStart = 2;
		opc.style.gridRowEnd = 3;
		opc = document.getElementById("bottomgrip_left_" + this.leftPanelContainers[i].id);
		opc.style.gridColumnStart = i * 2 + 2;
		opc.style.gridColumnEnd = i * 2 + 3;
		opc.style.gridRowStart = this.noOfGridRows;
		opc.style.gridRowEnd = this.noOfGridRows + 1;
		opc = document.getElementById("rightgrip_left_" + this.leftPanelContainers[i].id);
		opc.style.gridColumnStart = i * 2 + 3;
		opc.style.gridColumnEnd = i * 2 + 4;
		opc.style.gridRowStart = 3;
		opc.style.gridRowEnd = this.noOfGridRows;
		this.leftPanelContainers[i].SetUpContainerGrid();
	};
	l = this.rightPanelContainers.length;
	for (i = 0; i < l; i++) {
		opc = document.getElementById("panelcontainer_" + this.rightPanelContainers[i].id);
		opc.style.gridColumnStart = leftOff * 2 + 1 + i * 2 + 3;
		opc.style.gridColumnEnd = leftOff * 2 + 1 + i * 2 + 4;
		opc.style.gridRowStart = 3;
		opc.style.gridRowEnd = this.noOfGridRows;
		opc = document.getElementById("topgrip_right_" + this.rightPanelContainers[i].id);
		opc.style.gridColumnStart = leftOff * 2 + 1 + i * 2 + 3;
		opc.style.gridColumnEnd = leftOff * 2 + 1 + i * 2 + 4;
		opc.style.gridRowStart = 2;
		opc.style.gridRowEnd = 3;
		opc = document.getElementById("bottomgrip_right_" + this.rightPanelContainers[i].id);
		opc.style.gridColumnStart = leftOff * 2 + 1 + i * 2 + 3;
		opc.style.gridColumnEnd = leftOff * 2 + 1 + i * 2 + 4;
		opc.style.gridRowStart = this.noOfGridRows;
		opc.style.gridRowEnd = this.noOfGridRows + 1;
		opc = document.getElementById("leftgrip_right_" + this.rightPanelContainers[i].id);
		opc.style.gridColumnStart = leftOff * 2 + i * 2 + 3;
		opc.style.gridColumnEnd = leftOff * 2 + i * 2 + 4;
		opc.style.gridRowStart = 3;
		opc.style.gridRowEnd = this.noOfGridRows;
		this.rightPanelContainers[i].SetUpContainerGrid();
	};
	l = this.topPanelContainers.length;
	topOff = l;
	for (i = 0; i < l; i++) {
		opc = document.getElementById("panelcontainer_" + this.topPanelContainers[i].id);
		opc.style.gridColumnStart = leftOff * 2 + 2;
		opc.style.gridColumnEnd = leftOff * 2 + 1 + 2;
		opc.style.gridRowStart = 3 + i * 2;
		opc.style.gridRowEnd = 3 + i * 2 + 1;
		opc = document.getElementById("bottomgrip_top_" + this.topPanelContainers[i].id);
		opc.style.gridColumnStart = leftOff * 2 + 2;
		opc.style.gridColumnEnd = leftOff * 2 + 1 + 2;
		opc.style.gridRowStart = 3 + i * 2 + 1;
		opc.style.gridRowEnd = 3 + i * 2 + 1;
		this.topPanelContainers[i].SetUpContainerGrid();
	};
	l = this.bottomPanelContainers.length;
	for (i = 0; i < l; i++) {
		opc = document.getElementById("panelcontainer_" + this.bottomPanelContainers[i].id);
		opc.style.gridColumnStart = leftOff * 2 + 2;
		opc.style.gridColumnEnd = leftOff * 2 + 1 + 2;
		opc.style.gridRowStart = topOff * 2 + 5 + i * 2;
		opc.style.gridRowEnd = topOff * 2 + 5 + i * 2 + 1;
		opc = document.getElementById("topgrip_bottom_" + this.bottomPanelContainers[i].id);
		opc.style.gridColumnStart = leftOff * 2 + 2;
		opc.style.gridColumnEnd = leftOff * 2 + 1 + 2;
		opc.style.gridRowStart = topOff * 2 + 4 + i * 2;
		opc.style.gridRowEnd = topOff * 2 + 4 + i * 2 + 1;
		this.bottomPanelContainers[i].SetUpContainerGrid();
	};
	opc = document.getElementById("panelcontainer_" + this.mainPanelContainer.id);
	opc.style.gridColumnStart = leftOff * 2 + 2;
	opc.style.gridColumnEnd = leftOff * 2 + 3;
	opc.style.gridRowStart = topOff * 2 + 3;
	opc.style.gridRowEnd = topOff * 2 + 4;

	opc = document.getElementById("leftgrip_main");
	opc.style.gridColumnStart = 1;
	opc.style.gridColumnEnd = 2;
	opc.style.gridRowStart = 2;
	opc.style.gridRowEnd = this.noOfGridRows + 1;

	opc = document.getElementById("rightgrip_main");
	opc.style.gridColumnStart = this.noOfGridCols;
	opc.style.gridColumnEnd = this.noOfGridCols + 1;
	opc.style.gridRowStart = 2;
	opc.style.gridRowEnd = this.noOfGridRows + 1;

	opc = document.getElementById("topgrip_main");
	opc.style.gridColumnStart = leftOff * 2 + 2;
	opc.style.gridColumnEnd = leftOff * 2 + 3;
	opc.style.gridRowStart = 2;
	opc.style.gridRowEnd = 3;

	opc = document.getElementById("bottomgrip_main");
	opc.style.gridColumnStart = leftOff * 2 + 2;
	opc.style.gridColumnEnd = leftOff * 2 + 3;
	opc.style.gridRowStart = this.noOfGridRows;
	opc.style.gridRowEnd = this.noOfGridRows + 1;

	om.style.gridColumnStart = 1;
	om.style.gridColumnEnd = this.noOfGridCols + 1;
	om.style.gridRowStart = 1;
	om.style.gridRowEnd = 2;
};
GUI.prototype.SetUpMainFull = function (_on) {
	this.isMainFull = _on;
	ResizeViewPort({});
};
GUI.prototype.Resize = function (_doFix) {
	var oc, og, ob, o;
	oc = document.getElementById("content");
	og = document.getElementById("gui");
	if (this.isMainFull) {
		o = document.getElementById("pageHeader");
		o.className = o.className.boolClass("mainfull", true)
		o = document.getElementById("pageFooter");
		o.className = o.className.boolClass("mainfull", true)
		o = document.getElementById("content");
		o.className = o.className.boolClass("mainfull", true)
		o = document.getElementById(this.topMenu.fullId);
		o.className = o.className.boolClass("hidden", true)
		var r = this.gridTemplateColsStr.split(" "), i, l = r.length;
		for (i = 0; i < l; i++) {
			if (r[i] == "calc") {
				r[i] = "100vw";
			} else {
				r[i] = "0px";
			};
		};
		og.style.gridTemplateColumns = r.join(" ");
		var r = this.gridTemplateRowsStr.split(" "), i, l = r.length;
		for (i = 0; i < l; i++) {
			if (r[i] == "calc") {
				r[i] = "100vh";
			} else {
				r[i] = "0px";
			};
		};
		og.style.gridTemplateRows = r.join(" ");
	} else {
		o = document.getElementById("pageHeader");
		o.className = o.className.boolClass("mainfull", false)
		o = document.getElementById("pageFooter");
		o.className = o.className.boolClass("mainfull", false)
		o = document.getElementById("content");
		o.className = o.className.boolClass("mainfull", false)
		o = document.getElementById(this.topMenu.fullId);
		o.className = o.className.boolClass("hidden", false)
		if (_doFix === undefined) _doFix = false;
		if (this.gridTemplateRowsSum >= oc.clientHeight) {
			var r = this.gridTemplateRowsStr.split(" "), i, l = r.length, s = 0;;
			for (i = 0; i < l; i++) {
				if (r[i] == "calc") {
					r[i] = "1px";
				} else {
					r[i] = parseInt(r[i], 10);
					r[i] = (oc.clientHeight * r[i] / this.gridTemplateRowsSum);
					s += r[i];
					if (_doFix) this.gridTemplateRows[i] = r[i];
					r[i] += "px";
				};
			};
			if (_doFix) this.gridTemplateRowsSum = s;
			og.style.gridTemplateRows = r.join(" ");
		} else {
			og.style.gridTemplateRows = this.gridTemplateRowsStr.replace(/calc/, (oc.clientHeight - this.gridTemplateRowsSum) + "px");
		};
		if (this.gridTemplateColsSum >= oc.clientWidth) {
			var r = this.gridTemplateColsStr.split(" "), i, l = r.length, s = 0;
			for (i = 0; i < l; i++) {
				if (r[i] == "calc") {
					r[i] = "1px";
				} else {
					r[i] = parseInt(r[i], 10);
					r[i] = (oc.clientWidth * r[i] / this.gridTemplateColsSum);
					s += r[i];
					if (_doFix) this.gridTemplateCols[i] = r[i];
					r[i] += "px";
				};
			};
			if (_doFix) this.gridTemplateColsSum = s;
			og.style.gridTemplateColumns = r.join(" ");
		} else {
			og.style.gridTemplateColumns = this.gridTemplateColsStr.replace(/calc/, (oc.clientWidth - this.gridTemplateColsSum) + "px");
		};
	};
};

GUI.prototype.SelectableForSizingGrips = function (_enable) {
	var i, l, o = document.getElementsByName("guigrip");
	l = o.length;
	if (_enable) {
		for (i = 0; i < l; i++)if (!o[i].className.hasClass("onlyDropper")) o[i].className = o[i].className.addClass("selectableForSizing");
	} else {
		for (i = 0; i < l; i++)if (!o[i].className.hasClass("onlyDropper")) o[i].className = o[i].className.removeClass("selectableForSizing");
	};
};
GUI.prototype.RemoveSelectableForDockingGrips = function () {
	var i, l, o = document.getElementsByName("guigrip");
	l = o.length;
	for (i = 0; i < l; i++)o[i].className = o[i].className.removeClass("selectableForDocking");
};
function DisributeText(_text) {
	var i, ret = '<div class="disttext">';
	for (i = 0; i < _text.length; i++) {
		ret += '<div class="char">' + _text[i].HtmlEntities() + '</div>';
	};
	ret += '</div>';
	return ret;
};

GUI.prototype.Activate = function (_actOpts) {
	var k, p, o;
	this.isMainFull = false;
	if (_actOpts === undefined) _actOpts = {};
	lastGUI = curGUI;
	if (curGUI != this && curGUI != null) curGUI.Deactivate();
	curGUI = this;
	curGUI.generalMouseMode = GUI.GENERALMOUSEMODE_NONE;
	for (p in GUI.interGUIPanels) {
		this.AddPanel(GUI.interGUIPanels[p]);
	};
	o = document.getElementById("guititle");
	if (o) o.innerHTML = DisributeText(this.title);

	this.keyDowns = {};
	GUI.modalKeyEvents = {};
	GUI.modalKeyEventButtonObjects = {};
	this.modalPanels = [];

	this.ctrlKeyPressed = false;
	this.cmdKeyPressed = false;
	this.altKeyPressed = false;
	this.shiftKeyPressed = false;
	this.specialKeyChange = 0x00;
	GUI.KEYSTRMAC_BYCODE = {};
	for (k in GUI.KEYSTRMAC) GUI.KEYSTRMAC_BYCODE[GUI.KEY[k]] = GUI.KEYSTRMAC[k];
	GUI.KEYSTR_BYCODE = {};
	for (k in GUI.KEYSTR) GUI.KEYSTR_BYCODE[GUI.KEY[k]] = GUI.KEYSTR[k];
	this.GetLocalStorageWorkSpace(this.stdWorkSpace);

	this.OldOnKeyDown = window.onkeydown;
	this.OldOnKeyUp = window.onkeyup;
	this.OldOnMouseDown = window.onmouseup;
	this.OldOnMouseUp = window.onmouseup;
	this.OldOnMouseMove = window.onmousemove;
	this.OldOnMouseWheel = window.onmousewheel;
	this.OldOnContextMenu = window.oncontextmenu;
	window.onkeydown = this.OnKeyDown;
	window.onkeyup = this.OnKeyUp;
	window.onmouseup = this.OnMouseUp;
	window.onmousedown = this.OnMouseDown;
	window.onmousemove = this.OnMouseMove;
	window.onmousewheel = this.OnMouseWheel;
	window.oncontextmenu = this.OnContextMenu;
	this.isActive = true;
	if (!_actOpts.hasOwnProperty("insideDomElement")) _actOpts.insideDomElement = "content";
	this.domElementId = _actOpts.insideDomElement;
	o = document.getElementById(this.domElementId);
	if (o) o.innerHTML = this.HTML();
	this.topMenu.SetUpPanelMenuReferences(this);
	for (p in this.panels) if (this.panels[p].menu != null) this.panels[p].menu.SetToggle(this.panels[p].visible);
	this._SetUpGUIGrid();
	this.SelectableForSizingGrips(true);
	for (p in this.panels) if (this.panels[p].visible) if (this.panels[p].eventHandler != null) this.panels[p].eventHandler({ type: Panel.EVENTTYPE_VISIBLECHANGED, panel: this.panels[p] });
	setTimeout(ResizeViewPort, 10);
	if (this.AfterActivate) this.AfterActivate(_actOpts);
};
GUI.prototype.RemovePanels = function () {
	var i, l;
	l = this.floatPanels.length;
	for (i = l - 1; i >= 0; i--) {
		this.floatPanels[i].Close(true);
	};
	l = this.leftPanelContainers.length;
	for (i = l - 1; i >= 0; i--) {
		this.leftPanelContainers[i].CloseAllPanels();
	};
	l = this.topPanelContainers.length;
	for (i = l - 1; i >= 0; i--) {
		this.topPanelContainers[i].CloseAllPanels();
	};
	l = this.bottomPanelContainers.length;
	for (i = l - 1; i >= 0; i--) {
		this.bottomPanelContainers[i].CloseAllPanels();
	};
	l = this.rightPanelContainers.length;
	for (i = l - 1; i >= 0; i--) {
		this.rightPanelContainers[i].CloseAllPanels();
	};
	this.mainPanelContainer.CloseAllPanels();

	//for(i in GUI.interGUIPanels){
	//	this.RemovePanel(GUI.interGUIPanels[i]);
	//};
};
GUI.prototype.Deactivate = function () {
	var o;
	this.SetLocalStorageWorkSpace(undefined, false);
	if (this.BeforeDeactivate) this.BeforeDeactivate();
	o = document.getElementById("guititle");
	if (o) o.innerHTML = "";
	this.modalPanels = [];
	this.RemoveModalContent();
	this.RemovePanels();

	this.isActive = false;
	curGUI = null;
	window.onkeydown = this.OldOnKeyDown;
	window.onkeyup = this.OldOnKeyUp;
	window.onmouseup = this.OldOnMousep;
	window.onmousedown = this.OldOnMouseDown;
	window.onmousemove = this.OldOnMouseMove;
	window.onmousewheel = this.OldOnMouseWheel;
	window.oncontextmenu = this.OldOnContextMenu;
};
GUI.prototype.Reactivate = function () {
	if (curGUI == this) {
		this.Deactivate();
		this.Activate(this.domElementId);
	};
};
GUI.prototype.OnUserChange = function () {
	var g;
	for (g in GUIS) if (GUIS[g].OnUserChange) GUIS[g].OnUserChange();
};
GUI.prototype.ForcePanelVisibile = function (_panel) {
};
GUI.LastGeneralCursor = "pointer";
GUI.SetGeneralCursor = function (_cursor) {
	var o = document.getElementById("body");
	if (GUI.LastGeneralCursor != "") o.className = o.className.removeClass("cursor_" + GUI.LastGeneralCursor);
	if (GUI._cursor != "") o.className = o.className.addClass("cursor_" + _cursor);
	GUI.LastGeneralCursor = _cursor;
};
function ResizeViewPort(_ev, _callAfterWSEvent = false) {
	var p, pp, o;
	// shit ie...
	//if(curGUI!==undefined)return;

	if (curGUI != null) {
		curGUI.Resize();
		if (curGUI.extraResizeEvent != null) curGUI.extraResizeEvent(_ev);
		for (pp in curGUI.panels) {
			p = curGUI.panels[pp];
			if (p.visible) {
				if (!p.isFolded) {
					if (p.type <= Panel.TYPE_PALETTE) {
						o = document.getElementById("panel_" + p.id);
						//if(o)o.style.maxHeight=o.parentElement.clientHeight+"px";
					};
				};
				if (p.eventHandler != null) {
					p.eventHandler({ type: Panel.EVENTTYPE_SIZECHANGED, panel: p });
					if (_callAfterWSEvent) p.eventHandler({ type: Panel.EVENTTYPE_AFTERWORKSPACECHANGE, panel: p });
				};
			};
		};
		if (curGUI.modalPanel != null) {
			p = curGUI.modalPanel;
			p.eventHandler({ type: Panel.EVENTTYPE_SIZECHANGED, panel: p });
			if (_callAfterWSEvent) p.eventHandler({ type: Panel.EVENTTYPE_AFTERWORKSPACECHANGE, panel: p });
		};
	};
};



ENUMERATOR = 0;
GUI.MODALBUTTON_CANCEL = ENUMERATOR++;
GUI.MODALBUTTON_OK = ENUMERATOR++;
GUI.MODALBUTTON_NO = ENUMERATOR++;
GUI.MODALBUTTON_YES = ENUMERATOR++;
GUI.MODALBUTTON_DISCARD = ENUMERATOR++;
GUI.MODALBUTTON_SAVE = ENUMERATOR++;
GUI.MODALBUTTON_EXTRA = ENUMERATOR++;

GUI.MODALBUTTONSET_ONLYOK = ENUMERATOR++;
GUI.MODALBUTTONSET_NO_YES_DEFAULTYES = ENUMERATOR++;
GUI.MODALBUTTONSET_NO_YES_DEFAULTNO = ENUMERATOR++;
GUI.MODALBUTTONSET_CANCEL_OK_DEFAULTCANCEL = ENUMERATOR++;
GUI.MODALBUTTONSET_DONTAGREE_AGREE = ENUMERATOR++;
GUI.MODALBUTTONSET_CANCEL_DISCARD_SAVE = ENUMERATOR++;

GUI.ModalButtonStdKeys = { "modalCancelButton": GUI.KEY.ESCAPE, "modalOkButton": GUI.KEY.ENTER, "modalNoButton": GUI.KEY.ESCAPE, "modalYesButton": GUI.KEY.ENTER };
GUI.ModalButtonIds = { "modalCancelButton": GUI.MODALBUTTON_CANCEL, "modalOkButton": GUI.MODALBUTTON_OK, "modalNoButton": GUI.MODALBUTTON_NO, "modalYesButton": GUI.MODALBUTTON_YES, "modalDiscardButton": GUI.MODALBUTTON_DISCARD, "modalSaveButton": GUI.MODALBUTTON_SAVE, "modalExtraButton": GUI.MODALBUTTON_EXTRA };
Panel.prototype.ModalButtonKeyEventsSetUp = function (_id, _key, _eventHandler) {
	var o = this.contentDiv.GetElementById(_id);
	if (o) GUI.ModalButtonKeyEventsSetUp(o, _key, _eventHandler);
};
GUI.ModalButtonKeyEventsSetUp = function (_butObj, _key, _eventHandler) {
	if (_butObj) {
		GUI.modalKeyEvents[_key] = _eventHandler;
		GUI.modalKeyEventButtonObjects[_key] = _butObj;
	};
};

GUI.ModalButtonEventsSetUp = function (_gui, _eventHandler) {
	var o, b;
	GUI.modalKeyEvents = {};
	GUI.modalKeyEventButtonObjects = {};
	for (b in GUI.ModalButtonIds) {
		o = document.getElementById(b);
		if (o) {
			ButtonAttributesToElement(o, _eventHandler);
			if (GUI.ModalButtonStdKeys[b] != 0) {
				GUI.modalKeyEvents[GUI.ModalButtonStdKeys[b]] = _eventHandler;
				GUI.ModalButtonKeyEventsSetUp(o, GUI.ModalButtonStdKeys[b], _eventHandler);
			};
		};
	};
};

GUI.ModalButtonsHTML = function (_modalButtonSet, _extra_event = NOFUNCTION, _extraButton = null) {
	var h = "", extraClass = "";
	switch (_modalButtonSet) {
		case GUI.MODALBUTTONSET_ONLYOK:
			if (_extraButton == null) extraClass = " single";
			break;
	};
	h += '<div class="subbuttons' + extraClass + '">';
	switch (_modalButtonSet) {
		case GUI.MODALBUTTONSET_ONLYOK:
			if (_extraButton != null) h += '<div id="modalExtraButton" class="button">' + _extraButton.HtmlEntities() + '</div>';
			h += '<div id="modalOkButton" onkeyup="if(event.keyCode==GUI.KEY.ENTER)" class="button">' + 'Ok<info context="button text"/>'.I18xTrans().HtmlEntities() + '</div>';
			break;
		case GUI.MODALBUTTONSET_CANCEL_OK_DEFAULTCANCEL:
			h += '<div id="modalCancelButton" onkeyup="if(event.keyCode==GUI.KEY.ESCAPE)" class="button">' + 'Cancel<info context="button text"/>'.I18xTrans().HtmlEntities() + '</div>';
			h += '<div id="modalOkButton" onkeyup="if(event.keyCode==GUI.KEY.ENTER)" class="button">' + 'Ok<info context="button text"/>'.I18xTrans().HtmlEntities() + '</div>';
			break;
		case GUI.MODALBUTTONSET_NO_YES_DEFAULTYES:
			h += '<div id="modalNoButton" onkeyup="if(event.keyCode==GUI.KEY.ESCAPE)" class="button">' + 'No<info context="button text"/>'.I18xTrans().HtmlEntities() + '</div>';
			h += '<div id="modalYesButton" onkeyup="if(event.keyCode==GUI.KEY.ENTER)" class="button">' + 'Yes<info context="button text"/>'.I18xTrans().HtmlEntities() + '</div>';
			break;
		case GUI.MODALBUTTONSET_NO_YES_DEFAULTNO:
			h += '<div id="modalNoButton" onkeyup="if(event.keyCode==GUI.KEY.ESCAPE)" class="button">' + 'No<info context="button text"/>'.I18xTrans().HtmlEntities() + '</div>';
			h += '<div id="modalYesButton" onkeyup="if(event.keyCode==GUI.KEY.ENTER)" class="button">' + 'Yes<info context="button text"/>'.I18xTrans().HtmlEntities() + '</div>';
			break;
		case GUI.MODALBUTTONSET_DONTAGREE_AGREE:
			h += '<div id="modalNoButton" class="button">' + "I dont't agree<info context=\"button text\">".I18xTrans().HtmlEntities() + '</div>';
			if (_extraButton != null) h += '<div id="modalExtraButton" class="button">' + _extraButton.HtmlEntities() + '</div>';
			h += '<div id="modalYesButton" class="button">' + 'I agree<info context="button text"/>'.I18xTrans().HtmlEntities() + '</div>';
			break;
		case GUI.MODALBUTTONSET_CANCEL_DISCARD_SAVE:
			h += '<div id="modalCancelButton" onkeyup="if(event.keyCode==GUI.KEY.ESCAPE)" class="button">' + "Cancel<info context=\"button text\">".I18xTrans().HtmlEntities() + '</div>';
			h += '<div id="modalDiscardButton" class="button">' + "Discard<info context=\"button text\">".I18xTrans().HtmlEntities() + '</div>';
			h += '<div id="modalSaveButton" onkeyup="if(event.keyCode==GUI.KEY.ENTER)" class="button">' + 'Save<info context="button text"/>'.I18xTrans().HtmlEntities() + '</div>';
			break;

	};
	h += '</div>';
	return h;
};

GUI.HeaderSwitch = function (_ev, _id) {
	var oc = document.getElementById("headerswitchcontent_" + _id), os = document.getElementById("headerswitch_" + _id), oh = document.getElementById("header_" + _id), od = document.getElementById(_id), n, i, oss, b;
	if (od) if (oc) if (oh) {
		if (oc.style.display == "none") {
			oc.style.display = oc.dataset.displayStyle;
			oh.className = oh.className.exchangeClass("closed", "open");
			os.className = os.className.exchangeClass("icon-circle-right", "icon-circle-down");
			//oh.scrollIntoView({block:"end",behavior:"smooth"});
			b = true;
		} else {
			oc.style.display = "none";
			oh.className = oh.className.exchangeClass("open", "closed");
			os.className = os.className.exchangeClass("icon-circle-down", "icon-circle-right");
			b = false;
		};
		if (_ev.altKey) {
			n = od.getAttribute("name");
			if (n != null && n != "") {
				oss = document.getElementsByName(n);
				for (i = 0; i < oss.length; i++) {
					if (oss[i].id != _id) GUI.HeaderSwitchSetSwitch(oss[i].id, false);
				};
			};
		} else if (_ev.ctrlKey) {
			n = od.getAttribute("name");
			if (n != null && n != "") {
				oss = document.getElementsByName(n);
				for (i = 0; i < oss.length; i++) {
					if (oss[i].id != _id) GUI.HeaderSwitchSetSwitch(oss[i].id, b);
				};
			};
		};
		if (od.dataset.onswitch != "") eval(od.dataset.onswitch);
	};
	//headerswitch
};
GUI.HeaderSwitchSetSwitch = function (_id, _onOff) {
	var oc = document.getElementById("headerswitchcontent_" + _id), oh = document.getElementById("headerswitch_" + _id);
	if (oc) if (oh) {
		if (oc.style.display == "none" && _onOff) {
			oc.style.display = "block";
			oh.className = oh.className.exchangeClass("icon-circle-right", "icon-circle-down");
		} else if (oc.style.display == "block" && !_onOff) {
			oc.style.display = "none";
			oh.className = oh.className.exchangeClass("icon-circle-down", "icon-circle-right");
		};
	};
};
GUI.HeaderSwitchInDivSetSwitch = function (_div, _id, _onOff) {
	var oc = _div.GetElementById("headerswitchcontent_" + _id), oh = _div.GetElementById("headerswitch_" + _id);
	if (oc) if (oh) {
		if (oc.style.display == "none" && _onOff) {
			oc.style.display = "block";
			oh.className = oh.className.exchangeClass("icon-circle-right", "icon-circle-down");
		} else if (oc.style.display == "block" && !_onOff) {
			oc.style.display = "none";
			oh.className = oh.className.exchangeClass("icon-circle-down", "icon-circle-right");
		};
	};
};
GUI.HeaderSwitchHidden = function (_id, _hidden) {
	var o = document.getElementById(_id);
	if (o) o.className = o.className.boolClass("hidden", _hidden);
};
GUI.HeaderSwitchContent = function (_id, _content) {
	var o = document.getElementById("headerswitchcontent_" + _id);
	if (o) o.innerHTML = _content;
};
GUI.HeaderSwitchTitle = function (_id, _title) {
	var o = document.getElementById(_id + "_title");
	if (o) o.innerHTML = _title.HtmlEntities();
};
GUI.H1HeaderSwitch = function (_id, _title, _html, _opts) {
	var h = "", t = "", open, titleIsHTML = false, icon = "", contentClass = "", extraClass = "", displayStyle = "block";
	if (_opts.hasOwnProperty("titleIsHTML")) titleIsHTML = _opts.titleIsHTML;
	if (_opts.hasOwnProperty("extraClass")) extraClass = " " + _opts.extraClass;
	if (_opts.hasOwnProperty("contentClass")) contentClass = _opts.contentClass;
	if (_opts.hasOwnProperty("displayStyle")) displayStyle = _opts.displayStyle;
	if (_opts.hasOwnProperty("icon")) icon = _opts.icon;
	if (_opts.hasOwnProperty("subTitle")) {
		t = '<div class="headerswitchtext' + extraClass + '"><div dir="auto" id="' + _id + '_title" class="title">' + (titleIsHTML ? _title : _title.HtmlEntities()) + '</div>';
		if (_opts.subTitle != "" || _opts.hasOwnProperty("forceSubTitle")) t += '<div dir="auto" id="' + _id + '_subtitle" class="subtitle">' + _opts.subTitle.HtmlEntities() + '</div>';
		t += '</div>';
	} else {
		if (_opts.hasOwnProperty("extraHTML")) {
			t = '<div class="headerswitchtext' + extraClass + '"><div dir="auto" id="' + _id + '_title" class="title">' + (titleIsHTML ? _title : _title.HtmlEntities()) + '</div>' + _opts.extraHTML + '</div>';
		} else {
			t = '<span dir="auto" id="' + _id + '_title">' + (titleIsHTML ? _title : _title.HtmlEntities()) + '</span>';
		};
	};
	open = true; if (_opts.hasOwnProperty("open")) open = _opts.open;
	if (!_opts.hasOwnProperty("onswitch")) _opts.onswitch = "";
	h += '<div id="' + _id + '" data-onswitch="' + _opts.onswitch.HtmlEntities() + '"' + ((_opts.hasOwnProperty("name")) ? ' name="' + _opts.name + '"' : '') + ' class="headerswitch' + (_opts.hasOwnProperty("sticky") ? ' sticky' : '') + ((_opts.hasOwnProperty("hidden") && _opts.hidden) ? ' hidden' : '') + ((_opts.hasOwnProperty("selected") && _opts.selected) ? ' sel' : '') + ((_opts.hasOwnProperty("autowidth") && _opts.autowidth) ? ' autowidth' : '') + '">';
	h += '<h1 id="header_' + _id + '" class="' + (open ? 'open' : 'closed') + '"><span class="' + (_opts.hasOwnProperty("ellipsistext") ? ' ellipsistext' : '') + (_opts.hasOwnProperty("centertext") ? ' centertext' : '') + (_opts.hasOwnProperty("smalltext") ? ' smalltext' : '') + '">';
	if (!_opts.hasOwnProperty("noswitch")) h += '<span id="headerswitch_' + _id + '" class="button headerswitchbutton ' + (_opts.hasOwnProperty("buttonExtraClass") ? ' ' + _opts.buttonExtraClass + " " : '') + (open ? 'icon-circle-down' : 'icon-circle-right') + '"' + ButtonAttributes("GUI.HeaderSwitch(event,'" + _id + "');") + '></span>';
	h += '&nbsp;&nbsp;' + ((icon == "") ? "" : '<img style="display:inline-block" src="' + icon + '"/>') + t + (_opts.hasOwnProperty("inlinebuttons") ? _opts.inlinebuttons : '') + '</span>';
	if (_opts.hasOwnProperty("buttons")) if (_opts.buttons.length > 0) h += '<span class="headerbuttons">' + _opts.buttons.join("") + '</span>';
	if (_opts.hasOwnProperty("extraHTML") && _opts.hasOwnProperty("subTitle")) h += _opts.extraHTML;
	h += '</h1>';
	h += '<div style="display:' + (open ? displayStyle : 'none') + ';" data-display-style="' + displayStyle + '"' + (contentClass != "" ? ' class="' + contentClass + '"' : '') + ' id="headerswitchcontent_' + _id + '">' + _html + '</div>';
	h += '</div>';
	return h;
};


GUI.H2HeaderSwitch = function (_id, _title, _html, _opts) {
	var h = "", t = "", open, titleIsHTML = false, icon = "", contentClass = "", extraClass = "", displayStyle = "block";
	if (_opts.hasOwnProperty("titleIsHTML")) titleIsHTML = _opts.titleIsHTML;
	if (_opts.hasOwnProperty("extraClass")) extraClass = " " + _opts.extraClass;
	if (_opts.hasOwnProperty("contentClass")) contentClass = _opts.contentClass;
	if (_opts.hasOwnProperty("displayStyle")) displayStyle = _opts.displayStyle;
	if (_opts.hasOwnProperty("icon")) icon = _opts.icon;
	if (_opts.hasOwnProperty("subTitle")) {
		t = '<div class="headerswitchtext' + extraClass + '"><div dir="auto" id="' + _id + '_title" class="title">' + (titleIsHTML ? _title : _title.HtmlEntities()) + '</div>';
		if (_opts.subTitle != "" || _opts.hasOwnProperty("forceSubTitle")) t += '<div dir="auto" id="' + _id + '_subtitle" class="subtitle">' + _opts.subTitle.HtmlEntities() + '</div>';
		t += '</div>';
	} else {
		if (_opts.hasOwnProperty("extraHTML")) {
			t = '<div class="headerswitchtext' + extraClass + '"><div dir="auto" id="' + _id + '_title" class="title">' + (titleIsHTML ? _title : _title.HtmlEntities()) + '</div>' + _opts.extraHTML + '</div>';
		} else {
			t = '<span dir="auto" id="' + _id + '_title">' + (titleIsHTML ? _title : _title.HtmlEntities()) + '</span>';
		};
	};
	open = true; if (_opts.hasOwnProperty("open")) open = _opts.open;
	if (!_opts.hasOwnProperty("onswitch")) _opts.onswitch = "";
	h += '<div id="' + _id + '" data-onswitch="' + _opts.onswitch.HtmlEntities() + '"' + ((_opts.hasOwnProperty("name")) ? ' name="' + _opts.name + '"' : '') + ' class="headerswitch' + (_opts.hasOwnProperty("sticky") ? ' sticky' : '') + ((_opts.hasOwnProperty("hidden") && _opts.hidden) ? ' hidden' : '') + ((_opts.hasOwnProperty("selected") && _opts.selected) ? ' sel' : '') + ((_opts.hasOwnProperty("autowidth") && _opts.autowidth) ? ' autowidth' : '') + '">';
	h += '<h2 id="header_' + _id + '" class="' + (open ? 'open' : 'closed') + '"><span class="' + (_opts.hasOwnProperty("ellipsistext") ? ' ellipsistext' : '') + (_opts.hasOwnProperty("centertext") ? ' centertext' : '') + (_opts.hasOwnProperty("smalltext") ? ' smalltext' : '') + '">';
	if (!_opts.hasOwnProperty("noswitch")) h += '<span id="headerswitch_' + _id + '" class="button headerswitchbutton ' + (_opts.hasOwnProperty("buttonExtraClass") ? ' ' + _opts.buttonExtraClass + " " : '') + (open ? 'icon-circle-down' : 'icon-circle-right') + '"' + ButtonAttributes("GUI.HeaderSwitch(event,'" + _id + "');") + '></span>';
	h += '&nbsp;&nbsp;' + ((icon == "") ? "" : '<img style="display:inline-block" src="' + icon + '"/>') + t + (_opts.hasOwnProperty("inlinebuttons") ? _opts.inlinebuttons : '') + '</span>';
	if (_opts.hasOwnProperty("buttons")) if (_opts.buttons.length > 0) h += '<span class="headerbuttons">' + _opts.buttons.join("") + '</span>';
	if (_opts.hasOwnProperty("extraHTML") && _opts.hasOwnProperty("subTitle")) h += _opts.extraHTML;
	h += '</h2>';
	h += '<div style="display:' + (open ? displayStyle : 'none') + ';" data-display-style="' + displayStyle + '"' + (contentClass != "" ? ' class="' + contentClass + '"' : '') + ' id="headerswitchcontent_' + _id + '">' + _html + '</div>';
	h += '</div>';
	return h;
};
GUI.H3HeaderSwitch = function (_id, _title, _html, _opts) {
	var h = "", t = "", open, titleIsHTML = false, icon = "", contentClass = "", extraClass = "", displayStyle = "block";
	if (_opts.hasOwnProperty("titleIsHTML")) titleIsHTML = _opts.titleIsHTML;
	if (_opts.hasOwnProperty("extraClass")) extraClass = " " + _opts.extraClass;
	if (_opts.hasOwnProperty("contentClass")) contentClass = _opts.contentClass;
	if (_opts.hasOwnProperty("displayStyle")) displayStyle = _opts.displayStyle;
	if (_opts.hasOwnProperty("icon")) icon = _opts.icon;
	if (_opts.hasOwnProperty("subTitle")) {
		t = '<div class="headerswitchtext' + extraClass + '"><div dir="auto" id="' + _id + '_title" class="title">' + (titleIsHTML ? _title : _title.HtmlEntities()) + '</div>';
		if (_opts.subTitle != "" || _opts.hasOwnProperty("forceSubTitle")) t += '<div dir="auto" id="' + _id + '_subtitle" class="subtitle">' + _opts.subTitle.HtmlEntities() + '</div>';
		t += '</div>';
	} else {
		if (_opts.hasOwnProperty("extraHTML")) {
			t = '<div class="headerswitchtext' + extraClass + '"><div dir="auto" id="' + _id + '_title" class="title">' + (titleIsHTML ? _title : _title.HtmlEntities()) + '</div>' + _opts.extraHTML + '</div>';
		} else {
			t = '<span dir="auto" id="' + _id + '_title">' + (titleIsHTML ? _title : _title.HtmlEntities()) + '</span>';
		};
	};
	open = true; if (_opts.hasOwnProperty("open")) open = _opts.open;
	if (!_opts.hasOwnProperty("onswitch")) _opts.onswitch = "";
	h += '<div id="' + _id + '" data-onswitch="' + _opts.onswitch.HtmlEntities() + '"' + ((_opts.hasOwnProperty("name")) ? ' name="' + _opts.name + '"' : '') + ' class="headerswitch' + (_opts.hasOwnProperty("sticky") ? ' sticky' : '') + ((_opts.hasOwnProperty("hidden") && _opts.hidden) ? ' hidden' : '') + ((_opts.hasOwnProperty("selected") && _opts.selected) ? ' sel' : '') + ((_opts.hasOwnProperty("autowidth") && _opts.autowidth) ? ' autowidth' : '') + '">';
	h += '<h3 id="header_' + _id + '" class="' + (open ? 'open' : 'closed') + '"><span class="' + (_opts.hasOwnProperty("ellipsistext") ? ' ellipsistext' : '') + (_opts.hasOwnProperty("centertext") ? ' centertext' : '') + (_opts.hasOwnProperty("smalltext") ? ' smalltext' : '') + '">';
	if (!_opts.hasOwnProperty("noswitch")) h += '<span id="headerswitch_' + _id + '" class="button headerswitchbutton ' + (_opts.hasOwnProperty("buttonExtraClass") ? ' ' + _opts.buttonExtraClass + " " : '') + (open ? 'icon-circle-down' : 'icon-circle-right') + '"' + ButtonAttributes("GUI.HeaderSwitch(event,'" + _id + "');") + '></span>';
	h += '&nbsp;&nbsp;' + ((icon == "") ? "" : '<img style="display:inline-block" src="' + icon + '"/>') + t + (_opts.hasOwnProperty("inlinebuttons") ? _opts.inlinebuttons : '') + '</span>';
	if (_opts.hasOwnProperty("buttons")) if (_opts.buttons.length > 0) h += '<span class="headerbuttons">' + _opts.buttons.join("") + '</span>';
	if (_opts.hasOwnProperty("extraHTML") && _opts.hasOwnProperty("subTitle")) h += _opts.extraHTML;
	h += '</h3>';
	h += '<div style="display:' + (open ? displayStyle : 'none') + ';" data-display-style="' + displayStyle + '"' + (contentClass != "" ? ' class="' + contentClass + '"' : '') + ' id="headerswitchcontent_' + _id + '">' + _html + '</div>';
	h += '</div>';
	return h;
};

GUI.SubHeadlineHTML = function (_id, _title = "", _opts = {}) {
	var h = "";
	h += '<div class="modalSubHeadLine' + ((_opts.hasOwnProperty("isAlert") && _opts.isAlert) ? ' alert' : '') + (_opts.hasOwnProperty("extraClass") ? ' ' + _opts.extraClass : '') + '" id="' + _id + '_subheadline"' + (_opts.hasOwnProperty("tooltip") ? ' title="' + _opts.tooltip.HtmlEntities() + '"' : '') + '>';
	h += _title.HtmlEntities();
	h += '</div>';
	return h;
};
GUI.SubHeadlineSetAlert = function (_id, _onOff) {
	var o = document.getElementById(_id + "_subheadline")
	if (o) o.className = o.className.boolClass("alert", _onOff);
};

GUI.InputBarHTML = function (_inputsHTMLs, _opts) {
	var h = "", i, l;
	if (_opts === undefined) _opts = { context: "panel" };
	l = _inputsHTMLs.length;
	h += '<div ' + ((_opts.hasOwnProperty("id")) ? 'id="' + _opts.id + '" ' : '') + 'class="inputbarcontainer' + ((_opts.hasOwnProperty("containerAlign")) ? ' ' + _opts.containerAlign : '') + ((_opts.hasOwnProperty("fullContainer")) ? ' full' : '') + '">'
	for (i = 0; i < l; i++) {
		h += '<div class="inputbar' + ((_opts.hasOwnProperty("inputsAligns")) ? ' ' + _opts.inputsAligns[i] : '') + '">';
		h += _inputsHTMLs[i].join("");
		//if(_opts.hasOwnProperty("texts"))if(_opts.texts[i]!="")h+='<div class="text">'+_opts.texts[i].HtmlEntities()+'</div>';
		h += '</div>';
	};
	h += '</div>';
	return h;
};

GUI.TextInputHTMLI18xChange = function (_id) {
	var osel = document.getElementById(_id + "_sel"), oin = document.getElementById(_id), jerr;
	//log("oin.dataset.input",oin.dataset.inputs);
	var oldlid = oin.dataset.lid, newlid = osel.value, value, newvalue = {};
	try {
		value = JSON.parse(oin.dataset.inputs);
	} catch (jerr) {
		value = { "en-US": oin.dataset.inputs };
	};
	value[oldlid] = oin.value;
	for (lid in value) if (value[lid].trim() != "") newvalue[lid] = value[lid].trim();
	oin.dataset.inputs = JSON.stringify(value);
	oin.dataset.lid = newlid;
	oin.dir = i18x.LIDS_RTL.indexOf(newlid) >= 0 ? "rtl" : "ltr";
	if (value.hasOwnProperty(newlid)) {
		oin.value = value[newlid];
	} else {
		oin.value = "";
	};
};
GUI.TextInputHTMLI18xSet = function (_id, _lid) {
	var osel = document.getElementById(_id + "_sel");
	if (osel) osel.value = _lid;
	GUI.TextInputHTMLI18xChange(_id);
};
GUI.TextInputHTMLI18xNext = function (_id) {
	var osel = document.getElementById(_id + "_sel"), oin = document.getElementById(_id), value, key, nowkey, newkey = "", preWasNowKey = false;
	GUI.TextInputHTMLI18xChange(_id);
	try {
		value = JSON.parse(oin.dataset.inputs);
		nowkey = osel.value;
		for (key in value) {
			if (preWasNowKey) newkey = key;
			if (key == nowkey) preWasNowKey = true;
		};
		if (newkey == "") newkey = "en-US";
		osel.value = newkey;
		GUI.TextInputHTMLI18xChange(_id);
	} catch (jerr) {
	};
};
GUI.TextInputHTMLOnInput = function (_ev, _id) {
	var o = document.getElementById(_id), min = Number.MIN_VALUE, max = Number.MAX_VALUE, value, _this = o;
	if (o.dataset.onType == "int") {
		min = Number.MIN_SAFE_INTEGER;
		max = Number.MAX_SAFE_INTEGER;
		if (o.min != "") min = parseInt(o.min, 10);
		if (o.max != "") max = parseInt(o.max, 10);
		value = Math.min(max, Math.max(min, parseInt(o.value, 10)));
		if (value != parseInt(o.value, 10)) o.value = value;
	} else if (o.dataset.onType == "double") {
		min = Number.MIN_VALUE;
		max = Number.MAX_VALUE;
		if (o.min != "") min = parseFloat(o.min);
		if (o.max != "") max = parseFloat(o.max);
		value = Math.min(max, Math.max(min, parseFloat(o.value))).SysClp();
		if (value != parseFloat(o.value)) o.value = value;
	};
	if (o.dataset.onInput) eval(o.dataset.onInput.str_replace('this', '_this'));
};
GUI.TextInputHTML = function (_id, _title, _opts) {
	// !!! MA maxlen parameter!!!!!
	// !!! MA regex parameter!!!!
	var t = "", h = "", extraAttrs = "", value = "", trclass = "", i18txts, valueLid = "en-US", lidOpts = NLIDS, defLid = i18x.lid, itype = "text", l;
	//defLid = i18x.isAutoLid ? i18x.i18nBestLid : i18x.i18nLid
	if (!_opts.hasOwnProperty("context")) _opts.context = "panel";
	if (_opts.hasOwnProperty("defLid")) defLid = _opts.defLid;
	if (_opts.hasOwnProperty("lidOpts")) lidOpts = _opts.lidOpts;
	if (_opts.hasOwnProperty("type")) {
		switch (_opts.type) {
			case "int":
				itype = "number";
				break;
			case "double":
				itype = "number";
				break;
			case "text":
				itype = "text";
				break;
			default:
				itype = _opts.type;
				break;
		};
	};
	h += '<div class="inputField' + ((_opts.hasOwnProperty("inline") && _opts.inline) ? ' inline' : '') + ((_opts.hasOwnProperty("full") && _opts.full) ? ' full' : '') + '">';
	if (_title !== false) {
		if (_opts.context == "paneltable") _title = _title.wordWrap();
		t += '<div id="' + _id + '_title" class="title' + ((_opts.hasOwnProperty("inline") && _opts.inline) ? ' inline' : '') + '">' + _title.HtmlEntities() + '</div>';
	};
	if (_opts.hasOwnProperty("extraHTML")) h += _opts.extraHTML;
	if (_opts.hasOwnProperty("i18n")) {
		if (_opts.hasOwnProperty("value")) {
			try {
				extraAttrs += ' data-inputs="' + _opts.value.HtmlEntities() + '"';
				i18txts = JSON.parse(_opts.value);
				for (l in i18txts) if (!lidOpts.hasOwnProperty(l)) if (i18x.LIDS_CULTURES.hasOwnProperty(l)) lidOpts[l] = i18x.LIDS_CULTURES[l];
				if (i18txts.hasOwnProperty(defLid)) {
					value = i18txts[defLid];
					valueLid = defLid;
					if (value == "") {
						if (i18txts.hasOwnProperty("en-US")) {
							if (i18txts["en-US"] != "") {
								valueLid = "en-US";
								value = i18txts["en-US"];
							};
						};
					};
				} else {
					if (i18txts.hasOwnProperty("en-US")) {
						value = i18txts["en-US"];
						valueLid = "en-US";
					};
				};
				extraAttrs += ' data-i18n="true"';
			} catch (jerr) {
				value = _opts.value;
				valueLid = "en-US";
				extraAttrs = ' data-i18n="true" data-inputs="' + _opts.value.HtmlEntities() + '"';
			};
		} else {
			valueLid = "en-US";
			extraAttrs += ' data-i18n="true" data-inputs=""';
		};
		extraAttrs += ' data-lid="' + valueLid + '"';
		t += '<select id="' + _id + '_sel" class="i18n" oninput="GUI.TextInputHTMLI18xChange(\'' + _id + '\');"/>';
		for (var lid in lidOpts) {
			t += '<option ' + ((valueLid == lid) ? "selected " : "") + 'value="' + lid + '">' + lidOpts[lid].HtmlEntities() + '</option>';
		};
		t += '</select>';
		t += '<span title="' + '...select international language variation...<info context="i18n button tooltip"/>'.I18xTrans().HtmlEntities() + '" onclick="GUI.TextInputHTMLI18xSet(\'' + _id + '\',\'en-US\');" class="icon-earth minibutton button cursor_handpointer"></span>';
		t += '<span title="' + '...select best local language variation...<info context="i18n button tooltip"/>'.I18xTrans().HtmlEntities() + '"onclick="GUI.TextInputHTMLI18xSet(\'' + _id + '\',\'' + i18x.i18nBestLid + '\');" class="icon-home3 minibutton button cursor_handpointer"></span>';
		t += '<span title="' + '...select next available language variation...<info context="i18n button tooltip"/>'.I18xTrans().HtmlEntities() + '"onclick="GUI.TextInputHTMLI18xNext(\'' + _id + '\');" class="icon-forward3 minibutton button cursor_handpointer"></span>';
	} else {
		value = _opts.value;
	};
	if (_opts.type == "int" || _opts.type == "double") if (_opts.hasOwnProperty("oninput") && !_opts.hasOwnProperty("onchange")) _opts.onchange = _opts.oninput;
	if (_opts.hasOwnProperty("format")) value = value.Format(_opts.format);
	h += '<div class="inputline' + (_opts.hasOwnProperty("inline") ? " inline" : "") + '">';
	h += '<input class="input"' +
		extraAttrs +
		' autocomplete="off" data-on-type="' + (_opts.hasOwnProperty("type") ? _opts.type : "text") + '"' +
		((_opts.hasOwnProperty("disabled") && _opts.disabled) ? ' disabled' : '') +
		(_opts.hasOwnProperty("spellcheck") ? ' spellcheck="true"' : ' spellcheck="false"') +
		' type="' + itype + '"' +
		((_opts.type != "int" && _opts.type != "double") ? ' oninput="GUI.TextInputHTMLOnInput(event,\'' + _id + '\');" ' : '') +
		(_opts.hasOwnProperty("onchange") ? ' onchange="' + _opts.onchange.HtmlEntities() + '"' : '') +
		(_opts.hasOwnProperty("oninput") ? ' data-on-input="' + _opts.oninput + '"' : '') +
		' id="' + _id + '"' +
		(_opts.hasOwnProperty("name") ? ' name="' + _opts.name + '"' : ' name="' + _id + '"') +
		' dir="' + (i18x.LIDS_RTL.indexOf(valueLid) >= 0 ? "rtl" : "ltr") + '"' +
		(_opts.hasOwnProperty("minwidth") ? ' style="min-width:' + _opts.minwidth + ';width:initial;"' : '') +
		(_opts.hasOwnProperty("width") ? ' style="width:' + _opts.width + ';min-width:initial;"' : '') +
		(_opts.hasOwnProperty("step") ? ' step="' + _opts.step + '"' : '') +
		(_opts.hasOwnProperty("min") ? ' min="' + _opts.min + '"' : '') +
		(_opts.hasOwnProperty("max") ? ' max="' + _opts.max + '"' : '') +
		(_opts.hasOwnProperty("placeholder") ? ' placeholder="' + _opts.placeholder.HtmlEntities(µTESUP) + '"' : '') +
		(_opts.hasOwnProperty("value") ? ' value="' + value.HtmlEntities(µTESUP) + '"' : '') +
		(_opts.hasOwnProperty("tooltip") ? ' title="' + _opts.tooltip.HtmlEntities(µTESUP) + '"' : '') +
		(_opts.hasOwnProperty("check") ? ' data-check="' + JSON.stringify(_opts.check).HtmlEntities() + '"' : '') +
		(_opts.hasOwnProperty("onenterkey") ? ' onkeypress="if(event.keyCode==13){' + _opts.onenterkey + '}"' : '') +
		'/>';
	h += (_opts.hasOwnProperty("unit") ? '<div class="inputunit">' + _opts.unit.HtmlEntities() + '</div>' : '');
	if (_opts.hasOwnProperty("extrabuttons")) h += _opts.extrabuttons;
	h += '</div>';
	if (_opts.hasOwnProperty("button")) h += _opts.button;
	if (_opts.hasOwnProperty("note")) if (_opts.note != "") h += '<div class="note">*' + _opts.note.I18xTrans().HtmlEntities() + '</div>';
	if (_opts.hasOwnProperty("postExtraHTML")) h += _opts.postExtraHTML;
	h += '</div>';
	switch (_opts.context) {
		case "panel":
		case "modal":
			return t + h;
		case "paneltable":
			if (_opts.hasOwnProperty("trclass")) if (_opts.trclass != "") trclass = ' class="' + _opts.trclass + '"';
			return '<tr id="' + _id + '_inputField"' + trclass + '><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
		default:
			return "";
	};
};
Panel.prototype.TextInputSetEnabled = function (_id, _enabled) { GUI.TextInputSetEnabled(this, _id, _enabled); };
GUI.TextInputSetEnabled = function (_panel, _id, _enabled) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) o.disabled = !_enabled;
};
Panel.prototype.TextInputSetOnKeyPress = function (_id, _onKeyPress) { GUI.TextInputSetOnKeyPress(this, _id, _onKeyPress); };
GUI.TextInputSetOnKeyPress = function (_panel, _id, _onKeyPress) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) o.onkeypress = _onKeyPress;
};
Panel.prototype.TextInputSetOnChange = function (_id, _onKeyPress) { GUI.TextInputSetOnKeyPress(this, _id, _onKeyPress); };
GUI.TextInputSetOnKeyPress = function (_panel, _id, _onKeyPress) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) o.onchange = _onKeyPress;
};
Panel.prototype.TextInputSetValue = function (_id, _value) { GUI.TextInputSetValue(this, _id, _value); };
GUI.TextInputSetValue = function (_panel, _id, _value) {
	var o = _panel.contentDiv.GetElementById(_id), jerr, value;
	if (o) {
		if (o.dataset.i18n) {
			o.dataset.inputs = _value;
			try {
				value = JSON.parse(_value);
				if (o.dataset.lid == "en-US") {
					o.value = value["en-US"];
				} else {
					if (value.hasOwnProperty(o.dataset.lid)) {
						o.value = value[o.dataset.lid];
					} else {
						o.value = "";
					};
				};
			} catch (jerr) {
				if (o.dataset.lid == "en-US") {
					o.value = _value;
				} else {
					o.value = "";
				};
			};
		} else {
			o.value = _value;
		};
	};
};
Panel.prototype.TextInputSetMin = function (_id, _value) { GUI.TextInputSetMin(this, _id, _min); };
GUI.TextInputSetMin = function (_panel, _id, _min) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) o.min = _min;
};
Panel.prototype.TextInputSetMax = function (_id, _value) { GUI.TextInputSetMax(this, _id, _max); };
GUI.TextInputSetMax = function (_panel, _id, _max) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) o.max = _max;
};
Panel.prototype.TextInputValue = function (_id, _defValue = "") { return GUI.TextInputValue(this, _id, _defValue); };
GUI.TextInputValue = function (_panel, _id, _defValue = "") {
	var o = _panel.contentDiv.GetElementById(_id), value;
	if (o) {
		if (o.dataset.i18n == "true") {
			var osel = _panel.contentDiv.GetElementById(_id + "_sel");
			var tlid, lid = o.dataset.lid, newvalue = {};
			try {
				value = JSON.parse(o.dataset.inputs);
			} catch (jerr) {
				value = { "en-US": o.dataset.inputs };
			};
			value[lid] = o.value;
			for (tlid in value) if (value[tlid].trim() != "") newvalue[tlid] = value[tlid].trim();
			if (ObjCount(newvalue) == 1 && newvalue.hasOwnProperty("en-US")) {
				return newvalue["en-US"];
			} else {
				value = JSON.stringify(newvalue);
				if (value == "{}") value = "";
				return value;
			};
		} else {
			return o.value;
		};
	} else {
		return _defValue;
	};
};
Panel.prototype.TextInputIntValue = function (_id, _defValue) { return GUI.TextInputIntValue(this, _id, _defValue); };
GUI.TextInputIntValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementById(_id), ret, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER;
	if (o) {
		if (o.value == null) return _defValue;
		if (o.min != "") min = parseInt(o.min, 10);
		if (o.max != "") max = parseInt(o.max, 10);
		ret = Math.min(max, Math.max(min, parseInt(o.value, 10)));
		if (ret != parseInt(o.value, 10)) o.value = ret;
		return ret;
	} else {
		return _defValue;
	};
};
Panel.prototype.TextInputDoubleValue = function (_id, _defValue) { return GUI.TextInputDoubleValue(this, _id, _defValue); };
GUI.TextInputDoubleValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementById(_id), ret, min = Number.MIN_VALUE, max = Number.MAX_VALUE;
	if (o) {
		if (o.value == null) return _defValue.SysClp();;
		if (o.min != "") min = parseFloat(o.min);
		if (o.max != "") max = parseFloat(o.max);
		ret = Math.min(max, Math.max(min, parseFloat(o.value))).SysClp();
		if (ret != parseFloat(o.value)) o.value = ret;
		return ret;
	} else {
		return _defValue.SysClp();;
	};
};

GUI.UserInputShowDoc = function (_uId, _nickName) {
	var threadsIds = {};
	threadsIds['oxyduser_' + _uId] = { usersId: _uId, title: _nickName };
	DocViewer.ShowDoc(threadsIds);
};
GUI.UserInputHTML = function (_id, _title, _opts) {
	// currently only as disabled input to show an user.
	var t = "", h = "", e = "", extraAttrs = "", nullTimestampText = "./.", uid, nick, but = "", butclass = "";
	if (!_opts.hasOwnProperty("context")) _opts.context = "panel";
	h += '<div class="inputField' + ((_opts.hasOwnProperty("inline") && _opts.inline) ? ' inline' : '') + '">';
	if (_title !== false) {
		if (_opts.context == "paneltable") _title = _title.wordWrap();
		t += '<div id="' + _id + '_title" class="title' + ((_opts.hasOwnProperty("inline") && _opts.inline) ? ' inline' : '') + '">' + _title.HtmlEntities() + '</div>';
	};
	if (_opts.hasOwnProperty("extraHTML")) h += _opts.extraHTML;
	if (_opts.hasOwnProperty("value") && _opts.hasOwnProperty("avatar") && _opts.hasOwnProperty("nickName")) {
		nick = _opts.nickName;
		uid = _opts.value;
		e += '<img class="avatar" src="./dynrscs/avatars/' + _opts.avatar + '">';
		e += '<div class="nickname">' + nick.HtmlEntities() + '</div>';
		but = ' title="' + '...show user page...'.I18xTrans().HtmlEntities() + '" ' + ButtonAttributes("GUI.UserInputShowDoc(" + uid + ",'" + nick + "');");
		butclass = " button";
	} else {
		nick = 'Unkown<info context="unkown avatar nickname"/>'.I18xTrans();
		uid = 0;
		e += '<img class="avatar" src="./skins/' + SKIN + '/imgs/general/gui/unkownavatar.jpg">';
		e += '<div class="nickname">' + nick.HtmlEntities() + '</div>';
		but = "";
	};
	h += '<div class="userinfo' + butclass + '" ' + but + '>';
	h += e;
	h += '</div>';
	if (_opts.hasOwnProperty("button")) h += _opts.button;
	h += '</div>';
	switch (_opts.context) {
		case "panel":
		case "modal":
			return t + h;
		case "paneltable":
			return '<tr><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
		default:
			return "";
	};
};

GUI.GetRatingData = function (_values, _disabled = false) {
	var total, stars, title = "", numbers = [], maxlen, max, extraCharLength = new Array(5).fill(0), starData = {};
	total = _values[0] + _values[1] + _values[2] + _values[3] + _values[4];
	if (total > 0) {
		numbers[0] = _values[0].Format("int");
		numbers[1] = _values[1].Format("int");
		numbers[2] = _values[2].Format("int");
		numbers[3] = _values[3].Format("int");
		numbers[4] = _values[4].Format("int");
		if (numbers[0].indexOf(",") >= 0) extraCharLength[0] += numbers[0].split(",").length - 1;
		if (numbers[0].indexOf(".") >= 0) extraCharLength[0] += numbers[0].split(".").length - 1;
		if (numbers[1].indexOf(",") >= 0) extraCharLength[1] += numbers[1].split(",").length - 1;
		if (numbers[1].indexOf(".") >= 0) extraCharLength[1] += numbers[1].split(".").length - 1;
		if (numbers[2].indexOf(",") >= 0) extraCharLength[2] += numbers[2].split(",").length - 1;
		if (numbers[2].indexOf(".") >= 0) extraCharLength[2] += numbers[2].split(".").length - 1;
		if (numbers[3].indexOf(",") >= 0) extraCharLength[3] += numbers[3].split(",").length - 1;
		if (numbers[3].indexOf(".") >= 0) extraCharLength[3] += numbers[3].split(".").length - 1;
		if (numbers[4].indexOf(",") >= 0) extraCharLength[4] += numbers[4].split(",").length - 1;
		if (numbers[4].indexOf(".") >= 0) extraCharLength[4] += numbers[4].split(".").length - 1;

		maxlen = Math.max(numbers[0].length, numbers[1].length, numbers[2].length, numbers[3].length, numbers[4].length);
		max = Math.max(_values[0], _values[1], _values[2], _values[3], _values[4]);
		if (_disabled) {
			title = '...please log in to rate...<info context="GUI Rating Comment Tooltip"/>'.I18xTrans().HtmlEntities() + "\n";;
		} else {
			title = "";
		};
		title += '★☆☆☆☆ ' + "  ".repeat(maxlen - numbers[0].length) + (extraCharLength[0] > 0 ? " ".repeat(extraCharLength[0]) : "") + numbers[0] + " " + "█".repeat(Math.floor(_values[0] / max * 10)) + (((_values[0] / max * 10) % 1) > 0.0 ? "▌" : "") + "\n";
		title += '★★☆☆☆ ' + "  ".repeat(maxlen - numbers[1].length) + (extraCharLength[1] > 0 ? " ".repeat(extraCharLength[1]) : "") + numbers[1] + " " + "█".repeat(Math.floor(_values[1] / max * 10)) + (((_values[1] / max * 10) % 1) > 0.0 ? "▌" : "") + "\n";
		title += '★★★☆☆ ' + "  ".repeat(maxlen - numbers[2].length) + (extraCharLength[2] > 0 ? " ".repeat(extraCharLength[2]) : "") + numbers[2] + " " + "█".repeat(Math.floor(_values[2] / max * 10)) + (((_values[2] / max * 10) % 1) > 0.0 ? "▌" : "") + "\n";
		title += '★★★★☆ ' + "  ".repeat(maxlen - numbers[3].length) + (extraCharLength[3] > 0 ? " ".repeat(extraCharLength[3]) : "") + numbers[3] + " " + "█".repeat(Math.floor(_values[3] / max * 10)) + (((_values[3] / max * 10) % 1) > 0.0 ? "▌" : "") + "\n";
		title += '★★★★★ ' + "  ".repeat(maxlen - numbers[4].length) + (extraCharLength[4] > 0 ? " ".repeat(extraCharLength[4]) : "") + numbers[4] + " " + "█".repeat(Math.floor(_values[4] / max * 10)) + (((_values[4] / max * 10) % 1) > 0.0 ? "▌" : "");

		stars = (_values[0] * 1 + _values[1] * 2 + _values[2] * 3 + _values[3] * 4 + _values[4] * 5) / total;
		starData[0] = ((stars < 0.25) ? 'empty' : (stars < 0.75) ? 'half' : 'full');
		starData[1] = ((stars < 1.25) ? 'empty' : (stars < 1.75) ? 'half' : 'full');
		starData[2] = ((stars < 2.25) ? 'empty' : (stars < 2.75) ? 'half' : 'full');
		starData[3] = ((stars < 3.25) ? 'empty' : (stars < 3.75) ? 'half' : 'full');
		starData[4] = ((stars < 4.25) ? 'empty' : (stars < 4.75) ? 'half' : 'full');
	} else {
		if (_disabled) {
			title = '...please log in to rate...<info context="GUI Rating Comment Tooltip"/>'.I18xTrans().HtmlEntities();
		} else {
			title = '...still not rated...<info context="GUI Rating Comment Tooltip"/>'.I18xTrans().HtmlEntities();
		};
		starData[0] = "empty";
		starData[1] = "empty";
		starData[2] = "empty";
		starData[3] = "empty";
		starData[4] = "empty";
	};
	return { title: title, starData: starData, total: total };
};
GUI.OnRatingStarMouseMove = function (_ev, _this) {
	var o, x, b = _this.getBoundingClientRect();
	if (_this.dataset.requestActive == 1) return;
	x = (_ev.pageX - b.x);
	x = Math.floor(x * 5 / _this.clientWidth);
	if (x > 4) x = 4;
	if (x < 0) x = 0;
	o = document.getElementById(_this.id + "_star0");
	if (o) o.className = "icon-star-" + (x >= 0 ? "full" : "empty");
	o = document.getElementById(_this.id + "_star1");
	if (o) o.className = "icon-star-" + (x >= 1 ? "full" : "empty");
	o = document.getElementById(_this.id + "_star2");
	if (o) o.className = "icon-star-" + (x >= 2 ? "full" : "empty");
	o = document.getElementById(_this.id + "_star3");
	if (o) o.className = "icon-star-" + (x >= 3 ? "full" : "empty");
	o = document.getElementById(_this.id + "_star4");
	if (o) o.className = "icon-star-" + (x >= 4 ? "full" : "empty");
};
GUI.OnRatingStarMouseLeave = function (_ev, _this) {
	// restore original stars...
	var starData, o;
	if (_this.dataset.requestActive == 1) return;
	starData = JSON.parse(_this.dataset.starData);
	o = document.getElementById(_this.id + "_star0");
	if (o) o.className = "icon-star-" + starData[0];
	o = document.getElementById(_this.id + "_star1");
	if (o) o.className = "icon-star-" + starData[1];
	o = document.getElementById(_this.id + "_star2");
	if (o) o.className = "icon-star-" + starData[2];
	o = document.getElementById(_this.id + "_star3");
	if (o) o.className = "icon-star-" + starData[3];
	o = document.getElementById(_this.id + "_star4");
	if (o) o.className = "icon-star-" + starData[4];
};
GUI.OnRatingByName = function (_id, _title, _stars) {
	// set up all disabled visible ratings...
	var i, s, o;
	o = document.getElementsByName("rating_" + _id);
	for (i = 0; i < o.length; i++) o[i].title = _title;
	for (s = 0; s < 5; s++) {
		o = document.getElementsByName("rating_" + _id + "_star" + s);
		for (i = 0; i < o.length; i++)o[i].className = "icon-star-" + _stars[s];
	};
};
GUI.OnRatingStarMouseUp = function (_ev, _this) {
	var o, x, b = _this.getBoundingClientRect(), request = new XMLHttpRequest();
	var idCmp = _this.id.split("_");
	PlaySound("button_up");
	if (_this.dataset.onChange == "") return;
	if (_this.dataset.requestActive == 1) return;
	_this.className = _this.className.addClass("requestrunning");
	_this.dataset.requestActive = 1;

	x = (_ev.pageX - b.x);
	x = Math.floor(x * 5 / _this.clientWidth);
	if (x > 4) x = 4;
	if (x < 0) x = 0;

	request.onreadystatechange = function () {
		if (this.readyState == 4) {
			var res = this.finish(), rdata, o;
			_this.className = _this.className.removeClass("requestrunning");
			_this.dataset.requestActive = 0;
			if (res.ok) {
				rdata = GUI.GetRatingData(res.output.starsCounts, curUser.isLoggedIn);
				_this.title = rdata.title;
				_this.dataset.starData = JSON.stringify(rdata.starData);
				GUI.OnRatingStarMouseLeave({}, _this);
				_this.dataset.rated = 1;
				GUI.OnRatingByName(idCmp[1] , rdata.title, rdata.starData);
				o = document.getElementById('button_' + idCmp[1]  + '_mycomment');
				if (o) o.className = o.className.removeClass("disabled");
				if (_this.dataset.onChange != "") eval(_this.dataset.onChange.str_replace("_values", JSON.stringify(res.output.starsCounts)));
				PlaySound("ok");
			} else {
				PlaySound("no");
			};
		};
	};
	_this.dataset.myRate = (x + 1);
	request.rest("setRating", { rateRef: idCmp[1], rateStars: (x + 1), cache: JSON.parse(_this.dataset.cache) });
};
GUI.OnRatingStarMouseDown = function (_ev, _this) {
	PlaySound("button_down");
};

GUI.RatingHTML = function (_id, _values, _disabled = false, _enabled = true, _onlyRated = false, _onChange = "", _extraHTML = "", _extraClass = "", _cache = {}) {
	// id of form "type_tablerefno" e.g. "models_123"
	// values: an array of five integers (number of stars)
	var h = "", events = "", idTag = "id", attrs = "";
	rdata = GUI.GetRatingData(_values, _disabled);
	if (_onlyRated && rdata.total == 0) return (_extraHTML == "") ? "" : '<div class="ratingcontainer"' + (_extraClass == "" ? "" : " " + _extraClass) + '">' + _extraHTML + '</div>';
	h += '<div class="ratingcontainer' + (_disabled ? " disabled" : "") + (_extraClass == "" ? "" : " " + _extraClass) + '">';
	if (_disabled || parseInt(_id.split("@")[1], 10) == NaN) {
		attrs = ' name="' + _id + '"';
		idTag = "name";
	} else {
		attrs = ' data-cache="' + JSON.stringify(_cache).HtmlEntities() + '"  data-request-active="0" data-my-rate="0" data-rated="0" data-star-data="' + JSON.stringify(rdata.starData).HtmlEntities() + '" onmousedown="GUI.OnRatingStarMouseDown(event,this);" onmouseup="GUI.OnRatingStarMouseUp(event,this);" onmouseenter="" onmousemove="GUI.OnRatingStarMouseMove(event,this);" onmouseleave="GUI.OnRatingStarMouseLeave(event,this);" data-on-change="' + _onChange + '"';
	};
	h += '<div ' + idTag + '="rating_' + _id + '" ' + ((_enabled) ? '' : ' style="display:none;" ') + 'title="' + rdata.title + '" class="stars"' + attrs + '>';
	h += '<span ' + idTag + '="rating_' + _id + '_star0" class="icon-star-' + rdata.starData[0] + '"></span>';
	h += '<span ' + idTag + '="rating_' + _id + '_star1" class="icon-star-' + rdata.starData[1] + '"></span>';
	h += '<span ' + idTag + '="rating_' + _id + '_star2" class="icon-star-' + rdata.starData[2] + '"></span>';
	h += '<span ' + idTag + '="rating_' + _id + '_star3" class="icon-star-' + rdata.starData[3] + '"></span>';
	h += '<span ' + idTag + '="rating_' + _id + '_star4" class="icon-star-' + rdata.starData[4] + '"></span>';
	h += '</div>';
	h += _extraHTML;
	h += '</div>';
	return h;
};
GUI.RatingCommentAlert = function (_id) {
	var request = new XMLHttpRequest();
	request.onreadystatechange = function () {
		if (this.readyState == 4) {
			var res = this.finish();
			curGUI.RemoveModalContent();
			if (res.ok) {
				curGUI.ShowInfo('Violation Rating Comment Report<info context="gui rating button text"/>'.I18xTrans(), 'Thank you for your cooperation and rating comment violation reporting.<newline/>Our team will check this violation soon as possible.<info context="Rating Comment Alert Message"/>'.I18xTrans());
			} else {
				curGUI.ShowAlert('Violation Rating Comment Report failed<info context="gui rating button text"/>'.I18xTrans(), 'Please try again later<info context="Rating Comment Alert Message"/>'.I18xTrans());
			};
		};
	};
	curGUI.ShowWaitMessage('Reporting rating comment violation, please wait...<info context="Wait Message"/>'.I18xTrans());
	request.rest("setRatingCommentAlert", { ratingsId: _id });
};
GUI.RatingCommentClear = function (_id, _ratingsId) {
	var request = new XMLHttpRequest();
	request.onreadystatechange = function () {
		if (this.readyState == 4) {
			var res = this.finish();
			curGUI.RemoveModalContent();
			if (res.ok) {
				GUI.RatingComments(_id);
			} else {
				curGUI.ShowAlert('Removing Your Comment failed<info context="GUI Rating Comment message text"/>'.I18xTrans(), 'Please try again later<info context="GUI Rating Comment Alert Message"/>'.I18xTrans());
			};
		};
	};
	curGUI.ShowWaitMessage('Removing your comment, please wait...<info context="Wait Message"/>'.I18xTrans());
	request.rest("clearRatingComment", { ratingsId: _ratingsId });
};
GUI.RatingComments = function (_id, _doUpdate = false) {
	var request = new XMLHttpRequest(), o;
	o = document.getElementById("comments_" + _id + "_area");
	request.open("GET", "./dynrscs/comments/" + _id + ".json", true);
	request.setRequestHeader("Content-Type", "application/json");
	request.onreadystatechange = function () {
		var comments = null, c, comment, h = "", err;
		if (this.readyState == 4) {
			try { comments = JSON.parse(this.responseText); } catch (err) { };
			if (this.status == 200 && comments != null) {
				if (o) {
					// sort&filter...
					// ?!!!!
					for (c in comments) {
						comment = comments[c];
						h += '<div class="ratingcomment">';
						h += '<div class="commenthead">';
						h += '<span class="icon-star-' + (comment.rateStars >= 1 ? "full" : "empty") + '"></span>';
						h += '<span class="icon-star-' + (comment.rateStars >= 2 ? "full" : "empty") + '"></span>';
						h += '<span class="icon-star-' + (comment.rateStars >= 3 ? "full" : "empty") + '"></span>';
						h += '<span class="icon-star-' + (comment.rateStars >= 4 ? "full" : "empty") + '"></span>';
						h += '<span class="icon-star-' + (comment.rateStars >= 5 ? "full" : "empty") + '"></span>';
						h += " · " + comment.timestamp.FormatTicks("stddatetime").HtmlEntities();
						if (curUser.usersId == comment.usersId) {
							h += GUI.ButtonHTML(_id + "_" + c + "_ratealertbut", false, 'icon-status-edited', "GUI.RatingComment('" + _id + "');", { butclass: "button commentedit", tooltip: '...edit your comment...<info context="tooltip rating comment"/>'.I18xTrans() });
							h += GUI.ButtonHTML(_id + "_" + c + "_ratealertbut", false, 'icon-bin', "GUI.RatingCommentClear('" + _id + "'," + parseInt(c, 10) + ");", { butclass: "button commentalert", tooltip: '...remove your comment...<info context="tooltip rating comment"/>'.I18xTrans() });
						} else {
							h += GUI.ButtonHTML(_id + "_" + c + "_ratealertbut", false, 'icon-alert', "GUI.RatingCommentAlert(" + parseInt(c, 10) + ");", { butclass: "button commentalert", tooltip: '...report a comment violation...<info context="tooltip rating comment"/>'.I18xTrans() });
						};
						h += '</div>';
						h += '<div class="userinfo">';
						h += '<img class="avatar" src="./dynrscs/avatars/' + comment.avatar + '">';
						h += '<div class="nickname">' + comment.nickName.HtmlEntities() + '</div>';
						h += '</div>';
						h += '<div class="commenttext">';
						//if(??)
						h += comment.comment.i18n().HtmlEntities();
						h += '</div>';
						h += '</div>';
					};
					o.innerHTML = h;
				};
			} else {
				if (o) o.innerHTML = 'No comments available.<info context="rating comments no comment messaage"/>'.I18xTrans();
			};
		};
	};
	if (o) {
		if (o.className.hasClass("hidden") || _doUpdate) {
			o.className = o.className.removeClass("hidden");
			o.innerHTML = '<div class="wait"></div>';
			request.send(null);
		} else {
			o.className = o.className.addClass("hidden");
		};
	};
};
GUI.RatingComment = function (_id) {
	var  commentModalPanel, h = "", commentRequest = new XMLHttpRequest(), loadRequest = new XMLHttpRequest(), smartscroll = null;
	var myRate = 0, o, myComment = "";
	o = document.getElementById("rating_" + _id);
	if (o) myRate = o.dataset.myRate;

	commentRequest.onreadystatechange = function () {
		if (this.readyState == 4) {
			var res = this.finish(), o;
			if (res.ok) {
				PlaySound("ok");
				curGUI.RemoveModalContent();
				o = document.getElementById("comments_" + _id + "_area");
				if (o) if (!o.className.hasClass("hidden")) GUI.RatingComments(_id, true);
			} else {
				curGUI.ShowAlert('Error by Sending Contact Message<info context="Alert Message Title"/>'.I18xTrans(), 'Unkown account. Please try again.<info context="Alert Message"/>'.I18xTrans(), ShowCommentPanel);
			};
		};
	};
	function HdlDialogPanel(_ev, _panel) {
		switch (_ev.type) {
			case Panel.EVENTTYPE_APPEARSINDOM:
				ButtonAttributesToElement(document.getElementById("modalCancelButton"), CancelButton);
				GUI.ModalButtonKeyEventsSetUp(document.getElementById("modalCancelButton"), GUI.KEY.ESCAPE, CancelButton);
				ButtonAttributesToElement(document.getElementById("modalSendButton"), SendButton);
				GUI.ModalButtonKeyEventsSetUp(document.getElementById("modalSendButton"), GUI.KEY.ENTER, SendButton);
				ButtonAttributesToElement(document.getElementById("modalSendButton"), SendButton);
				//document.getElementById("commenttext").oninput=HdlDialog;
				//HdlDialog();
				break;
			case Panel.EVENTTYPE_WILLREMOVEDFROMDOM:
				smartscroll = null;
				break;
			case Panel.EVENTTYPE_SIZECHANGED:
				setTimeout(UpdateUpScrollArea, 1000);
				smartscroll = commentModalPanel.SetUpScrollArea(smartscroll, "scrollarea", true);
				break;
		};
	};
	function UpdateUpScrollArea() {
		smartscroll = commentModalPanel.SetUpScrollArea(smartscroll, "scrollarea", true);
	};
	function CancelButton() {
		PlaySound("no");
		FinishCompleteModalDialogs();
	};
	function SendButton() {
		var comment = "";
		var ocot = document.getElementById("commenttext");
		PlaySound("yes");
		curGUI.ShowWaitMessage('Saving comment, please wait...<info context="Wait Message"/>'.I18xTrans());
		commentRequest.rest("setRating", { rateRef: _id, rateComment: commentModalPanel.TextAreaValue("commenttext") });
	};
	//function HdlDialog(){
	//var oct=document.getElementById("commenttext"),osb=document.getElementById("modalSendButton"),ok=true;
	//if(oct.value.trim()==""&&myComment=="")ok=false;
	//if(osb)osb.className=osb.className.boolClass("disabled",!ok);
	//if(osb)osb.className=osb.className.boolClass("disabled",false);
	//};
	function FinishCompleteModalDialogs() {
		curGUI.RemoveModalContent();
		commentModalPanel.Dispose();
	};
	function ShowCommentPanel() {
		curGUI.ShowModalPanel(commentModalPanel);
	};

	loadRequest.open("GET", "./dynrscs/comments/" + _id + ".json", true);
	loadRequest.setRequestHeader("Content-Type", "application/json");
	loadRequest.onreadystatechange = function () {
		var comments = null, c, comment, err;
		if (this.readyState == 4) {
			try { comments = JSON.parse(this.responseText); } catch (err) { };
			if (this.status == 200 && comments != null) {
				for (c in comments) {
					if (comments[c].usersId == curUser.usersId) {
						myComment = comments[c].comment;
						break;
					};
				};
			};
			commentModalPanel = new Panel("commentModalPanel", 'Your Comment<info context="Panel Title"/>'.I18xRegister(), Panel.TYPE_MODAL, HdlDialogPanel);
			h += '<div class="header">' + 'Your Comment<info context="Modal Dialog Headline"/>'.I18xTrans().HtmlEntities() + '</div>';
			if (myRate > 0) {
				h += '<div class="title">';
				h += '<span class="icon-star-' + (myRate >= 1 ? "full" : "empty") + '"></span>';
				h += '<span class="icon-star-' + (myRate >= 2 ? "full" : "empty") + '"></span>';
				h += '<span class="icon-star-' + (myRate >= 3 ? "full" : "empty") + '"></span>';
				h += '<span class="icon-star-' + (myRate >= 4 ? "full" : "empty") + '"></span>';
				h += '<span class="icon-star-' + (myRate >= 5 ? "full" : "empty") + '"></span>';
				h += '</div>';
			};
			h += '<div class="scrollArea" id="scrollarea">';
			h += GUI.TextAreaHTML("commenttext", false, { spellcheck: true, defLid: i18x.BrowserLid(), defEditLid: i18x.BrowserLid(), i18n: true, cols: 30, rows: 10, maxlen: 1000, value: myComment, note: (myComment != "") ? 'clear text and save to remove the existing comment.<info context="text area input note"/>' : "" });
			h += '</div>';
			h += '<div class="subbuttons">';
			h += '<div id="modalCancelButton" class="button">' + 'Cancel<info context="button text"/>'.I18xTrans().HtmlEntities() + '</div>';
			h += '<div id="modalSendButton" class="button">' + 'Save<info context="button text"/>'.I18xTrans().HtmlEntities() + '</div>';
			h += '</div>';
			commentModalPanel.contentDiv.innerHTML = h;
			ShowCommentPanel();
		};
	};
	loadRequest.send(null);
	curGUI.ShowWaitMessage('Loading comments, please wait...<info context="Wait Message"/>'.I18xTrans());
};
GUI.RatingEdit = function (_id, _onedit) {
	var br = document.getElementById(_id + "_editRating"), fr = document.getElementById("rating_" + _id);
	var bc = document.getElementById(_id + "_editComments"), fc = document.getElementById(_id + "_comments"), ac = document.getElementById("comments_" + _id + "_area");
	if (br) if (fr) if (bc) {
		if (br.className.indexOf("icon-ratingoff") >= 0) {
			br.className = br.className.exchangeClass("icon-ratingoff", "icon-ratingon");
			br.title = '...switch rating on...<info context="button tooltip"/>'.I18xTrans();
			fr.style.display = "none";
			if (bc.className.indexOf("icon-commentsoff") >= 0) {
				bc.className = bc.className.exchangeClass("icon-commentsoff", "icon-commentson");
				bc.title = '...switch comments on...<info context="button tooltip"/>'.I18xTrans();
				if (fc) fc.style.display = "none";
				if (ac) ac.className = ac.className.addClass("hidden");
			};
			bc.className = bc.className.boolClass("disabled", true);
		} else {
			fr.style.display = "block";
			br.className = br.className.exchangeClass("icon-ratingon", "icon-ratingoff");
			br.title = '...switch rating off...<info context="button tooltip"/>'.I18xTrans();
			bc.className = bc.className.boolClass("disabled", false);
		};
		eval(_onedit.I18xTrans({ ratingEnabled: br.className.indexOf("icon-ratingoff") >= 0, commentsEnabled: bc.className.indexOf("icon-commentsoff") >= 0 }));
	};
};
GUI.CommentsEdit = function (_id, _onedit) {
	var br = document.getElementById(_id + "_editRating");
	var bc = document.getElementById(_id + "_editComments"), fc = document.getElementById(_id + "_comments"), ac = document.getElementById("comments_" + _id + "_area");
	if (bc) {
		if (bc.className.indexOf("icon-commentsoff") >= 0) {
			bc.className = bc.className.exchangeClass("icon-commentsoff", "icon-commentson");
			bc.title = '...switch comments on...<info context="button tooltip"/>'.I18xTrans();
			if (fc) fc.style.display = "none";
			if (ac) ac.className = ac.className.addClass("hidden");
		} else {
			bc.className = bc.className.exchangeClass("icon-commentson", "icon-commentsoff");
			bc.title = '...switch comments off...<info context="button tooltip"/>'.I18xTrans();
			if (fc) fc.style.display = "block";
		};
		eval(_onedit.I18xTrans({ ratingEnabled: br.className.indexOf("icon-ratingoff") >= 0, commentsEnabled: bc.className.indexOf("icon-commentsoff") >= 0 }));
	};
};
GUI.RatingInputHTML = function (_id, _title, _opts) {
	var t = "", h = "", e = "", value = _opts.value, extraClass = "", editButs = "", editable = false;
	if (_title !== false) {
		if (_opts.context == "paneltable") _title = _title.wordWrap();
		t += '<div id="' + _id + '_title" class="title' + ((_opts.hasOwnProperty("inline") && _opts.inline) ? ' inline' : '') + '">' + _title.HtmlEntities() + '</div>';
	};
	if (_opts.disabled === undefined) _opts.disabled = false;
	if (_opts.ratingEnabled === undefined) _opts.ratingEnabled = true;
	if (_opts.commentsEnabled === undefined) _opts.commentsEnabled = true;
	if (!_opts.disabled) _opts.disabled = !curUser.isLoggedIn;
	if (_opts.onchange === undefined) _opts.onchange = "";
	if (_opts.cache === undefined) _opts.cache = {};
	if (_opts.allowComments === undefined) _opts.allowComments = curUser.isLoggedIn;
	if (_opts.editRatingComments) {
		editable = true;
		if (!_opts.ratingEnabled) _opts.commentsEnabled = false;
		editButs = '<div class="editbuttons">';
		editButs += GUI.ButtonHTML(_id + "_editRating", false, 'icon-rating' + (_opts.ratingEnabled ? 'off' : 'on'), 'GUI.RatingEdit("' + _id + '","' + _opts.onedit + '");', { tooltip: (_opts.ratingEnabled ? '...switch rating off...<info context="button tooltip"/>'.I18xTrans() : '...switch rating on...<info context="button tooltip"/>'.I18xTrans()) });
		editButs += GUI.ButtonHTML(_id + "_editComments", false, 'icon-comments' + (_opts.commentsEnabled ? 'off' : 'on'), 'GUI.CommentsEdit("' + _id + '","' + _opts.onedit + '");', { disabled: !_opts.ratingEnabled, tooltip: (_opts.commentsEnabled ? '...switch comments off...<info context="button tooltip"/>'.I18xTrans() : '...switch comments on...<info context="button tooltip"/>'.I18xTrans()) });
		if (_opts.editRatingCommentsExtraBut) editButs += _opts.editRatingCommentsExtraBut;
		editButs += '</div>';
	};
	if (_opts.allowComments) {
		e += '<div id="' + _id + '_comments" class="commentbuttons" style="display:' + ((_opts.commentsEnabled) ? 'block;"' : 'none;"') + '>';
		e += '<span id="button_' + _id + '_comments" title="' + '...show comments...<info context="rating comments text"/>'.I18xTrans().HtmlEntities() + '" class="button icon-bubbles2"' + ButtonAttributes("GUI.RatingComments('" + _id + "');") + '></span>';
		if (curUser.isLoggedIn) e += '<span id="button_' + _id + '_mycomment" title="' + '...add/change/remove your comment...<info context="rating comment text"/>'.I18xTrans().HtmlEntities() + '" class="button disabled icon-bubble"' + ButtonAttributes("GUI.RatingComment('" + _id + "');") + '></span>';
		e += '</div>';
		e += '<div id="comments_' + _id + '_area" class="ratingcomments hidden">';
		e += '</div>';
	};
	if (_opts.context == "headline") extraClass = "headline";
	if (_opts.context == "headlinesmall") extraClass = "headlinesmall";
	h += GUI.RatingHTML(_id, _opts.value, _opts.disabled, _opts.ratingEnabled, false, _opts.onchange, e + editButs, extraClass + (editable ? " editable" : ""), _opts.cache);
	switch (_opts.context) {
		case "headline":
		case "headlinesmall":
			return h;
		case "panel":
		case "modal":
			return t + h;
		case "paneltable":
			return '<tr><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
		default:
			return "";
	};
};
GUI.RatingInputSetEdit = function (_id, _ratingEnabled, _commentsEnabled) {
}

GUI.TimestampInputHTML = function (_id, _title, _opts) {
	// currently only as disabled input to show a timestamp.
	var t = "", h = "", extraAttrs = "", nullTimestampText = "./.";
	if (!_opts.hasOwnProperty("context")) _opts.context = "panel";
	h += '<div class="inputField' + ((_opts.hasOwnProperty("inline") && _opts.inline) ? ' inline' : '') + '">';
	if (_title !== false) {
		if (_opts.context == "paneltable") _title = _title.wordWrap();
		t += '<div id="' + _id + '_title" class="title' + ((_opts.hasOwnProperty("inline") && _opts.inline) ? ' inline' : '') + '">' + _title.HtmlEntities() + '</div>';
	};
	if (_opts.hasOwnProperty("extraHTML")) h += _opts.extraHTML;
	if (_opts.hasOwnProperty("nullText")) nullTimestampText = _opts.nullText;
	h += '<input class="input" type="text" ' +
		extraAttrs +
		((_opts.hasOwnProperty("disabled") && _opts.disabled) ? ' disabled' : '') +
		(_opts.hasOwnProperty("onchange") ? ' onchange="' + _opts.onchange + '"' : '') +
		(_opts.hasOwnProperty("oninput") ? ' oninput="' + _opts.oninput + '"' : '') +
		' id="' + _id + '"' +
		(_opts.hasOwnProperty("placeholder") ? ' placeholder="' + _opts.placeholder.HtmlEntities(µTESUP) + '"' : '') +
		(_opts.hasOwnProperty("value") ? ' value="' + ((_opts.value == 0) ? nullTimestampText : _opts.value.FormatTicks("stddatetime").HtmlEntities()) + '"' : '') +
		(_opts.hasOwnProperty("tooltip") ? ' title="' + _opts.tooltip.HtmlEntities(µTESUP) + '"' : '') +
		(_opts.hasOwnProperty("onenterkey") ? ' onkeypress="if(event.keyCode==13){' + _opts.onenterkey + '}"' : '') +
		'/>';
	if (_opts.hasOwnProperty("button")) h += _opts.button;
	h += '</div>';
	switch (_opts.context) {
		case "panel":
		case "modal":
			return t + h;
		case "paneltable":
			return '<tr><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
		default:
			return "";
	};
};
Panel.prototype.TimestampInputSetValue = function (_id, _value) { GUI.TimestampInputSetValue(this, _id, _value); };
GUI.TimestampInputSetValue = function (_panel, _id, _value) {
	var o = document.getElementById(_id);
	if (o) o.value = ((_value == 0) ? nullTimestampText : _value.FormatTicks("stddatetime"));
};

Panel.prototype.RangeInputSetOnChange = function (_id, _onchange) { return GUI.RangeInputSetOnChange(this, _id, _onchange); };
GUI.RangeInputSetOnChange = function (_panel, _id, _onchange) {
	var o = _panel.contentDiv.GetElementsByName(_id), i, l;
	if (o) o.onchange = _onchange;
};
GUI.RangeInputOnRangeInput = function (_ev, _id) {
	var or = document.getElementById(_id + '_range'), ot = document.getElementById(_id + '_text');
	if (or) {
		or.value = parseFloat(or.value).Frac(4);
		if (or.dataset.hasOwnProperty("ontooltip")) or.title = or.dataset.ontooltip.I18xTrans({ value: or.value });
		if (or.dataset.hasOwnProperty("oninput") && or.dataset.oninput != "") eval(or.dataset.oninput.str_replace('this', 'or'));
		if (ot) ot.value = or.value;
	};
};
GUI.RangeInputOnTextInput = function (_ev, _id) {
	var or = document.getElementById(_id + '_range'), ot = document.getElementById(_id + '_text'), v, min, max;
	if (or) if (ot) {
		v = parseFloat(ot.value);
		if (isNaN(v)) v = 0;
		ot.value = parseFloat(ot.value).Frac(4);
		min = parseFloat(ot.min);
		max = parseFloat(ot.max);
		if (ot.value < min) ot.value = min;
		if (ot.value > max) ot.value = max;
		ot.value = parseFloat(ot.value);
		if (or.dataset.hasOwnProperty("oninput") && or.dataset.oninput != "") eval(ot.dataset.onInput.str_replace('this', 'ot'));
		or.value = ot.value;
	};
};
GUI.RangeInputHTML = function (_id, _title, _opts) {
	var t = "", h = "", i, tooltip = "", tooltipData = "";
	if (!_opts.hasOwnProperty("context")) _opts.context = "panel";
	h += '<div class="inputField">';
	if (_title !== false) {
		if (_opts.context == "paneltable") _title = _title.wordWrap();
		t += '<div class="title" id="' + _id + '_title" class="inputField">' + _title.HtmlEntities() + '</div>';
	};
	if (_opts.hasOwnProperty("extraHTML")) h += _opts.extraHTML;
	if (_opts.hasOwnProperty("tooltip")) {
		if (_opts.tooltip.indexOf("<value") >= 0) {
			tooltipData = _opts.tooltip;
			tooltip = _opts.tooltip.I18xTrans({ value: _opts.value });
		} else {
			tooltip = _opts.tooltip;
		};
	};
	h += '<div style="flex-grow:' + (_opts.hasOwnProperty("rangegrow") ? _opts.rangegrow : '1') + ';">';
	h += '<div class="inputline">';
	h += '<input class="range" type="range"' +
		((tooltipData != "") ? ' data-ontooltip="' + tooltipData.HtmlEntities() + '"' : '') +
		(_opts.hasOwnProperty("oninput") ? ' data-oninput="' + _opts.oninput.HtmlEntities() + '"' : '') +
		' oninput="GUI.RangeInputOnRangeInput(event,\'' + _id + '\');"' +
		(_opts.hasOwnProperty("onchange") ? ' onchange="' + _opts.onchange + '"' : '') +
		' id="' + _id + '_range"' +
		(_opts.hasOwnProperty("step") ? ' step="' + _opts.step + '"' : '') +
		(_opts.hasOwnProperty("min") ? ' min="' + _opts.min + '"' : '') +
		(_opts.hasOwnProperty("max") ? ' max="' + _opts.max + '"' : '') +
		(_opts.hasOwnProperty("defvalue") ? ' data-def-value="' + _opts.value.HtmlEntities(µTESUP) + '"' : '') +
		(_opts.hasOwnProperty("value") ? ' value="' + _opts.value.HtmlEntities(µTESUP) + '"' : '') +
		(_opts.hasOwnProperty("tooltip") ? ' title="' + tooltip.HtmlEntities(µTESUP) + '"' : '') +
		'/>';
	h += (_opts.hasOwnProperty("unit") ? '<div class="inputunit">' + _opts.unit.HtmlEntities() + '</div>' : '');
	h += '</div>';
	if (_opts.hasOwnProperty("units")) {
		if (_opts.units.length > 0) {
			h += '<div class="inputline">';
			h += '<div class="inputunits">';
			if (typeof _opts.units[0] == "string") {
				for (i = 0; i < _opts.units.length; i++)h += '<div class="rangeinputunit">' + _opts.units[i].HtmlEntities() + '</div>';
			} else {
				for (i = 0; i < _opts.units.length; i++)h += '<div class="rangeinputunit">' + (_opts.hasOwnProperty("unitsformat") ? _opts.units[i].Format(_opts.unitsformat).HtmlEntities() : _opts.units[i]) + (_opts.hasOwnProperty("unit") ? ' ' + _opts.unit.HtmlEntities() : '') + '</div>';
			};
			h += '</div>';
			h += (_opts.hasOwnProperty("unit") ? '<div class="inputunit" style="color:transparent">' + _opts.unit.HtmlEntities() + '</div>' : '');
			h += '</div>';
		};
		h += '</div>';
	};
	h += '</div>';
	if (_opts.hasOwnProperty("textinput")) {
		h += '<div class="inputline">';
		h += '<input class="input" type="number"' +
			(_opts.hasOwnProperty("value") ? ' value="' + _opts.value.HtmlEntities(µTESUP) + '"' : '') +
			' id="' + _id + '_text"' +
			' required' +
			' oninput="GUI.RangeInputOnTextInput(event,\'' + _id + '\');"' +
			' onblur="GUI.RangeInputOnTextInput(event,\'' + _id + '\');"' +
			(_opts.hasOwnProperty("oninput") ? ' data-on-input="' + _opts.oninput + '"' : '') +
			(_opts.hasOwnProperty("onchange") ? ' onchange="' + _opts.onchange + '"' : '') +
			(_opts.hasOwnProperty("step") ? ' step="' + _opts.step + '"' : '') +
			(_opts.hasOwnProperty("min") ? ' min="' + _opts.min + '"' : '') +
			(_opts.hasOwnProperty("max") ? ' max="' + _opts.max + '"' : '') +
			'/>';
		h += (_opts.hasOwnProperty("unit") ? '<div class="inputunit">' + _opts.unit.HtmlEntities() + '</div>' : '');
		h += '</div>';
	};
	h += '</div>';
	switch (_opts.context) {
		case "panel":
		case "modal":
			return t + h;
		case "paneltable":
			return '<tr id="' + _id + '_inputField"><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
		default:
			return "";
	};
};
Panel.prototype.RangeInputIntValue = function (_id, _defValue) { return GUI.RangeInputIntValue(this, _id, _defValue); };
GUI.RangeInputIntValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementById(_id + "_range");
	if (o) {
		return parseInt(o.value, 10);
	} else {
		return _defValue;
	};
};
Panel.prototype.RangeInputDoubleValue = function (_id, _defValue) { return GUI.RangeInputDoubleValue(this, _id, _defValue); };
GUI.RangeInputDoubleValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementById(_id + "_range");
	if (o) {
		return parseFloat(o.value).SysClp();;
	} else {
		return _defValue.SysClp();
	};
};
Panel.prototype.RangeInputSetValue = function (_id, _value) { return GUI.RangeInputSetValue(this, _id, _value); };
GUI.RangeInputSetValue = function (_panel, _id, _value) {
	var o = _panel.contentDiv.GetElementById(_id + "_range");
	if (o) o.value = _value;
};
Panel.prototype.RangeInputSetOnInput = function (_id, _onInput) { GUI.RangeInputSetOnInput(this, _id, _onInput); };
GUI.RangeInputSetOnInput = function (_panel, _id, _onInput) {
	var o = _panel.contentDiv.GetElementById(_id + "_range");
	if (o) o.oninput = _onInput;
};
Panel.prototype.RangeInputSetValue = function (_id, _value) { GUI.RangeInputSetValue(this, _id, _value); };
GUI.RangeInputSetValue = function (_panel, _id, _value) {
	var o = _panel.contentDiv.GetElementById(_id + "_range");
	if (o) {
		o.value = _value;
		GUI.RangeInputOnRangeInput(null, _id);
	};
};

GUI.JointInputInfo = function (_j) {
	var ret = {}, d = _j.split(",");
	ret.springConstant = parseFloat(d[0]);
	ret.shrunkenLength = parseFloat(d[1]);
	ret.neutralLength = parseFloat(d[2]);
	ret.effectStartLength = parseFloat(d[3]);
	ret.breakingLength = parseFloat(d[4]);
	ret.mode = 0;
	if (ret.effectStartLength == 0.0) {
		// it's a spring or a pole (this.springConstant>3.0)...
		ret.mode = (ret.springConstant > 10.0) ? 4 : 2;
		if (ret.mode == 2 && ret.neutralLength < ret.shrunkenLength) ret.mode = 0;
		if (ret.mode == 4 && ret.effectStartLength != 0) ret.mode = 0;
	} else {
		// it's a rubber band (this.neutralLength==this.shrunkenLength) or a rope
		ret.mode = (ret.springConstant > 10.0) ? 3 : 1;
		if (ret.mode == 1 && (ret.neutralLength != ret.shrunkenLength || ret.neutralLength != ret.effectStartLength || ret.effectStartLength != ret.shrunkenLength)) ret.mode = 0;
		if (ret.mode == 3 && (ret.effectStartLength != ret.neutralLength || ret.neutralLength != ret.shrunkenLength)) ret.mode = 0;
	};
	return ret;
};
GUI.JointInputHTML = function (_id, _title, _opts) {
	var t = "", h = "", info = GUI.JointInputInfo(_opts.value);
	if (!_opts.hasOwnProperty("context")) _opts.context = "panel";
	h += '<div class="inputField">';
	if (_title !== false) {
		if (_opts.context == "paneltable") _title = _title.wordWrap();
		t += '<div class="title" id="' + _id + '_title" class="inputField">' + _title.HtmlEntities() + '</div>';
	};
	h += '<div class="inputline smalltitle">';
	h += 'Mode<info context="gui joint input"/>'.I18xTrans().HtmlEntities() + '&nbsp;&nbsp;';
	h += '<select id="' + _id + '_modesel" class="jointmode joint' + info.mode + '" onchange="GUI.JointInputOnInput(event,\'' + _id + '\',true);" data-oninput="' + _opts.oninput.HtmlEntities() + '"/>';
	h += '<option class="joint" value="0"' + ((info.mode == 0) ? 'selected' : '') + '>' + 'Universal<info context="gui joint input"/>'.I18xTrans().HtmlEntities() + '</option>';
	h += '<option class="joint" value="1"' + ((info.mode == 1) ? 'selected' : '') + '>' + 'Rubber Band<info context="gui joint input"/>'.I18xTrans().HtmlEntities() + '</option>';
	h += '<option class="joint" value="2"' + ((info.mode == 2) ? 'selected' : '') + '>' + 'Spring<info context="gui joint input"/>'.I18xTrans().HtmlEntities() + '</option>';
	h += '<option class="joint" value="3"' + ((info.mode == 3) ? 'selected' : '') + '>' + 'Rope<info context="gui joint input"/>'.I18xTrans().HtmlEntities() + '</option>';
	h += '<option class="joint" value="4"' + ((info.mode == 4) ? 'selected' : '') + '>' + 'Pole<info context="gui joint input"/>'.I18xTrans().HtmlEntities() + '</option>';
	h += '</select>';
	h += '</div>';

	h += '<div class="inputline smalltitle">' + 'Spring Constant<info context="gui joint input"/>'.I18xTrans().HtmlEntities() + '</div>';
	h += '<div class="inputline">';
	h += '<input id="' + _id + '_range_SpringConstant" oninput="GUI.JointInputOnInput(event,\'' + _id + '\',false);" class="range" type="range" min="0.0" step="0.1" value="' + info.springConstant + '"/>';
	h += '<div class="inputunit">N/m</div>';
	h += '</div>';
	h += '<div class="inputline">';
	h += '<div class="inputunits">';
	h += '<div id="' + _id + '_minUnitSpringConstant" class="rangeinputunit">' + '0 N/m'.HtmlEntities() + '</div>';
	h += '<div id="' + _id + '_maxUnitSpringConstant" class="rangeinputunit">' + '10 N/m'.HtmlEntities() + '</div>';
	h += '</div>';
	h += '</div>';
	h += '<div class="inputline joint">';
	h += '<input id="' + _id + '_text_SpringConstant" onchange="GUI.JointInputOnInput(event,\'' + _id + '\',false);" class="input" type="number" min="0.0" step="0.1" value="' + info.springConstant + '"/>';
	h += '<div class="inputunit">N/m</div>';
	h += '</div>';

	h += '<div class="inputline smalltitle">' + 'Shrunken Length<info context="gui joint input"/>'.I18xTrans().HtmlEntities() + '</div>';
	h += '<div class="inputline">';
	h += '<input id="' + _id + '_range_ShrunkenLength" oninput="GUI.JointInputOnInput(event,\'' + _id + '\',false);" class="range" type="range" min="0.0" step="0.1" value="' + info.shrunkenLength + '"/>';
	h += '<div class="inputunit">m</div>';
	h += '</div>';
	h += '<div class="inputline">';
	h += '<div class="inputunits">';
	h += '<div class="rangeinputunit">' + '0 m'.HtmlEntities() + '</div>';
	h += '<div id="' + _id + '_maxUnitShrunkenLength" class="rangeinputunit">' + '100 m'.HtmlEntities() + '</div>';
	h += '</div>';
	h += '</div>';
	h += '<div class="inputline joint">';
	h += '<input id="' + _id + '_text_ShrunkenLength" onchange="GUI.JointInputOnInput(event,\'' + _id + '\',false);" class="input" type="number" min="0.0" step="0.1"value="' + info.shrunkenLength + '"/>';
	h += '<div class="inputunit">m</div>';
	h += '</div>';

	h += '<div class="inputline smalltitle">' + 'Neutral Length<info context="gui joint input"/>'.I18xTrans().HtmlEntities() + '</div>';
	h += '<div class="inputline">';
	h += '<input id="' + _id + '_range_NeutralLength" oninput="GUI.JointInputOnInput(event,\'' + _id + '\',false);"class="range" type="range" min="0.0" step="0.1" value="' + info.neutralLength + '"/>';
	h += '<div class="inputunit">m</div>';
	h += '</div>';
	h += '<div class="inputline">';
	h += '<div class="inputunits">';
	h += '<div class="rangeinputunit">' + '0 m'.HtmlEntities() + '</div>';
	h += '<div id="' + _id + '_maxUnitNeutralLength" class="rangeinputunit">' + '100 m'.HtmlEntities() + '</div>';
	h += '</div>';
	h += '</div>';
	h += '<div class="inputline joint">';
	h += '<input id="' + _id + '_text_NeutralLength" onchange="GUI.JointInputOnInput(event,\'' + _id + '\',false);"class="input" type="number" min="0.0" step="0.1" value="' + info.neutralLength + '"/>';
	h += '<div class="inputunit">m</div>';
	h += '</div>';

	h += '<div class="inputline smalltitle">' + 'Effect Start Length<info context="gui joint input"/>'.I18xTrans().HtmlEntities() + '</div>';
	h += '<div class="inputline">';
	h += '<input id="' + _id + '_range_EffectStartLength" oninput="GUI.JointInputOnInput(event,\'' + _id + '\',false);"class="range" type="range" step="0.1" min="0.0" value="' + info.effectStartLength + '"/>';
	h += '<div class="inputunit">m</div>';
	h += '</div>';
	h += '<div class="inputline">';
	h += '<div class="inputunits">';
	h += '<div class="rangeinputunit">' + '0 m'.HtmlEntities() + '</div>';
	h += '<div id="' + _id + '_maxUnitEffectStartLength" class="rangeinputunit">' + '100 m'.HtmlEntities() + '</div>';
	h += '</div>';
	h += '</div>';
	h += '<div class="inputline joint">';
	h += '<input id="' + _id + '_text_EffectStartLength" onchange="GUI.JointInputOnInput(event,\'' + _id + '\');" class="input" type="number" min="0.0" step="0.1" value="' + info.effectStartLength + '"/>';
	h += '<div class="inputunit">m</div>';
	h += '</div>';

	h += '<div class="inputline smalltitle">' + 'Breaking Length<info context="gui joint input"/>'.I18xTrans().HtmlEntities() + '</div>';
	h += '<div class="inputline">';
	h += '<input id="' + _id + '_range_BreakingLength" class="range" oninput="GUI.JointInputOnInput(event,\'' + _id + '\');" type="range" min="0.0" max="100.0" step="0.1" value="' + info.breakingLength + '"/>';
	h += '<div class="inputunit">m</div>';
	h += '</div>';
	h += '<div class="inputline">';
	h += '<div class="inputunits">';
	h += '<div class="rangeinputunit">' + '0 m'.HtmlEntities() + '</div>';
	h += '<div class="rangeinputunit">' + '100 m'.HtmlEntities() + '</div>';
	h += '</div>';
	h += '</div>';
	h += '<div class="inputline joint">';
	h += '<input id="' + _id + '_text_BreakingLength" class="input" type="number" min="0.0" max="100.0" step="0.1"  onchange="GUI.JointInputOnInput(event,\'' + _id + '\');" value="' + info.breakingLength + '"/>';
	h += '<div class="inputunit">m</div>';
	h += '</div>';
	h += '<img src="./skins/' + SKIN + '/imgs/empty.png" class="empty" onload="GUI.JointInputOnInput(event,\'' + _id + '\',true,false);">';

	h += '</div>';
	switch (_opts.context) {
		case "panel":
		case "modal":
			return t + h;
		case "paneltable":
			return '<tr><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
		default:
			return "";
	};
};
GUI.JointInputOnInput = function (_ev, _id, _setMode = false, _doEval = true) {
	var mode, omode = document.getElementById(_id + '_modesel'), maxLenValue, maxLenText, minSCValue, maxSCValue, inputType, inputId,
		osct = document.getElementById(_id + '_text_SpringConstant'),
		oscr = document.getElementById(_id + '_range_SpringConstant'),
		oscu1 = document.getElementById(_id + '_minUnitSpringConstant'),
		oscu2 = document.getElementById(_id + '_maxUnitSpringConstant'),

		oslt = document.getElementById(_id + '_text_ShrunkenLength'),
		oslr = document.getElementById(_id + '_range_ShrunkenLength'),
		oslu2 = document.getElementById(_id + '_maxUnitShrunkenLength'),

		onlt = document.getElementById(_id + '_text_NeutralLength'),
		onlr = document.getElementById(_id + '_range_NeutralLength'),
		onlu2 = document.getElementById(_id + '_maxUnitNeutralLength'),

		oelt = document.getElementById(_id + '_text_EffectStartLength'),
		oelr = document.getElementById(_id + '_range_EffectStartLength'),
		oelu2 = document.getElementById(_id + '_maxUnitEffectStartLength'),

		oblt = document.getElementById(_id + '_text_BreakingLength'),
		oblr = document.getElementById(_id + '_range_BreakingLength');

	if (oblt == null) return;
	omode.className = "jointmode joint" + omode.value;

	maxLenValue = parseFloat(oblr.value);
	if (_ev.srcElement) if (_ev.srcElement.id.indexOf("Breaking") > 0 || _setMode) {
		maxLenText = (maxLenValue.Format("floatfix2") + " m").HtmlEntities();
		oslr.min = 0;
		oslt.min = 0;
		oslr.max = maxLenValue;
		oslt.max = maxLenValue;
		oslu2.innerText = maxLenText;
		onlt.min = 0;
		onlr.min = 0;
		onlt.max = maxLenValue;
		onlr.max = maxLenValue;
		onlu2.innerText = maxLenText;
		oelt.min = 0;
		oelr.min = 0;
		oelt.max = maxLenValue;
		oelr.max = maxLenValue;
		oelu2.innerText = maxLenText;
	};

	mode = parseInt(omode.value, 10);
	if (_ev.srcElement) {
		if (_ev.srcElement.tagName == "INPUT") {
			inputId = _ev.srcElement.id.cutRestAtLastCharOf();
			inputType = _ev.srcElement.type;
			if (inputType == "range") {
				switch (inputId) {
					case "SpringConstant":
						osct.value = oscr.value;
						break;
					case "ShrunkenLength":
						oslt.value = oslr.value;
						break;
					case "NeutralLength":
						onlt.value = onlr.value;
						break;
					case "EffectStartLength":
						oelt.value = oelr.value;
						break;
					case "BreakingLength":
						oblt.value = oblr.value;
						break;
				};
			} else if (inputType == "number") {
				switch (inputId) {
					case "SpringConstant":
						oscr.value = osct.value;
						break;
					case "ShrunkenLength":
						oslr.value = oslt.value;
						break;
					case "NeutralLength":
						onlr.value = onlt.value;
						break;
					case "EffectStartLength":
						oelr.value = oelt.value;
						break;
					case "BreakingLength":
						oblr.value = oblt.value;
						break;
				};
			};
		};
	};

	switch (mode) {
		case 0:
			break;
		case 1:
			// rubber band
			onlt.value = oslt.value;
			onlr.value = oslr.value;
			oelt.value = oslt.value;
			oelr.value = oslr.value;
			break;
		case 2:
			// spring
			oelt.value = 0.0;
			oelr.value = 0.0;
			if (inputId == "ShrunkenLength") {
				if (parseFloat(onlr.value) < parseFloat(oslr.value)) {
					onlt.value = oslt.value;
					onlr.value = oslr.value;
				};
			} else {
				if (parseFloat(onlr.value) < parseFloat(oslr.value)) {
					oslt.value = onlt.value;
					oslr.value = onlr.value;
				};
			};
			break;
		case 3:
			// rope
			onlt.value = oslt.value;
			onlr.value = oslr.value;
			oelt.value = oslt.value;
			oelr.value = oslr.value;
			break;
		case 4:
			// pole
			onlt.value = oslt.value;
			onlr.value = oslr.value;
			oelt.value = 0.0;
			oelr.value = 0.0;
			break;
	};
	if (_setMode) {
		switch (mode) {
			case 0:
				// unviversal
				osct.disabled = false;
				osct.disabled = false;
				minSCValue = 0.0;
				maxSCValue = 30.0;
				osct.min = minSCValue;
				oscr.min = minSCValue;
				osct.max = maxSCValue;
				oscr.max = maxSCValue;
				oscu1.innerText = minSCValue.Format("floatfix2") + " N/m".HtmlEntities();
				oscu2.innerText = maxSCValue.Format("floatfix2") + " N/m".HtmlEntities();
				oslt.disabled = false;
				oslr.disabled = false;
				onlt.disabled = false;
				onlr.disabled = false;
				oelt.disabled = false;
				oelr.disabled = false;
				break;
			case 1:
				// rubber band
				osct.disabled = false;
				oscr.disabled = false;
				minSCValue = 0.0;
				maxSCValue = 10.0;
				osct.min = minSCValue;
				oscr.min = minSCValue;
				osct.max = maxSCValue;
				if (parseFloat(osct.value) > maxSCValue) osct.value = maxSCValue;
				oscr.max = maxSCValue;
				if (parseFloat(oscr.value) > maxSCValue) oscr.value = maxSCValue;
				oscu1.innerText = minSCValue.Format("floatfix2") + " N/m".HtmlEntities();
				oscu2.innerText = maxSCValue.Format("floatfix2") + " N/m".HtmlEntities();
				oslt.disabled = false;
				oslr.disabled = false;
				onlt.disabled = true;
				onlr.disabled = true;
				oelt.disabled = true;
				oelr.disabled = true;
				onlt.value = oslt.value;
				onlr.value = oslr.value;
				oelt.value = oelt.value;
				oelr.value = oslr.value;
				break;
			case 2:
				// spring
				osct.disabled = false;
				oscr.disabled = false;
				minSCValue = 0.0;
				maxSCValue = 10.0;
				osct.min = minSCValue;
				oscr.min = minSCValue;
				osct.max = maxSCValue;
				if (parseFloat(osct.value) > maxSCValue) osct.value = maxSCValue;
				oscr.max = maxSCValue;
				if (parseFloat(oscr.value) > maxSCValue) oscr.value = maxSCValue;
				oscu1.innerText = minSCValue.Format("floatfix2") + " N/m".HtmlEntities();
				oscu2.innerText = maxSCValue.Format("floatfix2") + " N/m".HtmlEntities();
				oslt.disabled = false;
				oslr.disabled = false;
				onlt.disabled = false;
				onlr.disabled = false;
				oelt.disabled = true;
				oelr.disabled = true;
				oelt.value = 0.0;
				oelr.value = 0.0;
				break;
			case 3:
				// rope
				minSCValue = 10.1;
				maxSCValue = 30.0;
				osct.min = minSCValue;
				oscr.min = minSCValue;
				osct.max = maxSCValue;
				if (parseFloat(osct.value) < minSCValue) osct.value = minSCValue;
				oscr.max = maxSCValue;
				if (parseFloat(oscr.value) < minSCValue) oscr.value = minSCValue;
				oscu1.innerText = minSCValue.Format("floatfix2") + " N/m".HtmlEntities();
				oscu2.innerText = maxSCValue.Format("floatfix2") + " N/m".HtmlEntities();
				osct.disabled = false;
				oscr.disabled = false;
				oslt.disabled = false;
				oslr.disabled = false;
				onlt.disabled = true;
				onlr.disabled = true;
				onlt.value = oslt.value;
				onlr.value = oslr.value;
				oelt.disabled = true;
				oelr.disabled = true;
				oelt.value = onlt.value;
				oelr.value = onlr.value;
				break;
			case 4:
				// pole
				minSCValue = 10.1;
				maxSCValue = 30.0;
				osct.min = minSCValue;
				oscr.min = minSCValue;
				osct.max = maxSCValue;
				if (parseFloat(osct.value) < minSCValue) osct.value = minSCValue;
				oscr.max = maxSCValue;
				if (parseFloat(oscr.value) < minSCValue) oscr.value = minSCValue;
				oscu1.innerText = minSCValue.Format("floatfix2") + " N/m".HtmlEntities();
				oscu2.innerText = maxSCValue.Format("floatfix2") + " N/m".HtmlEntities();
				osct.disabled = false;
				oscr.disabled = false;
				oslt.disabled = false;
				oslr.disabled = false;
				onlt.disabled = true;
				onlr.disabled = true;
				oelt.disabled = true;
				oelr.disabled = true;
				oslt.value = onlr.value;
				oslr.value = onlr.value;
				oelt.value = 0.0;
				oelr.value = 0.0;
				break;
		};
	};
	if (omode) if (omode.dataset.oninput != "" && _doEval) eval(omode.dataset.oninput);
};
Panel.prototype.JointInputValue = function (_id, _defValue) { return GUI.JointInputValue(this, _id, _defValue); };
GUI.JointInputValue = function (_panel, _id, _defValue) {
	var oscr = _panel.contentDiv.GetElementById(_id + '_range_SpringConstant'),
		oslr = _panel.contentDiv.GetElementById(_id + '_range_ShrunkenLength'),
		onlr = _panel.contentDiv.GetElementById(_id + '_range_NeutralLength'),
		oelr = _panel.contentDiv.GetElementById(_id + '_range_EffectStartLength'),
		oblr = _panel.contentDiv.GetElementById(_id + '_range_BreakingLength');
	if (oscr) {
		return parseFloat(oscr.value).Frac(4) + "," + parseFloat(oslr.value).Frac(4) + "," + parseFloat(onlr.value).Frac(4) + "," + parseFloat(oelr.value).Frac(4) + "," + parseFloat(oblr.value).Frac(4);
	} else {
		return _defValue;
	};
};
Panel.prototype.JointInputSetValue = function (_id, _value) { return GUI.JointInputSetValue(this, _id, _value); };
GUI.JointInputSetValue = function (_panel, _id, _value) {
	var i = GUI.JointInputInfo(_value),
		oscr = _panel.contentDiv.GetElementById(_id + '_range_SpringConstant'),
		oslr = _panel.contentDiv.GetElementById(_id + '_range_ShrunkenLength'),
		onlr = _panel.contentDiv.GetElementById(_id + '_range_NeutralLength'),
		oelr = _panel.contentDiv.GetElementById(_id + '_range_EffectStartLength'),
		oblr = _panel.contentDiv.GetElementById(_id + '_range_BreakingLength'),
		osct = _panel.contentDiv.GetElementById(_id + '_text_SpringConstant'),
		oslt = _panel.contentDiv.GetElementById(_id + '_text_ShrunkenLength'),
		onlt = _panel.contentDiv.GetElementById(_id + '_text_NeutralLength'),
		oelt = _panel.contentDiv.GetElementById(_id + '_text_EffectStartLength'),
		oblt = _panel.contentDiv.GetElementById(_id + '_text_BreakingLength');
	if (oscr) {
		oscr.value = i.springConstant;
		oslr.value = i.shrunkenLength;
		onlr.value = i.neutralLength;
		oelr.value = i.effectStartLength;
		oblr.value = i.breakingLength;
		osct.value = i.springConstant;
		oslt.value = i.shrunkenLength;
		onlt.value = i.neutralLength;
		oelt.value = i.effectStartLength;
		oblt.value = i.breakingLength;
	};
};


GUI.CurveInputDraw = function (_this) {
	var w = parseInt(_this.clientWidth, 10), h = parseInt(_this.clientHeight, 10), d, i, dl, ctx, x = 0, y = 0, xf, xo, yf, yo, dx, dy, dw, dh, dye;
	if (w == 0 || h == 0) {
		_this.curveArea = { dx: 0, dy: 0, dw: 0, dh: 0, xo: 0, yo: 0, xf: 0, yf: 0 };
		return;
	};
	ctx = _this.getContext("2d");
	_this.width = w;
	_this.height = h;
	dx = 8 + _this.maxYAxisTextWidth + 2 + 4;
	dw = w - dx - 8;
	dy = 8;
	dh = h - 24;
	dye = dy + dh;
	ctx.clearRect(0, 0, w, h);
	ctx.lineWidth = 1;
	d = _this.curCurve;
	dl = d.length;
	xo = _this.xMin;
	xf = (_this.xMax - _this.xMin);
	if (xf == 0) xf = 1;
	xf = dw / xf;
	yo = _this.yMin;
	yf = (_this.yMax - _this.yMin);
	if (yf == 0) yf = 1;
	yf = dh / yf;
	_this.curveArea = { dx: dx, dy: dy, dw: dw, dh: dh, xo: xo, yo: yo, xf: xf, yf: yf };
	// draw lines...
	ctx.strokeStyle = _this.styleLineColor;
	if (dl > 0) {
		ctx.moveTo((d[0][1] - xo) * xf + dx, dye - (d[0][0] - yo) * yf);
		for (i = 1; i < dl; i++)ctx.lineTo((d[i][1] - xo) * xf + dx, dye - (d[i][0] - yo) * yf);
		ctx.stroke();
	};
	// draw unselected value points...
	ctx.fillStyle = _this.stylePointColor;
	for (i = 0; i < dl; i++) {
		x = (d[i][1] - xo) * xf + dx;
		y = dye - (d[i][0] - yo) * yf;
		ctx.fillRect(x - 2, y - 2, 5, 5);
	};
	// draw selected value points...
	if (_this.selectedPointNo >= 0) {
		ctx.fillStyle = _this.stylePointSelectColor;
		x = (d[_this.selectedPointNo][1] - xo) * xf + dx;
		y = dye - (d[_this.selectedPointNo][0] - yo) * yf;
		ctx.fillRect(x - 2, y - 2, 5, 5);
	};
};
GUI.CurveInputBgrdDraw = function (_this) {
	var w = parseInt(_this.clientWidth, 10), h = parseInt(_this.clientHeight, 10), d, i, dl, ctx, x = 0, y = 0, xf, xo, yf, yo, dx, dy, dw, dh, dye, cnv;
	var ytxts = [], maxYW = 0;
	if (w == 0 || h == 0) return;
	ctx = _this.getContext("2d");
	cnv = _this.cnv;
	_this.width = w;
	_this.height = h;

	dx = 8 + cnv.maxYAxisTextWidth + 2 + 4;
	dw = w - dx - 8;
	dy = 8;
	dh = h - 24;

	dye = dy + dh;
	ctx.fillStyle = cnv.styleBgrdColor;
	ctx.fillRect(0, 0, w, h);
	xo = cnv.xMin;
	xf = (cnv.xMax - cnv.xMin);
	if (xf == 0) xf = 1;
	xf = dw / xf;
	yo = cnv.yMin;
	yf = (cnv.yMax - cnv.yMin);
	if (yf == 0) yf = 1;
	yf = dh / yf;
	// draw grid lines...
	ctx.lineWidth = 1;
	ctx.strokeStyle = cnv.styleGridBgrdColor;
	ctx.rect(0, 0, w, w);
	for (x = 0; x <= 4; x++) {
		ctx.moveTo((dw) / 4 * x + dx, dy);
		ctx.lineTo((dw) / 4 * x + dx, dh - 1 + dy + ((x % 1 == 1) ? 0 : cnv.scaleMarkerSizeX));
	};
	for (y = 0; y <= 4; y++) {
		ctx.moveTo(dx - ((y % 1 == 1) ? 0 : cnv.scaleMarkerSizeY), (dh - 1) / 4 * y + dy);
		ctx.lineTo(dw + dx, (dh - 1) / 4 * y + dy);
	};
	ctx.stroke();

	ctx.imageSmoothingEnabled = true;
	ctx.font = cnv.styleTextBgrdFont;
	ctx.fillStyle = cnv.styleTextBgrdColor;

	function _xTxt(_x, _y, _minX, _maxX, _no) {
		var tw = cnv.xAxisTextWidths[_no];
		if (tw > 0) {
			_x = _x - tw / 2;
			if (_x + tw > _maxX) _x = _maxX - tw;
			if (_x < _minX) _x = _minX;
			ctx.fillText(cnv.xAxisTexts[_no], _x, _y + 8);
		};
	};
	if (cnv.scaleMarkerSizeX > 0) {
		y = dh + dy + cnv.scaleMarkerSizeX + 1;
		x = dx; _xTxt(x, y, 2, w - 4, 0);
		x = dw / 2 + dx; _xTxt(x, y, 2, w - 4, 1);
		x = dw - 1 + dx; _xTxt(x, y, 2, w - 4, 2);
	};

	function _yTxt(_x, _y, _no) {
		ctx.fillText(cnv.yAxisTexts[_no], _x, _y + 4);
	};
	if (cnv.scaleMarkerSizeY > 0) {
		ctx.textAlign = "right";
		x = dx - cnv.scaleMarkerSizeY - 0;
		y = dy; _yTxt(x, y, 0);
		y = dh / 2 + dy; _yTxt(x, y, 1);
		y = dh - 1 + dy; _yTxt(x, y, 2);
	};
};
GUI.CurveInputEndPointMove = function (_cnv) {
};
GUI.CurveInputGetPointNo = function (_cnv, _x, _y) {
	var ret = -1, b = _cnv.getBoundingClientRect(), i, d, dl, x, y, xf, xo, yf, yo, h, dx, dy, dw, dh, dye;
	if (_cnv.curveArea.dw == 0 || _cnv.curveArea.dh == 0) return ret;
	_x -= b.x;
	_y -= b.y;
	d = _cnv.curCurve;
	dl = d.length;
	if (dl > 0) {
		xf = _cnv.curveArea.xf;
		xo = _cnv.curveArea.xo;
		yf = _cnv.curveArea.yf;
		yo = _cnv.curveArea.yo;;
		dx = _cnv.curveArea.dx;
		dy = _cnv.curveArea.dy;;
		dye = _cnv.curveArea.dy + _cnv.curveArea.dh;
		for (i = 0; i < dl; i++) {
			x = (d[i][1] - xo) * xf + dx;
			//log(x,_x,y,_y);
			if (_x >= (x - 2) && _x <= (x + 2)) {
				y = dye - (d[i][0] - yo) * yf;
				if (_y >= (y - 2) && _y <= (y + 2)) return i;
			};
		};
	};
	return ret;
};
GUI.CurveInputGetXY = function (_cnv, _x, _y) {
	var b = _cnv.getBoundingClientRect(), ret = null, x, y;
	if (_cnv.curveArea.dw == 0 || _cnv.curveArea.dh == 0) return ret;
	_x -= b.x;
	_y -= b.y;
	if (_x < _cnv.curveArea.dx) {
		x = _cnv.xMin;
	} else if (_x > _cnv.curveArea.dx + _cnv.curveArea.dw) {
		x = _cnv.xMax;
	} else {
		x = (_cnv.xMax - _cnv.xMin) * ((_x - _cnv.curveArea.dx) / _cnv.curveArea.dw);
	};
	if (_y < _cnv.curveArea.dy) {
		y = _cnv.yMax;
	} else if (_y > _cnv.curveArea.dy + _cnv.curveArea.dh) {
		y = _cnv.yMin;
	} else {
		y = (_cnv.yMax - _cnv.yMin) * (((_cnv.curveArea.dy + _cnv.curveArea.dh) - _y) / _cnv.curveArea.dh);
	};
	//log(x,y);
	return [y, x];
};
GUI.CurveInputGetNewPointNo = function (_cnv, _x, _y) {
	var b = _cnv.getBoundingClientRect(), i, d, dl, xs, ys, xe, ye, xf, xo, yf, yo, dye, dx, dy, x, y;
	if (_cnv.curveArea.dw == 0 || _cnv.curveArea.dh == 0) return ret;
	_x -= b.x;
	_y -= b.y;
	d = _cnv.curCurve;
	dl = d.length;
	if (dl > 0) {
		xf = _cnv.curveArea.xf;
		xo = _cnv.curveArea.xo;
		yf = _cnv.curveArea.yf;
		yo = _cnv.curveArea.yo;
		dx = _cnv.curveArea.dx;
		dy = _cnv.curveArea.dy;;
		dye = _cnv.curveArea.dy + _cnv.curveArea.dh;
		xs = (d[0][1] - xo) * xf + dx;
		for (i = 1; i < dl; i++) {
			xe = (d[i][1] - xo) * xf + dx;
			if (_x > xs && _x < xe) {
				ys = dye - (d[i - 1][0] - yo) * yf;
				ye = dye - (d[i][0] - yo) * yf;
				y = (ye - ys) * (_x - xs) / (xe - xs) + ys;
				//log(_y,y);
				if (_y > (y - 2) && _y < (y + 2)) {
					x = (d[i][1] - d[i - 1][1]);
					y = (d[i][0] - d[i - 1][0]);
					return [i - 1, GUI.CurveInputGetXY(_cnv, x + b.x, _y + b.y)];
				};
			};
			xs = xe;
		};
	};
	return null;
};
GUI.CurveInputSetToInputs = function (_cnv, _vp) {
	if (_cnv.returnYExpression != null) {
		_cnv.yInput.value = _cnv.returnYExpression.Exec(_vp[0]);
	} else {
		_cnv.yInput.value = _vp[0];
	};
	if (_cnv.returnXExpression != null) {
		_cnv.xInput.value = _cnv.returnXExpression.Exec(_vp[1]);
	} else {
		_cnv.xInput.value = _vp[1];
	};
};
GUI.CurveInputSetFromInputs = function (_id) {
	var cnv = document.getElementById(_id), x, y, sp;
	if (cnv) if (cnv.selectedPointNo >= 0) {
		sp = cnv.selectedPointNo;
		y = parseFloat(cnv.yInput.value);
		x = parseFloat(cnv.xInput.value);
		if (cnv.editYExpression != null) y = cnv.editYExpression.Exec(y);
		if (cnv.editXExpression != null) x = cnv.editXExpression.Exec(x);
		if (y < cnv.yMin) y = cnv.yMin;
		if (y > cnv.yMax) y = cnv.yMax;
		if (x < cnv.xMin) x = cnv.xMin;
		if (x > cnv.xMax) x = cnv.xMax;
		if (sp == 0) {
			x = cnv.xMin;
		} else if (sp == cnv.curCurve.length - 1) {
			x = cnv.xMax;
		} else {
			if (x < cnv.curCurve[sp - 1][1]) x = cnv.curCurve[sp - 1][1];
			if (x > cnv.curCurve[sp + 1][1]) x = cnv.curCurve[sp + 1][1];
		};
		cnv.curCurve[sp][0] = y;
		cnv.curCurve[sp][1] = x;
		GUI.CurveInputDraw(cnv);
	};
};
GUI.CurveInputInit = function (_id) {
	var cnv = document.getElementById(_id), cvsbgrd = document.getElementById(_id + "_bgrd"), d, i, k, ctx;
	if (cnv) {
		if (cnv.hasOwnProperty("isInit")) return;
		cnv.isInit = true;
		cnv.yInput = document.getElementById(_id + "_yinput");
		cnv.xInput = document.getElementById(_id + "_xinput");
		d = JSON.parse(cnv.dataset.opts);
		cnv.styleLineColor = GetCSSPropertyOfClass("canvas.curvelinecolor", "color");
		cnv.stylePointColor = GetCSSPropertyOfClass("canvas.curvepointcolor", "color");
		cnv.stylePointSelectColor = GetCSSPropertyOfClass("canvas.curvepointselectcolor", "color");
		cnv.styleBgrdColor = GetCSSPropertyOfClass("canvas.curvebgrd", "color");
		cnv.styleGridBgrdColor = GetCSSPropertyOfClass("canvas.curvebgrdgrid", "color");
		cnv.styleTextBgrdColor = GetCSSPropertyOfClass("canvas.curvebgrdtext", "color");
		cnv.styleTextBgrdFont = GetCSSPropertyOfClass("canvas.curvebgrdtext", "font");

		cnv.value = d.value;
		cnv.myHeight = d.height;
		cnv.curveArea = [0, 0, 0, 0];
		cvsbgrd.cnv = cnv;
		cnv.xMin = d.xMin;
		cnv.xMax = d.xMax;
		cnv.yMin = d.yMin;
		cnv.yMax = d.yMax;

		cnv.scaleMarkerSizeX = 0;
		cnv.scaleMarkerSizeY = 0;
		cnv.maxXAxisTextWidth = 0;
		cnv.maxYAxisTextWidth = 0;
		ctx = cnv.getContext("2d");
		ctx.font = "8px Open Sans";

		if (d.hasOwnProperty("xAxisScaleTextTemplate")) {
			cnv.xAxisTexts = [d.xAxisScaleTextTemplate.I18xTrans({ x: cnv.xMin }), d.xAxisScaleTextTemplate.I18xTrans({ x: (cnv.xMax + cnv.xMin) / 2 }), d.xAxisScaleTextTemplate.I18xTrans({ x: cnv.xMax })];
			cnv.xAxisTextWidths = [];
			for (i = 0; i < 3; i++) {
				k = ctx.measureText(cnv.xAxisTexts[i]).width;
				cnv.xAxisTextWidths.push(k);
				if (k > cnv.maxXAxisTextWidth) cnv.maxXAxisTextWidth = k;
			};
			cnv.scaleMarkerSizeX = 4;
		};
		if (d.hasOwnProperty("yAxisScaleTextTemplate")) {
			cnv.yAxisTexts = [d.yAxisScaleTextTemplate.I18xTrans({ y: cnv.yMax }), d.yAxisScaleTextTemplate.I18xTrans({ y: (cnv.yMax + cnv.yMin) / 2 }), d.yAxisScaleTextTemplate.I18xTrans({ y: cnv.yMin })];
			cnv.yAxisTextWidths = [];
			for (i = 0; i < 3; i++) {
				k = ctx.measureText(cnv.yAxisTexts[i]).width;
				cnv.yAxisTextWidths.push(k);
				if (k > cnv.maxYAxisTextWidth) cnv.maxYAxisTextWidth = k;
			};
			cnv.scaleMarkerSizeY = 4;
		};

		cnv.curveType = "linear";
		cnv.selectedPointNo = -1;
		cnv.isInPointMove = false;
		cnv.isMultiCurve = !Array.isArray(cnv.value);
		cnv.onchangeEval = null;
		cnv.oninputEval = null;
		if (d.hasOwnProperty("onchange")) cnv.onchangeEval = d.onchange;
		if (d.hasOwnProperty("oninput")) cnv.oninputEval = d.oninput;
		if (d.hasOwnProperty("editYExpression")) {
			cnv.editYExpression = new i18xExpression(d.editYExpression);
			if (cnv.isMultiCurve) {
				for (k in cnv.value) for (i = 0; i < cnv.value[k].length; i++)cnv.value[k][i][0] = cnv.editYExpression.Exec(cnv.value[k][i][0]);
			} else {
				for (i = 0; i < cnv.value.length; i++)cnv.value[i][0] = cnv.editYExpression.Exec(cnv.value[i][0]);
			};
		};
		if (d.hasOwnProperty("returnYExpression")) {
			cnv.returnYExpression = new i18xExpression(d.returnYExpression);
		};
		if (d.hasOwnProperty("editXExpression")) {
			cnv.editXExpression = new i18xExpression(d.editXExpression);
		};
		if (d.hasOwnProperty("returnXExpression")) {
			cnv.returnXExpression = new i18xExpression(d.returnXExpression);
		};
		if (cnv.isMultiCurve) {
			cnv.curMultiCurveKey = ObjFirstKey(cnv.value);
			cnv.curCurve = cnv.value[cnv.curMultiCurveKey];
		} else {
			cnv.curCurve = cnv.value;
		};
		if (d.hasOwnProperty("returnExpression")) cnv.returnExpression = new i18xExpression(d.returnExpression);
		cvsbgrd.resizeObserver = new ResizeObserver(entries => { for (let entry of entries) { GUI.CurveInputBgrdDraw(entry.target); } });
		cvsbgrd.resizeObserver.observe(cvsbgrd);
		cnv.resizeObserver = new ResizeObserver(entries => { for (let entry of entries) { GUI.CurveInputDraw(entry.target); } });
		cnv.resizeObserver.observe(cnv);
		cnv.onmousedown = function (_ev) {
			var sp, np, vp;
			if (this.isInPointMove) GUI.CurveInputEndPointMove(this);
			sp = GUI.CurveInputGetPointNo(this, _ev.clientX, _ev.clientY);
			if (sp >= 0) {
				this.selectedPointNo = sp;
				this.isInPointMove = true;
				GUI.CurveInputSetToInputs(this, this.curCurve[sp]);
				GUI.CurveInputDraw(this);
				cnv.className = cnv.className.exchangeCursorClass("pointermove");
			} else {
				np = GUI.CurveInputGetNewPointNo(this, _ev.clientX, _ev.clientY);
				if (np != null) {
					vp = GUI.CurveInputGetXY(this, _ev.clientX, _ev.clientY);
					this.selectedPointNo = np[0] + 1;
					this.isInPointMove = true;
					this.curCurve.splice(np[0] + 1, 0, vp);
					GUI.CurveInputSetToInputs(this, vp);
					GUI.CurveInputDraw(this);
					cnv.className = cnv.className.exchangeCursorClass("pointermove");
				} else {
					cnv.className = cnv.className.exchangeCursorClass("pointer");
				};
			};
		};
		cnv.onmouseup = function (_ev) {
			var sp, vp;
			if (this.isInPointMove) {
				this.isInPointMove = false;
				vp = GUI.CurveInputGetXY(this, _ev.clientX, _ev.clientY);
				if (vp != null) {
					sp = this.selectedPointNo;
					if (sp != 0 && sp != this.curCurve.length - 1) {
						if ((vp[1] < this.curCurve[sp - 1][1]) || (vp[1] > this.curCurve[sp + 1][1])) {
							this.curCurve.splice(sp, 1);
						};
					};
				};
				if (this.onchangeEval != null) eval(this.onchangeEval);
			};
			GUI.CurveInputDraw(this);
			cnv.className = cnv.className.exchangeCursorClass("pointer");
		};
		cnv.onmousemove = function (_ev) {
			var sp, np, vp, canMove = false, delAtMouseUp = false;
			if (this.isInPointMove) {
				vp = GUI.CurveInputGetXY(this, _ev.clientX, _ev.clientY);
				if (vp != null) {
					sp = this.selectedPointNo;
					if (sp == 0) {
						vp[1] = this.xMin;
						canMove = true;
					} else if (sp == (this.curCurve.length - 1)) {
						vp[1] = this.xMax;
						canMove = true;
					} else {
						canMove = true;
						if (vp[1] < this.curCurve[sp - 1][1]) {
							delAtMouseUp = true;
							vp[1] = this.curCurve[sp - 1][1];
						} else if (vp[1] > this.curCurve[sp + 1][1]) {
							delAtMouseUp = true;
							vp[1] = this.curCurve[sp + 1][1];
						};
					};
					if (canMove) {
						GUI.CurveInputSetToInputs(this, vp);
						this.curCurve[sp] = vp;
						GUI.CurveInputDraw(this);
					};
					this.className = this.className.exchangeCursorClass(delAtMouseUp ? "pointerminus" : "pointermove");
				};
			} else {
				sp = GUI.CurveInputGetPointNo(this, _ev.clientX, _ev.clientY);
				//log(sp);
				if (sp < 0) {
					np = GUI.CurveInputGetNewPointNo(this, _ev.clientX, _ev.clientY);
					if (np != null) {
						this.className = cnv.className.exchangeCursorClass("pointerplus");
					} else {
						this
						this.className = this.className.exchangeCursorClass("pointer");
					};
				} else {
					this.className = this.className.exchangeCursorClass("handpointer");
				};
			};
		};
		cnv.onmousewheel = function (_ev) {
			cnv.myHeight += (_ev.deltaY / (3 * WHEELYSTEPSIZE));
			if (cnv.myHeight < 0) cnv.myHeight = 60;
			cnv.height = cnv.myHeight;
			cnv.style.height = cnv.myHeight + "px";
			cvsbgrd.height = cnv.myHeight;
			cvsbgrd.style.height = cnv.myHeight + "px";
			GUI.CurveInputDraw(this);
			GUI.CurveInputBgrdDraw(cvsbgrd);
			_ev.preventDefault();
		};
	};
};
GUI.CurveInputMultiCurveChange = function (_this, _id) {
	var cnv = document.getElementById(_id), key = document.getElementById(_id + "_curvekey");
	if (cnv) {
		if (cnv.value.hasOwnProperty(_this.value)) {
			cnv.curMultiCurveKey = _this.value;
			cnv.curCurve = cnv.value[_this.value];
			key.value = _this.value;
			GUI.CurveInputDraw(cnv);
			if (cnv.onchangeEval != null) eval(cnv.onchangeEval);
		};
	};
};
GUI.CurveInputMultiCurveRemove = function (_id) {
	var cnv = document.getElementById(_id), sel = document.getElementById(_id + "_select"), key = document.getElementById(_id + "_curvekey");
	if (cnv) if (sel) if (key) {
		if (ObjCount(cnv.value) > 1) {
			delete cnv.value[sel.value];
			sel.Remove(sel.selectedIndex);
			key.value = sel.value;
			GUI.CurveInputMultiCurveChange(sel, _id);
			if (cnv.onchangeEval != null) eval(cnv.onchangeEval);
		};
	};
};
GUI.CurveInputMultiCurveNew = function (_id) {
	var cnv = document.getElementById(_id), sel = document.getElementById(_id + "_select"), key = document.getElementById(_id + "_curvekey");
	var v, opt = document.createElement("option");
	if (cnv) if (sel) if (key) {
		v = parseInt(key.value, 10);
		if (!isNaN(v)) {
			if (cnv) {
				if (!cnv.value.hasOwnProperty(v)) {
					opt.value = v;
					opt.text = v;
					sel.add(opt);
					cnv.value[v] = [[(cnv.yMax + cnv.yMin) / 2, cnv.xMin], [(cnv.yMax + cnv.yMin) / 2, cnv.xMax]];
					sel.selectedIndex = sel.options.length - 1;
					GUI.CurveInputMultiCurveChange(sel, _id);
					if (cnv.onchangeEval != null) eval(cnv.onchangeEval);
				};
			};
		};
	};
};

GUI.CurveInputHTML = function (_id, _title, _opts) {
	var t = "", h = "", ch = "50px", trclass = "", isMultiCurve = false, s;
	if (!_opts.hasOwnProperty("value")) _opts.value = [[0, 0], [0, 100]];
	isMultiCurve = !Array.isArray(_opts.value);
	h += '<div class="inputField' + ((_opts.hasOwnProperty("inline") && _opts.inline) ? ' inline' : '') + ((_opts.hasOwnProperty("full") && _opts.full) ? ' full' : '') + '">';
	if (_title !== false) {
		if (_opts.context == "paneltable") _title = _title.wordWrap();
		t += '<div id="' + _id + '_title" class="title' + ((_opts.hasOwnProperty("inline") && _opts.inline) ? ' inline' : '') + '">' + _title.HtmlEntities() + '</div>';
	};
	if (isMultiCurve) {
		h += '<div class="inputline">';
		h += '<select id="' + _id + '_select" onchange="GUI.CurveInputMultiCurveChange(this,\'' + _id + '\');">';
		for (s in _opts.value) h += '<option value="' + s.HtmlEntities() + '"/>' + s.HtmlEntities() + '</option>';
		h += '</select>';
		if (_opts.hasOwnProperty("curveSelectText")) h += '&nbsp' + _opts.curveSelectText.HtmlEntities();
		h += '<span title="' + '...delete curve key...<info context="i18n button tooltip"/>'.I18xTrans().HtmlEntities() + '" onclick="GUI.CurveInputMultiCurveRemove(\'' + _id + '\');" class="icon-bin minibutton button cursor_handpointer"></span>';
		h += '</div>';
		h += '<div class="inputline">';
		h += '<input id="' + _id + '_curvekey" type="number" value="' + ObjFirstKey(_opts.value) + '">';
		h += '<span title="' + '...create new curve key...<info context="i18n button tooltip"/>'.I18xTrans().HtmlEntities() + '" onclick="GUI.CurveInputMultiCurveNew(\'' + _id + '\');" class="icon-new minibutton button cursor_handpointer"></span>';
		h += '</div>';
	};
	if (_opts.hasOwnProperty("height")) ch = _opts.height + "px";
	h += '<div style="position:relative;width:100%;">';
	h += '<canvas id="' + _id + '_bgrd" class="curveeditbgrd" style="position:relative;top:0px;left:0px;width:100%;height:' + ch + '"></canvas>';
	h += '<canvas id="' + _id + '" class="curveedit cursor_pointer" style="position:absolute;position:absolute;top:0px;left:0px;width:100%;height:' + ch + '" data-opts="' + JSON.stringify(_opts).HtmlEntities() + '"></canvas>';
	h += '</div>';
	h += '<div class="inputline">';
	h += '<input id="' + _id + '_yinput" type="number" oninput="GUI.CurveInputSetFromInputs(\'' + _id + '\');">';
	h += (_opts.hasOwnProperty("yUnit") ? '<div class="inputunit">' + _opts.yUnit.HtmlEntities() + '</div>' : '') + "&nbsp;";
	h += '<input id="' + _id + '_xinput" type="number" oninput="GUI.CurveInputSetFromInputs(\'' + _id + '\');">';
	h += (_opts.hasOwnProperty("xUnit") ? '<div class="inputunit">' + _opts.xUnit.HtmlEntities() + '</div>' : '');
	h += '</div>';
	h += '<img src="./skins/' + SKIN + '/imgs/empty.png" class="empty" onload="GUI.CurveInputInit(\'' + _id + '\');">';
	h += '</div>';
	switch (_opts.context) {
		case "panel":
		case "modal":
			return t + h;
		case "paneltable":
			if (_opts.hasOwnProperty("trclass")) if (_opts.trclass != "") trclass = ' class="' + _opts.trclass + '"';
			return '<tr' + trclass + '><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
		default:
			return "";
	};
};
Panel.prototype.CurveInputValue = function (_id, _defValue = {}) { return GUI.CurveInputValue(this, _id, _defValue); };
GUI.CurveInputValue = function (_panel, _id, _defValue = {}) {
	var cnv = document.getElementById(_id), x, y, sp;
	if (cnv) {
		return cnv.value;
	} else {
		return _defValue;
	};
};

Panel.prototype.CurveInputSetValue = function (_id, _value = {}) { return GUI.CurveInputSetValue(this, _id, _value); };
GUI.CurveInputSetValue = function (_panel, _id, _value) {
	var cnv = document.getElementById(_id), d;
	if (cnv) {
		d = JSON.parse(cnv.dataset.opts);
		d.value = _value;
		cnv.dataset.opts = JSON.stringify(d);
		delete cnv.isInit;
		GUI.CurveInputInit(_id);
	};
};

GUI.TextAreaHTMLI18xChange = function (_id) {
	var osel = document.getElementById(_id + "_sel"), oin = document.getElementById(_id), jerr;
	//log("oin.dataset.input",oin.dataset.inputs);
	var oldlid = oin.dataset.lid, newlid = osel.value, value, newvalue = {};
	try {
		value = JSON.parse(oin.dataset.inputs);
	} catch (jerr) {
		value = { "en-US": oin.dataset.inputs };
	};
	value[oldlid] = oin.value;
	for (lid in value) if (value[lid].trim() != "") newvalue[lid] = value[lid].trim();
	oin.dataset.inputs = JSON.stringify(value);
	oin.dataset.lid = newlid;
	oin.dir = i18x.LIDS_RTL.indexOf(newlid) >= 0 ? "rtl" : "ltr";
	if (value.hasOwnProperty(newlid)) {
		oin.value = value[newlid];
	} else {
		oin.value = "";
	};
};
GUI.TextAreaHTMLI18xSet = function (_id, _lid) {
	var osel = document.getElementById(_id + "_sel");
	if (osel) osel.value = _lid;
	GUI.TextAreaHTMLI18xChange(_id);
};
GUI.TextAreaHTMLI18xNext = function (_id) {
	var osel = document.getElementById(_id + "_sel"), oin = document.getElementById(_id), value, key, nowkey, newkey = "", preWasNowKey = false;
	GUI.TextInputHTMLI18xChange(_id);
	try {
		value = JSON.parse(oin.dataset.inputs);
		nowkey = osel.value;
		for (key in value) {
			if (preWasNowKey) newkey = key;
			if (key == nowkey) preWasNowKey = true;
		};
		if (newkey == "") newkey = "en-US";
		osel.value = newkey;
		GUI.TextAreaHTMLI18xChange(_id);
	} catch (jerr) {
	};
};
GUI.TextAreaHTML = function (_id, _title, _opts) {
	var t = "", h = "", extraAttrs = ' data-i18n="false"', jerr, i18txts, value = "", valueLid = "en-US", lidOpts = NLIDS, defLid = i18x.lid, defEditLid = null;
	// defLid = i18x.isAutoLid ? i18x.i18nBestLid : i18x.i18nLid
	if (!_opts.hasOwnProperty("context")) _opts.context = "panel";
	if (_opts.hasOwnProperty("defLid")) defLid = _opts.defLid;
	if (_opts.hasOwnProperty("defEditLid")) defEditLid = _opts.defEditLid;
	if (_opts.hasOwnProperty("lidOpts")) lidOpts = _opts.lidOpts;
	h += '<div class="inputField">';
	if (_title !== false) {
		if (_opts.context == "paneltable") _title = _title.wordWrap();
		t += '<div class="title" id="' + _id + '_title" class="inputField">' + _title.HtmlEntities() + '</div>';
	};
	if (_opts.hasOwnProperty("i18n")) {
		if (_opts.hasOwnProperty("value")) {
			try {
				extraAttrs = ' data-inputs="' + _opts.value.HtmlEntities() + '"';
				i18txts = JSON.parse(_opts.value);
				for (l in i18txts) if (!lidOpts.hasOwnProperty(l)) if (i18x.LIDS_CULTURES.hasOwnProperty(l)) lidOpts[l] = i18x.LIDS_CULTURES[l];
				if (i18txts.hasOwnProperty(defLid)) {
					value = i18txts[defLid];
					valueLid = defLid;
					if (value == "") {
						if (i18txts.hasOwnProperty("en-US")) {
							if (i18txts["en-US"] != "") {
								valueLid = "en-US";
								value = i18txts["en-US"];
							};
						};
					};
				} else {
					if (i18txts.hasOwnProperty("en-US")) {
						value = i18txts["en-US"];
						valueLid = "en-US";
					};
				};
				extraAttrs += ' data-i18n="true"';
			} catch (jerr) {
				if (defEditLid != null) {
					value = _opts.value;
					valueLid = defEditLid;
				} else {
					value = _opts.value;
					valueLid = "en-US";
				};
				extraAttrs = ' data-i18n="true" data-inputs="' + _opts.value.HtmlEntities() + '"';
			};
		} else {
			valueLid = "en-US";
			extraAttrs += ' data-i18n="true" data-inputs=""';
		};
		extraAttrs += ' data-lid="' + valueLid + '"';
		t += '<select id="' + _id + '_sel" class="i18n" oninput="GUI.TextAreaHTMLI18xChange(\'' + _id + '\');"/>';
		for (var lid in lidOpts) {
			t += '<option ' + ((valueLid == lid) ? "selected " : "") + 'value="' + lid + '">' + lidOpts[lid].HtmlEntities() + '</option>';
		};
		t += '</select>';
		t += '<span title="' + '...select international language variation...<info context="i18n button tooltip"/>'.I18xTrans().HtmlEntities() + '" onclick="GUI.TextAreaHTMLI18xSet(\'' + _id + '\',\'en-US\');" class="icon-earth minibutton button cursor_handpointer"></span>';
		t += '<span title="' + '...select best local language variation...<info context="i18n button tooltip"/>'.I18xTrans().HtmlEntities() + '"onclick="GUI.TextAreaHTMLI18xSet(\'' + _id + '\',\'' + i18x.i18nBestLid + '\');" class="icon-home3 minibutton button cursor_handpointer"></span>';
		t += '<span title="' + '...select next available language variation...<info context="i18n button tooltip"/>'.I18xTrans().HtmlEntities() + '"onclick="GUI.TextAreaHTMLI18xNext(\'' + _id + '\');" class="icon-forward3 minibutton button cursor_handpointer"></span>';
	} else {
		value = _opts.value;
	};
	if (_opts.hasOwnProperty("oninput")) extraAttrs += ' oninput="' + _opts.oninput + '"';
	if (_opts.hasOwnProperty("onchange")) extraAttrs += ' onchange="' + _opts.onchange + '"';
	if (_opts.hasOwnProperty("extraHTML")) h += _opts.extraHTML;
	h += '<textarea dir="' + (i18x.LIDS_RTL.indexOf(valueLid) >= 0 ? "rtl" : "ltr") + '" class="textarea"' + (_opts.hasOwnProperty("spellcheck") ? ' spellcheck="true"' : ' spellcheck=false') + (_opts.hasOwnProperty("cols") ? ' cols="' + _opts.cols + '"' : '') + (_opts.hasOwnProperty("rows") ? ' rows="' + _opts.rows + '"' : '') + ' id="' + _id + '"' + (_opts.hasOwnProperty("tooltip") ? ' title="' + _opts.tooltip.HtmlEntities(µTESUP) + '"' : '') + extraAttrs + '>' + (_opts.hasOwnProperty("value") ? '' + value.chtmlEntities() : '') + '</textarea>';
	if (_opts.hasOwnProperty("note")) if (_opts.note != "") h += '<div class="note">*' + _opts.note.I18xTrans().HtmlEntities() + '</div>';
	h += '</div>';
	switch (_opts.context) {
		case "panel":
		case "modal":
			return t + h;
		case "paneltable":
			return '<tr id="' + _id + '_inputField"><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
		default:
			return "";
	};
};
Panel.prototype.TextAreaValue = function (_id, _defValue = "") { return GUI.TextAreaValue(this, _id, _defValue); };
GUI.TextAreaValue = function (_panel, _id, _defValue = "") {
	var o = _panel.contentDiv.GetElementById(_id), value;
	if (o) {
		if (o.dataset.i18n == "true") {
			var osel = _panel.contentDiv.GetElementById(_id + "_sel");
			var tlid, lid = o.dataset.lid, newvalue = {};
			try {
				value = JSON.parse(o.dataset.inputs);
			} catch (jerr) {
				value = { "en-US": o.dataset.inputs };
			};
			value[lid] = o.value;
			for (tlid in value) if (value[tlid].trim() != "") newvalue[tlid] = value[tlid].trim();
			if (ObjCount(newvalue) == 1 && newvalue.hasOwnProperty("en-US")) {
				return newvalue["en-US"];
			} else {
				value = JSON.stringify(newvalue);
				if (value == "{}") value = "";
				return value;
			};
		} else {
			return o.value;
		};
	} else {
		return _defValue;
	};
};

Panel.prototype.TextAreaSetOnInput = function (_id, _onInput) { GUI.TextAreaSetOnInput(this, _id, _onInput); };
GUI.TextAreaSetOnInput = function (_panel, _id, _onInput) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) o.oninput = _onInput;
};
Panel.prototype.TextAreaSetValue = function (_id, _value = "") { return GUI.TextAreaSetValue(this, _id, _value); };
GUI.TextAreaSetValue = function (_panel, _id, _value = "") {
	var o = _panel.contentDiv.GetElementById(_id), value;
	if (o) {
		if (o.dataset.i18n.ToBoolean()) {
			o.dataset.inputs = _value;
			try {
				value = JSON.parse(_value);
				if (o.dataset.lid == "en-US") {
					o.value = value["en-US"];
				} else {
					if (value.hasOwnProperty(o.dataset.lid)) {
						o.value = value[o.dataset.lid];
					} else {
						o.value = "";
					};
				};
			} catch (jerr) {
				if (o.dataset.lid == "en-US") {
					o.value = _value;
				} else {
					o.value = "";
				};
			};
		} else {
			o.value = _value;
		};
	};
};
GUI.CheckBoxClick = function (_ev, _this) {
	var info, i, o, pref;
	_this.checked = !_this.checked;
	if (_this.dataset.hasOwnProperty("inputSwitches")) {
		if (_this.dataset.inputSwitches != "") {
			info = JSON.parse(_this.dataset.inputSwitches);
			if (info.hasOwnProperty(_this.checked ? 0 : 1)) {
				info = info[_this.checked ? 1 : 0];
				pref = _this.id.cutAtLastCharOf() + "_";
				for (i in info) {
					o = document.getElementById(pref + i + "_inputField");
					if (o) o.style.opacity = info[i] ? 1.0 : 0.3;
				};
			};
		};
	};
	if (_this.onchange != null) {
		var ev = new Event('change');
		_this.dispatchEvent(ev);
	};
};

GUI.ChecBoxOnButtonClick = function (_ev, _this, _id) {
	_this.dataset.value = _this.dataset.value != "true";
	_this.className = _this.className.boolClass("highlight", _this.dataset.value == "true");
	if (_this.dataset.oninput != "") eval(_this.dataset.oninput);
};
GUI.CheckBoxHTML = function (_id, _title, _text = "", _opts = {}) {
	var t = "", h = "", p, inputSwitches = "", icon = "", color = "white", disabled = false;
	if (_opts.hasOwnProperty("disabled")) disabled = _opts.disabled;
	if (_opts.hasOwnProperty("oninput")) _opts.onchange = _opts.oninput;
	if (_opts.hasOwnProperty("icon")) icon = _opts.icon;
	if (!_opts.hasOwnProperty("context")) _opts.context = "panel";
	h += '<div class="inputField' + (_opts.hasOwnProperty("extraClass") ? ' ' + _opts.extraClass : '') + '">';
	if (icon == "") {
		if (_title !== false) {
			if (_opts.context == "paneltable") _title = _title.wordWrap();
			t += '<div class="title" id="' + _id + '_title" class="inputField">' + _title.HtmlEntities() + '</div>';
		};
		if (_opts.hasOwnProperty("intputSwitches")) inputSwitches += ' data-input-switches="' + JSON.stringify(_opts.intputSwitches).HtmlEntities() + '" ';
		if (_opts.hasOwnProperty("extraHTML")) h += _opts.extraHTML;
		h += '<div style="display:inline-box;">';
		h += '<input type="checkbox"' + inputSwitches + 'class="checkbox" onclick="return false;" ' + ButtonAttributes("GUI.CheckBoxClick(event,this);") + ' id="' + _id + '" ' + (_opts.hasOwnProperty("tooltip") ? ' title="' + _opts.tooltip.HtmlEntities(µTESUP) + '"' : '') + ((_opts.hasOwnProperty("value") && _opts.value == true) ? ' checked' : '') + (disabled ? ' disabled ' : '') + (_opts.hasOwnProperty("onchange") ? ' onchange="' + _opts.onchange + '"' : '') + '>';
		h += '<span class="checkboxlabel ' + (disabled ? ' disabled ' : '') + '" id="' + _id + '_label">' + _text.HtmlEntities() + '</span>';
		h += '</div>';
		if (_opts.hasOwnProperty("textreplaces")) for (p in _opts.textreplaces) h = h.str_replace(p, _opts.textreplaces[p]);
		if (_opts.hasOwnProperty("note")) if (_opts.note != "") h += '<div class="note">*' + _opts.note.I18xTrans().HtmlEntities() + '</div>';
		if (_opts.hasOwnProperty("postExtraHTML")) h += _opts.postExtraHTML;
	} else {
		if (_opts.hasOwnProperty("color")) color = _opts.color;
		h += GUI.ButtonHTML(_id + "_button", false, 'icon-' + icon + ' color-' + color, "GUI.ChecBoxOnButtonClick(event,this,'" + _id + "');", { data: _opts.value, oninput: _opts.oninput, butextraclass: (disabled ? ' disabled ' : '') + (_opts.butextraclass) + ((_opts.value) ? ' highlight' : ''), tooltip: _opts.tooltip });
	};
	h += '</div>';
	switch (_opts.context) {
		case "panel":
		case "modal":
			return t + h;
		case "pure":
			return h;
		case "paneltable":
			return '<tr id="' + _id + '_inputField"><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
		case "paneltablecenter":
			return '<tr id="' + _id + '_inputField"><td class="center" colspan="2">' + t + ((t == "") ? '' : '&nbsp;') + h + '</td>';
		default:
			return "";
	};
};
Panel.prototype.CheckBoxValue = function (_id, _defValue) { return GUI.CheckBoxValue(this, _id, _defValue); };
GUI.CheckBoxValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) {
		return o.checked;
	} else {
		return _defValue;
	};
};
Panel.prototype.CheckBoxSetValue = function (_id, _value) { return GUI.CheckBoxSetValue(this, _id, _value); };
GUI.CheckBoxSetValue = function (_panel, _id, _value) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) o.checked = _value;
};
Panel.prototype.CheckBoxSetOnInput = function (_id, _onInput) { GUI.CheckBoxSetOnInput(this, _id, _onInput); };
GUI.CheckBoxSetOnInput = function (_panel, _id, _onInput) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) o.onchange = _onInput;
};
GUI.SwitchDivsByCheckBoxInput = function (_this, _offIds, _onIds) {
	var i, o;
	for (i = 0; i < _offIds.length; i++) {
		o = document.getElementById(_offIds[i]);
		if (o) o.style.display = _this.checked ? "none" : "block";
	};
	for (i = 0; i < _onIds.length; i++) {
		o = document.getElementById(_onIds[i]);
		if (o) o.style.display = _this.checked ? "block" : "none";
	};
};
GUI.SwitchDivsByCheckBoxInputStartUpJS = function (_CheckBoxInputIds) {
	var ret = "", c;
	for (c = 0; c < _CheckBoxInputIds.length; c++) {
		ret += "document.getElementById('" + _CheckBoxInputIds[c] + "').onchange();";
	};
	return ret;
};
GUI.SwitchDivsByCheckBoxInputStartUpHTML = function (_CheckBoxInputIds) {
	return ImgLoadHTML(GUI.SwitchDivsByCheckBoxInputStartUpJS(_CheckBoxInputIds));
	//return '<img src="./skins/'+SKIN+'/imgs/empty.png" class="empty" onload="'+GUI.SwitchDivsByCheckBoxInputStartUpJS(_CheckBoxInputIds)+'">';
};
Panel.prototype.CheckBoxSetEnabled = function (_id, _enabled) { GUI.CheckBoxSetEnabled(this, _id, _enabled); };
GUI.CheckBoxSetEnabled = function (_panel, _id, _enabled) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) o.disabled = !_enabled;
	var o = _panel.contentDiv.GetElementById(_id + "_label");
	if (o) o.className = o.className.boolClass("disabled", !_enabled);
};

GUI.BitsetSelectHTML = function (_id, _title, _opts = {}) {
	var t = "", h = "", k = "", s, q, value = 0, bitsets = [], separator = '', sepClass = "";
	if (_opts.hasOwnProperty("separtionType")) {
		switch (_opts.separtionType) {
			case "inline": sepClass = ""; break;
			case "block": sepClass = " column left"; break;
		};
	};
	if (_opts.hasOwnProperty("separator")) separator = _opts.separator;
	if (!_opts.hasOwnProperty("context")) _opts.context = "panel";
	if (_title !== false) {
		if (_opts.context == "paneltable") _title = _title.wordWrap();
		t += '<div class="title" id="' + _id + '_title">' + _title.HtmlEntities() + '</div>';
	};
	if (_opts.hasOwnProperty("extraHTML")) h += _opts.extraHTML;
	if (_opts.hasOwnProperty("value")) value = _opts.value;
	for (s in _opts.bitsets) {
		q = _opts.bitsets[s];
		bitsets.push(parseInt(s, 10));
		k += '<span class="sep8"><input type="checkbox" class="checkbox" onclick="return false;" ' + ButtonAttributes("GUI.CheckBoxClick(event,this);") + ' id="' + _id + '_' + s + '" ' + (q.hasOwnProperty("tooltip") ? ' title="' + q.tooltip.HtmlEntities() + '"' : '') + ((((parseInt(s, 10)) & value) != 0) ? ' checked' : '') + (_opts.hasOwnProperty("onchange") ? ' onchange="' + _opts.onchange + '"' : '') + '>';
		if (q.hasOwnProperty("title")) k += q.title.HtmlEntities() + separator;
		if (q.hasOwnProperty("icon")) k += '<span style="vertical-align:middle;' + (q.hasOwnProperty("color") ? 'color:' + q.color + ";" : '') + 'font-size:14px" class="' + q.icon + '"></span>' + separator;
		k += '</span>';
	};
	h += '<div id="' + _id + '" data-bit-sets="' + JSON.stringify(bitsets).HtmlEntities() + '" class="inputField' + sepClass + (_opts.hasOwnProperty("inputclass") ? " " + _opts.inputclass : '') + '">';
	h += k;
	h += '</div>';
	if (_opts.hasOwnProperty("note")) if (_opts.note != "") h += '<div class="note">*' + _opts.note.I18xTrans().HtmlEntities() + '</div>';
	if (_opts.hasOwnProperty("button")) h += _opts.button;
	switch (_opts.context) {
		case "panel":
		case "modal":
			return t + h;
		case "paneltable":
			return '<tr id="' + _id + '_inputField"><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
		default:
			return "";
	};
};
Panel.prototype.BitsetSelectValue = function (_id, _defValue) { return GUI.BitsetSelectValue(this, _id, _defValue); };
GUI.BitsetSelectValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementById(_id), b = o.dataset.bitSets, ret = 0, i, l, ob;
	if (o) {
		if (b) {
			b = JSON.parse(b);
			l = b.length;
			for (i = 0; i < l; i++) {
				ob = _panel.contentDiv.GetElementById(_id + "_" + b[i]);
				if (ob) if (ob.checked) ret |= b[i];
			};
			return ret;
		} else {
			return _defValue;
		};
	} else {
		return _defValue;
	};
};
Panel.prototype.BitsetSelectSetValue = function (_id, _value) { return GUI.BitsetSelectSetValue(this, _id, _value); };
GUI.BitsetSelectSetValue = function (_panel, _id, _value) {
	var o = _panel.contentDiv.GetElementById(_id), b = o.dataset.bitSets, ret = 0, i, l, ob;
	if (o) {
		if (b) {
			b = JSON.parse(b);
			l = b.length;
			for (i = 0; i < l; i++) {
				ob = _panel.contentDiv.GetElementById(_id + "_" + b[i]);
				if (ob) ob.checked = (_value & b[i]) != 0;
			};
		};
	};
};

GUI.SelectInputOnButtonClick = function (_ev, _this, _id, _value) {
	var o = document.getElementById(_id), bo = document.getElementById(_id + "_selbutton_" + o.dataset.value), bn = document.getElementById(_id + "_selbutton_" + _value), event = _ev;
	if (o) {
		if (bo) bo.className = bo.className.boolClass("highlight", false);
		if (bn) bn.className = bn.className.boolClass("highlight", true);
		o.dataset.value = _value;
		GUI.SelectInputOnChange(_ev, _this, _id);
		if (o.dataset.oninput != "") eval(o.dataset.oninput);
	};
};

GUI.SelectInputOnChange = function (_ev, _this, _id) {
	var o = document.getElementById(_id), oi = document.getElementById(_id + "_info"), info, o, i, pref, value;
	if (o) if (oi) {
		if (o.dataset.value) {
			value = o.dataset.value;
		} else {
			value = o.value;
		};
		if (o.dataset.info != "") {
			info = JSON.parse(o.dataset.info);
			if (info.hasOwnProperty(value)) {
				oi.innerText = info[value].HtmlEntities();
			} else {
				oi.innerText = "";
			};
		};
		if (o.dataset.hasOwnProperty("inputSwitches")) {
			if (o.dataset.inputSwitches != "") {
				info = JSON.parse(o.dataset.inputSwitches);
				if (info.hasOwnProperty(value)) {
					info = info[value];
					pref = o.id.cutAtLastCharOf() + "_";
					for (i in info) {
						o = document.getElementById(pref + i + "_inputField");
						if (o) o.style.opacity = info[i] ? 1.0 : 0.3;
					};
				};
			};
		};
	};
};
GUI.SelectInputHTML = function (_id, _title, _selects, _opts) {
	var t = "", h = "", s, inputSwitches = "", cc = "", dropdown = true, disabled = false;
	if (!_opts.hasOwnProperty("context")) _opts.context = "panel";
	if (_opts.hasOwnProperty("disabled")) disabled = _opts.disabled;
	h += '<div class="inputField' + (_opts.hasOwnProperty("extraClass") ? ' ' + _opts.extraClass : '') + '">';
	if (_title !== false) {
		if (_opts.context == "paneltable") _title = _title.wordWrap();
		t += '<div class="inputField title" id="' + _id + '_title">' + _title.HtmlEntities() + '</div>';
	};
	if (_opts.hasOwnProperty("extraHTML")) h += _opts.extraHTML;
	if (_opts.hasOwnProperty("selectDropDown")) dropdown = _opts.selectDropDown;
	_opts.selectDropDown = dropdown;
	if (_opts.hasOwnProperty("intputSwitches")) inputSwitches += ' data-input-switches="' + JSON.stringify(_opts.intputSwitches).HtmlEntities() + '"';
	if (dropdown) {
		if (_opts.hasOwnProperty("selectInfo")) {
			info = _opts.selectInfo;
			h += '<select id="' + _id + '"' + inputSwitches + (disabled ? ' disabled ' : '') + ' data-info="' + JSON.stringify(info).HtmlEntities() + '" onchange="GUI.SelectInputOnChange(event,this,\'' + _id + '\');' + (_opts.hasOwnProperty("onchange") ? _opts.onchange.HtmlEntities() : '') + '"' + (_opts.hasOwnProperty("oninput") ? ' oninput="' + _opts.oninput.HtmlEntities() + '"' : '') + '>';
		} else {
			h += '<select id="' + _id + '"' + inputSwitches + (disabled ? ' disabled ' : '') + (_opts.hasOwnProperty("onchange") ? ' onchange="' + _opts.onchange.HtmlEntities() + '"' : '') + (_opts.hasOwnProperty("oninput") ? ' oninput="' + _opts.oninput.HtmlEntities() + '"' : '') + '>';
		};
		for (s in _selects) {
			h += '<option value="' + s.HtmlEntities() + '"' + ((s == _opts.value) ? ' selected' : '') + '>';
			h += _selects[s].HtmlEntities();
			h += '</option>';
		};
		h += '</select>';
		if (inputSwitches != "") h += '<img src="./skins/' + SKIN + '/imgs/empty.png" class="empty" onload="GUI.SelectInputOnChange(event,this,\'' + _id + '\');">';
	} else {
		if (_title == "") t = "";
		var butgroups = [], buts = [], orders = [], l, i, oninput = "";
		for (s in _selects) orders.push(s | 0);
		orders.sort(function (a, b) { return a - b });
		l = orders.length;
		if (_opts.hasOwnProperty("oninput")) oninput = _opts.oninput;
		for (i = 0; i < l; i++) {
			s = orders[i];
			buts.push(GUI.ButtonHTML(_id + "_selbutton_" + s, false, 'icon-' + _opts.selectIcons[s], "GUI.SelectInputOnButtonClick(event,this,'" + _id + "'," + s + ");", { data: s, butextraclass: _opts.butextraclass + ((s == _opts.value) ? ' highlight' : ''), disabled: disabled, tooltip: _selects[s] }));
		};
		butgroups = [buts];
		h = GUI.ButtonBarsHTML(
			butgroups,
			{ buttonsAligns: ["extrabig center wrap noglass noborder", "right"], containerAlign: "center", fullContainer: true, extraAttrs: 'id="' + _id + '" data-value="' + _opts.value + '" data-oninput="' + oninput.HtmlEntities() + '" ' }
		);
	};
	if (_opts.hasOwnProperty("selectInfo")) h += '<div id="' + _id + '_info" class="selectinfo">' + (_opts.selectInfo.hasOwnProperty(_opts.value) ? _opts.selectInfo[_opts.value].HtmlEntities() : "") + '<div>';
	if (_opts.hasOwnProperty("note")) if (_opts.note != "") h += '<div class="note">*' + _opts.note.I18xTrans().HtmlEntities() + '</div>';
	if (_opts.hasOwnProperty("extraButtons")) h += _opts.extraButtons;
	if (_opts.hasOwnProperty("postExtraHTML")) h += _opts.postExtraHTML;

	if (_opts.context == "paneltable" || _opts.context == "paneltablecenter") {
		if (_opts.hasOwnProperty("icon") && _opts.hasOwnProperty("doicon") && _opts.doicon) {
			t = "";
			cc = "white";
			if (_opts.hasOwnProperty("color")) cc = _opts.color;
			t += '<div class="icon-' + _opts.icon + ' color-' + cc + '" ' + (_opts.hasOwnProperty("tooltip") ? ' title="' + _opts.tooltip.HtmlEntities() + '"' : '') + '>';
		};
	};
	h += '</div>';
	switch (_opts.context) {
		case "panel":
		case "modal":
			return t + h;
		case "paneltable":
			return '<tr id="' + _id + '_inputField"><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
		case "paneltablecenter":
			return '<tr id="' + _id + '_inputField"><td class="center" colspan="2">' + t + ((t == "") ? '' : '&nbsp;') + h + '</td>';
		default:
			return "";
	};
};
Panel.prototype.SelectInputChangeSelects = function (_id, _selects, _value) { return GUI.SelectInputChangeSelects(this, _id, _selects, _value); };
GUI.SelectInputChangeSelects = function (_panel, _id, _selects, _value) {
	var o = _panel.contentDiv.GetElementById(_id), l, s, op;
	if (o) {
		l = o.length;
		//for(s=0;s<l;s++)if(o.options.hasOwnProperty(s))o.options[s].Remove();
		o.options.length = 0;
		for (s in _selects) {
			op = document.createElement('option');
			op.value = s;
			op.innerHTML = _selects[s].HtmlEntities();
			o.appendChild(op);
		};
		o.value = _value;
	};
};
Panel.prototype.SelectInputSetValue = function (_id, _value) { return GUI.SelectInputSetValue(this, _id, _value); };
GUI.SelectInputSetValue = function (_panel, _id, _value) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) {
		if (o.dataset.value) {
			GUI.SelectInputOnButtonClick(null, null, _id, _value);
		} else {
			o.value = _value;
		};
	};
};
Panel.prototype.SelectInputValue = function (_id, _defValue) { return GUI.SelectInputValue(this, _id, _defValue); };
GUI.SelectInputValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) {
		if (o.dataset.value) {
			return o.dataset.value;
		} else {
			return o.value;
		};
	} else {
		return _defValue;
	};
};
Panel.prototype.SelectInputIntValue = function (_id, _defValue) { return GUI.SelectInputIntValue(this, _id, _defValue); };
GUI.SelectInputIntValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) {
		if (o.dataset.value) {
			return parseInt(o.dataset.value, 10);
		} else {
			return parseInt(o.value, 10);
		};
	} else {
		return _defValue;
	};
};
Panel.prototype.SelectInputDoubleValue = function (_id, _defValue) { return GUI.SelectInputDoubleValue(this, _id, _defValue); };
GUI.SelectInputDoubleValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) {
		return parseFloat(o.value).SysClp();;
	} else {
		return _defValue.SysClp();;
	};
};
Panel.prototype.SelectInputChangeOptions = function (_id, _selects) { return GUI.SelectInputChangeOptions(this, _id, _selects); };
GUI.SelectInputChangeOptions = function (_panel, _id, _selects) {
	var o = _panel.contentDiv.GetElementById(_id), s, v, i = 0;
	if (o) {
		v = o.value;
		o.options.length = 0;
		for (s in _selects) o.options[i++] = new Option(_selects[s], s, 0, s == v);
	};
};
Panel.prototype.SelectInputSetEnabled = function (_id, _enabled) { return GUI.SelectInputSetEnabled(this, _id, _enabled); };
GUI.SelectInputSetEnabled = function (_panel, _id, _enabled) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) o.disabled = !_enabled;
};

GUI.RadioInputHTML = function (_id, _title, _opts) {
	var t = "", h = "", vv, i, l, layout = "line", value = "";
	if (!_opts.hasOwnProperty("context")) _opts.context = "panel";
	if (_opts.hasOwnProperty("layout")) layout = _opts.layout;
	if (_opts.hasOwnProperty("value")) value = _opts.value;
	h += '<div class="inputField">';
	if (_title !== false) {
		if (_opts.context == "paneltable") _title = _title.wordWrap();
		t += '<div class="title" id="' + _id + '_title" class="inputField">' + _title.HtmlEntities() + '</div>';
	};
	if (_opts.hasOwnProperty("extraHTML")) h += _opts.extraHTML;
	l = _opts.values.length;
	for (i = 0; i < l; i++) {
		vv = _opts.values[i];
		//log(value,vv.value);
		h += '<input type="radio" class="radio" name="' + _id + '" ' + (vv.hasOwnProperty("tooltip") ? ' title="' + vv.tooltip.HtmlEntities(µTESUP) + '"' : '') + ' value="' + vv.value.HtmlEntities() + '"' + ((value == vv.value) ? ' checked' : '') + (_opts.hasOwnProperty("onchange") ? ' onchange="' + _opts.onchange + '"' : '') + '>';
		h += vv.title.HtmlEntities();
		switch (layout) {
			case "multiline":
				h += '<br/>';
				break;
			case "line":
				h += '&nbsp;&nbsp;';
				break;
		};
	};
	if (_opts.hasOwnProperty("note")) if (_opts.note != "") h += '<div class="note">*' + _opts.note.I18xTrans().HtmlEntities() + '</div>';
	h += '</div>';
	switch (_opts.context) {
		case "panel":
		case "modal":
			return t + h;
		case "paneltable":
			return '<tr id="' + _id + '_inputField"><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
		default:
			return "";
	};
};
Panel.prototype.RadioInputValue = function (_id, _defValue) { return GUI.RadioInputValue(this, _id, _defValue); };
GUI.RadioInputValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementsByName(_id), i, l;
	if (o) {
		l = o.length;
		for (i = 0; i < l; i++)if (o[i].checked) return o[i].value;
		return _defValue;
	} else {
		return _defValue;
	};
};
Panel.prototype.RadioInputIntValue = function (_id, _defValue) { return GUI.RadioInputIntValue(this, _id, _defValue); };
GUI.RadioInputIntValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementsByName(_id), i, l;
	if (o) {
		l = o.length;
		for (i = 0; i < l; i++)if (o[i].checked) return parseInt(o[i].value);
		return _defValue;
	} else {
		return _defValue;
	};
};
Panel.prototype.RadioInputDoubleValue = function (_id, _defValue) { return GUI.RadioInputIntValue(this, _id, _defValue); };
GUI.RadioInputIntValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementsByName(_id), i, l;
	if (o) {
		l = o.length;
		for (i = 0; i < l; i++)if (o[i].checked) return parseFloat(o[i].value).SysClp();;
		return _defValue.SysClp();;
	} else {
		return _defValue.SysClp();;
	};
};
Panel.prototype.RadioInputBoolValue = function (_id, _defValue) { return GUI.RadioInputIntValue(this, _id, _defValue); };
GUI.RadioInputIntValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementsByName(_id), i, l;
	if (o) {
		l = o.length;
		for (i = 0; i < l; i++)if (o[i].checked) return (o[i].value + "").ToBoolean();
		return _defValue;
	} else {
		return _defValue;
	};
};
Panel.prototype.RadioInputSetValue = function (_id, _value) { return GUI.RadioInputSetValue(this, _id, _value); };
GUI.RadioInputSetValue = function (_panel, _id, _value) {
	var o = _panel.contentDiv.GetElementsByName(_id + "_option"), i, l;
	if (o) o.value = _value;
};
Panel.prototype.RadioInputSetOnChange = function (_id, _onchange) { return GUI.RadioInputSetOnChange(this, _id, _onchange); };
GUI.RadioInputSetOnChange = function (_panel, _id, _onchange) {
	var o = _panel.contentDiv.GetElementsByName(_id), i, l;
	if (o) o.onchange = _onchange;
};

GUI.InputImageLoad = function (_ev, _id, _file) {
	var img = document.getElementById(_id + '_image'), opts = JSON.parse(img.dataset.opts), ri = opts.resizeInfo;
	var reader = new FileReader(), orgimg = new Image();
	if (!ri.hasOwnProperty("keepOrgIfPossible")) ri.keepOrgIfPossible = false;
	reader.onload = function (_le) {
		orgimg.onload = function () {
			orgimg.Resize(ri.boxWidth, ri.boxHeight, ri.suffix, ri.quality, ri.cutMode, ri.cutHorPos, ri.cutVerPos, ri.bgr, ri.maxSize,
				function (_newImg) {
					img.src = _newImg.src;
					if (opts.hasOwnProperty("oninput")) {
						eval(opts.oninput);
					};
				}, ri.keepOrgIfPossible
			);
		};
		orgimg.onerror = function () {
		};
		orgimg.src = _le.target.result;
	};
	reader.readAsDataURL(_file);
};
GUI.InputImageChange = function (_ev, _id) {
	var imginput = document.getElementById(_id + '_imageinput');
	if (imginput.files.length > 0) {
		GUI.InputImageLoad(_ev, _id, imginput.files[0]);
	};
};
GUI.InputImageClick = function (_ev, _id) {
	document.getElementById(_id + '_imageinput').click();
};
GUI.InputImageDrop = function (_ev, _id) {
	_ev.preventDefault();
	if (_ev.dataTransfer.files.length > 0) {
		GUI.InputImageLoad(_ev, _id, _ev.dataTransfer.files[0]);
	};
};
GUI.ImageInputHTML = function (_id, _title, _opts) {
	var t = "", h = "", value;
	//onerrorDefValue
	if (!_opts.hasOwnProperty("value")) _opts.context = "";
	if (!_opts.hasOwnProperty("defValue")) _opts.defValue = "";
	if (!_opts.hasOwnProperty("context")) _opts.context = "panel";
	if (!_opts.hasOwnProperty("oninput")) _opts.oninput = "null";
	if (_title !== false) {
		if (_opts.context == "paneltable") _title = _title.wordWrap();
		t += '<div class="title" id="' + _id + '_title" class="inputField">' + _title.HtmlEntities() + '</div>';
	};
	value = _opts.value;
	if (value == "") value = _opts.defValue;
	h += '<div id="' + _id + '" class="inputField cursor_handpointer image limitedwidth" title="' + '...click or drop to change image...<info context="gui image input note"/>'.I18xTrans().HtmlEntities() + '" ondragover="event.preventDefault();" ondrop="GUI.InputImageDrop(event,\'' + _id + '\');" onclick="GUI.InputImageClick(event,\'' + _id + '\');">';
	h += '<img ' + (_opts.hasOwnProperty("dynsize") ? 'width="100%"' : '') + ' id="' + _id + '_image" data-opts="' + JSON.stringify(_opts).HtmlEntities() + '" src="' + value + '">';
	h += '<input id="' + _id + '_imageinput" style="display:none;" onchange="GUI.InputImageChange(event,\'' + _id + '\');" type="file" accept="image/' + '*"/>';
	h += '</div>';
	if (_opts.hasOwnProperty("note")) if (_opts.note != "") h += '<div class="note">*' + _opts.note.I18xTrans().HtmlEntities() + '</div>';

	switch (_opts.context) {
		case "panel":
		case "modal":
			if (_opts.hasOwnProperty("extraButtons")) h += '<div class="buttonbarcontainer nopadding center">' + _opts.extraButtons + '</div>';
			return t + h;
		case "paneltable":
			if (_opts.hasOwnProperty("extraButtons")) h += _opts.extraButtons;
			return '<tr id="' + _id + '_inputField"><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
		default:
			return "";
	};
};
Panel.prototype.ImageInputValue = function (_id, _defValue) { return GUI.ImageInputValue(this, _id, _defValue); };
GUI.ImageInputValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementById(_id + '_image');
	if (o) {
		return o.src;
	} else {
		return _defValue;
	};
};
Panel.prototype.ImageInputWidth = function (_id, _defValue) { return GUI.ImageInputWidth(this, _id, _defValue); };
GUI.ImageInputWidth = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementById(_id + '_image');
	if (o) {
		return o.width;
	} else {
		return _defValue;
	};
};
Panel.prototype.ImageInputHeight = function (_id, _defValue) { return GUI.ImageInputHeight(this, _id, _defValue); };
GUI.ImageInputHeight = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementById(_id + '_image');
	if (o) {
		return o.height;
	} else {
		return _defValue;
	};
};
Panel.prototype.ImageInputSetValue = function (_id, _value) { return GUI.ImageInputSetValue(this, _id, _value); };
GUI.ImageInputSetValue = function (_panel, _id, _value) {
	var o = _panel.contentDiv.GetElementById(_id + "_image");
	if (o) return o.src = _value;
};


GUI.InputAudioLoad = function (_ev, _id, _file = "") {
	var audio = document.getElementById(_id + '_audio'), ctrls = document.getElementById(_id + '_playbut'), opts = JSON.parse(audio.dataset.opts), audioremove = document.getElementById('removeaudio_' + _id), audioname = document.getElementById(_id + '_audioname'), ir = document.getElementById(_id + '_range');
	var reader = new FileReader(), opts;
	opts = JSON.parse(audio.dataset.opts);
	if (_file == "") {
		if (ctrls) ctrls.className = ctrls.className.boolClass("disabled", true);
		audio.src = "";
		audioname.style.display = "none";
		audioname.innerHTML = "";
		if (audioremove) audioremove.className = audioremove.className.boolClass("disabled", true);
		if (opts.hasOwnProperty("onchange")) eval(opts.onchange);
		if (ir) {
			ir.disabled = true;
			ir.max = 0;
			ir.value = 0;
		};
		GUI.InputAudioSetPlayTime(_id, true);
	} else {
		reader.onerror = function (_e) {
			audio.src = "";
			audio.name = "";
			audioname.style.display = "none";
			audioname.innerHTML = "";
			if (ctrls) ctrls.className = ctrls.className.boolClass("disabled", true);
			if (audioremove) audioremove.className = audioremove.className.boolClass("disabled", true);
			if (opts.hasOwnProperty("onchange")) eval(opts.onchange);
			if (ir) {
				ir.disabled = true;
				ir.max = 0;
				ir.value = 0;
			};
			GUI.InputAudioSetPlayTime(_id, true);
		};
		reader.onload = function (_e) {
			audio.src = _e.target.result;
			audio.name = _file.name.basename();
			audioname.style.display = "block";
			audioname.innerHTML = audio.name.HtmlEntities();
			if (ctrls) ctrls.className = ctrls.className.boolClass("disabled", false);
			if (audioremove) audioremove.className = audioremove.className.boolClass("disabled", false);
			if (opts.hasOwnProperty("onchange")) eval(opts.onchange);
			if (ir) {
				ir.disabled = false;
				ir.max = audio.duration;
				ir.value = 0;
			};
			GUI.InputAudioSetPlayTime(_id, false);
		};
		reader.readAsDataURL(_file);
	};
};
GUI.InputAudioLoaded = function (_ev, _id) {
	var audio = document.getElementById(_id + '_audio');
	if (audio == null) return;
	var ctrls = document.getElementById(_id + '_playbut'), opts = JSON.parse(audio.dataset.opts), audioremove = document.getElementById('removeaudio_' + _id), audioname = document.getElementById(_id + '_audioname'), ir = document.getElementById(_id + '_range');
	if (ctrls) ctrls.className = ctrls.className.boolClass("disabled", false);
	if (ir) {
		ir.disabled = false;
		ir.max = audio.duration;
		ir.value = 0;
	};
	GUI.InputAudioSetPlayTime(_id, false);
};

GUI.InputAudioChange = function (_ev, _id) {
	var audioinput = document.getElementById(_id + '_audioinput');
	if (audioinput.files.length > 0) GUI.InputAudioLoad(_ev, _id, audioinput.files[0]);
};
GUI.InputAudioUploadClick = function (_ev, _id) {
	document.getElementById(_id + '_audioinput').click();
};
GUI.InputAudioRemoveClick = function (_ev, _id) {
	GUI.InputAudioLoad(_ev, _id);
};
GUI.InputAudioSetPlayTime = function (_id) {
	var ia = document.getElementById(_id + '_audio'), pt = document.getElementById(_id + '_playtext'), pb = document.getElementById(_id + '_playbut'), ir = document.getElementById(_id + '_range');
	var t, d;
	if (ia == null) {
		t = 0;
		d = 0;
	} else {
		t = ia.currentTime;
		d = ia.duration;
		if (GUI.InputAudioPlayingID == _id && ia.paused) GUI.InputAudioPlay(null, null, _id);
	};
	if (t >= 3600) t = 3599;
	if (d >= 3600) d = 3599;
	t = (Math.floor(t / 60) + "").PadStart(2, "0") + ":" + (((t | 0) % 60) + "").PadStart(2, "0")
	d = (Math.floor(d / 60) + "").PadStart(2, "0") + ":" + (((d | 0) % 60) + "").PadStart(2, "0")
	if (pt) pt.innerText = t + " / " + d;
	if (ir) ir.value = ia.currentTime;
};

GUI.InputAudioPlayRange = function (_ev, _this, _id) {
	var ia = document.getElementById(_id + '_audio')
	if (ia != null) ia.currentTime = parseFloat(_this.value);
};
GUI.InputAudioPlayTimer = function (_id) {
	GUI.InputAudioSetPlayTime(_id);
};
GUI.InputAudioPlayingID = null;
GUI.InputAudioPlayInterval = null;
GUI.InputAudioPlaySetVolume = function () {
	if (GUI.InputAudioPlayingID != "") {
		var ia = document.getElementById(GUI.InputAudioPlayingID + '_audio');
		if (ia != null) ia.volume = CONF_GAMEMUSICVOLUME;
	};
};
GUI.InputAudioPlay = function (_ev, _this, _id) {
	var ia = document.getElementById(_id + '_audio'), ctrls = document.getElementById(_id + '_playbut');
	if (_this != null) if (_this.className.hasClass("disabled")) return;
	if (ia == null || ia.src == "") {
		if (GUI.InputAudioPlayInterval != null) clearInterval(GUI.InputAudioPlayInterval);
		if (GUI.InputAudioPlayingID == _id) GUI.InputAudioPlayingID = "";
		return;
	};
	if (ia.playing) {
		ia.playing = false;
		ia.pause();
		if (GUI.InputAudioPlayInterval != null) clearInterval(GUI.InputAudioPlayInterval);
		if (ctrls) ctrls.className = ctrls.className.boolClasses("icon-play2", "icon-pause", true);
		GUI.InputAudioPlayingID = "";
		GUI.InputAudioPlayInterval = null;
	} else {
		if (GUI.InputAudioPlayingID != "") {
			GUI.InputAudioPlayingID = "";
			GUI.InputAudioPlay(null, null, GUI.InputAudioPlayingID);
		};
		if (ctrls) ctrls.className = ctrls.className.boolClasses("icon-play2", "icon-pause", false);
		ia.playing = true;
		ia.volume = CONF_GAMEMUSICVOLUME;
		ia.play();
		GUI.InputAudioPlayInterval = setInterval(GUI.InputAudioPlayTimer, 100, _id);
		GUI.InputAudioPlayingID = _id;
	};
};
GUI.AudioInputHTML = function (_id, _title, _opts) {
	var t = "", h = "", loadButText = false, loadButIcon = "icon-upload", loadButClass = "button", removeButText = false, removeButIcon = "icon-bin", removeButClass = "button";
	//onerrorDefValue
	if (!_opts.hasOwnProperty("context")) _opts.context = "panel";
	if (!_opts.hasOwnProperty("oninput")) _opts.oninput = "null";
	if (!_opts.hasOwnProperty("accepts")) _opts.accepts = "audio/mp3;audio/wav";
	if (!_opts.hasOwnProperty("audioName")) _opts.audioName = "";
	if (_title !== false) {
		if (_opts.context == "paneltable") _title = _title.wordWrap();
		t += '<div class="title" id="' + _id + '_title" class="inputField">' + _title.HtmlEntities() + '</div>';
	};
	h += '<div class="inputField' + (_opts.hasOwnProperty("inputclass") ? " " + _opts.inputclass : '') + '">';
	h += '<div>';
	h += '<span id="' + _id + '_playbut" onclick="GUI.InputAudioPlay(event,this,\'' + _id + '\');" style="color:white;" class="icon-play2 button disabled cursor_handpointer leftalign"></span>';
	//h+='<span id="'+_id+'_playloopbut" onclick="GUI.InputAudioLoop(event,this,\''+_id+'\');" style="color:white;" class="icon-playloop button disabled cursor_handpointer leftalign"></span>';
	h += ' <span id="' + _id + '_playtext" class="" type="range"/>00:00 / 00:00</span>';
	h += '<input disabled id="' + _id + '_range" oninput="GUI.InputAudioPlayRange(event,this,\'' + _id + '\');" class="range" type="range" min="0" max="0" step="0.1"/>';
	h += '</div>';
	h += '<audio controls onloadeddata="GUI.InputAudioLoaded(event,\'' + _id + '\');" style="display:none;opacity:0.5;" class="cursor_handpointer" id="' + _id + '_audio" data-opts="' + JSON.stringify(_opts).HtmlEntities() + '" src="' + _opts.value + '" name="' + _opts.audioName.HtmlEntities() + '"></audio>';
	h += '<input id="' + _id + '_audioinput" style="display:none;padding:8px;" onchange="GUI.InputAudioChange(event,\'' + _id + '\');" type="file" accept="' + _opts.accepts + '"/>';
	h += '<div id="' + _id + '_audioname" style="' + ((_opts.audioName == "") ? 'display:none;' : 'display:block;') + '">' + _opts.audioName.HtmlEntities() + '</div>';
	if (_opts.hasOwnProperty("loadButText")) loadButText = _opts.loadButText;
	if (_opts.hasOwnProperty("loadButIcon")) loadButIcon = _opts.loadButIcon;
	if (_opts.hasOwnProperty("loadButClass")) loadButClass = _opts.loadButClass;
	if (_opts.hasOwnProperty("removeButText")) removeButText = _opts.removeButText;
	if (_opts.hasOwnProperty("removeButIcon")) removeButIcon = _opts.removeButIcon;
	if (_opts.hasOwnProperty("removeButClass")) removeButClass = _opts.removeButClass;
	h += '<div class="buttonbarcontainer left leftalign">';
	h += GUI.ButtonHTML("loadaudio_" + _id, loadButText, loadButIcon, "GUI.InputAudioUploadClick(event,'" + _id + "');", { butclass: loadButClass, tooltip: '...upload audio file...<info context="gui audio input tooltip"/>'.I18xTrans() });
	h += GUI.ButtonHTML("removeaudio_" + _id, removeButText, removeButIcon, "GUI.InputAudioRemoveClick(event,'" + _id + "');", { disabled: (_opts.value == ""), butclass: removeButClass, tooltip: '...remove audio file...<info context="gui audio input tooltip"/>'.I18xTrans() });
	if (_opts.hasOwnProperty("extraButtons")) h += _opts.extraButtons;
	h += '</div>';
	h += '</div>';
	switch (_opts.context) {
		case "panel":
		case "modal":
			return t + h;
		case "paneltable":
			return '<tr id="' + _id + '_inputField"><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
		default:
			return "";
	};
};
Panel.prototype.AudioInputValue = function (_id, _defValue) { return GUI.AudioInputValue(this, _id, _defValue); };
GUI.AudioInputValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementById(_id + '_audio');
	if (o) {
		return (o.src == "" || o.src == o.baseURI) ? "" : o.src;
	} else {
		return _defValue;
	};
};
Panel.prototype.AudioInputAudioName = function (_id, _defValue) { return GUI.AudioInputAudioName(this, _id, _defValue); };
GUI.AudioInputAudioName = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementById(_id + '_audio');
	if (o) {
		return o.name;
	} else {
		return _defValue;
	};
};
Panel.prototype.AudioInputSetValue = function (_id, _value) { return GUI.AudioInputSetValue(this, _id, _value); };
GUI.AudioInputSetValue = function (_panel, _id, _value) {
	var o = _panel.contentDiv.GetElementById(_id + "_audio");
	if (o) GUI.InputAudioLoad({}, _id, _value);
};
function MoveSC(_this) {
	var o = document.getElementById("pageHeader");
	if (o) o.appendChild(_this.nextSibling);
};
GUI.SoundCloudMiniPlayer = function (_trackId, _extraStyle) {
	var h = "", url, srcurl;
	if (_trackId == 0) return "";
	url = "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/" + _trackId + "&color=%230080ff&auto_play=" + IS_FIREFOX.asText() + "true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false";
	srcurl = url;
	if (CONF_GAMEMUSICVOLUME == 0 && IS_CHROME) srcurl = "";
	if (AlienPolicy()) {
		//h+='<img src="./skins/'+SKIN+'/imgs/empty.png" class="empty" onload="MoveSC(this);">';
		h += '<iframe id="soundcloudiframe" class="soundcloudplayer" style="' + _extraStyle + '" width="100%" height="20px" scrolling="no" src="' + srcurl + '" data-soundcloudurl="' + url.HtmlEntities() + '" frameborder="no"></iframe>';
	} else {
		h += '<div id="soundcloudiframe" onclick="AlienPolicy(AlienFree);" class="soundcloudpreview height20" name="AlienFreeSoundCloud" style="' + _extraStyle + '"" data-height="20" data-soundcloudurl="' + srcurl.HtmlEntities() + '"></div>';
	};
	//return "";
	return h;
};
GUI.SoundCloudReWork = function (_this) {
	var h = "";
	h += '<iframe id="' + _this.id + '" style="display:' + ((_this.dataset.soundcloudurl == "") ? 'none;' : 'block;') + '" onload="if(this.clientWidth==0)GUI.SoundCloudBug(this);" class="soundcloudplayer" width="100%" scrolling="no" src="' + _this.dataset.soundcloudurl + '" data-soundcloudurl="' + _this.dataset.soundcloudurl.HtmlEntities() + '"></iframe>';
	_this.outerHTML = h;
};
GUI.SoundCloudBug = function (_this) {
	var h = "";
	if (_this.nextSibling == null) return;
	if (_this.nextSibling.tagName != "IFRAME") return;
	if (_this.nextSibling.clientWidth == 0) {
		h += '<div id="' + _this.nextSibling.id + '" onclick="GUI.SoundCloudReWork(this);" class="soundcloudpreview height20" data-soundcloudurl="' + _this.nextSibling.dataset.soundcloudurl.HtmlEntities() + '"></div>';
	} else {
		_this.nextSibling.src = _this.nextSibling.dataset.soundcloudurl;
	};
	_this.nextSibling.outerHTML = h;
};
GUI.SoundCloudInputChanged = function (_ev, _this) {
	var iframe = _this.parentNode.GetElementById(_this.id + "_iframe"), trackNo, n, url;
	trackNo = parseInt(_this.value.trim(), 10);
	if (isNaN(trackNo) || _this.value.indexOf("/tracks/") > 0) trackNo = parseInt(_this.value.substr(_this.value.indexOf("/tracks/") + 8), 10);
	if (isNaN(trackNo) || trackNo == 0) {
		_this.value = 0;
		iframe.style.display = "none";
		if (iframe.tagName == "IFRAME") { iframe.src = ""; iframe.dataset.soundcloudurl = ""; };
		if (iframe.tagName == "DIV") iframe.dataset.soundcloudurl = "";
	} else {
		_this.value = trackNo;
		iframe.style.display = "block";
		if (iframe.dataset.height == 20) {
			url = "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/" + trackNo + "&color=%230080ff&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false";
		} else {
			url = "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/" + trackNo + "&color=%230080ff&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true";
		};
		if (iframe.tagName == "IFRAME") { iframe.src = url; iframe.dataset.soundcloudurl = url; };
		if (iframe.tagName == "DIV") iframe.dataset.soundcloudurl = url;
	};
	eval(_this.dataset.onchange);
};


GUI.SoundCloudInputHTML = function (_id, _title, _opts) {
	var t = "", h = "", trclass = "", height = 166, iframesrc = "", value = 0;
	if (!_opts.hasOwnProperty("context")) _opts.context = "panel";
	if (_opts.hasOwnProperty("height")) height = _opts.height;
	if (_opts.hasOwnProperty("value")) value = _opts.value;
	if (_title !== false) {
		if (_opts.context == "paneltable") _title = _title.wordWrap();
		t += '<div id="' + _id + '_title" class="title' + ((_opts.hasOwnProperty("inline") && _opts.inline) ? ' inline' : '') + '">' + _title.HtmlEntities() + '</div>';
	};
	h += '<div class="inputField' + ((_opts.hasOwnProperty("inline") && _opts.inline) ? ' inline' : '') + ((_opts.hasOwnProperty("full") && _opts.full) ? ' full' : '') + '">';
	h += '<input class="input" type="text" id="' + _id + '" class="input" data-onchange="' + (_opts.hasOwnProperty("onchange") ? _opts.onchange.HtmlEntities() : '') + '" onchange="GUI.SoundCloudInputChanged(event,this);" value="' + value.HtmlEntities() + '"/>';
	if (height == 20) {
		iframesrc = "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/" + value + "&color=%230080ff&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false";
	} else {
		iframesrc = "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/" + value + "&color=%230080ff&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true";
	};
	if (value == 0) iframesrc = "";
	if (AlienPolicy()) {
		h += '<img src="./skins/' + SKIN + '/imgs/empty.png" class="empty" onload="GUI.SoundCloudBug(this);">';
		h += '<iframe id="' + _id + '_iframe"  class="soundcloudplayer" style="display:' + ((iframesrc == "") ? "none" : "block") + ';" width="100%" data-height="' + height + '" height="' + height + 'px" scrolling="no" src="" data-soundcloudurl="' + iframesrc.HtmlEntities() + '" frameborder="no"></iframe>';
	} else {
		if (height == 20) {
			h += '<div id="' + _id + '_iframe" onclick="AlienPolicy(AlienFree);" style="display:' + ((iframesrc == "") ? "none" : "block") + ';" class="soundcloudpreview height20" name="AlienFreeSoundCloud" data-height="' + height + '" data-soundcloudurl="' + iframesrc.HtmlEntities() + '"></div>';
		} else {
			h += '<div id="' + _id + '_iframe" onclick="AlienPolicy(AlienFree);" style="display:' + ((iframesrc == "") ? "none" : "block") + ';" class="soundcloudpreview" name="AlienFreeSoundCloud" data-height="' + height + '" data-soundcloudurl="' + iframesrc.HtmlEntities() + '"></div>';
		};
	};
	//h+='<iframe width="100%" height="166" scrolling="no" frameborder="no" src="http://w.soundcloud.com/player/?url=http%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F{trackId}{widgetParams}"></iframe>';
	//h+='<iframe width="100%" height="300" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/396530439&color=%23ff5500&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false"></iframe>';
	h += '</div>';
	switch (_opts.context) {
		case "panel":
		case "modal":
			return t + h;
		case "paneltable":
			if (_opts.hasOwnProperty("trclass")) if (_opts.trclass != "") trclass = ' class="' + _opts.trclass + '"';
			return '<tr id="' + _id + '_inputField"' + trclass + '><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
		default:
			return "";
	};
};
Panel.prototype.SoundCloudInputValue = function (_id, _defValue) { return GUI.SoundCloudInputValue(this, _id, _defValue); };
GUI.SoundCloudInputValue = function (_panel, _id, _defValue) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) {
		return parseInt(o.value, 10);
	} else {
		return _defValue;
	};
};

GUI.ButtonBarsHTML = function (_buttonHTMLs, _opts) {
	var h = "", i, l;
	if (_opts === undefined) _opts = { context: "panel" };
	l = _buttonHTMLs.length;
	h += '<div ' + (_opts.hasOwnProperty("extraAttrs") ? _opts.extraAttrs + ' ' : '') + 'class="buttonbarcontainer' + ((_opts.hasOwnProperty("containerAlign")) ? ' ' + _opts.containerAlign : '') + ((_opts.hasOwnProperty("fullContainer")) ? ' full' : '') + '">'
	for (i = 0; i < l; i++) {
		h += '<div class="buttonbar' + ((_opts.hasOwnProperty("buttonsAligns")) ? ' ' + _opts.buttonsAligns[i] : '') + '">';
		h += _buttonHTMLs[i].join("");
		if (_opts.hasOwnProperty("texts")) if (_opts.texts[i] != "") h += '<div class="text">' + _opts.texts[i].HtmlEntities() + '</div>';
		h += '</div>';
	};
	h += '</div>';
	return h;
};
GUI.ButtonHTML = function (_id, _text, _icon, _callBackStr, _opts) {
	var t = "", h = "", contexts, tag = "div", data = "", style = "", butclass = "button", text = "";
	if (_icon === undefined) _icon = false;
	if (_callBackStr === undefined) _callBackStr = "";
	if (_opts === undefined) _opts = { context: "panel" };
	if (_opts.hasOwnProperty("context")) {
		contexts = _opts.context.split(" ");
		if (contexts.indexOf("header") >= 0) tag = "span";
	};
	if (_opts.hasOwnProperty("style")) data += ' style="' + _opts.style + '"';
	if (_opts.hasOwnProperty("data")) data += ' data-value="' + _opts.data.HtmlEntities() + '"';
	if (_opts.hasOwnProperty("oninput")) data += ' data-oninput="' + _opts.oninput.HtmlEntities() + '"';
	if (_opts.hasOwnProperty("butclass")) butclass = _opts.butclass;
	if (_opts.hasOwnProperty("butextraclass")) butclass += " " + _opts.butextraclass;
	if (_opts.hasOwnProperty("tableTitle")) t = _opts.tableTitle;
	text = ((_text !== false) ? _text.HtmlEntities() : '');
	if (text != "" && _icon != "") text = '<span class="buttonicontext">' + text + '</span>';
	h += '<' + tag + ' id="' + _id + '" ' + data + ' class="' + butclass + ((_icon !== false) ? ' ' + _icon : '') + ((_opts.hasOwnProperty("disabled") && _opts.disabled) ? ' disabled' : '') + ((style == "") ? '' : ' style="' + style + '"') + ((_opts.hasOwnProperty("sel") && _opts.disabled) ? ' sel' : '') + ((_opts.hasOwnProperty("align")) ? ' ' + _opts.align : '') + '"' + ((_opts.hasOwnProperty("tooltip")) ? ' title="' + _opts.tooltip.HtmlEntities() + '"' : '') + ((_callBackStr == "") ? "" : ButtonAttributes(_callBackStr)) + '>' + text + '</' + tag + '>';
	switch (_opts.context) {
		case "paneltable":
			return '<tr id="' + _id + '_inputField"><td class="formtitle">' + t + '</td><td class="forminput">' + h + '</td>';
	};
	return h;
};
Panel.prototype.ButtonSetAttributes = function (_id, _eventHandler) { GUI.ButtonSetAttributes(this, _id, _eventHandler); };
GUI.ButtonSetAttributes = function (_panel, _id, _eventHandler) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) ButtonAttributesToElement(o, _eventHandler);
};
Panel.prototype.ButtonSetSelected = function (_id, _selected) { GUI.ButtonSetSelected(this, _id, _selected); };
GUI.ButtonSetSelected = function (_panel, _id, _selected) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) o.className = o.className.boolClass("sel", _selected);
};
Panel.prototype.ButtonSelected = function (_id) { return GUI.ButtonGetSelected(this, _id); };
GUI.ButtonSelected = function (_panel, _id) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) return o.className.hasClass("sel");
	return false
};
Panel.prototype.ButtonSetEnabled = function (_id, _enabled) { GUI.ButtonSetEnabled(this, _id, _enabled); };
GUI.ButtonSetEnabled = function (_panel, _id, _enabled) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) o.className = o.className.boolClass("disabled", !_enabled);
};
Panel.prototype.ButtonEnabled = function (_id) { return GUI.ButtonEnabled(this, _id); };
GUI.ButtonEnabled = function (_panel, _id) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) return !o.className.hasClass("disabled");
	return false
};
Panel.prototype.ButtonSetHighlight = function (_id, _highlight) { GUI.ButtonSetHighlight(this, _id, _highlight); };
GUI.ButtonSetHighlight = function (_panel, _id, _highlight) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) o.className = o.className.boolClass("highlight", !_highlight);
};

Panel.prototype.ButtonSetVisible = function (_id, _visible) { return GUI.ButtonSetVisible(this, _id, _visible); };
GUI.ButtonSetVisible = function (_panel, _id, _visible) {
	var o = _panel.contentDiv.GetElementById(_id);
	if (o) o.className = o.className.boolClass("hidden", !_visible);
};

Panel.prototype.GetPanelOverlayHTML = function () {
	return '<div id="paneloverlay_' + this.id + '" class="paneloverlay hidden"></div>';
};
Panel.prototype.ShowOverlay = function () {
	var o = this.contentDiv.GetElementById('paneloverlay_' + this.id);
	if (o) o.className = o.className.removeClass("hidden");
};
Panel.prototype.HideOverlay = function () {
	var o = this.contentDiv.GetElementById('paneloverlay_' + this.id);
	if (o) o.className = o.className.addClass("hidden");
};
Panel.prototype.ShowWaitMessage = function (_text = "", _title = "", _withProgress = false) {
	var o = this.contentDiv.GetElementById('paneloverlay_' + this.id), h = "";
	if (o) {
		o.className = o.className.addClass("hidden");
		h += '<div class="panelwaitmessage">';
		if (_title != "") h += '<div class="title">' + _title.HtmlEntities() + '</div>';
		h += '<div class="ai white"></div>';
		if (_withProgress) {
			h += '<br/><br/><div id="progressbar_' + this.id + '" class=" progressbar off"><div id="progressbarinner_' + this.id + '" class="progressbarinner" data-source-text="" data-placeholders="{}" data-last-timestamp="' + NOW_TIMESTAMP() + '" data-start-timestamp="' + NOW_TIMESTAMP() + '" data-value="0" data-total="' + 0 + '"></div></div><br/>';
			h += '<div id="progressbartext_gui' + this.id + '" class="off"></div>';
		};
		if (_text != "") h += '<div id="panelwaitmessagetext_' + this.id + '" class="text">' + _text.HtmlEntities() + '</div>';
		h += '</div>';
		o.innerHTML = h;
	};
	this.ShowOverlay();
};

Panel.prototype.SetHdlDialogInputs = function (_ids, _hdlDialog) {
	GUI.SetHdlDialogInputs(this, _ids, _hdlDialog);
};
GUI.SetHdlDialogInputs = function (_panel, _ids, _hdlDialog) {
	var i, l = _ids.length, o;
	for (i = 0; i < l; i++) {
		o = _panel.GetElementById(_ids[i]);
		if (o) o.oninput = _hdlDialog;
	};
};

Panel.prototype.SetWrongInput = function (_id, _isWrong) {
	var ot = this.contentDiv.GetElementById(_id + "_title");
	if (ot) ot.className = ot.className.boolClass("wrong", _isWrong);
};
Panel.prototype.CheckInputs = function (_ids, _markWrong = true) {
	return GUI.CheckInputs(this, _ids, _markWrong);
};
GUI.CheckInputs = function (_panel, _ids, _markWrong = true) {
	var i, l = _ids.length, o, ret = true, check, c, res, ot;
	for (i = 0; i < l; i++) {
		o = _panel.contentDiv.GetElementById(_ids[i]);
		if (o) {
			if (o.dataset.hasOwnProperty("check")) {
				check = JSON.parse(o.dataset.check);
				for (c in check) {
					switch (c) {
						case "ipv46":
							res = REGEX_IPV46.test(o.value.trim());
							if (_markWrong) {
								ot = _panel.contentDiv.GetElementById(o.id + "_title");
								if (ot) ot.className = ot.className.boolClass("wrong", !res);
							};
							ret = ret && res;
							break;
						case "domain":
							res = REGEX_DOMAIN.test(o.value.trim());
							if (_markWrong) {
								ot = _panel.contentDiv.GetElementById(o.id + "_title");
								if (ot) ot.className = ot.className.boolClass("wrong", !res);
							};
							ret = ret && res;
							break;
						case "email":
							res = REGEX_EMAIL.test(o.value.trim());
							if (_markWrong) {
								ot = _panel.contentDiv.GetElementById(o.id + "_title");
								if (ot) ot.className = ot.className.boolClass("wrong", !res);
							};
							ret = ret && res;
							break;
						case "regex":
							res = (o.value.trim().exec(check[c]));
							if (_markWrong) {
								ot = _panel.contentDiv.GetElementById(o.id + "_title");
								if (ot) ot.className = ot.className.boolClass("wrong", !res);
							};
							ret = ret && res;
							break;
						case "notempty":
							res = (o.value.trim() != "");
							if (_markWrong) {
								ot = _panel.contentDiv.GetElementById(o.id + "_title");
								if (ot) ot.className = ot.className.boolClass("wrong", !res);
							};
							ret = ret && res;
							break;
					};
				};
			};
		};
	};
	return ret;
};


ENUMERATOR = 0;
GUI.MODALTYPE_WAITMESSAGE = ENUMERATOR++;
GUI.MODALTYPE_ALERT = ENUMERATOR++;
GUI.MODALTYPE_INFO = ENUMERATOR++;
GUI.MODALTYPE_CONFIRMATION = ENUMERATOR++;
GUI.MODALTYPE_PROGRESS = ENUMERATOR++;

function GUIModalPanelData(_type, _opts) {
	this.type = _type;
	this.title = _opts.title;
	this.text = _opts.text;
	this.buttons = _opts.buttons;
	this.eventHandler = _opts.eventHandler;
	this.minValue = _opts.minValue;
	this.maxValue = _opts.maxValue;
};

GUI.prototype.PerhapsReshowPreviousModalPanel = function () {
	var mpd;
	if (this.modalPanelData.length == 0) return;
	mpd = this.modalPanelData.pop();
	switch (mpd.type) {
		case GUI.MODALTYPE_WAITMESSAGE:
			break;
		case GUI.MODALTYPE_ALERT:
			this.ShowAlert(mpd.title, mpd.text, mpd.eventHandler);
			break;
		case GUI.MODALTYPE_INFO:
			this.ShowInfo(mpd.title, mpd.text, mpd.eventHandler);
			break;
		case GUI.MODALTYPE_CONFIRMATION:
			this.ShowConfirmation(mpd.title, mpd.text, mpd.buttons, mpd.eventHandler);
			break;
		case GUI.MODALTYPE_PROGRESS:
			break;
	};

};
GUI.prototype.RemoveModalContent = function () {
	var oo = document.getElementById("overlay"), om = document.getElementById("modalcontent");
	/*-- @<BUILD_ONLY_ON_BUILDS:Debug --*/
	//errlog("RemoveModalContent");
	/*-- @>BUILD_ONLY_ON_BUILDS --*/
	if (this.modalPanel != null) {
		if (this.modalPanel.eventHandler != null) this.modalPanel.eventHandler({ type: Panel.EVENTTYPE_WILLREMOVEDFROMDOM, panel: this.modalPanel });
		this.modalPanel = null;
		delete this.panels[this.id];
	};
	if (oo) oo.className = oo.className.addClass("hidden");
	if (om) {
		om.className = om.className.addClass("hidden");
		om.className = om.className.removeClass("wait");
		om.innerHTML = "";
	};
	this.modalMode = false;
};
GUI.prototype.ShowModalPanel = function (_panel, _asWait) {
	var om = document.getElementById("modalcontent");
	this.RemoveModalContent();
	if (_asWait === undefined) _asWait = false;
	this.modalPanel = _panel;
	this.modalMode = true;
	_panel.ShowAsModal();
	if (_asWait) om.className = om.className.addClass("wait");
};
GUI.WaitMessageHTMLfunction = function (_text, _title, _withProgress = false) {
	var h = "", id = "gui";
	h += '<div id="modalwaitmessage">';
	if (_title != "") h += '<div class="title">' + _title.HtmlEntities() + '</div>';
	h += '<div class="ai white"></div>';
	if (_withProgress) {
		h += '<br/><br/><div id="progressbar_gui" class=" progressbar off"><div id="progressbarinner_gui" class="progressbarinner" data-source-text="" data-placeholders="{}" data-last-timestamp="' + NOW_TIMESTAMP() + '" data-start-timestamp="' + NOW_TIMESTAMP() + '" data-value="0" data-total="' + 0 + '"></div></div><br/>';
		h += '<div id="progressbartext_gui" class="off"></div>';
	};
	if (_text != "") h += '<div id="waitmessagetext_gui" class="text">' + _text.HtmlEntities() + '</div>';
	h += '</div>';
	return h;
};
GUI.prototype.ShowWaitMessage = function (_text = "", _title = "", _withProgress = false) {
	var oo = document.getElementById("overlay"), om = document.getElementById("modalcontent"), h = "";
	if (this.modalPanel != null) this.RemoveModalContent();
	oo.className = oo.className.removeClass("hidden");
	om.className = om.className.removeClass("hidden");
	om.className = om.className.addClass("wait");
	h += GUI.WaitMessageHTMLfunction(_text, _title, _withProgress);
	om.innerHTML = h;
	this.modalMode = true;
};
GUI.prototype.ChangeWaitMessage = function (_text) {
	var o = document.getElementById("waitmessagetext_gui");
	if (o) o.innerHTML = _text.HtmlEntities();
};

GUI.progressBarIntervals = {}
GUI.progressBarText = "";
GUI.ProgressBarInterval = function (_id) {
	var ob = document.getElementById("progressbar_" + _id), ot = o = document.getElementById("progressbartext_" + _id), obi = document.getElementById("progressbarinner_" + _id);
	var duration = 0, timePerValue;
	if (ob) if (obi) if (ot) {
		//log("obi.dataset.placeholders",obi.dataset.placeholders);
		if (obi.dataset.total > 1 && obi.dataset.value > 0) {
			timePerValue = ((obi.dataset.lastTimestamp - obi.dataset.startTimestamp) / obi.dataset.value);
			duration = timePerValue * (obi.dataset.total - obi.dataset.value);
			duration -= NOW_TIMESTAMP() - obi.dataset.lastTimestamp;
			duration = Math.round(duration / 1000) * 1000;
			//log("duration",duration);
		};
		ot.innerHTML = obi.dataset.sourceText.I18xTrans(ObjMerge(JSON.parse(obi.dataset.placeholders), { done: obi.dataset.value, total: obi.dataset.total, duration: duration })).HtmlEntities();
	} else {
		if (GUI.progressBarIntervals.hasOwnProperty(_id)) {
			clearInterval(GUI.progressBarIntervals[_id]);
			GUI.progressBarIntervals[_id] = null;
		};
	};
};
GUI.UpdateProgressBar = function (_id, _value, _text, _total, _placeholders) {
	var ob = document.getElementById("progressbar_" + _id);
	var obi = document.getElementById("progressbarinner_" + _id);
	var ot = document.getElementById("progressbartext_" + _id);
	var installInterval = true, startTimestamp, nowTimestamp;
	var duration = 0, timePerValue;
	if (obi) {
		if (_total === undefined) {
			_total = parseFloat(obi.dataset.total);
		} else {
			obi.dataset.total = _total;
		};
		if (_total > 1 && _value > 1) {
			startTimestamp = obi.dataset.startTimestamp;
			obi.dataset.lastTimestamp = NOW_TIMESTAMP();
			nowTimestamp = obi.dataset.lastTimestamp;
			obi.dataset.total = _total;
			obi.dataset.value = _value;
			timePerValue = ((nowTimestamp - startTimestamp) / _value);
			duration = timePerValue * (_total - _value);
			duration = Math.round(duration / 1000) * 1000;
		};
	};
	if (_text !== undefined) {
		if (ot) {
			if (typeof (_placeholders) === UNDEFINED) {
				ot.innerHTML = _text.HtmlEntities();
			} else {
				ot.innerHTML = _text.I18xTrans(ObjMerge(_placeholders, { done: _value, total: _total, duration: duration })).HtmlEntities();
			};
			if (_text.trim() == "") {
				ot.className = ot.className.exchangeClass("on", "off");
			} else {
				ot.className = ot.className.exchangeClass("off", "on");
			};
		};
	} else {
		_text = "";
	};
	if (typeof (_placeholders) == UNDEFINED) { installInterval = false; _placeholders = {}; };
	if (ob) if (obi) {
		obi.dataset.sourceText = _text;
		obi.dataset.placeholders = JSON.stringify(_placeholders);
		if (_total == 0) {
			ob.className = ob.className.exchangeClass("on", "off");
		} else {
			ob.className = ob.className.exchangeClass("off", "on");
			obi.style.width = (Math.min(100, Math.max(_value / _total * 100, 0))) + "%";
			if (installInterval) if (GUI.progressBarIntervals[_id] == null) GUI.progressBarIntervals[_id] = setInterval(GUI.ProgressBarInterval, 1000);
		};
	};
};

GUI.ConfirmationPanelIds = 0;
GUI.prototype.ShowConfirmation = function (_title, _text, _buttons, _eventHandler = NOFUNCTION, _opts = {}) {
	var oo = document.getElementById("overlay"), om = document.getElementById("modalcontent"), h = "", confirmationPanel, self = this, txt, extraButtonCall = NOFUNCTION, extraButton = null;
	if (this.modalPanel != null) this.RemoveModalContent();
	this.ConfirmationPanelEventHandler = _eventHandler;
	oo.className = oo.className.removeClass("hidden");
	om.className = om.className.removeClass("hidden");

	function HdlButton(_ev, _this) {
		switch (_this.id) {
			case "modalCancelButton":
				PlaySound("no");
				break;
			case "modalOkButton":
				PlaySound("ok");
				break;
			case "modalNoButton":
				PlaySound("no");
				break;
			case "modalYesButton":
				PlaySound("yes");
				break;
			case "modalDiscardButton":
				PlaySound("no");
				break;
			case "modalSaveButton":
				PlaySound("yes");
				break;
			case "modalExtraButton":
				PlaySound("yes");
				extraButtonCall();
				return;
				break;

		};
		self.RemoveModalContent();
		self.modalPanelData.pop();
		_eventHandler({ button: GUI.ModalButtonIds[_this.id] });
		self.PerhapsReshowPreviousModalPanel();
	};

	function HdlConfirmationPanel(_ev) {
		var o;
		switch (_ev.type) {
			case Panel.EVENTTYPE_APPEARSINDOM:
				PlaySound("confirm");
				GUI.ModalButtonEventsSetUp(self, HdlButton);
				break;
			case Panel.EVENTTYPE_WILLREMOVEDFROMDOM:
				break;
		};
	};

	if (_opts.extraButton !== undefined) {
		extraButton = _opts.extraButton.text;
		extraButtonCall = _opts.extraButton.call;
	};
	this.modalPanelData.push(new GUIModalPanelData(GUI.MODALTYPE_CONFIRMATION, { title: _title, text: _text, buttons: _buttons, eventHandler: _eventHandler }));
	if (this.modalPanel != null) this.RemoveModalContent();
	GUI.ConfirmationPanelIds++;
	confirmationPanel = new Panel("confirmation_" + GUI.ConfirmationPanelIds, _title, Panel.TYPE_MODAL, HdlConfirmationPanel);
	h += '<div class="header">' + _title.HtmlEntities() + '</div>';
	h += '<div class="confirmation">';
	if (i18x.IsHTML(_text)) {
		txt = _text.I18xTrans();
	} else {
		txt = _text.HtmlEntities();
	};
	h += '<div class="text"' + ((_opts.textExtraStyle === undefined) ? "" : ' style="' + _opts.textExtraStyle + '"') + '>' + txt + '</div>';
	h += '</div>';
	h += GUI.ModalButtonsHTML(_buttons, NOFUNCTION, extraButton);
	confirmationPanel.contentDiv.innerHTML = h;
	this.ShowModalPanel(confirmationPanel);
};

GUI.AlertPanelIds = 0;
GUI.prototype.ShowAlert = function (_title, _text, _eventHandler) {
	var h = "", oo = document.getElementById("overlay"), om = document.getElementById("modalcontent"), alertPanel, self = this, smartscroll = null;

	function HdlButton(_ev, _this) {
		PlaySound("ok");
		self.RemoveModalContent();
		self.modalPanelData.pop();
		if (_eventHandler != null) _eventHandler({ button: GUI.ModalButtonIds[_this.id] });
		self.PerhapsReshowPreviousModalPanel();
	};

	function HdlAlertPanel(_ev) {
		var o;
		switch (_ev.type) {
			case Panel.EVENTTYPE_APPEARSINDOM:
				GUI.ModalButtonEventsSetUp(self, HdlButton);
				break;
			case Panel.EVENTTYPE_WILLREMOVEDFROMDOM:
				smartscroll = alertPanel.RemoveScrollArea(smartscroll);
				break;
			case Panel.EVENTTYPE_SIZECHANGED:
				setTimeout(UpdateUpScrollArea, 1000);
				smartscroll = alertPanel.SetUpScrollArea(smartscroll, "scrollarea", true, "80vh");
				break;
		};
	};

	function UpdateUpScrollArea() {
		smartscroll = alertPanel.SetUpScrollArea(smartscroll, "scrollarea", true, "80vh");
	};

	errlog("ALERT:", _title, _text);
	this.modalPanelData.push(new GUIModalPanelData(GUI.MODALTYPE_ALERT, { title: _title, text: _text, eventHandler: _eventHandler }));
	if (this.modalPanel != null) this.RemoveModalContent();
	GUI.AlertPanelIds++;
	alertPanel = new Panel("alert_" + GUI.AlertPanelIds, _title, Panel.TYPE_MODAL, HdlAlertPanel);
	h += '<div class="header alert">' + _title.HtmlEntities() + '</div>';
	h += '<div class="alert">';
	h += '<div class="icon"></div>';
	h += '<div class="text scrollArea" id="scrollarea">' + _text.HtmlEntities() + '</div>';
	h += '</div>';
	h += GUI.ModalButtonsHTML(GUI.MODALBUTTONSET_ONLYOK, curGUI.RemoveModalContent);
	alertPanel.contentDiv.innerHTML = h;
	this.ShowModalPanel(alertPanel);
	PlaySound("error");
};

GUI.InfoPanelIds = 0;
GUI.prototype.ShowInfo = function (_title, _text, _eventHandler = null, _isHTMLText = false, _opts = {}) {
	var h = "", oo = document.getElementById("overlay"), om = document.getElementById("modalcontent"), infoPanel, self = this, smartscroll = null, extraButtonCall = NOFUNCTION, extraButton = null;

	function HdlButton(_ev, _this) {
		switch (_this.id) {
			case "modalOkButton":
				PlaySound("ok");
				break;
			case "modalExtraButton":
				PlaySound("yes");
				extraButtonCall();
				return;
				break;
		};
		self.RemoveModalContent();
		self.modalPanelData.pop();
		if (_eventHandler !== null) _eventHandler({ button: GUI.ModalButtonIds[_this.id] });
		self.PerhapsReshowPreviousModalPanel();
	};

	function HdlInfoPanel(_ev) {
		var o;
		switch (_ev.type) {
			case Panel.EVENTTYPE_APPEARSINDOM:
				GUI.ModalButtonEventsSetUp(self, HdlButton);
				break;
			case Panel.EVENTTYPE_WILLREMOVEDFROMDOM:
				smartscroll = infoPanel.RemoveScrollArea(smartscroll);
				break;
			case Panel.EVENTTYPE_SIZECHANGED:
				setTimeout(UpdateUpScrollArea, 1000);
				smartscroll = infoPanel.SetUpScrollArea(smartscroll, "scrollarea", true, "80vh");
				break;
		};
	};

	function UpdateUpScrollArea() {
		smartscroll = infoPanel.SetUpScrollArea(smartscroll, "scrollarea", true, "80vh");
	};

	if (_opts.extraButton !== undefined) {
		extraButton = _opts.extraButton.text;
		extraButtonCall = _opts.extraButton.call;
	};
	//log("ShowInfo:",_title,_text);
	this.modalPanelData.push(new GUIModalPanelData(GUI.MODALTYPE_INFO, { title: _title, text: _text, eventHandler: _eventHandler, isHTMLText: _isHTMLText }));
	if (this.modalPanel != null) this.RemoveModalContent();
	GUI.InfoPanelIds++;
	infoPanel = new Panel("info_" + GUI.InfoPanelIds, _title, Panel.TYPE_MODAL, HdlInfoPanel);
	h += '<div class="header">' + _title.HtmlEntities() + '</div>';
	h += '<div class="info">';
	h += '<div class="icon"></div>';
	h += '<div class="text scrollArea" id="scrollarea">' + (_isHTMLText ? _text : _text.HtmlEntities()) + '</div>';
	h += '</div>';
	h += GUI.ModalButtonsHTML(GUI.MODALBUTTONSET_ONLYOK, curGUI.RemoveModalContent, extraButton);
	infoPanel.contentDiv.innerHTML = h;
	this.ShowModalPanel(infoPanel);
	PlaySound("confirm");
};

GUI.SlideShowImageError = function () {
};
GUI.prototype.OverlaySlideShow = function (_title, _imageList, _opts = {}) {
	var oo = document.getElementById("overlay"), om = document.getElementById("modalcontent"), h = "", images;
	var pageNo, noOfPages = 0;

	if (this.modalPanel != null) this.RemoveModalContent();
	oo.className = oo.className.removeClass("hidden");
	om.className = om.className.removeClass("hidden");
	om.className = om.className.addClass("wait");
	if (_opts == {}) _opts = SYSTEM_SMARTSCROLL_STD_DOCUMENT;

	h += '<div id="slideshow" class="slideshowimages" ';
	h += ' data-doctitle="';
	//h+="Test Image <no/>".I18xTrans({no:1}).HtmlEntities();
	h += '">';
	images = _imageList.images;
	noOfPages = images.length;
	for (pageNo = 0; pageNo < noOfPages; pageNo++) {
		h += '<img style="display:none;width:' + images[pageNo].width + 'px;height:' + images[pageNo].height + 'px;" id="slideshowimage_' + pageNo + '" class="slideshowimage loading"';
		if (pageNo == 0) {
			h += ' src="' + images[pageNo].url + '"';
		} else {
			h += ' data-src="' + images[pageNo].url + '"';
		};
		h += ' data-imgtitle="' + images[pageNo].title.HtmlEntities() + '" data-thumbnail-src="' + images[pageNo].thumbnailUrl + '" data-thumbnail-width="' + images[pageNo].thumbnailWidth + '" data-thumbnail-height="' + images[pageNo].thumbnailHeight + '" onload="';
		h += 'this.className=this.className.removeClass(\'loading\');';
		//if(pageNo==_opts.startPageNo)h+=AutoSmartScrollHTMLOnLoadJS("slideshow",_opts);
		if (pageNo == 0) h += AutoSmartScrollHTMLOnLoadJS("slideshow", _opts);
		h += '" onerror="GUI.SlideShowImageError();" ';
		h += '/>';
	};
	h += '</div>';
	h += GUI.ButtonHTML("slideshowcloser", false, 'icon-cancel-circle', "curGUI.RemoveModalContent()", { butclass: "button bigicon modalcloser", tooltip: '...close image view...<info context="player gui button"/>'.I18xTrans() });

	om.innerHTML = h;
	this.modalMode = true;
};

GUI.prototype.ProgressPanel = function (_title, _startText, _minValue, _maxValue) {
};
GUI.prototype.ChangeProgressText = function (_text) {
};
GUI.prototype.ChangeProgressValue = function (_value) {
};
GUI.prototype.ChangeProgressMaxValue = function (_maxValue) {
};


