define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/on",
    "dojo/Deferred", "dojo/promise/all", "dojo/query",
    "esri/tasks/query", "esri/tasks/QueryTask",
    "dojox/layout/ContentPane",
    "dojo/text!application/FeatureList/Templates/FeatureList.html",
    "dojo/dom", "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event",
    "dojo/string",
    "dojo/text!application/FeatureList/Templates/FeatureListTemplate.html",
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
        FeatureList,
        dom, domClass, domAttr, domStyle, domConstruct, event,
        string,
        listTemplate, i18n, Ri18n,
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

            window._this = this;

            if(options.animatedMarker) {
                window.markerSymbol = new esri.symbol.PictureMarkerSymbol({
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
                window.markerSymbol = new SimpleMarkerSymbol({
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

            lang.hitch(window._this, window._this.showBadge(false));

            var list = dom.byId('featuresList');
            this._clearMarker();
            window.tasks.filter(function(t) {
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

            var promises = all(window.tasks.map(function(t) {return t.result;}));

            promises.then(function(results) {
                list.innerHTML = "";
                var count = 0;
                var preselected = null;
                if(results) for(var i = 0; i<results.length; i++)
                {
                    var layer = window.tasks[i].layer;
                    if(layer.visible && layer.visibleAtMapScale && layer.infoTemplate) {
                        r = results[i];

                        if(r) {
                            count += r.features.length;
                            for(var j = 0; j<r.features.length; j++) {
                                var f = r.features[j];
                                if(window._prevSelected && window._prevSelected.split('_')[1] == f.attributes[r.objectIdFieldName]) {
                                    preselected = f;
                                }

                                var featureListItem = this._getFeatureListItem(i, f, r.objectIdFieldName, layer, listTemplate);
                                if(featureListItem)
                                {
                                    var li = domConstruct.create("li", {
                                        // tabindex : 0,
                                        innerHTML : featureListItem
                                    }, list);
                               }
                            }
                        }
                    }
                }
                if(!preselected) {
                    window._prevSelected = null;
                } else {
                    var checkbox = query("#featureButton_"+window._prevSelected)[0];
                    if(checkbox) {
                        checkbox.checked = true;
                        window.featureExpand(checkbox, true);
                        checkbox.focus();
                    }
                }

                dom.byId('featureListCount').innerHTML = Ri18n.totalCount.format(count);

                deferred.resolve(true);
            });
            return deferred.promise;
        },

        _reloadList : function(ext) {
            if(!this._isVisible()) return;
            var loading_features = this.domNode.parentNode.parentNode.querySelector('#loading_features');

            domClass.replace(loading_features, "showLoading", "hideLoading");

            this.__reloadList(ext).then(function(results) {
                domClass.replace(loading_features, "hideLoading", "showLoading");
            });
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
            window.tasks = [];
            for(var l = 0; l<this.Layers.length; l++) {
                layer = this.Layers[l];
                var _query = new Query();
                _query.outFields = ["*"];
                _query.returnGeometry = false;
                _query.spatialRelationship = "esriSpatialRelIntersects";
                if(!layer || !layer.layerObject)
                    continue;
                window.tasks.push({
                    layer : layer.layerObject,
                    task : new QueryTask(this.map._layers[layer.id].url),
                    query : _query
                });
            }

            window.featurePanZoom = function(el, panOnly) {
                var r = window.tasks[el.dataset.layerid];
                var fid = el.dataset.featureid;
                var layer = r.layer;
                var objectIdFieldName = r.layer.objectIdField;

                q = new Query();
                q.where = objectIdFieldName+"="+fid;
                q.outFields = [objectIdFieldName];
                q.returnGeometry = true;
                r.task.execute(q).then(function(ev) {
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

            window.featureExpandAndZoom = function(event, checkbox) {
                if(event.charCode === 43 || event.charCode === 45 || event.charCode === 46) { // +,- or .
                    checkbox.checked = !checkbox.checked;
                    window.featureExpand(checkbox, false);
                    if(checkbox.checked) {
                        var btn = document.querySelector(((event.charCode === 43) ? '#zoomBtn_' : '#panBtn_')+checkbox.value.replace(',','_'));
                        btn.click();
                    }
                }
            };

            window._prevSelected = null;
            window.featureExpand = function(checkBox, restore) {
                if(_prevSelected && !restore) {
                    dojo.query('.featureItem_'+_prevSelected).forEach(function(e) {
                        // dojo.removeClass(e, 'showAttr');
                        dojo.addClass(e, 'hideAttr');
                        var li = query(e).closest('li');
                        li.removeClass('borderLi');

                    });
                    dojo.query('#featureButton_'+_prevSelected).forEach(function(e) {
                        e.checked=false;
                    });
                }
                var values = checkBox.value.split(',');
                var r = window.tasks[values[0]];
                var objectIdFieldName = r.layer.objectIdField;
                var fid = values[1];
                var layer = r.layer;

                layer._map.graphics.graphics.forEach(lang.hitch(layer._map.graphics, function(gr) {
                    if(gr.name && gr.name === 'featureMarker') {
                        this.remove(gr);
                    }
                }));

                lang.hitch(window._this, window._this.showBadge(checkBox.checked));

                var li = query(checkBox).closest('li');
                li.addClass('borderLi');
                if(checkBox.checked)
                {
                    _prevSelected = values[0]+'_'+fid;
                    var featureControls = li[0].querySelector('.featureControls');
                    dojo.removeClass(featureControls, 'hideAttr');
                    var featureContent = li[0].querySelector('.featureContent');
                    dojo.removeClass(featureContent, 'hideAttr');
                    var featureContentPane = li[0].querySelector('.featureContentPane');

                    var q = new Query();
                    q.where = objectIdFieldName+"="+fid;
                    q.outFields = layer.fields.map(function(fld) {return fld.name;});//objectIdFieldName];
                    q.returnGeometry = true;
                    r.task.execute(q).then(function(ev) {
                        var feature = ev.features[0];
                        if(!featureContentPane.attributes.hasOwnProperty('widgetid')) {
                            var contentPane = new ContentPane({ }, featureContentPane);
                            contentPane.startup();

                            var myContent = layer.infoTemplate.getContent(feature);

                            contentPane.set("content", myContent).then(lang.hitch(this, function() {
                                var mainView = featureContentPane.querySelector('.esriViewPopup');
                                if(mainView) {
                                    domAttr.set(mainView, 'tabindex',0);

                                    var mainSection = mainView.querySelector('.mainSection');
                                    if(mainSection) {
                                        domConstruct.destroy(mainSection.querySelector('.header'));
                                    }

                                    var attrTables = query('.attrTable', mainSection);
                                    if(attrTables && attrTables.length > 0) {
                                        for(var i = 0; i<attrTables.length; i++) {
                                            var attrTable = attrTables[i];
                                            // domAttr.set(attrTable, 'role', 'presentation');
                                            var attrNames = query('td.attrName', attrTable);
                                            if(attrNames && attrNames.length > 0) {
                                                for(var j = 0; j<attrNames.length; j++) {
                                                    attrNames[j].outerHTML = attrNames[j].outerHTML.replace(/^<td/, '<th').replace(/td>$/, 'th>');
                                                }
                                            }
                                        }
                                    }

                                    var images = query('.esriViewPopup img', myContent.domNode);
                                    if(images) {
                                        images.forEach(function(img) {
                                            var alt = domAttr.get(img, 'alt');
                                            if(!alt) {
                                                domAttr.set(img,'alt','');
                                            } else {
                                                domAttr.set(img,'tabindex',0);
                                                if(!domAttr.get(img, 'title'))
                                                {
                                                    domAttr.set(img,'title', alt);
                                                }
                                            }
                                        });
                                    }
                                }
                            }));
                        }

                        li[0].scrollIntoView({block: "start", inline: "nearest", behavior: "smooth"});

                        var markerGeometry;
                        var marker;

                        switch (feature.geometry.type) {
                            case "point":
                                markerGeometry = feature.geometry;
                                marker = markerSymbol;
                                break;
                            case "extent":
                                markerGeometry = feature.getCenter();
                                // marker = new SimpleMarkerSymbol
                                break;
                            case "polyline" :
                                markerGeometry = feature.geometry;
                                marker = new CartographicLineSymbol(
                                    CartographicLineSymbol.STYLE_SOLID, new Color([0, 127, 255]), 10,
                                    CartographicLineSymbol.CAP_ROUND,
                                    CartographicLineSymbol.JOIN_ROUND, 5);
                                break;
                            default:
                                // if the feature is a polygon
                                markerGeometry = feature.geometry;
                                marker = new SimpleFillSymbol(
                                    SimpleFillSymbol.STYLE_SOLID,
                                    new SimpleLineSymbol(
                                        SimpleLineSymbol.STYLE_SOLID,
                                        new Color([0, 127, 255]), 3),
                                        new Color([0, 127, 255, 0.25]));
                                break;
                        }

                        var gr = new Graphic(markerGeometry, marker);
                        gr.name = 'featureMarker';
                        layer._map.graphics.add(gr);
                    });
                } else {
                    li.removeClass('borderLi');
                    dojo.query('.featureItem_'+_prevSelected).forEach(function(e) {
                        dojo.addClass(e, 'hideAttr');
                    });
                    window._prevSelected = null;
                }
            };


            on(this.map, "extent-change", lang.hitch(this, this._reloadList), this);

            _getFeatureListItem = function(r, f, objectIdFieldName, layer, listTemplate) {
                try {
                    var attributes = {
                        _featureId: f.attributes[objectIdFieldName],
                        _layerId: r,
                        _title: layer.infoTemplate.title(f),
                        _panTo: i18n.widgets.featureList.panTo,
                        _zoomTo: i18n.widgets.featureList.zoomTo,
                    };

                    var _substitute = function(template,attrs) {
                        var regex = /\${((?:\w)*)}/gm;

                        var matches = [];
                        var m;

                        while ((m = regex.exec(template)) !== null) {
                            // This is necessary to avoid infinite loops with zero-width matches
                            if (matches.index === regex.lastIndex) {
                                regex.lastIndex++;
                            }

                            matches.push(m);
                        }

                        matches.forEach(function(g) {
                            // console.log('g', g[0], g[1]);
                            var attr = '';
                            if(attrs.hasOwnProperty(g[1])) {
                                attr = attrs[g[1]];
                            }
                            template = template.replace(g[0], attr);
                        });

                        return(template);
                    };

                    return _substitute(listTemplate, attributes);
                } catch (e) {
                    console.log("Error on feature ("+featureId+")\n\t "+layer.infoTemplate.title(f)+"\n\t",e);
                    return null;
                }
            };
        },



    });
    if (has("extend-esri")) {
        lang.setObject("dijit.FeaturesList", Widget, esriNS);
    }
    return Widget;
});

