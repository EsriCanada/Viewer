define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", 
    "dojo/on",  "esri/dijit/LocateButton",
    "dojo/query",
    "dojo/text!application/DirectionsWidget/Templates/DirectionsHeader.html",
    "dojo/dom", "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event",
    "dojo/i18n!application/nls/DirectionsWidget"
    ], function (
        Evented, declare, lang, has, esriNS,
        _WidgetBase, _TemplatedMixin, 
        on, LocateButton,
        query,
        DirectionsHeaderTemplate,
        dom, domClass, domAttr, domStyle, domConstruct, event,
        i18n
    ) {

        var Widget = declare("esri.dijit.DirectionsHeader", [_WidgetBase, _TemplatedMixin, Evented], {
        
        options: {
            map: null,
            directions: null,
            toolbar: null,
            header: 'pageHeader_directionsPanel',
            id: 'directionsHeadrId',
            template: DirectionsHeaderTemplate,
            iconsColor: 'black',
            locateCallBack: null,
            options: {
                locator: true,
                stops: true,
                barriers: true,
                optimize: true,
                print: true
            }
        },

        constructor: function (options, srcRefNode) {
            const defaults = lang.mixin({}, this.options, options);
            this.map = defaults.map;
            this.toolbar = defaults.toolbar;
            this.domNode = srcRefNode;
            this.widgetsInTemplate = true;
            
            this.directions = defaults.directions;
            this.templateString = defaults.template;
            this.directionsHeaderId = defaults.id;
            this._i18n = i18n;
            this.headerNode = dom.byId(defaults.header);
            this.iconsColor = defaults.iconsColor;
            this.options = defaults.options;
            
            this.locateCallBack = defaults.locateCallBack;

            this.mapClickActiveStatus = true;
            this.barriersToolActiveStatus = false;
        },

        startup: function () {
            if (!this.directions) {
                this.destroy();
                console.log("Error DirectionsWidget: directions required");
            }
            if (this.directions.loaded) {
                this._init();
            } else {
                on.once(this.directions, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }

            if(this.options.locator && has("locate")) {// && isLocationEnabled) {
                this.locate = new LocateButton({
                    map: this.map,
                    scale: 5000,
                    highlightLocation: false
                }, domConstruct.create("div",{},this.locateDivButton));
                this.locate.startup();

                const zoomLocateButton = this.locate._locateNode;
                domAttr.remove(zoomLocateButton, 'role');
                domAttr.remove(this.locate._locateNode, 'tabindex');
                dojo.empty(zoomLocateButton);

                const locateHint = i18n.widgets.directionsWidget.locator;
                domConstruct.create("input", {
                    type: 'image',
                    src: 'images/icons_'+this.iconsColor+'/locate.png',
                    alt: locateHint,
                    title: locateHint
                }, zoomLocateButton);  

                if(this.locateCallBack) {
                    this.locate.on("locate", lang.hitch(this, function(ev) {
                        this.locateCallBack(ev);
                        domClass.remove(this.locateDivButton, 'activeBg');
                    }));
                }
            } else {
                domClass.add(this.locateDivButton, 'hide');
                domAttr.set(this.locateDivButton, 'aria-hidden', true);
            }

            if(!this.options.stops) {
                domClass.add(this.addStopsButton, 'hide');
                domAttr.set(this.addStopsButton, 'aria-hidden', true);
            }

            if(!this.options.barriers) {
                domClass.add(this.barriers, 'hide');
                domAttr.set(this.barriers, 'aria-hidden', true);
            }

            if(!this.options.optimize) {
                domClass.add(this.optimize, 'hide');
                domAttr.set(this.optimize, 'aria-hidden', true);
            }

            if(!this.options.print) {
                domClass.add(this.print, 'hide');
                domAttr.set(this.print, 'aria-hidden', true);
            }
        },

        _init: function () {

            this.loaded = true;

            this.directions.on("map-click-active", lang.hitch(this, function(state) {
                if(this.mapClickActiveStatus = state.mapClickActive) {
                    domClass.add(this.addStopsButton, 'activeBg');
                    // this.directions.set('barrierToolActive', false);
                    if(this.barriersToolActiveStatus) {
                        this.barriersDirections();
                        // this.addStopsDirections();
                    }
                    this.map.container.focus();
                }
                else {
                    domClass.remove(this.addStopsButton, 'activeBg');
                }
            }));

            this.directions.on("barrier-tool-active", lang.hitch(this, function(state) {
                if(this.barriersToolActiveStatus = state.barrierToolActive) {
                    domClass.add(this.barriers, 'activeBg');
                    const tip = query('.esriMapTooltip', this.map.domNode);
                    if(tip) {
                        domAttr.set(tip[0], 'aria-live', 'polite');
                        // domAttr.set(tip[0], 'aria-atomic', false);
                    }
                }
                else {
                    domClass.remove(this.barriers, 'activeBg');
                }
            }));

            this.toolbar.on('updateTool', lang.hitch(this, function(name) {
                // console.log('updateTool', name);
                if(name==='directions') {
                    if(this.barriersToolActiveStatus) {
                        this.barriersDirections();
                    }
                    this.directions.set("mapClickActive", this.mapClickActiveStatus);
                    this.directions.map.setInfoWindowOnClick(false);
                } else {
                    if(this.directions.mapClickActive) {
                        this.directions.set("mapClickActive", false);
                        this.mapClickActiveStatus = true;
                    }
                    if(this.directions.barrierToolActive) {
                        this.barriersDirections();
                        this.barriersToolActiveStatus = true;
                    }
                    this.directions.map.setInfoWindowOnClick(true);
                }
            }));

        },

        locateStarts: function() {
            domClass.add(this.locateDivButton, 'activeBg');
        },

        clearDirections : function(ev) {
            this.directions.reset();//clearDirections();
        },

        reverseDirections: function(ev) {
            const reverseButton = query('.esriStopsReverse');
            if(reverseButton && reverseButton.length>0) {
                reverseButton[0].click();
            }
        },

        printDirections: function() {
            this.directions._printButton.click();
        },

        addStopsDirections: function() {
            this.directions.set("mapClickActive", !this.directions.mapClickActive);
        },

        barriersDirections: function() {
            this.directions._lineBarrierButtonNode.click();
            // this.directions.set("barrierToolActive", !this.directions.barrierToolActive);
        },

        optimizeDirections : function() {
            this.directions.set('optimalRoute', true);
            domClass.add(this.optimize, 'activeBg');
            this.directions.getDirections().then(lang.hitch(this, function() {
                this.directions.set('optimalRoute', false);
                this.directions.getDirections().then(lang.hitch(this, function() {
                    domClass.remove(this.optimize, 'activeBg');
                }));
            }));
        },

    });
    if (has("extend-esri")) {
        lang.setObject("dijit.DirectionsHeader", Widget, esriNS);
    }
    return Widget;
});
