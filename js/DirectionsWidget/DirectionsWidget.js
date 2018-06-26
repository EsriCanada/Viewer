define([
    "dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "dojo/dom","esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/on",
    "dojo/query", "dijit/registry",
    "esri/units", "esri/urlUtils", "esri/dijit/Directions",
    "esri/symbols/PictureMarkerSymbol", "esri/symbols/Font",
    // "dojo/i18n!application/nls/LanguageSelect",
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style",
    "dojo/dom-construct", "dojo/_base/event",
    "dojo/NodeList-dom", "dojo/NodeList-traverse"

    ], function (
        Evented, declare, _lang, has, dom, esriNS,
        _WidgetBase, _TemplatedMixin, on,
        query, registry,
        units, urlUtils, Directions,
        PictureMarkerSymbol, Font,
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

            var link = document.createElement("link");
            link.href = "js/DirectionsWidget/Templates/DirectionWidget.css";
            link.type = "text/css";
            link.rel = "stylesheet";
            query('head')[0].appendChild(link);

            const fromSymb = new PictureMarkerSymbol("../images/greenPoint.png", 21, 29);
            fromSymb.setOffset(0, 12);
            const stopSymb = new PictureMarkerSymbol("../images/bluePoint.png", 21, 29);
            stopSymb.setOffset(0, 12);
            const toSymb = new PictureMarkerSymbol("../images/redPoint.png", 21, 29);
            toSymb.setOffset(0, 12);

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
                showSegmentHighlight: false,
                showTrafficOption: false,
                showTravelModesOption: false,

                showActivateButton: false,
                showClearButton: false,
                showBarriersButton: false,
                showReturnToStartOption: false,
                showReverseStopsButton: false,
                showSegmentPopup: false,
                showPrintPage: false,

                directionsLengthUnits: units.KILOMETERS,
                maxStops: 2,

                fromSymbol: fromSymb,
                stopSymbol: stopSymb,
                toSymbol: toSymb,
                textSymbolColor: '#000000',
                textSymbolFont: new Font("10pt", null, null, Font.WEIGHT_BOLD, "Arial, Helvetica, sans-serif"),

                //searchOptions: <Object>
                //segmentInfoTemplate: <InfoTemplate> 
            };
            if(directionsProxy && directionsProxy.isNonEmpty()) {
                directionOptions.routeTaskUrl = directionsProxy;
            }
            this.directions = new Directions(directionOptions,
                domConstruct.create("div",null,this.domNode)); //"pageBody_directions");
        },

        startup: function () {
            try {
                this.directions.startup();

                domClass.add(this.domNode, "pageBody");

                domAttr.set(this.directions._dndNode, "role", "presentation");
                // domAttr.set(this.directions._popupStateNode, "role", "presentation");

                this.directions.on("directions-finish", function(ev){
                    // console.log("directions-finish", ev);
                    // console.log("directions", ev.result.routeResults[0].directions);
                    // console.log("target", ev.target.directions);
                    // console.log("domNode", ev.target.domNode);
                    
                    const nodes = query('[role=presentation]', ev.target.domNode);
                    // console.log("presentationNodes", nodes);
                    nodes.forEach(function(node) { domAttr.remove(node, "role"); });

                    const tables = query('table', ev.target.domNode);
                    // console.log("tables", tables);
                    tables.forEach(table => domAttr.set(table, "role", "presentation"));

                    const tbodies = query('tbody[role=menu]', ev.target.domNode);
                    // console.log("tbodies", tbodies);
                    tbodies.forEach(tbody => domAttr.set(tbody, "role", "list"));

                    const trs = query('tr[role=menuitem]', ev.target.domNode);
                    // console.log("trs", trs);
                    trs.forEach(tr => domAttr.set(tr, "role", "listitem"));

                    const hiddens = query('input[type=hidden][aria-hidden]', ev.target.domNode);
                    hiddens.forEach(hidden => domAttr.remove(hidden, 'aria-hidden'));

                    const routeIcons = query('.esriRouteIcon', ev.target.domNode);
                    // console.log("routeIcons", routeIcons);

                    routeIcons.forEach(routeIcon => {
                        let imgSrc = domStyle.getComputedStyle(routeIcon).backgroundImage;
                        if(imgSrc.includes("esriDMTStopOrigin.png")) {
                            imgSrc = "../images/greenPoint.png";
                        }
                        else if(imgSrc.includes("esriDMTStopDestination.png")) {
                            imgSrc = "../images/redPoint.png";
                        }
                        else {
                            imgSrc = imgSrc.substring(5, imgSrc.length-2);
                        }

                        const text = routeIcon.innerText;
                        routeIcon.innerText = null;

                        domStyle.set(routeIcon, "background", "transparent");
                        const img = domConstruct.create("img",{role:"presentation", src:imgSrc},routeIcon);

                        if(text.isNonEmpty()) {
                            const span = domConstruct.toDom("<span>"+text+"</span>");
                            domConstruct.place(span, img, "after");
                        }

                    });
                });

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
