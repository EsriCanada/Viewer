define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel", 
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/registry",
    "dojo/on", 
    "esri/tasks/locator",
    "esri/geometry/webMercatorUtils",
    "dojo/Deferred", "dojo/query", 
    "dojo/text!application/GeoCoding/Templates/GeoCoding.html", 
    "dojo/text!application/GeoCoding/Templates/GeoCodingHeader.html", 
    "dojo/dom", "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event", 
    "dojo/parser", "dojo/ready",
    "dijit/layout/BorderContainer",
    "dojox/layout/ContentPane",  
    "esri/InfoTemplate", 
    "esri/symbols/PictureMarkerSymbol", "esri/symbols/TextSymbol", "esri/graphic", 
    "dojo/string", 
    "dojo/i18n!application/nls/PopupInfo",
    "esri/domUtils",
    // "esri/dijit/Popup", 
    "application/GeoCoding/GeoCodingHeader",
    "application/SuperNavigator/SuperNavigator",
    "dojo/NodeList-dom", "dojo/NodeList-traverse"
    
    ], function (
        Evented, declare, lang, has, esriNS,
        _WidgetBase, _TemplatedMixin, registry,
        on, 
        Locator, webMercatorUtils,
        Deferred, query,
        GeoCodingTemplate, GeoCodingHeaderTemplate, 
        dom, domClass, domAttr, domStyle, domConstruct, event, 
        parser, ready,
        BorderContainer,
        ContentPane,
        InfoTemplate, 
        PictureMarkerSymbol, TextSymbol, Graphic,
        string,
        i18n,
        domUtils,
        // Popup, 
        GeoCodingHeader, SuperNavigator
    ) {

    ready(function(){
        // Call the parser manually so it runs after our widget is defined, and page has finished loading
        parser.parse();
    });

    var Widget = declare("esri.dijit.GeoCoding", [_WidgetBase, _TemplatedMixin, Evented], {
        // defaults
        templateString: GeoCodingTemplate,

        options: {
            map: null,
            toolbar: null, 
            header: 'pageHeader_geoCoding',
            superNavigator : null,
            searchMarker: './images/SearchPin1.png',
            geolocatorLabelColor: "#0000ff", // 'green'
            // emptyMessage: i18n.widgets.geoCoding.noAddress,
        },

        locator : null,

        constructor: function (options, srcRefNode) {
            var defaults = lang.mixin({}, this.options, options);
            this.domNode = srcRefNode;
            this.widgetsInTemplate = true;

            this.map = defaults.map;
            this.searchMarker = defaults.searchMarker;
            this.geolocatorLabelColor = defaults.geolocatorLabelColor;
            this.toolbar = defaults.toolbar;
            this._i18n = i18n;
            this.headerNode = dom.byId(defaults.header);
            this.superNavigator = defaults.superNavigator;
            this.emptyMessage = defaults.emptyMessage;

            dojo.create("link", {
                href : "js/GeoCoding/Templates/geoCoding.css",
                type : "text/css",
                rel : "stylesheet",
            }, document.head);

            this.locator = new Locator("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer");
        },

        startup: function () {
            if (!this.map) {
                this.destroy();
                console.error("Map required");
                // return;
            }
            if (!this.toolbar) {
                this.destroy();
                console.error("Toolbar required");
                return;
            }
            if (this.map.loaded) {
                this._init();
            } else {
                on.once(this.map, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }
        },

        postCreate : function() {
            if(this.locator) {

                this.locator.on('location-to-address-complete', lang.hitch(this, function(evt) {
                    console.log('locator', evt);
                    if (evt.address.address) {
                        console.log('address', evt.address);
                        var address = evt.address.address;
                        var infoTemplate = new InfoTemplate(
                            i18n.widgets.geoCoding.Location, 
                            this.makeAddressTemplate(address)
                            );
                        var location = webMercatorUtils.geographicToWebMercator(
                            evt.address.location
                            );
                        //this service returns geocoding results in geographic - convert to web mercator to display on map
                        // var location = webMercatorUtils.geographicToWebMercator(evt.location);
                        this.geoCodingMarkerGraphic = new Graphic(
                            location, 
                            this.searchMarker, 
                            address, 
                            infoTemplate
                            );
                        this.map.graphics.add(this.geoCodingMarkerGraphic);

                        this.contentPanel.setContent(this.geoCodingMarkerGraphic.getContent());
                    }
                }));

                this.map.on("click", lang.hitch(this, function(evt) {
                    // this.map.graphics.clear();
                    this.clearSearchGraphics();
                    this.locator.locationToAddress(
                        webMercatorUtils.webMercatorToGeographic(evt.mapPoint), 100
                    );
                }));
            }
        },

        geoCodingHeader : null,
        contentPanel : null,

        makeAddressTemplate: function(address) {
            if(address.Addr_type.isNonEmpty()) {
                var prop = address.Addr_type.replace(' ', '');
                address.AddrTypeLoc = (i18n.widgets.hasOwnProperty('addrType') && i18n.widgets.addrType.hasOwnProperty(prop)) ?
                i18n.widgets.addrType[prop] : address.Addr_type;
            }
            // address.Type.isNonEmpty()
            if(address.Type.isNonEmpty()) {
                var prop1 = address.Type.replace(' ', '');
                address.TypeLoc = (i18n.widgets.hasOwnProperty('addrType') && i18n.widgets.addrType.hasOwnProperty(prop1)) ?
                i18n.widgets.addrType[prop1] : address.Type;
            }

            var result = "";

            if(address.Address.isNonEmpty()) 
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.Address+"</th><td>${Address}</td></tr>";
            if(address.Block.isNonEmpty()) 
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.Block+"</th><td>${Block}</td></tr>";
            if(address.Sector.isNonEmpty()) 
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.Sector+"</th><td>${Sector}</td></tr>";
            if(address.Neighborhood.isNonEmpty()) 
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.Neighborhood+"</th><td>${Neighborhood}</td></tr>";
            if(address.PlaceName.isNonEmpty()) 
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.PlaceName+"</th><td>${PlaceName}</td></tr>";
            if(address.MetroArea.isNonEmpty()) 
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.MetroArea+"</th><td>${MetroArea}</td></tr>";
            if(address.District.isNonEmpty() && address.District !== address.City) 
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.District+"</th><td>${District}</td></tr>";
            if(address.City.isNonEmpty()) 
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.City+"</th><td>${City}</td></tr>";
            if(address.Postal.isNonEmpty()) {
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.PostalCode+"</th><td>${Postal}";
                if(address.PostalExt.isNonEmpty()) result += " ${PostalExt}";
                result += "</td></tr>";
            }
            if(address.Region.isNonEmpty()) {
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.Region+"</th><td>${Region}";
                if(address.Subregion.isNonEmpty() && address.Region !== address.Subregion) {
                    result += " - ${Subregion}";
                }
                result += "</td></tr>";
            }
            if(address.Territory.isNonEmpty()) 
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.Territory+"</th><td>${Territory}</td></tr>";
            if(address.CountryCode.isNonEmpty()) 
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.CountryCode+"</th><td>${CountryCode}</td></tr>";

            if(result !=='') {
                result = 
                "<div class='esriViewPopup'>"+
                    "<div tabindex=0 class='header'>"+
                        (address.Addr_type.isNonEmpty() || address.Type.isNonEmpty() ? 
                            (
                                (address.Addr_type.isNonEmpty() ? '${AddrTypeLoc}':'')+
                                (address.Addr_type.isNonEmpty() && address.Type.isNonEmpty() ? ' - ': '')+
                                (address.Type.isNonEmpty() ? '${TypeLoc}':'')
                            ) 
                            : '')+"</div>"+
                        "<div class='hzLine'></div>"+
                        "<table class='addressInfo'>"+result+"</table>"+
                    "</div>";
            }
            return result;
        },

        _init: function () {

            this.loaded = true;

            // var textProbe = dojo.byId('searchTextProbe');
            // var cs = domStyle.getComputedStyle(textProbe);
            // var fontSize = cs.fontSize.slice(0,-2);
            // this.searchLabel = new TextSymbol({
            //     yoffset : -fontSize,//-14,
            //     haloColor: [255,255,255,255],
            //     haloSize: 2,
            //     font : 
            //     {
            //         family : cs.fontFamily, //"Roboto Condensed",
            //         size : fontSize, //18,
            //         weight : cs.fontWeight, //'bold'
            //     }
            // });
            // this.searchLabel.color = this.geolocatorLabelColor; //"red";

            // domConstruct.destroy(textProbe);

            this.searchMarker = new esri.symbol.PictureMarkerSymbol({
                "angle": 0,
                "xoffset": 0,
                "yoffset": 15,
                "type": "esriPMS",
                "url": require.toUrl(this.searchMarker),
                "contentType": "image/png",
                "width": 30,
                "height": 30
            });

            this.contentPanel = new ContentPane({
                region: "center",
                id: "geoCodingContent",
                tabindex: 0,
            }, dom.byId("geoCoding_content"));
            this.contentPanel.startup();
            this.contentPanel.set("content", i18n.widgets.geoCoding.instructions);
            
            this.geoCodingHeader = new GeoCodingHeader({
                map: this.map,
                toolbar: this.toolbar, 
                header: 'pageHeader_geoCoding', 
                id: 'geoCoding_headerId', 
                superNavigator : this.superNavigator,
                template: GeoCodingHeaderTemplate,
                contentPanel: this.contentPanel,
                self: this,
            }, domConstruct.create('Div', {}, this.headerNode));
            this.geoCodingHeader.startup();
        },

        clearSearchGraphics: function(){
            if(this.geoCodingMarkerGraphic) {
                this.map.graphics.remove(this.geoCodingMarkerGraphic);
                this.geoCodingMarkerGraphic = null;
            }
            // if(this.searchLabelGraphic) {
            //     this.map.graphics.remove(this.searchLabelGraphic);
            //     this.searchLabelGraphic = null;
            // }
        },

        // showBadge : function(show) {
        //     var indicator = dom.byId('badge_followTheMapMode');
        //     if (show) {
        //         domStyle.set(indicator,'display','');
        //         domAttr.set(indicator, "title", i18n.widgets.popupInfo.followTheMap);
        //         domAttr.set(indicator, "alt", i18n.widgets.popupInfo.followTheMap);
        //     } else {
        //         domStyle.set(indicator,'display','none');
        //     }
        // },

    });
    if (has("extend-esri")) {
        lang.setObject("dijit.GeoCoding", Widget, esriNS);
    }
    return Widget;
});
