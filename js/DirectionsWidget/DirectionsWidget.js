define([
    "dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "dojo/dom","esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/on",
    "dojo/query", "dijit/registry",
    "esri/units", "esri/urlUtils", "esri/dijit/Directions",
    // "dojo/i18n!application/nls/LanguageSelect",
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style",
    "dojo/dom-construct", "dojo/_base/event",
    "dojo/NodeList-dom", "dojo/NodeList-traverse"

    ], function (
        Evented, declare, _lang, has, dom, esriNS,
        _WidgetBase, _TemplatedMixin, on,
        query, registry,
        units, urlUtils, Directions,
        // LanguageSelectTemplate, i18n,
        domClass, domAttr, domStyle,
        domConstruct, event, 
    ) {
    var Widget = declare("esri.dijit.DirectionWidget", [_WidgetBase, /*_TemplatedMixin,*/ Evented], {
        // templateString: LanguageSelectTemplate,

        options: {
            map: null,
            id: "directionsWidget",
            deferred: null,
            proxyUrl: null,
            directionsProxy: null,
        },

        constructor: function (options, srcRefNode) {
            this.defaults = _lang.mixin({}, this.options, options);
            //this._i18n = i18n;
            this.domNode = srcRefNode;
            this.map = this.defaults.map;
            this.deferred = this.defaults.deferred;
            const directionsProxy = this.defaults.directionsProxy;

            // var link = document.createElement("link");
            // link.href = "js/DirectionWidget/Templates/DirectionWidget.css";
            // link.type = "text/css";
            // link.rel = "stylesheet";
            // query('head')[0].appendChild(link);

            const directionOptions = {
                map: this.map,
                id: this.defaults.id,
                // routeTaskUrl: "https://utility.arcgis.com/usrsvcs/appservices/MZT52TUz01K4y8Li/rest/services/World/Route/NAServer/Route_World",
                // showSaveButton: true,

                // canModifyStops: false,
                dragging: false,
                showBarriersButton: false,
                showMilesKilometersOption: false,
                showOptimalRouteOption: false,
                showReturnToStartOption: false,
                showReverseStopsButton: false,
                showSegmentHighlight: false,
                showTrafficOption: false,
                showTravelModesOption: false,

                directionsLengthUnits: units.KILOMETERS
            };
            if(directionsProxy && directionsProxy.isNonEmpty()) {
                directionOptions.routeTaskUrl = directionsProxy;
            }
            this.directions = new Directions(directionOptions,this.domNode); //"pageBody_directions");
        },

        startup: function () {
            try {
                this.directions.startup();

                domClass.add(this.domNode, "pageBody");

                domAttr.set(this.directions._dndNode, "role", "presentation");
                // domAttr.set(this.directions._popupStateNode, "role", "presentation");

                if(this.deferred)
                    this.deferred.resolve(true);
            } catch (ex) {
                if(this.deferred)
                    this.deferred.resolve(false);
            }
        },
    });

    if (has("extend-esri")) {
        _lang.setObject("dijit.DirectionWidget", Widget, esriNS);
    }
    return Widget;
});
