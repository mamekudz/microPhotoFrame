import i18x from "./microLib/i18x.mjs";

export const APP_LIDS = {
	"en-US": "English",
	"de-DE": "Deutsch",
	"zh-CN": "中文"
};

const STORAGE_KEY = "microPhotoFrame_lid";

function installLid(lid, map) {
	i18x.i18xs[lid] = map || {};
	i18x.templates[lid] = i18x.templates[lid] || {};
	i18x.i18xExpressions[lid] = i18x.i18xExpressions[lid] || {};
}

/** i18x.trans ignores undefined lid; always pass curLid. */
export function t(text, placeholders) {
	return String(text || "").I18xTrans(placeholders || {}, i18x.curLid);
}

export function resolveLid(wanted) {
	if (!wanted || wanted === "auto") {
		const nav = String(navigator.language || "en-US").replace("_", "-");
		if (APP_LIDS[nav]) return nav;
		const lang = nav.split("-")[0].toLowerCase();
		if (lang === "de") return "de-DE";
		if (lang === "zh") return "zh-CN";
		return "en-US";
	}
	return APP_LIDS[wanted] ? wanted : "en-US";
}

export function applyDom() {
	document.documentElement.lang = i18x.curLid;
	document.querySelectorAll("[data-i18n]").forEach((el) => {
		const key = el.getAttribute("data-i18n");
		if (key) el.textContent = t(key);
	});
	document.querySelectorAll("[data-i18n-html]").forEach((el) => {
		const key = el.getAttribute("data-i18n-html");
		if (key) el.innerHTML = t(key);
	});
	document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
		const key = el.getAttribute("data-i18n-placeholder");
		if (key) el.placeholder = t(key);
	});
	document.querySelectorAll("[data-i18n-title]").forEach((el) => {
		const key = el.getAttribute("data-i18n-title");
		if (key) el.title = t(key);
	});
	const sel = document.getElementById("appLid");
	if (sel) {
		const stored = localStorage.getItem(STORAGE_KEY) || "auto";
		sel.value = (stored === "auto" || APP_LIDS[stored]) ? stored : "auto";
	}
}

export function setLid(lid, persist = true) {
	const stored = (!lid || lid === "auto") ? "auto" : lid;
	i18x.curLid = resolveLid(stored);
	if (persist) localStorage.setItem(STORAGE_KEY, stored);
	applyDom();
	window.dispatchEvent(new CustomEvent("i18n-changed", { detail: i18x.curLid }));
	return i18x.curLid;
}

export async function initI18n() {
	i18x.activated = true;
	i18x.availableLids = { ...APP_LIDS };
	installLid("en-US", {});
	const loads = ["de-DE", "zh-CN"].map(async (lid) => {
		try {
			const res = await fetch(`./i18x/app/${lid}.json`, { cache: "no-store" });
			installLid(lid, res.ok ? await res.json() : {});
		} catch {
			installLid(lid, {});
		}
	});
	await Promise.all(loads);
	const saved = localStorage.getItem(STORAGE_KEY) || "auto";
	i18x.curLid = resolveLid(saved);
	applyDom();
	return i18x.curLid;
}

export { i18x };
