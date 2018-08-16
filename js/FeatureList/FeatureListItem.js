define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/on",
    "dojo/Deferred", "dojo/promise/all", "dojo/query",
    "esri/tasks/query", "esri/tasks/QueryTask",
    "dojox/layout/ContentPane",
    "dojo/text!application/FeatureList/Templates/FeatureListTemplate.html",
    "dojo/dom", "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event",
    "dojo/string",
    "dojo/i18n!application/nls/FeatureList",
    "dojo/i18n!application/nls/resources",
    "esri/symbols/SimpleMarkerSymbol", "esri/symbols/PictureMarkerSymbol",
    "esri/symbols/CartographicLineSymbol",
    "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol",
    "esri/graphic", "esri/Color"

    ], function (
        Evented, declare, lang, has, esriNS,
        _WidgetBase, _TemplatedMixin, on,
        Deferred, all, query,
        Query, QueryTask,
        ContentPane,
        FeaturelistItemTemplate, 
        dom, domClass, domAttr, domStyle, domConstruct, event,
        string,
        i18n, Ri18n,
        SimpleMarkerSymbol, PictureMarkerSymbol,
        CartographicLineSymbol,
        SimpleFillSymbol, SimpleLineSymbol,
        Graphic, Color
    ) {
    var Widget = declare("esri.dijit.FeatureListItem", [_WidgetBase, _TemplatedMixin, Evented], {
        // defaults
        templateString: FeaturelistItemTemplate,

        options: {
            result:null, 
            feature:null,
            objectIdFieldName:null, 
            layer:null,
            featureList:null,
            _restore:false,
         },

        constructor: function (options, srcRefNode) {
            this.defaults = lang.mixin({}, this.options, options);
            this.domNode = srcRefNode;

            this._layerId = this.defaults.result;
            this._featureId = this.defaults.feature.attributes[this.defaults.objectIdFieldName];
            this._title = this.defaults.layer.infoTemplate.title(this.defaults.feature);
            this._panTo = i18n.widgets.featureList.panTo;
            this._zoomTo = i18n.widgets.featureList.zoomTo;
            this.featureList = this.defaults.featureList;
            this._restore = this.defaults._restore; // ?
        },

        featureExpand: function(event) {
            this._featureExpand(event.target);
        },

        _featureExpand: function(checkBox, restore) {
            if(this.featureList._prevSelected && !restore) {
                dojo.query('.featureItem_'+this.featureList._prevSelected).forEach(function(e) {
                    // dojo.removeClass(e, 'showAttr');
                    dojo.addClass(e, 'hideAttr');
                    const li = query(e).closest('li');
                    li.removeClass('borderLi');

                });
                dojo.query('#featureButton_'+this.featureList._prevSelected).forEach(function(e) {
                    e.checked=false;
                });
            }

            const values = checkBox.value.split(',');
            const r = this.featureList.tasks[values[0]];
            const objectIdFieldName = r.layer.objectIdField;
            const fid = values[1];
            const layer = r.layer;

            layer._map.graphics.graphics.forEach(lang.hitch(layer._map.graphics, function(gr) {
                if(gr.name && gr.name === 'featureMarker') {
                    this.remove(gr);
                }
            }));

            lang.hitch(this, this.featureList.showBadge(checkBox.checked));

            const li = this.domNode;//query(checkBox).closest('li');
            // li.addClass('borderLi');
            domClass.add(li, 'borderLi');
            if(checkBox.checked)
            {
                this._prevSelected = this.featureList._prevSelected = values[0]+'_'+fid;
                const featureControls = li.querySelector('.featureControls');
                domClass.remove(featureControls, 'hideAttr');
                const featureContent = li.querySelector('.featureContent');
                domClass.remove(featureContent, 'hideAttr');
                const featureContentPane = li.querySelector('.featureContentPane');

                const q = new Query();
                q.where = objectIdFieldName+"="+fid;
                q.outFields = layer.fields.map(function(fld) {return fld.name;});//objectIdFieldName];
                q.returnGeometry = true;
                r.task.execute(q).then(lang.hitch(this, function(ev) {
                    const feature = ev.features[0];
                    if(!featureContentPane.attributes.hasOwnProperty('widgetid')) {
                        const contentPane = new ContentPane({ }, featureContentPane);
                        contentPane.startup();

                        const myContent = layer.infoTemplate.getContent(feature);

                        contentPane.set("content", myContent).then(lang.hitch(this, function() {
                            const mainView = featureContentPane.querySelector('.esriViewPopup');
                            if(mainView) {
                                domAttr.set(mainView, 'tabindex',0);

                                const mainSection = mainView.querySelector('.mainSection');
                                if(mainSection) {
                                    domConstruct.destroy(mainSection.querySelector('.header'));
                                }

                                const attrTables = query('.attrTable', mainSection);
                                if(attrTables && attrTables.length > 0) {
                                    for(let i = 0; i<attrTables.length; i++) {
                                        const attrTable = attrTables[i];
                                        // domAttr.set(attrTable, 'role', 'presentation');
                                        const attrNames = query('td.attrName', attrTable);
                                        if(attrNames && attrNames.length > 0) {
                                            for(let j = 0; j<attrNames.length; j++) {
                                                attrNames[j].outerHTML = attrNames[j].outerHTML.replace(/^<td/, '<th').replace(/td>$/, 'th>');
                                            }
                                        }
                                    }
                                }

                                const images = query('.esriViewPopup img', myContent.domNode);
                                if(images) {
                                    images.forEach(function(img) {
                                        const alt = domAttr.get(img, 'alt');
                                            if(img.src.startsWith('http:') && location.protocol==='https:') {
                                            img.src = img.src.replace('http:', 'https:');
                                        }
                                        if(!alt) {
                                            domAttr.set(img,'alt','Attached Image');
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

                    li.scrollIntoView({block: "start", inline: "nearest", behavior: "smooth"});

                    let markerGeometry = null;
                    let marker = null;

                    switch (feature.geometry.type) {
                        case "point":
                            markerGeometry = feature.geometry;
                            marker = this.featureList.markerSymbol;
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

                    const gr = new Graphic(markerGeometry, marker);
                    gr.name = 'featureMarker';
                    layer._map.graphics.add(gr);
                }));
            } else {
                domClass.remove(li, 'borderLi');
                dojo.query('.featureItem_'+this.featureList._prevSelected).forEach(function(e) {
                    domClass.add(e, 'hideAttr');
                });
                this.featureList._prevSelected = null;
            }
        },

        featurePan: function(event) {
            // console.log('pan');
            this.featurePanZoom(event.target, true);
        },

        featureZoom: function(event) {
            // console.log('zoom');
            this.featurePanZoom(event.target, false);
        },

        featurePanZoom: function(el, panOnly) {
            var result = this.featureList.tasks[el.dataset.layerid];
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
        }

    });
    if (has("extend-esri")) {
        lang.setObject("dijit.FeatureListItem", Widget, esriNS);
    }
    return Widget;
});
