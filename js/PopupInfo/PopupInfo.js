define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel", 
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/registry",
    "dojo/on", 
    "dojo/Deferred", "dojo/query", 
    "dojo/text!application/PopupInfo/Templates/PopupInfo.html", 
    // "dojo/text!application/PopupInfo/Templates/PopupInfoHeader.html", 
    "dojo/dom", "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event", 
    "dojo/parser", "dojo/ready",
    "dijit/layout/BorderContainer",
    "dojox/layout/ContentPane",  
    "esri/InfoTemplate", 
    "esri/symbols/PictureMarkerSymbol", "esri/symbols/TextSymbol", "esri/graphic", 
    "dojo/string", 
    "dojo/i18n!application/nls/PopupInfo",
    "esri/domUtils",
    "esri/dijit/Popup", 
    "application/PopupInfo/PopupInfoHeader",
    "application/SuperNavigator/SuperNavigator",
    "dojo/NodeList-dom", "dojo/NodeList-traverse"
    
    ], function (
        Evented, declare, lang, has, esriNS,
        _WidgetBase, _TemplatedMixin, registry,
        on, 
        Deferred, query,
        PopupInfoTemplate, // PopupInfoHeaderTemplate, 
        dom, domClass, domAttr, domStyle, domConstruct, event, 
        parser, ready,
        BorderContainer,
        ContentPane,
        InfoTemplate, 
        PictureMarkerSymbol, TextSymbol, Graphic,
        string,
        i18n,
        domUtils, 
        Popup, PopupInfoHeader, SuperNavigator
    ) {

    ready(function(){
        // Call the parser manually so it runs after our widget is defined, and page has finished loading
        parser.parse();
    });

    var Widget = declare("esri.dijit.PopupInfo", [_WidgetBase, _TemplatedMixin, Evented], {
        // defaults
        templateString: PopupInfoTemplate,


        options: {
            map: null,
            toolbar: null, 
            header: 'pageHeader_infoPanel',
            superNavigator : null,
            maxSearchResults: 10,
            searchMarker: './images/SearchPin.png',
            geolocatorLabelColor: "#ff0000", // 'red'
            emptyMessage: i18n.widgets.popupInfo.noFeatures
        },

        constructor: function (options, srcRefNode) {
            var defaults = lang.mixin({}, this.options, options);
            this.domNode = srcRefNode;
            this.widgetsInTemplate = true;

            this.map = defaults.map;
            this.search = defaults.search;
            this.maxSearchResults = defaults.maxSearchResults;
            this.searchMarker = defaults.searchMarker;
            this.geolocatorLabelColor = defaults.geolocatorLabelColor;
            this.toolbar = defaults.toolbar;
            this._i18n = i18n;
            this.headerNode = dom.byId(defaults.header);
            this.superNavigator = defaults.superNavigator;
            this.emptyMessage = defaults.emptyMessage;

            dojo.create("link", {
                href : "js/PopupInfo/Templates/PopupInfo.css",
                type : "text/css",
                rel : "stylesheet",
            }, document.head);
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
            if(this.superNavigator)
                this.superNavigator.badge = this.showBadge;

            if(this.search) {
                this.search.enableLabel = true;
                this.search.maxResults = this.search.maxSuggestions = this.maxSearchResults;
                this.search.autoSelect = false;


                this.search.on('clear-search', lang.hitch(this, this.clearSearchGraphics));

                this.search.on('search-results', lang.hitch(this, function(e) {
                    // console.log('search-results', e);

                    var features = [];
                    if(e.results) {
                        for(var i = 0; i< this.search.sources.length; i++) {
                            if(e.results.hasOwnProperty(i)) {
                                var dataFeatures = e.results[i].map(function(r){ return r.feature;});
                                var infoTemplate = null;
                                var layer = null;
                                var isFeatureLayer = this.search.sources[i].hasOwnProperty('featureLayer');
                                if(isFeatureLayer) {
                                    infoTemplate = this.search.sources[i].featureLayer.infoTemplate;
                                    layer = this.search.sources[i].featureLayer;
                                }
                                for(var j = 0; j< dataFeatures.length; j++) {
                                    if(isFeatureLayer) {
                                        dataFeatures[j].infoTemplate = infoTemplate;
                                        dataFeatures[j]._layer = layer;
                                    } else {
                                        dataFeatures[j].infoTemplate = new InfoTemplate(
                                            i18n.widgets.geoCoding.Location,
                                            this.makeAddressTemplate(e.results[i][j].feature.attributes)
                                        );
                                    }
                                }
                                features = features.concat(dataFeatures);
                            }
                        }
                        // console.log('features-results', features);
                    }
                    this.search.map.infoWindow.show();
                    if(features && features !== undefined && features.length > 0) {
                        this.search.map.infoWindow.setFeatures(features);
                    }
                    else { 
                        this.search.map.infoWindow.clearFeatures();
                    }
                }));
            }
        },

        popupInfoHeader : null,
        contentPanel : null,

        makeAddressTemplate: function(address) {
            console.log('Info Address:', address);
            
            if(address.Addr_type.isNonEmpty()) {
                var prop = address.Addr_type.replace(' ', '');
                address.AddrTypeLoc = (i18n.widgets.hasOwnProperty('addrType') && i18n.widgets.addrType.hasOwnProperty(prop)) ?
                i18n.widgets.addrType[prop] : address.Addr_type;
            }
            // address.Type.isNonEmpty()
            if(address.Loc_name.isNonEmpty()) {
                var prop1 = address.Loc_name.replace(' ', '');
                address.TypeLoc = (i18n.widgets.hasOwnProperty('addrType') && i18n.widgets.addrType.hasOwnProperty(prop1)) ?
                i18n.widgets.addrType[prop1] : address.Loc_name;
            }

            var result = "";

            if(address.StAddr.isNonEmpty()) 
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.Address+"</th><td>${StAddr}</td></tr>";
            if(address.Block.isNonEmpty()) 
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.Block+"</th><td>${Block}</td></tr>";
            if(address.Sector.isNonEmpty()) 
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.Sector+"</th><td>${Sector}</td></tr>";
            if(address.Nbrhd.isNonEmpty()) 
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.Neighborhood+"</th><td>${Nbrhd}</td></tr>";
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
            if(address.Country.isNonEmpty()) 
                result += "<tr tabindex=0><th>"+i18n.widgets.geoCoding.CountryCode+"</th><td>${Country}</td></tr>";

            if(result !=='') {
                result = 
                "<div class='esriViewPopup'>"+
                    "<div tabindex=0 class='header'>"+
                        (address.Addr_type.isNonEmpty() || address.Loc_name.isNonEmpty() ? 
                            (
                                (address.Addr_type.isNonEmpty() ? '${AddrTypeLoc}':'')+
                                (address.Addr_type.isNonEmpty() && address.Loc_name.isNonEmpty() ? ' - ': '')+
                                (address.Loc_name.isNonEmpty() ? '${TypeLoc}':'')
                            ) 
                            : '')+"</div>"+
                    "<div class='hzLine'></div>"+
                    "<table class='addressInfo'>"+result+"</table>"+
                    "<span tabindex=0 class='locatorScore'>Score: ${Score}</span>"+
                    "</div>";
            }
            return result;
        },

        _init: function () {

            this.loaded = true;

            var popup = this.map.infoWindow;

            var textProbe = dojo.byId('searchTextProbe');
            var cs = domStyle.getComputedStyle(textProbe);
            var fontSize = cs.fontSize.slice(0,-2);
            this.searchLabel = new TextSymbol({
                yoffset : -fontSize,//-14,
                haloColor: [25,25,25,155],
                haloSize: 4,
                font : 
                {
                    family : cs.fontFamily, //"Roboto Condensed",
                    size : fontSize, //18,
                    weight : cs.fontWeight, //'bold'
                }
            });
            this.searchLabel.color = this.geolocatorLabelColor; //"red";

            domConstruct.destroy(textProbe);

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

            popup.set("popupWindow", false);

            //https://developers.arcgis.com/javascript/3/sandbox/sandbox.html?sample=popup_sidepanel

            this.contentPanel = new ContentPane({
                region: "center",
                id: "popupInfoContent",
                tabindex: 0,
            }, dom.byId("feature_content"));
            this.contentPanel.startup();
            this.contentPanel.set("content", i18n.widgets.popupInfo.instructions);
            
            this.popupInfoHeader = new PopupInfoHeader({
                map: this.map,
                toolbar: this.toolbar, 
                header: 'pageHeader_infoPanel',
                id: 'infoPanel_headerId', 
                superNavigator : this.superNavigator,
                emptyMessage: this.emptyMessage,
            }, domConstruct.create('Div', {}, this.headerNode));
            this.popupInfoHeader.startup();

            this.displayPopupContent = lang.hitch(this, function (feature) {
                // if(this.toolbar.IsToolSelected('geoCoding')) return;

                this.toolbar.OpenTool('infoPanel');
                if (feature) {
                    this.contentPanel.set("content", feature.getContent()).then(lang.hitch(this, function() {
                        var mainSection = query('.esriViewPopup .mainSection', dojo.byId('popupInfoContent'));
                        if(mainSection && mainSection.length > 0) {
                            var header = query('.header', mainSection[0]);
                            if(header && header.length > 0) {
                                domAttr.set(header[0], 'tabindex', 0);
                            }

                            var attrTable = query('.attrTable', mainSection[0]);
                            if(attrTable && attrTable.length > 0) {
                                domAttr.set(attrTable[0], 'role', 'presentation');
                                var rows = query('tr', attrTable[0]);
                                if(rows) {
                                    rows.forEach(function(row) {domAttr.set(row, 'tabindex', 0);});
                                }
                            } 
                            else {
                                var description = query('[dojoattachpoint=_description]', mainSection[0]);
                                if(description && description.length > 0) {
                                    domAttr.set(description[0], 'tabindex', 0);
                                }
                            }

                            var editSummarySection = query('.esriViewPopup .editSummarySection', dojo.byId('popupInfoContent'));
                            if(editSummarySection) {
                                var editSummary =  query('.editSummary', editSummarySection[0]);
                                if(editSummary) {
                                    editSummary.forEach(function(edit) { domAttr.set(edit, 'tabindex', 0);});
                                }
                            }
                            var images = query('.esriViewPopup img', dojo.byId('popupInfoContent'));
                            if(images) {
                                images.forEach(function(img) {
                                    var alt = domAttr.get(img, 'alt');
                                    if(!alt) {
                                        domAttr.set(img,'alt','');
                                    } else {
                                        domAttr.set(img,'tabindex',0);
                                        if(!domAttr.get(img, 'title'))
                                        {
                                            domAttr.set(img,'title',alt);
                                        }
                                    }
                                });
                            }
                        }
                    }));
                }
            });

            // on(popup, "SetFeatures", lang.hitch(this, function() {
            //     console.log("SetFeatures", popup.features);
            //     if(this.toolbar.IsToolSelected('geoCoding')) {
            //     }
            // }));

            on(popup, "ClearFeatures", lang.hitch(this, function() {
                if(this.toolbar.IsToolSelected('geoCoding')) return;

                this.contentPanel.set("content", i18n.widgets.popupInfo.instructions);
                // if(this.superNavigator) {
                //     this.superNavigator.clearZone();
                // }
                if(this.popupInfoHeader) {
                    this.popupInfoHeader.setTotal(0);
                }
            }));

            on(popup, "SelectionChange", lang.hitch(this, function() {
                if(this.toolbar.IsToolSelected('geoCoding')) return;

                var selectedFeature = popup.getSelectedFeature();
                if(selectedFeature && selectedFeature !== undefined) {
                    this.displayPopupContent(selectedFeature);
                    this.clearSearchGraphics();
                    if(selectedFeature.infoTemplate) {
                        var geometry = selectedFeature.geometry;
                        if(geometry.type !== "point") {
                            var extent = geometry.getExtent().expand(1.5);
                            this.map.setExtent(extent);
                        } else {
                            this.map.centerAt(geometry);
                            if(!selectedFeature._layer) {
                                this.searchMarkerGrafic = new Graphic(geometry, this.searchMarker);
                                this.map.graphics.add(this.searchMarkerGrafic);

                                this.searchLabel.setText(selectedFeature.attributes.ShortLabel);
                                this.searchLabelGraphic = new Graphic(geometry, this.searchLabel);
                                this.map.graphics.add(this.searchLabelGraphic);
                            }
                        }
                    }
                }
            }));

            on(this.toolbar, 'updateTool', lang.hitch(this, function(name) {
                if(this.superNavigator && name !== 'infoPanel') {
                    this.superNavigator.followTheMapMode(false);
                }
            }));

            on(dojo.byId('pageBody_infoPanel'), 'keydown', lang.hitch(this, function(ev) {
                switch(ev.keyCode) {
                    case 37: // <
                        if(this.popupInfoHeader.total>1) {
                            this.popupInfoHeader.ToPrev();
                            ev.stopPropagation();
                            ev.preventDefault();
                        }
                        break;
                    case 39: // >
                        if(this.popupInfoHeader.total>1) {
                            this.popupInfoHeader.ToNext();
                            ev.stopPropagation();
                            ev.preventDefault();
                        }
                        break;
                    case 90: // Z
                        this.popupInfoHeader.ToZoom();
                        ev.stopPropagation();
                        ev.preventDefault();
                        break;
                    case 77: // M
                    case 80: // P
                        this.popupInfoHeader.ToMap();
                        ev.stopPropagation();
                        ev.preventDefault();

                        break;
                    case 88: // X
                    case 67: // C
                    case 69: // E
                        this.popupInfoHeader.ToClear();
                        ev.stopPropagation();
                        ev.preventDefault();
                        break;

                }}));
        },

        clear: function() {
            this.map.infoWindow.clearFeatures();
            this.map.container.focus();
        },

        clearSearchGraphics: function(){
            if(this.searchMarkerGrafic) {
                this.map.graphics.remove(this.searchMarkerGrafic);
                this.searchMarkerGrafic = null;
            }
            if(this.searchLabelGraphic) {
                this.map.graphics.remove(this.searchLabelGraphic);
                this.searchLabelGraphic = null;
            }
        },

        showBadge : function(show) {
            var indicator = dom.byId('badge_followTheMapMode');
            if (show) {
                domStyle.set(indicator,'display','');
                domAttr.set(indicator, "title", i18n.widgets.popupInfo.followTheMap);
                domAttr.set(indicator, "alt", i18n.widgets.popupInfo.followTheMap);
            } else {
                domStyle.set(indicator,'display','none');
            }
        },

    });
    if (has("extend-esri")) {
        lang.setObject("dijit.PopupInfo", Widget, esriNS);
    }
    return Widget;
});
