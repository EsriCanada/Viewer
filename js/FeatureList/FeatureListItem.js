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
            layer:null
         },

        constructor: function (options, srcRefNode) {
            this.defaults = lang.mixin({}, this.options, options);
            this.domNode = srcRefNode;

            this._layerId = this.defaults.result;
            this._featureId = this.defaults.feature.attributes[this.defaults.objectIdFieldName];
            this._title = this.defaults.layer.infoTemplate.title(this.defaults.feature);
            this._panTo = i18n.widgets.featureList.panTo;
            this._zoomTo = i18n.widgets.featureList.zoomTo;

        },

        featureExpand: function(event) { //checkBox, restore) {
            console.log('featureExpand', event);
            return;
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
            var r = this.tasks[values[0]];
            var objectIdFieldName = r.layer.objectIdField;
            var fid = values[1];
            var layer = r.layer;

            layer._map.graphics.graphics.forEach(lang.hitch(layer._map.graphics, function(gr) {
                if(gr.name && gr.name === 'featureMarker') {
                    this.remove(gr);
                }
            }));

            lang.hitch(this, this.showBadge(checkBox.checked));

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
                this._prevSelected = null;
            }
        },

        featureExpandAndZoom: function(event) {//, checkbox) {
            console.log('featureExpandAndZoom', event);
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
        lang.setObject("dijit.FeatureListItem", Widget, esriNS);
    }
    return Widget;
});
