

import { i18x } from './i18x.mjs';
import { System } from './System.mjs';
import { User } from './User.mjs';
import { Utils } from './Utils.mjs';


// Globals from original file, now scoped to the module
let EFFECTLAYER = document.getElementById("effectlayer");
let GUIS = {};
let curGUI = null, lastGUI = null;
let ENUMERATOR = 0;

// Assuming these are globally available or will be imported from a utils file
// PlaySound, ButtonAttributes, AbsPositionOfElement, SetOuterHTML, ObjIsEmpty,
// ObjCopySimple, ObjFirstKey, ObjInsertFirstProperty, ObjCount, GetCSSPropertyOfClass,
// ImgLoadHTML, REGEX_IPV46, REGEX_DOMAIN, REGEX_EMAIL, NOW_TIMESTAMP,
// SKIN, SYSTEM_SMARTSCROLL_STD_VERTICAL, SmartScroll, CONF_GAMEMUSICVOLUME,
// curUser, NLIDS, µTESUP, NOFUNCTION, AlienPolicy, AlienFree
// These will need to be resolved for the module to work correctly.

// Helper functions from the original file
function DisributeText(_text) {
	let i, ret = '<div class="disttext">';
	for (i = 0; i < _text.length; i++) {
		ret += '<div class="char">' + _text[i].HtmlEntities() + '</div>';
	};
	ret += '</div>';
	return ret;
};

function MoveSC(_this) {
	let o = document.getElementById("pageHeader");
	if (o) o.appendChild(_this.nextSibling);
};

