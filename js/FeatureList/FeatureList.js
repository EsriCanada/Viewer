define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/on", 
    "dojo/Deferred", "dojo/promise/all", "dojo/query",
    "esri/tasks/query", "esri/tasks/QueryTask",
    "dojo/text!application/FeatureList/Templates/FeatureList.html",
    "dojo/dom", "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", 
    "application/FeatureList/FeatureListItem",
    "dojo/i18n!application/nls/FeatureList",
    "dojo/i18n!application/nls/resources",
    "esri/symbols/SimpleMarkerSymbol", "esri/symbols/PictureMarkerSymbol"

    ], function (
        Evented, declare, lang, has, esriNS,
        _WidgetBase, _TemplatedMixin, on, 
        Deferred, all, query,
        Query, QueryTask,
        FeatureList, 
        dom, domClass, domAttr, domStyle, domConstruct, 
        FeatureListItem,
        i18n, Ri18n,
        SimpleMarkerSymbol, PictureMarkerSymbol
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
            const Layers = this._getLayers(defaults.layers);
            this.set("Layers", Layers);

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

            const featureListHeader = dom.byId('pageHeader_features');
            dojo.create('div', {
                id: 'featureListCount',
                class:'fc bg',
                'aria-live': 'polite',
                'aria-atomic': 'true',
                tabindex: 0
            },featureListHeader);

        },

        _getLayers : function(layers) {
            const l1 = layers.filter(function (l) { return l.hasOwnProperty("url");});
            const l2 = layers.filter(function (l) { return !l.hasOwnProperty("url");});
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

            this.toolbar.hideBadge('featureSelected');

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
                                const featureListItem = this._getFeatureListItem(i, resultFeature, result.objectIdFieldName, layer, li);
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
                        const featureItem = query(checkbox).closest('.featureItem')[0];
                        const w = dijit.byId(featureItem.id);
                        w._featureExpand(checkbox, true);
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

            this.toolbar.hideLoading('features');

            lang.hitch(this, this.__reloadList(ext).then(lang.hitch(this, function(results) {
                this.toolbar.showLoading('features');
            })));
        },

        showBadge : function(show) {
            if (show) {
                this.toolbar.showBadge('featureSelected');
            } else {
                this.toolbar.hideBadge('featureSelected');
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

            on(this.map, "extent-change", lang.hitch(this, this._reloadList));
        },

        _getFeatureListItem: function(result, resultFeature, objectIdFieldName, layer, li) {
            return new FeatureListItem({
                result:result, 
                feature:resultFeature, 
                objectIdFieldName:objectIdFieldName, 
                layer:layer,
                featureList:this,
                _restore:false,
            }, domConstruct.create('div',{},li));
        },
    
        _prevSelected: null,

    });
    if (has("extend-esri")) {
        lang.setObject("dijit.FeaturesList", Widget, esriNS);
    }
    return Widget;
});

