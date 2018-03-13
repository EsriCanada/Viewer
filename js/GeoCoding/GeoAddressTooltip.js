define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel", 
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", 
    "dojo/on", 
    "esri/tasks/locator", "esri/geometry/webMercatorUtils",
    "dojo/query", "dojo/Deferred",
    "dojo/text!application/GeoCoding/templates/GeoAddressTooltip.html", 
    "dojo/dom", "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", 
    "esri/geometry/Point",
    "dojo/parser", "dojo/ready",
    "dojo/i18n!application/nls/PopupInfo",
    "dojo/parser", "dojo/ready"
], function (
        Evented, declare, lang, has, esriNS,
        _WidgetBase, _TemplatedMixin, 
        on, 
        Locator, webMercatorUtils,
        query, Deferred,
        GeoAddressTooltip, 
        dom, domClass, domAttr, domStyle, domConstruct, 
        Point,
        parser, ready,
        i18n
    ) {

    ready(function(){
        // Call the parser manually so it runs after our widget is defined, and page has finished loading
        parser.parse();
    });

    var Widget = declare("esri.dijit.GeoAddressTooltip", [_WidgetBase, _TemplatedMixin, Evented], {
        // defaults
        templateString: GeoAddressTooltip,

        options: {
            map: null,
            toolbar: null, 
            header: 'pageHeader_geoCoding',
            superNavigator : null,
            iconColor: 'white',
            themeColor: 'navy',
            addressTooltipButton: null,
            locator: null
        },

        constructor: function (options, srcRefNode) {
            var defaults = lang.mixin({}, this.options, options);
            this.domNode = srcRefNode;
            this.widgetsInTemplate = true;

            this.map = defaults.map;
            this.toolbar = defaults.toolbar;
            this.iconColor = defaults.iconColor;
            this.themeColor = defaults.themeColor;

            this._i18n = i18n;
            // this.superNavigator = defaults.superNavigator;
            this.addressTooltipButton = defaults.addressTooltipButton;
            this.locator = defaults.locator;
        },

        startup: function () {
            if (!this.map || !this.toolbar) {
                this.destroy();
                console.log("GeoAddressTooltips: map or toolbar required");
            }
            if (this.map.loaded) {
                this._init();
            } else {
                on.once(this.map, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }
        },

        locatorSignal: null,

        switchTooltips: function(active) {
        	switch(active) {
        		case false: 
                    if(this.locatorSignal) {
                        this.locatorSignal.remove();
                        this.locatorSignal = null;
                        this.closeDialog();
                        }
        			break;
        		case true:
                    this.locatorSignal = this.map.on('mouse-move', lang.hitch(this, this.hoverMap));
        			break;
        	}
        },

        _init: function () {

            this.loaded = true;

            this.addressToolTip = query('.address-tooltip')[0];
            this.tipHeader = dom.byId('addrHintTitle');
            this.tipContent = dom.byId('addrHintContent');

            this.addressTooltipButton.activate = lang.hitch(this, this.switchTooltips);

            on(this.toolbar, 'updateTool', lang.hitch(this, function(name) {
                if(this.addressTooltipButton.isActive()) {
                    this.addressTooltipButton.activate(name === 'geoCoding');
                }
            }));

            this.spikeNE = dom.byId('spikeNE');
            this.spikeNW = dom.byId('spikeNW');
            this.spikeSE = dom.byId('spikeSE');
            this.spikeSW = dom.byId('spikeSW');

            // this.mapDiv = this.map.container;

            lang.hitch(this, this.getMapBounds);
            this.map.on('resize', lang.hitch(this, this.getMapBounds));
		},

		getMapBounds: function(){
            this.mapH = this.map.container.clientHeight;
			this.mapW = this.map.container.clientWidth;
            this.mapMin = {x:this.map.container.clientLeft, y:this.map.container.clientTop};
            this.mapMax = {x:this.map.container.clientLeft+this.mapW, y:this.map.container.clientTop+this.mapH};
            this.mapCenter = {x:this.mapW/2+this.mapMin.x, y:this.mapH/2+this.mapMin.y};
		},

		showTooltip: function (evt){
            this.closeDialog();
            var address = evt.address;
            
            if(address.Addr_type.isNonEmpty()) {
                var prop = address.Addr_type.replace(' ', '');
                address.AddrTypeLoc = (i18n.widgets.hasOwnProperty('addrType') && i18n.widgets.addrType.hasOwnProperty(prop)) ?
                i18n.widgets.addrType[prop] : address.Addr_type;
            }
            if(address.Type.isNonEmpty()) {
                var prop1 = address.Type.replace(' ', '');
                address.TypeLoc = " - <i>"+((i18n.widgets.hasOwnProperty('addrType') && 
                    i18n.widgets.addrType.hasOwnProperty(prop1)) ?
                i18n.widgets.addrType[prop1] : address.Type) + "</i>";
            } 
            else {
                address.TypeLoc = '';
            }

            var location = this.map.toScreen(evt.location);
            if(location.x <= this.mapCenter.x && location.y<=this.mapCenter.y) {
            	// console.log("NW");
            	domStyle.set(this.spikeNE, "display", "");
            	domStyle.set(this.spikeNW, "display", "block");
            	domStyle.set(this.spikeSE, "display", "");
            	domStyle.set(this.spikeSW, "display", "");

            	domStyle.set(this.addressToolTip, "top", (location.y+12)+"px");
            	domStyle.set(this.addressToolTip, "bottom", "");
            	domStyle.set(this.addressToolTip, "left", (location.x-12)+"px");
            	domStyle.set(this.addressToolTip, "right", "");
            } else if(location.x > this.mapCenter.x && location.y<=this.mapCenter.y) {
            	// console.log("NE");
            	domStyle.set(this.spikeNE, "display", "block");
            	domStyle.set(this.spikeNW, "display", "");
            	domStyle.set(this.spikeSE, "display", "");
            	domStyle.set(this.spikeSW, "display", "");

            	domStyle.set(this.addressToolTip, "top", (location.y+12)+"px");
            	domStyle.set(this.addressToolTip, "bottom", "");
            	domStyle.set(this.addressToolTip, "right", (this.mapW-location.x-15)+"px");
            	domStyle.set(this.addressToolTip, "left", "");
            } else if(location.x <= this.mapCenter.x && location.y>this.mapCenter.y) {
            	// console.log("SW");
            	domStyle.set(this.spikeNE, "display", "");
            	domStyle.set(this.spikeNW, "display", "");
            	domStyle.set(this.spikeSE, "display", "");
            	domStyle.set(this.spikeSW, "display", "block");

            	domStyle.set(this.addressToolTip, "top", "");
            	domStyle.set(this.addressToolTip, "bottom", (this.mapH-location.y+12)+"px");
            	domStyle.set(this.addressToolTip, "left", (location.x-15)+"px");
            	domStyle.set(this.addressToolTip, "right", "");
            } else if(location.x > this.mapCenter.x && location.y>this.mapCenter.y) {
            	// console.log("SE");
            	domStyle.set(this.spikeNE, "display", "");
            	domStyle.set(this.spikeNW, "display", "");
            	domStyle.set(this.spikeSE, "display", "block");
            	domStyle.set(this.spikeSW, "display", "");

            	domStyle.set(this.addressToolTip, "top", "");
            	domStyle.set(this.addressToolTip, "bottom", (this.mapH-location.y+12)+"px");
            	domStyle.set(this.addressToolTip, "left", "");
            	domStyle.set(this.addressToolTip, "right", (this.mapW-location.x-15)+"px");
            }

            this.tipHeader.innerHTML=address.AddrTypeLoc+address.TypeLoc;
            this.tipContent.innerHTML=address.Match_addr;

            domStyle.set(this.addressToolTip, "display", "block");

            this.map.setMapCursor('none');  
            this.tipContent.focus();            
        },

        closeDialog: function () {
            if(this.addressToolTip)
                this.addressToolTip.style = "display:none;";
            this.map.setMapCursor('default');
        },

        locatorDeffered: null,
        timeoutDeffered: null,
        timeout: null,

        hoverMap : function(ev) {
        	if(this.timeoutDeffered && !this.timeoutDeffered.isResolved() 
        		&& this.timeout) {
        		clearTimeout(this.timeout);
        		// this.timeoutDeffered.cancel("CancelError");
        	}

            if(this.locatorDeffered && !this.locatorDeffered.isFulfilled()) {
                this.closeDialog();
            }
            else 
            {
            	var location = this.map.toScreen(ev.mapPoint);
            	if(location.x < this.mapMin.x+12 || location.x>this.mapMax.x-18) {
		            this.map.setMapCursor('default');
            		return;
				}

				lang.hitch(this, this.asyncProcess(this.timeoutDeffered = new Deferred(), ev.mapPoint));
            }
        },

		asyncProcess: function (timeoutDeffered, mapPoint){
			this.timeout = setTimeout(lang.hitch(this, function(){
                this.locatorDeffered = this.locator.locationToAddress(
                    webMercatorUtils.webMercatorToGeographic(mapPoint), 1)
                .then(
                    lang.hitch(this, function(result) {
                        this.showTooltip(result);
                        timeoutDeffered.resolve("");
                    }),
                    function(error) {
                        if(error.name !== "CancelError")
                            console.log('locator eror: ', error);
                        timeoutDeffered.resolve("");
                    },
                    function() {
                    	this.timeout = null;
                    });
	    	}, 250));

		    return timeoutDeffered.promise;
	  	},

    });


    if (has("extend-esri")) {
        lang.setObject("dijit.GeoAddressTooltip", Widget, esriNS);
    }
    return Widget;
});
