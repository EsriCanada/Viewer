define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/registry",
    "dojo/on",  "esri/dijit/LocateButton",
    "dojo/Deferred", "dojo/query",
    "dojo/text!application/DirectionsWidget/Templates/DirectionsHeader.html",
    "dojo/dom", "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event",
    "dojo/parser", "dojo/ready",
    "dijit/layout/ContentPane",
    "dojo/string",
    "dojo/i18n!application/nls/PopupInfo",
    "esri/domUtils",
    // "application/ImageToggleButton/ImageToggleButton",
    "dojo/NodeList-dom", "dojo/NodeList-traverse"

    ], function (
        Evented, declare, lang, has, esriNS,
        _WidgetBase, _TemplatedMixin, registry,
        on, LocateButton,
        Deferred, query,
        DirectionsHeaderTemplate,
        dom, domClass, domAttr, domStyle, domConstruct, event,
        parser, ready,
        ContentPane,
        string,
        i18n,
        domUtils
    ) {

    // ready(function(){
    //     // Call the parser manually so it runs after our widget is defined, and page has finished loading
    //     parser.parse();
    // });

    var Widget = declare("esri.dijit.DirectionsHeader", [_WidgetBase, _TemplatedMixin, Evented], {
        
        options: {
            map: null,
            directions: null,
            header: 'pageHeader_directionsPanel',
            id: 'directionsHeadrId',
            template: DirectionsHeaderTemplate,
            iconsColor: 'black',
        },

        constructor: function (options, srcRefNode) {
            var defaults = lang.mixin({}, this.options, options);
            this.map = defaults.map;
            this.domNode = srcRefNode;
            this.widgetsInTemplate = true;

            this.directions = defaults.directions;
            this.templateString = defaults.template;
            this.directionsHeaderId = defaults.id;
            this._i18n = i18n;
            this.headerNode = dom.byId(defaults.header);
            this.iconsColor = defaults.iconsColor;

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

            if (has("locate")) {// && isLocationEnabled) {
                this.locate = new LocateButton({
                    map: this.map,
                    scale: 2000,
                }, domConstruct.create("div",{},this.locateDivButton));
                this.locate.startup();

                var locateButton = dojo.query(".locateContainer", this.locateDivButton)[0];
                var zoomLocateButton = dojo.query(".zoomLocateButton", this.locateDivButton)[0];
                //dojo.removeAttr(zoomLocateButton, 'title');
                // var locateHint = dojo.attr(zoomLocateButton, 'title');
                dojo.removeAttr(zoomLocateButton, 'role');

                dojo.empty(zoomLocateButton);

                const locateHint = "Start from your location";
                domConstruct.create("input", {
                    type: 'image',
                    src: 'images/icons_'+this.iconsColor+'/locate.png',
                    alt: locateHint,
                    title: locateHint
                }, zoomLocateButton);            
            }
        },

        _init: function () {

            this.loaded = true;

            var buttons = query(".directionsButton");
            buttons.forEach(lang.hitch(this, function (btn) {
                on(btn,'keydown', lang.hitch(this, function(ev) {
                    switch(ev.keyCode) {
                        case 13:
                            btn.click();
                            ev.stopPropagation();
                            ev.preventDefault();
                            break;
                        // case 88: // X
                        // case 67: // C
                        // case 69: // E
                        //     this.ToClear();
                        //     ev.stopPropagation();
                        //     ev.preventDefault();
                        //     break;
                    }
                }));
            }));

        },

        // ToClear : function() {
        //     query('.directionsButton.clear')[0].focus();
        // },

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
            const printButton = query('.esriResultsPrint');
            if(printButton && printButton.length>0) {
                printButton[0].click();
            }
        },

        addStopsDirections: function() {
            this.directions.set("mapClickActive", !this.directions.mapClickActive);
        },

    });
    if (has("extend-esri")) {
        lang.setObject("dijit.DirectionsHeader", Widget, esriNS);
    }
    return Widget;
});