function ResizeViewPort(_ev, _callAfterWSEvent = false) {
	let p, pp, o;
	if (curGUI != null) {
		curGUI.Resize();
		if (curGUI.extraResizeEvent != null) curGUI.extraResizeEvent(_ev);
		for (pp in curGUI.panels) {
			p = curGUI.panels[pp];
			if (p.visible) {
				if (!p.isFolded) {
					if (p.type <= Panel.TYPE_PALETTE) {
						o = document.getElementById("panel_" + p.id);
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


export class GUIParticles {
    static RUNMODE_POINT = ENUMERATOR++;
    static RUNMODE_RNDRADIAL = ENUMERATOR++;

    constructor(_particleClassName, _params) {
        this.divs = [];
        this.particleClassName = _particleClassName;
        this.runMode = _params.hasOwnProperty("runMode") ? _params.runMode : GUIParticles.RUNMODE_RNDRADIAL;
        this.maxNoOfParticles = _params.hasOwnProperty("maxNoOfParticles") ? _params.maxNoOfParticles : 20;
        this.minDuration = _params.hasOwnProperty("minDuration") ? _params.minDuration : -1;
        this.maxDuration = _params.hasOwnProperty("maxDuration") ? _params.maxDuration : -1;
        this.minRadius = Math.sqrt(_params.hasOwnProperty("minRadius") ? _params.minRadius : 10);
        this.maxRadius = Math.sqrt(_params.hasOwnProperty("maxRadius") ? _params.maxRadius : 80);

        this.Init();
    }

    Init() {
        let i, o;
        for (i = 0; i < this.maxNoOfParticles; i++) {
            o = document.createElement("div");
            o.className = this.particleClassName + " hidden";
            o.dataset.no = i;
            o.dataset.particleClassName = this.particleClassName;
            o.dataset.used = 0;
            o.addEventListener("animationend", GUIParticles.AnimationEnd, { capture: false, passive: false });
            this.divs.push(o);
        };
    }

    static AnimationEnd(_ev) {
        let o = _ev.target, b = EFFECTLAYER;
        o.className = o.dataset.particleClassName + " hidden";
        o.dataset.used = 0;
        b.removeChild(o);
    }

    Run(_ev) {
        let i, l = this.divs.length, o = null, b = EFFECTLAYER;
        for (i = 0; i < l; i++) if (this.divs[i].dataset.used == 0) { o = this.divs[i]; break; };
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
    }
}

export class Menu {
    static TYPE_FUNC = ENUMERATOR++;
    static TYPE_TOGGLE = ENUMERATOR++;
    static TYPE_SEPARATION = ENUMERATOR++;
    static GeneralActiveByMouseDown = false;
    static lastVisibleMenuDiv = null;
    static GeneralDummyMouseOver = false;


    constructor(_id, _title, _key, _func, _type, _iconClass) {
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
    }

    Call() {
        let oldtog, o;
        if (this.func != null && this.enabled && this.visible) {
            if (this.type == Menu.TYPE_TOGGLE) {
                oldtog = this.toggle;
                if (this.doAutoToggle) this.toggle = !this.toggle;
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
            };
        };
        return this.func != null && this.enabled && this.visible;
    }

    Add(_menu) {
        if (this.subs == null) this.subs = [];
        this.subs.push(_menu);
        return _menu;
    }
    RemoveSubMenus(_menu) {
        let o;
        this.subs = null;
        o = document.getElementById(this.fullId);
        if (o) o.innerHTML = "";
    }
    static Find(_menuId) {
        if (curGUI != null) {
            return curGUI.menus['menu_' + curGUI.id + "_" + _menuId];
        } else {
            return null;
        };
    }

    static OnMouseUp(_ev, _fullId) {
        let gui, menu, comp = _fullId.split("_"), div = document.getElementById(_fullId), subdiv = document.getElementById(_fullId + "_submenus");
        PlaySound("button_up");
        gui = GUIS[comp[1]];
        menu = gui.menus[_fullId];
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
    }

    static OnDummyMouseOver(_ev) {
        PlaySound("button_up");
        Menu.GeneralDummyMouseOver = true;
    }

    static OnMouseOver(_ev, _fullId) {
        let gui, menu, comp = _fullId.split("_"), div = document.getElementById(_fullId), subdiv = document.getElementById(_fullId + "_submenus");
        Menu.GeneralDummyMouseOver = false;
        gui = GUIS[comp[1]];
        menu = gui.menus[_fullId];
        if (subdiv) if (menu.level > 1 || Menu.GeneralActiveByMouseDown) {
            if (Menu.lastVisibleMenuDiv != null) Menu.lastVisibleMenuDiv.className = Menu.lastVisibleMenuDiv.className.addClass("hidden");
            Menu.lastVisibleMenuDiv = subdiv;
            subdiv.className = subdiv.className.removeClass("hidden");
        };
    }

    static OnMouseDown(_ev, _fullId) {
        let gui, menu, comp = _fullId.split("_"), parentMenu, div = document.getElementById(_fullId), subdiv = document.getElementById(_fullId + "_submenus");
        Menu.GeneralDummyMouseOver = false;
        PlaySound("button_down");
        if (System.IS_SAFARI) _ev.buttons = _ev.which;
        if ((_ev.buttons & 1) == 0) return;
        gui = GUIS[comp[1]];
        menu = gui.menus[_fullId];
        parentMenu = gui.menus[_ev.target.parentNode.id];
        if (menu.level == 1) Menu.GeneralActiveByMouseDown = true;
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
    }

    static OnMouseLeave(_ev, _fullId) {
        let gui, menu, comp = _fullId.split("_"), div = document.getElementById(_fullId), subdiv = document.getElementById(_fullId + "_submenus");
        gui = GUIS[comp[1]];
        menu = gui.menus[_fullId];
        Menu.GeneralActiveByMouseDown = false;
        if (menu.level > 1) Menu.GeneralActiveByMouseDown = false;
        if (!Menu.GeneralDummyMouseOver) if (subdiv) {
            if (Menu.lastVisibleMenuDiv != null) Menu.lastVisibleMenuDiv.className = Menu.lastVisibleMenuDiv.className.addClass("hidden");
            Menu.lastVisibleMenuDiv = null;
            subdiv.className = subdiv.className.addClass("hidden");
        };
        Menu.GeneralDummyMouseOver = false;
    }

    SetUpPanelMenuReferences(_gui) {
        let pi = this.id.split("_"), i;
        if (this.func == Panel.MenuHandler) {
            this.doAutoToggle = true;
            if (_gui.panels[pi[1]]) {
                _gui.panels[pi[1]].menu = this;
            };
        };
        if (this.subs != null) for (i = 0; i < this.subs.length; i++)this.subs[i].SetUpPanelMenuReferences(_gui);
    }

    HTML(_level, _gui, _parentMenu) {
        let h = "", i, l, attrStr = "", keyInfoStr = "", iconStr = '<span class="icon"></span>';
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
            attrStr += ' onmouseup="Menu.OnMouseUp(event,\'" + this.fullId + "\');" ';
        } else {
            attrStr += ' onmouseup="Menu.OnDummyMouseOver(event);" ';
        };
        attrStr += ' id="' + this.fullId + '" onmousedown="Menu.OnMouseDown(event,\'" + this.fullId + "\');" onmouseover="Menu.OnMouseOver(event,\'" + this.fullId + "\');" onmouseleave="Menu.OnMouseLeave(event,\'" + this.fullId + "\');" ';
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
                        h += '<div' + attrStr + 'class="normmenu' + ((this.visible) ? '' : ' hidden') + ((this.enabled) ? '' : ' disabled') + '">' + iconStr + '<span class="title" id="menutitle_' + this.id + '">' + this.title.I18xTrans(this.titlePlaceholders).HtmlEntities() + '</span>';
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
                break;
        };
        return h;
    }

    SetEnable(_enabled) {
        let o;
        if (_enabled != this.enabled) {
            this.enabled = _enabled;
            o = document.getElementById(this.fullId);
            if (o) o.className = _enabled ? o.className.removeClass("disabled") : o.className.addClass("disabled");
        };
    }

    SetVisible(_visible) {
        let o;
        if (_visible != this.visible) {
            this.visible = _visible;
            o = document.getElementById(this.fullId);
            if (o) o.className = _visible ? o.className.removeClass("hidden") : o.className.addClass("hidden");
        };
    }

    SetToggle(_toggle) {
        let o;
        if (_toggle != this.toggle) {
            o = document.getElementById("menuicon_" + this.id);
            this.toggle = _toggle;
            if (o) {
                if (this.iconClass == "") {
                    o.innerHTML = (this.toggle ? '•' : '');
                } else {
                    o.className = o.className.boolClass("notsel", !this.toggle);
                };
            };
        };
    }

    SwitchToggle() {
        this.SetToggle(!this.toggle);
    }

    ChangeTitle(_title, _menuPlaceHolders) {
        let o, ot = this.title, op = this.titlePlaceholders;
        if (_title != undefined) this.title = _title;
        if (_menuPlaceHolders === undefined) _menuPlaceHolders = {};
        this.titlePlaceholders = _menuPlaceHolders;
        if (_title != ot || this.titlePlaceholders != op) {
            o = document.getElementById("menutitle_" + this.id);
            if (o) o.innerHTML = this.title.I18xTrans(this.titlePlaceholders).HtmlEntities();
        };
    }
}
// more classes to follow
// ...
