define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel", 
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/registry",
    "dojo/on", 
    "dojo/Deferred", "dojo/query", 
    "dojo/text!application/GeoCoding/templates/GeoCodingHeader.html", 
    "dojo/dom", "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event", 
    "dojo/parser", "dojo/ready",
    "dijit/layout/ContentPane",    
    "dojo/string", 
    "dojo/i18n!application/nls/PopupInfo",
    "esri/domUtils",
    "esri/dijit/Popup",
    "dojo/NodeList-dom", "dojo/NodeList-traverse"
    
    ], function (
        Evented, declare, lang, has, esriNS,
        _WidgetBase, _TemplatedMixin, registry,
        on, 
        Deferred, query,
        GeoCodingHeaderTemplate, 
        dom, domClass, domAttr, domStyle, domConstruct, event, 
        parser, ready,
        ContentPane,
        string,
        i18n,
        domUtils,
        Popup
    ) {

    // ready(function(){
    //     // Call the parser manually so it runs after our widget is defined, and page has finished loading
    //     parser.parse();
    // });

    var Widget = declare("esri.dijit.GeoCodingHeader", [_WidgetBase, _TemplatedMixin, Evented], {
        // templateString: GeoCodingHeaderTemplate,

        options: {
            map: null,
            toolbar: null, 
            header: 'pageHeader_geoCoding',
            id: 'geoCodingHeadrId',
            popupInfo: null,
            superNavigator: null,
            template: GeoCodingHeaderTemplate,
            self: null,
        },

        constructor: function (options, srcRefNode) {
            var defaults = lang.mixin({}, this.options, options);
            this.domNode = srcRefNode;
            this.widgetsInTemplate = true;

            this.map = defaults.map;
            this.toolbar = defaults.toolbar;
            this.templateString = defaults.template;
            this.popupHeaderId = defaults.id;
            this._i18n = i18n;
            this.headerNode = dom.byId(defaults.header);
            this.popupInfo = defaults.popupInfo;
            this.emptyMessage = defaults.emptyMessage;
            this.contentPanel = defaults.contentPanel;
            this.self = defaults.self;
        },

        startup: function () {
            if (!this.map || !this.toolbar) {
                this.destroy();
                console.log("PopupInfo: map or toolbar required");
            }
            if (this.map.loaded) {
                this._init();
            } else {
                on.once(this.map, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }
        },

//https://developers.arcgis.com/javascript/3/sandbox/sandbox.html?sample=popup_sidepanel

        total:0,

        _init: function () {

            this.loaded = true;

            // var popup = this.map.infoWindow;

            on(query('#'+this.popupHeaderId+' .popupInfoButton.zoom')[0], 'click', lang.hitch(this, this.zoomTo));
            on(query('#'+this.popupHeaderId+' .popupInfoButton.map')[0], 'click', lang.hitch(this, this.toMap));
            on(query('#'+this.popupHeaderId+' .popupInfoButton.clear')[0], 'click', lang.hitch(this, this.clearAddress));

            var buttons = query(".popupInfoButton");
            buttons.forEach(lang.hitch(this, function (btn) {
                on(btn,'keydown', lang.hitch(this, function(ev) {
                    switch(ev.keyCode) {
                        case 13: 
                            btn.click();
                            ev.stopPropagation();
                            ev.preventDefault();
                            break;
                        case 40: // down
                            dojo.byId("geoCodingContent").focus();
                            ev.stopPropagation();
                            ev.preventDefault();
                            break;
                        case 90: // Z
                            this.ToZoom();
                            ev.stopPropagation();
                            ev.preventDefault();
                            break;
                        case 77: // M
                        case 80: // P
                            this.ToMap();
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

            // on(popup, "SelectionChange", lang.hitch(this, function() {
            //     if(popup.selectedIndex>=0) {
            //         dom.byId('featureIndex').innerHTML = popup.selectedIndex + 1;
            //     }
            // }));

            // on(popup, "SetFeatures", lang.hitch(this, function() {
            //     if(popup.features && popup.features.length > 0) {
            //         // this.setTotal(popup.features.length);
            //     }
            //     else {
            //         this.clearFeatures();
            //     }
            // }));

        },

        ToZoom: function() {
            query('.popupInfoButton.zoom')[0].focus();
        },

        ToMap : function() {
            var _toMap = query('.popupInfoButton.map')[0];
            _toMap.focus();
            _toMap.click();
        },

        ToClear : function() {
            query('.popupInfoButton.clear')[0].focus();
        },

        clearAddress : function(ev) {
            lang.hitch(self, this.self.clearSearchGraphics());
            this.contentPanel.set("content", i18n.widgets.geoCoding.instructions);
            this.map.container.focus();
        },

        toMap : function(ev) {
            this.map.container.focus();
            this.clearSuperNavigator();
       },

        zoomTo : function(ev) {
            this.panZoom();
            this.clearSuperNavigator();
        },

        panZoom: function() {
            var marker = this.self.geoCodingMarkerGraphic;
            if(marker) {
                var addrType = marker.attributes.Addr_type;
                var zoomLevel = 13;
                switch (addrType) {
                    case 'PointAddress' :
                        zoomLevel = 18;
                        break;
                    case 'StreetAddress' :
                    case 'StreetName' :
                        zoomLevel = 16;
                        break;
                    case 'Park' :
                        zoomLevel = 15;
                        break;
                    case 'Locality' :
                        zoomLevel = 10;
                        break;
                    case 'Postal' :
                        zoomLevel = 8;
                        break;
                }
                this.map.centerAndZoom(this.self.geoCodingMarkerGraphic.geometry, zoomLevel);
            }
        },

        clearSuperNavigator: function() {
            if(this.superNavigator) 
                this.superNavigator.clearZone();
        },


    });
    if (has("extend-esri")) {
        lang.setObject("dijit.GeoCodingHeader", Widget, esriNS);
    }
    return Widget;
});
