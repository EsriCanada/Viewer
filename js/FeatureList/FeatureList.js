define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/on",
    "dojo/Deferred", "dojo/promise/all", "dojo/query",
    "esri/tasks/query", "esri/tasks/QueryTask",
    "dojox/layout/ContentPane",
    "dojo/text!application/FeatureList/Templates/FeatureList.html",
    "dojo/text!application/FeatureList/Templates/FeatureListTemplate.html",
    "dojo/dom", "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event",
    "dojo/string",
    "application/FeatureList/FeatureListItem",
    "dojo/i18n!application/nls/FeatureList",
    "dojo/i18n!application/nls/resources",
    "esri/symbols/SimpleMarkerSymbol", "esri/symbols/PictureMarkerSymbol",
    "esri/symbols/CartographicLineSymbol",
    "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol",
    "esri/graphic", "esri/Color",
    "dojo/NodeList-dom", "dojo/NodeList-traverse"

    ], function (
        Evented, declare, lang, has, esriNS,
        _WidgetBase, _TemplatedMixin, on,
        Deferred, all, query,
        Query, QueryTask,
        ContentPane,
        FeatureList, listTemplate, 
        dom, domClass, domAttr, domStyle, domConstruct, event,
        string,
        FeatureListItem,
        i18n, Ri18n,
        SimpleMarkerSymbol, PictureMarkerSymbol,
        CartographicLineSymbol,
        SimpleFillSymbol, SimpleLineSymbol,
        Graphic, Color
    ) {
    var Widget = declare("esri.dijit.FeatureList", [_WidgetBase, _TemplatedMixin, Evented], {
        // defaults
        templateString: FeatureList,

        options: {
            map: null,
            layers: null,
            visible: true
        },

        constructor: function (options, srcRefNode) {
            var defaults = lang.mixin({}, this.options, options);
            this.domNode = srcRefNode;

            dojo.create("link", {
                href : "js/FeatureList/Templates/FeatureList.css",
                type : "text/css",
                rel : "stylesheet",
            }, document.head);

            // properties
            this.set("map", defaults.map);
            var Layers = this._getLayers(defaults.layers);
            this.set("Layers", Layers);

            if(options.animatedMarker) {
                this.markerSymbol = new esri.symbol.PictureMarkerSymbol({
                    "angle": 0,
                    "xoffset": 0,
                    "yoffset": 0,
                    "type": "esriPMS",
                    "url": require.toUrl("./"+options.markerImage),
                    "contentType": "image/gif",
                    "width": options.markerSize,
                    "height": options.markerSize
                });
            } else {
                this.markerSymbol = new SimpleMarkerSymbol({
                      "color": [3,126,175,20],
                      "size": options.markerSize,
                      "xoffset": 0,
                      "yoffset": 0,
                      "type": "esriSMS",
                      "style": "esriSMSCircle",
                      "outline": {
                        "color": [3,26,255,220],
                        "width": 2,
                        "type": "esriSLS",
                        "style": "esriSLSSolid"
                      }
                    });
            }
            // this.css = {
            // };
            var featureListHeader = dom.byId('pageHeader_features');
            dojo.create('div', {
                id: 'featureListCount',
                class:'fc bg',
                'aria-live': 'polite',
                'aria-atomic': 'true',
                tabindex: 0
            },featureListHeader);

        },

        _getLayers : function(layers) {
            var l1 = layers.filter(function (l) { return l.hasOwnProperty("url");});
            var l2 = layers.filter(function (l) { return !l.hasOwnProperty("url");});
            if(l2.length>0) {
                console.info("Feature List - These Layers are not services: ", l2);
            }
            return l1;
        },

        startup: function () {
            if (!this.map) {
                this.destroy();
                console.log("FeaturesList::map required");
            }
            if (this.map.loaded) {
                this._init();
            } else {
                on.once(this.map, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }
        },

        _init: function () {
            this._createList();
            this.set("loaded", true);
            this.emit("load", {});

            on(this.toolbar, 'updateTool_features', lang.hitch(this, function(name) {
                this._reloadList(this.map);
                dom.byId('pageBody_features').focus();
            }));
        },

        _isVisible : function() {
            var page = query(this.domNode).closest('.page')[0];
            return dojo.hasClass(page, "showAttr");
        },

        _clearMarker: function() {
            this.map.graphics.graphics.forEach(lang.hitch(this, function(gr) {
                if(gr.name && gr.name === 'featureMarker') {
                    this.map.graphics.remove(gr);
                }
            }));
        },

        __reloadList : function(ext) {
            var deferred = new Deferred();

            lang.hitch(this, this.showBadge(false));

            const list = dom.byId('featuresList');
            this._clearMarker();
            this.tasks.filter(function(t) {
                return t.layer.visible && t.layer.visibleAtMapScale;// && t.layer.infoTemplate;
            }).forEach(lang.hitch(this.map, function(t) {
                t.query.geometry = ext.extent;
                try {
                    var exp=t.layer.getDefinitionExpression();
                    t.query.where = exp;
                    t.result = t.task.execute(t.query);
                }
                catch (ex) {
                    // ignore
                }
            }));

            var promises = all(this.tasks.map(function(t) {return t.result;}));

            promises.then(lang.hitch(this, function(results) {
                list.innerHTML = "";
                let count = 0;
                let preselected = null;
                if(results) for(let i = 0; i<results.length; i++)
                {
                    const layer = this.tasks[i].layer;
                    if(layer.visible && layer.visibleAtMapScale && layer.infoTemplate) {
                        const result = results[i];

                        if(result) {
                            count += result.features.length;
                            for(let j = 0; j<result.features.length; j++) {
                                const resultFeature = result.features[j];
                                if(this._prevSelected && this._prevSelected.split('_')[1] == resultFeature.attributes[result.objectIdFieldName]) {
                                    preselected = resultFeature;
                                }

                                const li = domConstruct.create("li", {}, list);
                                const featureListItem = this._getFeatureListItem(i, resultFeature, result.objectIdFieldName, layer, li, listTemplate);
                               //  if(featureListItem)
                               //  {
                               //      const li = domConstruct.create("li", {
                               //          // tabindex : 0,
                               //          innerHTML : featureListItem
                               //      }, list);
                               // }
                            }
                        }
                    }
                }
                if(!preselected) {
                    this._prevSelected = null;
                } else {
                    var checkbox = query("#featureButton_"+this._prevSelected)[0];
                    if(checkbox) {
                        checkbox.checked = true;
                        this.featureExpand(checkbox, true);
                        checkbox.focus();
                    }
                }

                dom.byId('featureListCount').innerHTML = Ri18n.totalCount.format(count);

                deferred.resolve(true);
            }));
            return deferred.promise;
        },

        _reloadList : function(ext) {
            if(!this._isVisible()) return;
            const loading_features = this.domNode.parentNode.parentNode.querySelector('#loading_features');

            domClass.replace(loading_features, "showLoading", "hideLoading");

            lang.hitch(this, this.__reloadList(ext).then(lang.hitch(this, function(results) {
                domClass.replace(loading_features, "hideLoading", "showLoading");
            })));
        },

        showBadge : function(show) {
            var indicator = dom.byId('badge_featureSelected');
            if (show) {
                domStyle.set(indicator,'display','');
                domAttr.set(indicator, "title", i18n.widgets.featureList.featureSelected);
                domAttr.set(indicator, "alt", i18n.widgets.featureList.featureSelected);
            } else {
                domStyle.set(indicator,'display','none');
            }
        },

        _createList: function(){
            this.tasks = [];
            for(var l = 0; l<this.Layers.length; l++) {
                layer = this.Layers[l];
                var _query = new Query();
                _query.outFields = ["*"];
                _query.returnGeometry = false;
                _query.spatialRelationship = "esriSpatialRelIntersects";
                if(!layer || !layer.layerObject)
                    continue;
                this.tasks.push({
                    layer : layer.layerObject,
                    task : new QueryTask(this.map._layers[layer.id].url),
                    query : _query
                });
            }

            this.featurePanZoom = function(el, panOnly) {
                var result = this.tasks[el.dataset.layerid];
                var fid = el.dataset.featureid;
                var layer = result.layer;
                var objectIdFieldName = result.layer.objectIdField;

                q = new Query();
                q.where = objectIdFieldName+"="+fid;
                q.outFields = [objectIdFieldName];
                q.returnGeometry = true;
                result.task.execute(q).then(function(ev) {
                    var geometry = ev.features[0].geometry;
                    if(panOnly) {
                        if (geometry.type !== "point") {
                            geometry = geometry.getExtent().getCenter();
                        }
                        layer._map.centerAt(geometry);
                    } else {
                        if(geometry.type === "point") {
                            layer._map.centerAndZoom(geometry, 13);
                        } else {
                            var extent = geometry.getExtent().expand(1.5);
                            layer._map.setExtent(extent);
                        }
                    }
                });
            };

            on(this.map, "extent-change", lang.hitch(this, this._reloadList));

        },

        _getFeatureListItem: function(result, resultFeature, objectIdFieldName, layer, li, listTemplate) {
            return new FeatureListItem({
                result:result, 
                feature:resultFeature, 
                objectIdFieldName:objectIdFieldName, 
                layer:layer,
                featureList:this,
                _restore:false,
            }, li);
        },
    
        _prevSelected: null,
        featureExpandAndZoom: function(event) {//, checkbox) {
            // console.log('featureExpandAndZoom', event);
            if(event.charCode === 43 || event.charCode === 45 || event.charCode === 46) { // +,- or .
                checkbox.checked = !checkbox.checked;
                this.featureExpand(checkbox, false);
                if(checkbox.checked) {
                    var btn = document.querySelector(((event.charCode === 43) ? '#zoomBtn_' : '#panBtn_')+checkbox.value.replace(',','_'));
                    btn.click();
                }
            }
        },

    });
    if (has("extend-esri")) {
        lang.setObject("dijit.FeaturesList", Widget, esriNS);
    }
    return Widget;
});

