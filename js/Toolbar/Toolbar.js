define([
    "dojo/Evented", "dijit/_WidgetBase", "dijit/_TemplatedMixin", 
    "dojo/text!application/Toolbar/Templates/Toolbar.html",
    "dojo/_base/declare", "dojo/_base/window", "dojo/_base/fx",
    "dojo/_base/html", "dojo/_base/lang", "dojo/has", "dojo/dom",
    "dojo/dom-class", "dojo/dom-style", "dojo/dom-attr", "dojo/dom-construct", "dojo/dom-geometry",
    "dojo/on", "dojo/mouse", "dojo/query", "dojo/Deferred"], function (
Evented, _WidgetBase, _TemplatedMixin, 
toolbarTemplate,
declare, win, fx, html, lang, has, dom,
domClass, domStyle, domAttr, domConstruct, domGeometry,
on, mouse, query, Deferred) {
    return declare("esri.dijit.Toolbar", [_WidgetBase, _TemplatedMixin, Evented], {
        map: null,
        tools: [],
        toollist: [],
        curTool: -1,
        scrollTimer: null,
        config: {},
        pPages: null,

        templateString: toolbarTemplate,

        constructor: function (config, srcRefNode) {
            this.config = config;
            this.domNode = srcRefNode;
        },

        startup: function () {
            const deferred = this._init();
            deferred.then(
                lang.hitch(this, function (config) {
                    // optional ready event to listen to
                    this.emit("ready", config);
                }),
                lang.hitch(this, function (error) {
                    // optional error event to listen to
                    this.emit("error", error);
                })
            );
            domAttr.remove(this.domNode, 'title'); // ?!
            return deferred;
        },

        _init: function () {
            //Don't need deferred now setting it up just in case
            const deferred = new Deferred();
            on(window, "scroll", lang.hitch(this, this._windowScrolled));
            on(window, "resize", lang.hitch(this, this._windowScrolled));
            // this.pTools = dom.byId("panelTools");

            this.pPages = dom.byId("panelPages");
            //Prevent body scroll when scrolling to the end of the panel content
            on(this.pPages, mouse.enter, lang.hitch(this, function () {

                if (this._hasScrollbar()) {
                    var p = dom.byId("panelPages");
                    if (p) {
                        domClass.add(p, "modal-scrollbar");
                    }
                }
                domStyle.set(win.body(), "overflow", "hidden");

            }));
            on(this.pPages, mouse.leave, lang.hitch(this, function () {
                if (this._hasScrollbar === false) {
                    var p = dom.byId("panelPages");
                    if (p) {
                        domClass.remove(p, "modal-scrollbar");
                    }
                    domStyle.set(win.body(), "overflow-y", "auto");
                }


            }));
            deferred.resolve();

            return deferred.promise;
        },

        _hasScrollbar: function () {
            // The Modern solution
            if (typeof window.innerWidth === 'number') return window.innerWidth > document.documentElement.clientWidth;

            // rootElem for quirksmode
            var rootElem = document.documentElement || document.body;

            // Check overflow style property on body for fauxscrollbars
            var overflowStyle;

            if (typeof rootElem.currentStyle !== 'undefined') overflowStyle = rootElem.currentStyle.overflow;

            overflowStyle = overflowStyle || window.getComputedStyle(rootElem, '').overflow;

            // Also need to check the Y axis overflow
            var overflowYStyle;

            if (typeof rootElem.currentStyle !== 'undefined') overflowYStyle = rootElem.currentStyle.overflowY;

            overflowYStyle = overflowYStyle || window.getComputedStyle(rootElem, '').overflowY;

            var contentOverflows = rootElem.scrollHeight > rootElem.clientHeight;
            var overflowShown = /^(visible|auto)$/.test(overflowStyle) || /^(visible|auto)$/.test(overflowYStyle);
            var alwaysShowScroll = overflowStyle === 'scroll' || overflowYStyle === 'scroll';

            return (contentOverflows && overflowShown) || (alwaysShowScroll);
        },

        //Create a tool and return the div where you can place content
        createTool: function (tool, panelClass, loaderImg, badgeEvName) {
            const name = tool.name;

            // add tool
            const refNode = this.domNode;
            const tip = this.config.i18n.tooltips[name] || name;
            const panelTool = domConstruct.create("div", {
                className: "panelTool",
                id: "toolButton_" + name,
                autofocus: true,
                // tabindex: -1,
                tabindex: 0,
                "aria-label": tip,
                'data-tip': tip,
            }, refNode);
            const pTool = domConstruct.create("input", {
                type: "image",
                src: "images/icons_" + this.config.icons + "/" + name + ".png",
                // title: tip,
                tabindex:-1,
                alt: tip
            }, panelTool);

            on(panelTool, "keypress", lang.hitch(this, this._toolKeyPress));

            if(badgeEvName && badgeEvName !== '') {
                const setIndicator = domConstruct.create("img", {
                    src:"images/"+badgeEvName+".png",
                    class:"setIndicator",
                    style:"display:none;",
                    tabindex:0,
                    id: 'badge_'+badgeEvName,
                    alt:""
                });
                domConstruct.place(setIndicator, panelTool);
            }

            on(pTool, "click", lang.hitch(this, this._toolClick, name));
            this.tools.push(name);

            // add page
            const page = domConstruct.create("div", {
                className: "page hideAttr",
                id: "page_" + name,
                // tabindex: 0
            }, this.pPages);

            const pageContent = domConstruct.create("div", {
                className: "pageContent",
                id: "pageContent_" + name,
                role: "dialog",
                "aria-labelledby": "pagetitle_" + name,
            }, page);

            const pageHeader = domConstruct.create("div", {
                id: "pageHeader_" + name,
                className: "pageHeader fc bg",
                //tabindex: 0,
            },
            pageContent);

            domConstruct.create("h2", {
                className: "pageTitle fc",
                innerHTML: this.config.i18n.tooltips[name] || name,
                //style: 'display:inline',
                id: "pagetitle_" + name
            }, pageHeader);

            if(loaderImg && loaderImg !=="") {
                domConstruct.create('img',{
                    src: 'images/'+loaderImg,//reload1.gif',
                    alt: 'Reloading',
                    title: 'Reloading'
                }, domConstruct.create("div", {
                    id: "loading_" + name,
                    class: 'hideLoading small-loading'
                }, pageHeader));
            }

            // domConstruct.create("div", {
            //     className: "pageHeaderImg",
            //     innerHTML: "<img class='pageIcon' src ='images/icons_" + this.config.icons + "/" + name + ".png' alt=''/>"
            // }, pageHeader);

            const pageBody = domConstruct.create("div", {
                className: "pageBody",
                tabindex: 0,
                id: "pageBody_" + name,
            },
            pageContent);
            domClass.add(pageBody, panelClass);

            on(this, "updateTool_" + name, lang.hitch(name, function() {
                var page = dom.byId('pageBody_'+this);
                if(page) page.focus();
                var focusables = dojo.query('#pageBody_'+this+' [tabindex=0]');
                if(focusables && focusables.length>0){
                    focusables[0].focus();
                }
            }));

            return pageBody;
        },

        OpenTool: function(name) {
            var page = dom.byId("page_"+name);
            var hidden = page.classList.contains("hideAttr");
            if(!hidden) return;
            var btn = dom.byId('toolButton_'+name);
            this._toolClick(name);
        },

        IsToolSelected: function(name) {
            var page = dom.byId("page_"+name);
            if(!page) return false;
            var hidden = page.classList.contains("hideAttr");
            return !hidden;
        },

        _toolKeyPress: function(ev) {
            var target = ev.target;
            if(ev.keyCode===13) {
                var input = dojo.query("input", target);
                if(input) {
                    input[0].click();
                }
            }
        },

        _toolClick: function (name) {

            var defaultBtns = dojo.query(".panelToolDefault");
            var defaultBtn;
            if(defaultBtns !== undefined && defaultBtns.length > 0) {
                defaultBtn = defaultBtns[0].id.split("_")[1];
            }

            this._updateMap(); // ! out of place
            var active = false;
            var page = dom.byId("page_"+name);
            var hidden = page.classList.contains("hideAttr");
            var pages = query(".page");
            pages.forEach(function(p){
                if(hidden && p === page) {
                    active = true;
                }
            });

            if(_gaq) _gaq.push(['_trackEvent', "Tool: '"+name+"'", 'selected']);

            pages.forEach(lang.hitch(this, function(p){
                if(hidden && p === page) {
                    domClass.replace(p, "showAttr","hideAttr");
                    this.emit("updateTool", name);
                    this.emit("updateTool_"+name);
                } else {
                    domClass.replace(p,"hideAttr","showAttr");
                }
            }));
            var tool = dom.byId("toolButton_"+name);
            var tools = query(".panelTool");
            tools.forEach(lang.hitch(this, function(t){
                if(active && t === tool) {
                    domClass.add(t, "panelToolActive");
                    // this.emit("updateTool_"+name);
                } else {
                    domClass.remove(t,"panelToolActive");
                }
            }));

            if(!active && defaultBtns !== undefined) {
                this._activateDefautTool();
            }
        },

        _atachEnterKey: function(onButton, clickButton) {
            on(onButton, 'keydown', lang.hitch(clickButton, function(event){
            if(event.keyCode=='13')
                this.click();
            }));
        },

        _updateMap: function () {
            if (this.map) {
                this.map.resize();
                this.map.reposition();
            }
        },

       _activateDefautTool: function() {
            var defaultBtns = dojo.query(".panelToolDefault");
            var defaultBtn;
            if(defaultBtns !== undefined && defaultBtns.length>0) {
                defaultBtn = defaultBtns[0].id.split("_")[1];
            }
            if(defaultBtn !== undefined) {
                this._toolClick(defaultBtn);
            }
            // else if (this.config.activeTool !== "" && has(this.config.activeTool)) {
            //     toolbar.activateTool(this.config.activeTool);
            // }
            // else {
            //     toolbar._closePage();
            // }
        },

        closePage: function() {

        },

        // // menu click
        // _menuClick: function () {
        //     if (query("#panelTools").style("display") == "block") {
        //         query("#panelTools").style("display", "none");
        //         this._closePage();
        //     } else {
        //         query("#panelTools").style("display", "block");
        //     }
        //     this._updateMap();
        // }
    });
    if (has("extend-esri")) {
        lang.setObject("dijit.Toolbar", Widget, esriNS);
    }
    return Widget;
});
