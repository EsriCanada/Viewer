define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/registry",
    "dojo/on",
    "dojo/Deferred", "dojo/query",
    "dojo/text!application/DirectionsWidget/Templates/DirectionsHeader.html",
    "dojo/dom", "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event",
    "dojo/parser", "dojo/ready",
    "dijit/layout/ContentPane",
    "dojo/string",
    "dojo/i18n!application/nls/PopupInfo",
    "esri/domUtils",
    "esri/dijit/Popup",
    // "application/ImageToggleButton/ImageToggleButton",
    "dojo/NodeList-dom", "dojo/NodeList-traverse"

    ], function (
        Evented, declare, lang, has, esriNS,
        _WidgetBase, _TemplatedMixin, registry,
        on,
        Deferred, query,
        DirectionsHeaderTemplate,
        dom, domClass, domAttr, domStyle, domConstruct, event,
        parser, ready,
        ContentPane,
        string,
        i18n,
        domUtils,
        Popup// , ImageToggleButton
    ) {

    // ready(function(){
    //     // Call the parser manually so it runs after our widget is defined, and page has finished loading
    //     parser.parse();
    // });

    var Widget = declare("esri.dijit.DirectionsHeader", [_WidgetBase, _TemplatedMixin, Evented], {
        // templateString: PopupInfoHeaderTemplate,

        options: {
            directions: null,
            header: 'pageHeader_directionsPanel',
            id: 'directionsHeadrId',
            template: DirectionsHeaderTemplate,
            iconsColor: 'black',
        },

        constructor: function (options, srcRefNode) {
            var defaults = lang.mixin({}, this.options, options);
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
        },

        _init: function () {

            this.loaded = true;

            // on(query('#'+this.directionsHeaderId+' .directionsButton.clear')[0], 'click', lang.hitch(this, this.clearDirections));

            var buttons = query(".directionsButton");
            buttons.forEach(lang.hitch(this, function (btn) {
                on(btn,'keydown', lang.hitch(this, function(ev) {
                    switch(ev.keyCode) {
                        case 13:
                            btn.click();
                            ev.stopPropagation();
                            ev.preventDefault();
                            break;
                        case 88: // X
                        case 67: // C
                        case 69: // E
                            this.ToClear();
                            ev.stopPropagation();
                            ev.preventDefault();
                            break;
                    }
                }));
            }));

        },

        ToClear : function() {
            query('.directionsButton.clear')[0].focus();
        },

        clearDirections : function(ev) {
            this.directions.clear();
        },

    });
    if (has("extend-esri")) {
        lang.setObject("dijit.DirectionsHeader", Widget, esriNS);
    }
    return Widget;
});
