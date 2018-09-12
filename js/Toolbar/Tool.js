define([
    "dojo/Evented", "dijit/_WidgetBase", "dijit/_TemplatedMixin", 
    "dojo/text!application/Toolbar/Templates/Tool.html",
    "dojo/_base/declare", "dojo/_base/window", "dojo/_base/fx",
    "dojo/_base/html", "dojo/_base/lang", "dojo/has", "dojo/dom",
    "dojo/dom-class", "dojo/dom-style", "dojo/dom-attr", "dojo/dom-construct", "dojo/dom-geometry",
    "dojo/on", "dojo/mouse", "dojo/query", "dojo/Deferred"], function (
Evented, _WidgetBase, _TemplatedMixin, 
toolTemplate,
declare, win, fx, html, lang, has, dom,
domClass, domStyle, domAttr, domConstruct, domGeometry,
on, mouse, query, Deferred) {
    return declare("esri.dijit.Tool", [_WidgetBase, _TemplatedMixin, Evented], {
        map: null,
        curTool: -1,
        scrollTimer: null,
        config: {},
        pPages: null,

        templateString: toolTemplate,

        constructor: function (config, srcRefNode) {
            this.deferrer = new Deferred();
            this.config = config;

            //(tool, panelClass, loaderImg, badgeEvName) {
            this.name = config.name;
            this.id = "toolButton_" + this.name;
            this.icon = config.icon;
            this.tip = config.i18n.tooltips[this.name] || this.name;
            // this.tools = config.tools;

            if(config.badgeEvName && config.badgeEvName !== '') {
                const setIndicator = domConstruct.create("img", {
                    src:"images/"+config.badgeEvName+".png",
                    class:"setIndicator",
                    style:"display:none;",
                    tabindex:0,
                    id: 'badge_'+config.badgeEvName,
                    alt:""
                });
                // domConstruct.place(setIndicator, this.panelTool);
            }

            // this.tools.push(this.name);

            // add page
            const page = domConstruct.create("div", {
                className: "page hideAttr",
                id: "page_" + this.name,
                // tabindex: 0
            }, this.pPages);

            const pageContent = domConstruct.create("div", {
                className: "pageContent",
                id: "pageContent_" + this.name,
                role: "dialog",
                "aria-labelledby": "pagetitle_" + this.name,
            }, page);

            const pageHeader = domConstruct.create("div", {
                id: "pageHeader_" + this.name,
                className: "pageHeader fc bg",
                //tabindex: 0,
            },
            pageContent);

            domConstruct.create("h2", {
                className: "pageTitle fc",
                innerHTML: this.config.i18n.tooltips[this.name] || this.name,
                //style: 'display:inline',
                id: "pagetitle_" + this.name
            }, pageHeader);

            if(config.loaderImg && config.loaderImg !=="") {
                domConstruct.create('img',{
                    src: 'images/'+config.loaderImg,//reload1.gif',
                    alt: 'Reloading',
                    title: 'Reloading'
                }, domConstruct.create("div", {
                    id: "loading_" + this.name,
                    class: 'hideLoading small-loading'
                }, pageHeader));
            }

            // domConstruct.create("div", {
            //     className: "pageHeaderImg",
            //     innerHTML: "<img class='pageIcon' src ='images/icons_" + this.config.icons + "/" + name + ".png' alt=''/>"
            // }, pageHeader);

            this.pageBody = domConstruct.create("div", {
                className: "pageBody",
                tabindex: 0,
                id: "pageBody_" + this.name,
            },
            pageContent);
            domClass.add(this.pageBody, config.panelClass);

            on(this, "updateTool_" + this.name, lang.hitch(this.name, function() {
                var page = dom.byId('pageBody_'+this);
                if(page) page.focus();
                var focusables = dojo.query('#pageBody_'+this+' [tabindex=0]');
                if(focusables && focusables.length>0){
                    focusables[0].focus();
                }
            }));

            this.deferrer.resolve(this.pageBody);
            // return pageBody;
        },

        startup: function () {
            return this.deferrer.promise;
        },

        IsToolSelected: function(name) {
            const page = dom.byId("page_"+this.name);
            if(!page) return false;
            const hidden = page.classList.contains("hideAttr");
            return !hidden;
        },

        executeByKbd: lang.hitch(this, function(ev) {
            if(ev.keyCode === 13) {
                const input = dojo.query("input", ev.target);
                if(input) {
                    input[0].click();
                    ev.preventDefault();
                    ev.stopPropagation();
                }
            }
        }),

        execute: lang.hitch(this, function (ev) {
            console.log(ev);

            const defaultBtns = dojo.query(".panelToolDefault");
            let defaultBtn;
            if(defaultBtns !== undefined && defaultBtns.length > 0) {
                defaultBtn = defaultBtns[0].id.split("_")[1];
            }

            // this._updateMap(); // ! out of place
            let active = false;
            const page = dom.byId("page_"+this.name);
            //// const hidden = page.classList.contains("hideAttr");
            const pages = query(".page");
            pages.forEach(function(p){
                if(hidden && p === page) {
                    active = true;
                }
            });

            if(_gaq) _gaq.push(['_trackEvent', "Tool: '"+this.name+"'", 'selected']);

            pages.forEach(lang.hitch(this, function(p){
                if(hidden && p === page) {
                    domClass.replace(p, "showAttr","hideAttr");
                    this.emit("updateTool", this.name);
                    this.emit("updateTool_"+this.name);
                } else {
                    domClass.replace(p,"hideAttr","showAttr");
                }
            }));
            const tool = dom.byId("toolButton_"+this.name);
            const ptools = query(".panelTool");
            ptools.forEach(lang.hitch(this, function(t){
                if(active && t === tool) {
                    domClass.add(t, "panelToolActive");
                    // this.emit("updateTool_"+this.name);
                } else {
                    domClass.remove(t,"panelToolActive");
                }
            }));

            if(!active && defaultBtns !== undefined) {
                //// this._activateDefautTool();
            }
        }),

        // _atachEnterKey: function(onButton, clickButton) {
        //     on(onButton, 'keydown', lang.hitch(clickButton, function(event){
        //     if(event.keyCode==='13')
        //         this.click();
        //     }));
        // },



    });
    if (has("extend-esri")) {
        lang.setObject("dijit.Tool", Widget, esriNS);
    }
    return Widget;
});