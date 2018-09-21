define([
    "dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "dojo/dom","esri/kernel", 
    "dijit/_WidgetBase", "dojo/on", "dojo/mouse", "dijit/focus",
    "dojo/query", "esri/toolbars/navigation", "dijit/registry",
    "esri/dijit/HomeButton", "esri/dijit/LocateButton", 
    "esri/symbols/SimpleLineSymbol", "esri/Color", "esri/symbols/SimpleFillSymbol", 
    "esri/graphic", "esri/geometry/Point", "esri/geometry/ScreenPoint",
    "esri/geometry/Circle",
    "esri/geometry/Extent",
    "esri/layers/FeatureLayer", "esri/tasks/query", 
    "dojox/gfx", 
    "dojo/i18n!application/nls/PopupInfo",
    "dojo/Deferred", "dojo/promise/all",
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", 
    "dojo/dom-construct", "dojo/_base/event", 
    "dojo/NodeList-dom", "dojo/NodeList-traverse"
    
    ], function (
        Evented, declare, lang, has, dom, esriNS,
        _WidgetBase, on, mouse, focusUtil,
        query, Navigation, registry,
        HomeButton, LocateButton, 
        SimpleLineSymbol, Color, SimpleFillSymbol,
        Graphic, Point, ScreenPoint,
        Circle, Extent,
        FeatureLayer, Query, 
        gfx, i18n,
        Deferred, all,
        domClass, domAttr, domStyle, 
        domConstruct, event
    ) {
    var Widget = declare("esri.dijit.SuperNavigator", [
        _WidgetBase, 
        Evented], {
        
        options: {
            map: null,
            toolBar:null,
            navToolBar:null,
            cursorColor:"black",
            cursorFocusColor:"red",
            zoomColor:'red',
            selectionColor: '#00008f',
            selectionSymbol: null,
            operationalLayers: null,
        },

        constructor: function (options, srcRefNode) {
            const defaults = lang.mixin({}, this.options, options);
            if(!defaults.selectionSymbol) {
                
                if(defaults.selectionColor && defaults.selectionColor !== undefined) {
                    defaults.map.infoWindow.fillSymbol.outline.color = 
                    defaults.map.infoWindow.markerSymbol.outline.color = 
                    defaults.map.infoWindow.lineSymbol.color = 
                        defaults.selectionColor;
                }

                const selectionColor = new Color().setColor(defaults.map.infoWindow.markerSymbol.outline.color);
                selectionColor.a = 0.225;
                
                defaults.selectionSymbol = new SimpleFillSymbol(
                    SimpleFillSymbol.STYLE_SOLID,
                    null,
                    //new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color('White'), 2), 
                    selectionColor);
            }
            
            // this._i18n = i18n;
            // this.domNode = srcRefNode;
            this.set("map", defaults.map);
            this.set("toolBar", defaults.toolBar);
            this.set("navToolBar", defaults.navToolBar);
            this.set("zoomColor", defaults.zoomColor);
            this.set("cursorColor", defaults.cursorColor);            
            this.set("cursorFocusColor", defaults.cursorFocusColor);    
            this.set("selectionSymbol", defaults.selectionSymbol);  
            this.set("operationalLayers", defaults.operationalLayers);
        },

        startup: function () {
            if (this.map.loaded) {
                this._init();
            } else {
                on.once(this.map, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }
        },

        cursorNav: null,
        cursor: null,
        cursorPos: null,
    
        _init: function () {
            const m = this.cursorToCenter();
            const mapSuperCursor = domConstruct.create('div', {
                id: 'mapSuperCursor',
                style:'position:absolute; pointer-events:none; display:none;',
            }, 'mapDiv_layers');

            this.map.isKeyboardNavigation = false;
            
            this.cursorNav = gfx.createSurface("mapSuperCursor", 40, 40);
            this.cursor = this.cursorNav.createGroup();
            const circle = this.cursor.createCircle({cx:20, cy:20, r:7}).setFill("transparent").setStroke(this.cursorFocusColor);
            const path = this.cursor.createPath("M20 0 L20 19 M20 21 L20 40 M0 20 L19 20 M21 20 L40 20").setStroke({color:"black", width:2});

            domStyle.set('mapSuperCursor', 'left', (this.cursorPos.x-20)+'px');
            domStyle.set('mapSuperCursor', 'top', (this.cursorPos.y-20)+'px');

            this.map.onResize = lang.hitch(this, function(ev) {
                const m = this.map.container.getBoundingClientRect();
                this.cursorPos = {x: ((m.right-m.left)/2), y: ((m.bottom-m.top)/2)};
                domStyle.set('mapSuperCursor', 'left', (this.cursorPos.x-20)+'px');
                domStyle.set('mapSuperCursor', 'top', (this.cursorPos.y-20)+'px');
            });

            on(this.map.container,'focus', lang.hitch(this, function() {
                domStyle.set('mapSuperCursor', 'display', 'block');
            }));

            on(this.map.container,'blur', lang.hitch(this, function() {
                domStyle.set('mapSuperCursor', 'display', 'none');
            }));

            on(this.map, 'click', lang.hitch(this, function(evn) {
                this.followTheMapMode(false);
                this.setCursorPos(this.map.toScreen(evn.mapPoint));
                this.clearZone();
            }));

            // on(this.map.infoWindow, 'show', lang.hitch(this, function() {
            // }));

            on(this.map.infoWindow, 'hide', lang.hitch(this, function() {
                this.clearZone();
            }));

            const mapDiv = this.map.container;
            on(mapDiv, 'keydown', lang.hitch(this, function(evn){
                const focusElement = document.querySelector(':focus');
                if(!focusElement || focusElement !== mapDiv) return; 
                switch(evn.keyCode)  {
                    case 13: //Enter
                        // https://gis.stackexchange.com/questions/78976/how-to-open-infotemplate-programmatically
                        this.emit("mapClick", {mapPoint:this.map.toMap(this.cursorPos)});
                        this.showPopup(evn, this.operationalLayers);
                        evn.preventDefault();
                        evn.stopPropagation();
                        break;
                }
            }));

        },

        cursorToCenter:function() {
            const m = this.map.container.getBoundingClientRect();
            this.cursorPos = new ScreenPoint(((m.right-m.left)/2), ((m.bottom-m.top)/2));
            return this.cursorPos;
        },

        cursorScroll:function(dx, dy) {
            var deferred = new Deferred();
            
            this.cursorPos.x += dx;
            this.cursorPos.y += dy;
            var m = this.map.container.getBoundingClientRect();
            if(this.cursorPos.x < 20) {
                this.map.centerAt(this.map.toMap(this.cursorPos)).then(
                    lang.hitch(this, function(){
                        this.map.toMap(this.setCursorPos(this.cursorToCenter()));
                        deferred.resolve();
                    })
                );
            }
            else if (this.cursorPos.x > this.map.container.getBoundingClientRect().width - 20) {
                this.map.centerAt(this.map.toMap(this.cursorPos)).then(
                    lang.hitch(this, function(){
                        this.map.toMap(this.setCursorPos(this.cursorToCenter()));
                        deferred.resolve();
                    })
                );
            }
            if(this.cursorPos.y < 20) {
                this.map.centerAt(this.map.toMap(this.cursorPos)).then(
                    lang.hitch(this, function(){
                        this.map.toMap(this.setCursorPos(this.cursorToCenter()));
                        deferred.resolve();
                    })
                );
            }
            else if (this.cursorPos.y > this.map.container.getBoundingClientRect().height - 20) {
                this.map.centerAt(this.map.toMap(this.cursorPos)).then(
                    lang.hitch(this, function(){
                        this.map.toMap(this.setCursorPos(this.cursorToCenter()));
                        deferred.resolve();
                    })
                );
            }
            else 
            {
                this.map.toMap(this.setCursorPos());
                deferred.resolve();
            }
           
            return deferred.promise;
        },

        setCursorPos: function(screenPoint) {
            if(screenPoint) {
                this.cursorPos = screenPoint;
            }
            domStyle.set('mapSuperCursor', 'left', (this.cursorPos.x-20)+'px');
            domStyle.set('mapSuperCursor', 'top', (this.cursorPos.y-20)+'px');
            return this.cursorPos;
        },

        queryZone : null,

        getFeaturesAtPoint: function(mapPoint, mode, layers) {
            this.loading(true);
            const deferred = new Deferred();

            this.features = [];
            if(!layers || layers.length === 0)
                deferred.resolve(this.features);
            else {

                let shape = this.map.extent;
                // if(!mapPoint) mapPoint = shape.getCenter();
                const w = shape.getWidth()/75;
                // var selectedFeature = this.map.infoWindow.getSelectedFeature();
                
                switch(mode) {
                    case 'point':
                        shape = new Circle({
                            center: mapPoint,
                            geodesic: false,
                            radius: w,
                        });
                        break;
                    case 'disk':
                        shape = new Circle({
                            center: mapPoint,
                            geodesic: false,
                            radius: w * 10,
                        });
                        break;
                    case 'extent':
                        shape = this.map.extent;
                        break;
                    case 'selection':
                        const feature = this.map.infoWindow.getSelectedFeature();
                        if(feature) {
                            shape = feature.geometry;
                            if(shape.type==='point') {
                                shape = new Circle({
                                    center: shape,
                                    geodesic: false,
                                    radius: w * 10,
                                });
                            }
                            else {
                                const extent = shape.getExtent().expand(1.5);
                                this.map.setExtent(extent);
                            }
                        }
                        else {
                            deferred.reject(i18n.widgets.popupInfo.noPreselectedFeature);
                            return deferred.promise;
                        }
                        break;
                }

                this.clearZone();
                this.queryZone = new Graphic(shape, this.selectionSymbol);
                this.map.graphics.add(this.queryZone);

                const deferrs = [];
                layers.map(function(layer) {
                    return layer.layerObject;
                })
                .filter(function(layer) { 
                    return layer && layer.selectFeatures && layer.selectFeatures !== undefined;
                })
                .forEach(lang.hitch(this, function(layer) {
                    const q = new Query();
                    q.outFields = ["*"];                    
                    q.where = "1=1";
                    q.geometry = shape;

                    q.spatialRelationship = "esriSpatialRelIntersects";
                    q.returnGeometry = true;

                    const def = layer.selectFeatures(
                        q, FeatureLayer.SELECTION_NEW, 
                        lang.hitch(this, function(results) {
                            this.features = this.features.concat(results);
                        })
                    );
                    deferrs.push(def);
                }));

                all(deferrs).then(lang.hitch(this, function() {
                    this.loading(false);
                    const features = this.features.filter(function(f) {
                        return f.getContent() != null;
                    });
                    if(features.length===0) {
                        deferred.reject(i18n.widgets.popupInfo.noFeatures);
                        return deferred.promise;
                    } 
                    else {
                        deferred.resolve(features);
                    }
                }));
            }
            return deferred.promise;
        },

        loading: function (show){
            const loading_infoPanel = dojo.byId('loading_infoPanel');
            if(!loading_infoPanel) return;

            if(show)
                domClass.replace(loading_infoPanel, "showLoading", "hideLoading");
            else
                domClass.replace(loading_infoPanel, "hideLoading", "showLoading");
            },

        clearZone: function() {
            if(this.queryZone) {
                this.map.graphics.remove(this.queryZone);
            }
        },

        layers: null,

        showPopup: function(evn, layers, mode) {
            this.showError('');

            const deferred = new Deferred();

            const center = this.map.toMap(this.cursorPos);
            const features = [];
            this.layers = layers;
            const visibleLayers = layers.filter(function (l) { 
                return l.hasOwnProperty("url") &&  l.layerObject && l.layerObject.visible && l.layerObject.visibleAtMapScale;
            });

            if(this.toolBar && this.toolBar.IsToolSelected('geoCoding')) 
                mode = 'point';
            
            if(!mode) {
                if(!evn.shiftKey && !evn.ctrlKey) {
                    mode = 'point';
                }
                else 
                if(evn.shiftKey && !evn.ctrlKey) {
                    mode = 'disk';
                }
                else 
                if(!evn.shiftKey && evn.ctrlKey) {
                    mode = 'extent';
                }
                else 
                if(evn.shiftKey && evn.ctrlKey) {
                    mode = 'selection';
                }
            }

            this.followTheMapMode(mode === 'extent');

            this.map.infoWindow.show();
            this.getFeaturesAtPoint(center, mode, visibleLayers)
            .then(lang.hitch(this, function(features){

                if(features && features !== undefined && features.length > 0) {
                    this.map.infoWindow.setFeatures(features);
                }
                else 
                    this.map.infoWindow.clearFeatures();

                if(!has('infoPanel'))
                    this.map.infoWindow.show(center);

                deferred.resolve();
            }),
            lang.hitch(this, function(error) {
                // console.error(error);
                this.showError(error);
                this.loading(false);
            }));
            return deferred.promise;
        },

        showError: function(error) {
            const errorDiv = dom.byId('popupInfoError');
            errorDiv.innerHTML = error;
            domStyle.set(errorDiv, 'display', error.isNonEmpty() ? '' : 'none');
            domStyle.set(dom.byId('popupInfoFooter'), 'display', error.isNonEmpty() ? 'none' : '');
        },

        badge:null,
        
        followTheMapMode: function(show) {
            if(!has('infoPanel')) return;

            if(show) {
                if(!this._followTheMapSignal) {
                    this._followTheMapSignal =  on(this.map, 'extent-change', lang.hitch(this, this._followTheMap));
                }
            } else {
                if(this._followTheMapSignal) {
                    this._followTheMapSignal.remove();
                    this._followTheMapSignal = null;
                }
            }
            if(this.badge) 
                this.badge(show);
        },

        _followTheMapSignal : null,
        _followTheMap: function() {
            if(this.layers) {
                this.showPopup(null, this.layers, 'extent')
                .then(
                    this.clearZone()
                );
            }
        }

    });

    if (has("extend-esri")) {
        lang.setObject("dijit.SuperNavigator", Widget, esriNS);
    }
    return Widget;
});