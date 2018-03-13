define([
    "dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", 
    "esri/arcgis/utils", "dojo/has", "dojo/dom","esri/kernel", 
    "dijit/layout/_LayoutWidget", 
    "esri/dijit/FeatureTable", 
    "application/ImageToggleButton/ImageToggleButton", 
    "esri/map", "dojo/_base/array", 
    "dojo/i18n!application/nls/ShowFeatureTable",
    "dojo/i18n!application/nls/resources",
    "dojo/on", "dojo/query", 
    "esri/tasks/query", "esri/tasks/QueryTask",
    "dijit/registry", "dojo/aspect", 
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", 
    "esri/toolbars/draw",
    "dijit/layout/ContentPane", "dijit/layout/BorderContainer",
    "dijit/form/DropDownButton", "dijit/DropDownMenu", "dijit/MenuItem", "dijit/MenuSeparator",
    "dojo/dom-construct", "dojo/_base/event", 
    // "esri/symbols/SimpleMarkerSymbol", 
    "esri/symbols/PictureMarkerSymbol", 
    "esri/symbols/CartographicLineSymbol", 
    "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol",
    "esri/graphic", "esri/Color", "esri/graphicsUtils",
    "dojo/NodeList-dom", "dojo/NodeList-traverse"
    
    ], function (
        Evented, declare, lang, arcgisUtils, has, dom, esriNS,
        _LayoutWidget,
        FeatureTable, 
        ImageToggleButton,
        Map, array,
        i18n, Ri18n,
        on, query, 
        Query, QueryTask,
        registry, aspect,
        domClass, domAttr, domStyle,
        Draw,
        ContentPane, BorderContainer, 
        DropDownButton, DropDownMenu, MenuItem, MenuSeparator,
        domConstruct, event,
        // SimpleMarkerSymbol, 
        PictureMarkerSymbol, 
        CartographicLineSymbol, 
        SimpleFillSymbol, SimpleLineSymbol,
        Graphic, Color, graphicsUtils
    ) {
    var Widget = declare("esri.dijit.ShowFeatureTable", [
        _LayoutWidget,
        Evented], {

        widgetsInTemplate: true, // ?

        options: {
            map: null,
            layers: null,
        },

        _getShowAttr: function() { 
            if (!dojo.byId('featureTableContainer_splitter')) return false;
            return domStyle.get(dojo.byId('featureTableContainer_splitter'), "display") !== "none";
        },
        _setShowAttr: function(visible) { 
            switch(visible){
                case true:
                    domStyle.set(dojo.byId('featureTableContainer'), "height","50%");
                    domStyle.set(dojo.byId('featureTableContainer_splitter'), "display", "block");
                    this.borderContainer.resize();
                    break;
                case false:
                    domStyle.set(dojo.byId('featureTableContainer'), "height","0");
                    domStyle.set(dojo.byId('featureTableContainer_splitter'), "display", "none");
                    this.borderContainer.resize();
                    break;
            }
            if(_gaq) _gaq.push(['_trackEvent', "Feature Table", !visible ? 'Visible' : 'Hidden']);
        },

        constructor: function (options, srcRefNode) {
            var defaults = lang.mixin({}, this.options, options);

            this.map = defaults.map;
            this.layers = defaults.layers;
            this.domNode = srcRefNode;
            this.containerNode = srcRefNode;

            dojo.create("link", {
                href : "js/ShowFeatureTable/Templates/ShowFeatureTable.css",
                type : "text/css",
                rel : "stylesheet",
            }, document.head);

            //if(options.animatedMarker) {
                this.pointMarker = new esri.symbol.PictureMarkerSymbol({
                    "angle": 0,
                    "xoffset": 0,
                    "yoffset": 0,
                    "type": "esriPMS",
                    "url": require.toUrl("./images/SelectPointMarker3.gif"),
                    "contentType": "image/gif",
                    "width": 33,
                    "height": 33
                });
            // } else {
            //     this.pointMarker = new SimpleMarkerSymbol({
            //           "color": [3,126,175,20],
            //           "size": options.markerSize,
            //           "xoffset": 0,
            //           "yoffset": 0,
            //           "type": "esriSMS",
            //           "style": "esriSMSCircle",
            //           "outline": {
            //             "color": [3,26,255,220],
            //             "width": 2,
            //             "type": "esriSLS",
            //             "style": "esriSLSSolid"
            //           }
            //         });
            // }

            this.lineMarker = new CartographicLineSymbol(
                CartographicLineSymbol.STYLE_SOLID, new Color([0, 127, 255]), 10, 
                CartographicLineSymbol.CAP_ROUND,
                CartographicLineSymbol.JOIN_ROUND, 5);

            this.polygonMarker = new SimpleFillSymbol(
                SimpleFillSymbol.STYLE_SOLID, 
                new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color([0, 127, 255]), 3),
                    new Color([0, 127, 255, 0.25]));

            this.borderContainer = new BorderContainer({
                design:'headline',
                gutters:false, 
                liveSplitters:true,
                class:"myBorderContainer",
                id:'bc',
                widgetsInTemplate: true
            });
             
            this.contentPaneMap = new ContentPane({
                region: "center",
                gutters:false, 
                splitter: false,
                style: "height:100%; width:100%; padding:0; overflow: none;",
                content: dojo.byId("mapDiv"), 
                id: 'contentPaneMap',
                class: "splitterContent",
            });
            this.borderContainer.addChild(this.contentPaneMap);

            this.contentPaneFeatureTable = new ContentPane({
                region: "bottom",
                gutters:false, 
                splitter: true,
                class: "bg",
                style: "height:50%;",
                id: 'featureTableContainer',
                content: domConstruct.create("div", { id: 'featureTableNode1'}),
            });

            this.borderContainer.addChild(this.contentPaneFeatureTable);
            this.borderContainer.placeAt(dojo.byId('mapPlace'));

            this.borderContainer.startup();

            domConstruct.create("div", {
                class:'goThereHint',
                innerHTML: '<b>Alt&nbsp;+&nbsp;7</b> '+Ri18n.skip.hsplitter,
                style:'left:40%; top: 0;'
            }, dom.byId('featureTableNode1'));

            domConstruct.create("div", {
                class:'goThereHint',
                innerHTML: '<b>Alt&nbsp;+&nbsp;8</b> '+Ri18n.skip.tableHeader,
                style:'left:5px; top:40px;'
            }, dom.byId('featureTableNode1'));

            domConstruct.create("div", {
                class:'goThereHint',
                innerHTML: '<b>Alt&nbsp;+&nbsp;9</b> '+Ri18n.skip.table,
                style:'left:20%; top:50%;'
            }, dom.byId('featureTableNode1'));
        },

        postCreate: function() {
            this.inherited(arguments);
            this.set('show', false);
            // on(this.map, 'extent-change', lang.hitch(this, function() {
            //     this.showRegionButton();
            // }));
        },

        layout:function() {
            this.inherited(arguments);
            this.map.resize();
            this.map.reposition();
        },

        startup: function () {
            on(this.map, 'parentSize_changed', lang.hitch(this, function(ev) {
                this.borderContainer.resize();
            }));
            aspect.after(
                this.contentPaneFeatureTable.containerNode.parentNode, "resize", 
                lang.hitch(this, function() {
                this.borderContainer.resize();
            }));            
            aspect.after(
                this.contentPaneMap, "resize", 
                lang.hitch(this, function() {
                this.resize();
            }));            
            this.resize();
        },

        destroy: function() {
            this._removeAllGraphics(['ftMarker', 'rectView']);
            if(this.myFeatureTable)
                this.myFeatureTable.destroy();
            this.emit("destroied", {});
            this.set('show', false);
        },

        _rectangleGr : null,

        draw:null,

        SelectOnRectangle:null,
        // SelectOnRegion:null,
        SelectOnMapOrView:null,

        loadTable: function(myFeatureLayer){
            var outFields = [];
            var fieldInfos = [];
            var fieldsMap = [];
            if(myFeatureLayer.layerObject.infoTemplate)
                fieldsMap = myFeatureLayer.layerObject.infoTemplate._fieldsMap;
            else {
                var fields = myFeatureLayer.layerObject.fields;
                for(var field in fields) {
                    fieldsMap.push(
                        {
                            fieldName: fields[field].name,
                            label: fields[field].alias,
                            isEditable: fields[field].editable,
                            tooltip: "",
                            visible: true
                        });
                }
            }
            for(var p in fieldsMap) {
                if(fieldsMap.hasOwnProperty(p) && fieldsMap[p].visible)
                {
                    var pField = fieldsMap[p];
                    outFields.push(pField.fieldName);

                    var fieldInfo = {
                        name : pField.fieldName,
                        alias: pField.label,
                    };
                    if(pField.hasOwnProperty('format') && pField.format) {
                        var format = pField.format;
                        if(format.hasOwnProperty('dateFormat')) {
                            fieldInfo.dateOptions= {
                                datePattern: i18n.widgets.showFeatureTable.datePattern,
                                timeEnabled: false,
                            };
                        } 
                        else if(format.hasOwnProperty('time')) {
                            fieldInfo.dateOptions = {
                                datePattern: i18n.widgets.showFeatureTable.shortDatePattern, 
                                timeEnabled: true,
                                timePattern: i18n.widgets.showFeatureTable.shortTimePattern,
                            };
                        }
                        else {
                            fieldInfo.format = format;
                        }
                    }

                    fieldInfos.push(fieldInfo);
                }
            }

            this.layer = myFeatureLayer;
            this.myFeatureTable = new FeatureTable({
                //id:"myFeatureTable0",
                "featureLayer" : myFeatureLayer.layerObject,
                "map" : this.map,
                showAttachments: true,
                syncSelection: false, 
                zoomToSelection: true, 
                gridOptions: {
                    allowSelectAll: false,
                    allowTextSelection: false,
                    // pagination: true,
                    // pagingDelay: 1000,
                    // pageSizeOptions: [50, 100, 500],
                },
                editable: false,
                dateOptions: {
                    datePattern: i18n.widgets.showFeatureTable.datePattern,
                    timeEnabled: false
                },
                
                "outFields": outFields,
                fieldInfos: fieldInfos,
                // showRelatedRecords: true,
                showDataTypes: true,
                // showFeatureCount:true,
                showStatistics:false,
                menuFunctions: [
                    {
                        label: i18n.widgets.showFeatureTable.showTypes, 
                        callback: lang.hitch(this, function(evt){
                            // console.log(" Callback evt: ", evt);
                            var typeLabels = query('.esri-feature-table-column-header-type');
                            if(typeLabels && typeLabels.length>0) {
                                var show = domStyle.get(typeLabels[0], 'display') === 'none';
                                var l = evt.toElement.innerText;
                                if(show) {
                                    typeLabels.forEach( function(label) { domStyle.set(label, 'display', '');});
                                    evt.toElement.innerText = i18n.widgets.showFeatureTable.hideTypes;
                                }
                                else {
                                    typeLabels.forEach( function(label) { domStyle.set(label, 'display', 'none');});
                                    evt.toElement.innerText = i18n.widgets.showFeatureTable.showTypes;
                                }
                                this.myFeatureTable.resize();
                            }
                        })
                    },

                    {
                        label: i18n.widgets.showFeatureTable.close, 
                        callback: lang.hitch(this, function(evt){
                            //this.destroy();
                            this.emit("destroy", {});
                        })
                    },
                ],
                cellNavigation:false,
                showColumnHeaderTooltips: false,
                showGridMenu: true,
            }, dojo.byId('featureTableNode'));

            this.myFeatureTable.startup();

            var hidderToggle = query('.ui-icon.dgrid-hider-toggle')[0];
            if(hidderToggle) {
                domClass.remove(hidderToggle, 'ui-icon');
                domConstruct.create('img', {
                    alt:'',
                    title: hidderToggle.attributes['aria-label'].value,
                    src:'images/icons_black/Columns.32.png',
                }, hidderToggle);
            }

            //this._addArrowCarrets();

            var tableTitle = query('.esri-feature-table-title')[0];

            if(this.layers && this.layers.length > 1) {
                var menu = new DropDownMenu({ style: "display: none;"});
                this.layers.forEach(lang.hitch(this, function(layer){
                    var menuItem1 = new MenuItem({
                        label: layer.title,
                        'data-layerid': layer.id,
                    });
                    if(!layer.layerObject.visible) {
                        domClass.add(menuItem1.domNode, 'menuItemDisabled');
                    }

                    on(menuItem1.domNode, 'click', lang.hitch(this, function(ev){ 
                        //console.log(layer.title, ev.target.parentElement.dataset.layerid, ev); 
                        this.emit("change", { layerId: ev.target.parentElement.dataset.layerid });
                    }));
                    //menu.addChild(menuItem1);
                    domConstruct.place(menuItem1.domNode, menu.domNode, 0);

                    on(layer.layerObject, "visibility-change", lang.hitch(this, function (evt) {
                        var layerId = evt.target.id;
                        if(layerId === this.layer.layerObject.id) {
                            this.emit("destroy", {}); 
                        }
                        var menuItem = query('.dijitMenuItem[data-layerId='+layerId+']');
                        
                        if(menuItem && menuItem.length>0) {
                            menuItem = menuItem[0];
                            if(evt.visible) {
                                domClass.remove(menuItem, 'menuItemDisabled');
                            } else {
                                domClass.add(menuItem, 'menuItemDisabled');
                            }
                        }

                        // this.showRegionButton();
                    }));
                }));
                var menuItem2 = new MenuSeparator();
                domConstruct.place(menuItem2.domNode, menu.domNode);
        
                var menuItem3 = new MenuItem({
                    label: i18n.widgets.showFeatureTable.close,
                });
                on(menuItem3.domNode, 'click', lang.hitch(this, function(ev){ 
                        //console.log(layer.title, ev.target.parentElement.dataset.layerid, ev); 
                        this.emit("destroy", {});
                    }));
                domConstruct.place(menuItem3.domNode, menu.domNode);
                menu.startup();

                var button = new DropDownButton({
                    label: 'label',
                    name: "progButton",
                    dropDown: menu,
                    id: "progButton",
                    role: 'application'
                });

                button.startup();

                this._addArrowCarrets();

                // tableTitle = query('.esri-feature-table-title')[0];
                // domStyle.set(tableTitle,'display', 'none');
                var titleNodeObserver = new MutationObserver(lang.hitch(this, function(mutations) {
                    // console.log(mutations);
                    mutations.forEach(lang.hitch(this, function(mutation) {
                        // console.log(mutation);
                        var target = mutation.target.childNodes[0];
                        if(target.toString() === "[object Text]") {
                            var pattern = /(.*)(\s\(.*\))/;
                            var matches = target.nodeValue.match(pattern);
                            // console.log(matches);
                            if(matches && matches.length === 3) {
                                var label = this.layer.title + matches[2];
                                var title = domConstruct.create('div', {
                                    //innerHTML: label,
                                    class: 'esri-feature-table-menu-item esri-feature-table-title titleDivDiv',
                                });

                                title.appendChild(button.domNode);
                                query('#progButton_label', title)[0].innerText = label;

                                query(".titleDivDiv").forEach(domConstruct.destroy);
                                domConstruct.place(title, tableTitle, 'before');
                                domStyle.set(tableTitle, 'display', 'none');
                                this._addArrowCarrets();
                            }
                        }
                    }));    
                }));
                titleNodeObserver.observe(tableTitle, { 
                    attributes: false, 
                    childList: true, 
                    characterData: true 
                });
            }

            var featureTableTools = domConstruct.create('div', {
                class:'esri-feature-table-menu-item',
                id: 'featureTableTools',
            });
            domConstruct.place(featureTableTools, tableTitle, 'before');

            var optionsMenu = query('.esri-feature-table-menu-item.esri-feature-table-menu-options')[0];

            var featureTableEndTools = domConstruct.create('div', {
                class:'esri-feature-table-menu-item',
                id: 'featureTableEndTools',
            }, optionsMenu);

            var closeBtn = domConstruct.create('img', {
                src: 'images/close.png',
                id: 'featureTableCloseBtn',
                alt: '',
                title: i18n.widgets.showFeatureTable.close,
            }, featureTableEndTools);
            on(closeBtn, 'click', lang.hitch(this, function(ev) { this.emit("destroy", {}); }));

            this.SelectOnRectangle = new ImageToggleButton({
                id:'btnSelectOnRectangle',
                // type:'radio',
                group:'selectOn',
                imgSelected: 'images/ListRectangle.Selected.png',
                imgUnselected: 'images/ListRectangle.Unselected.png',
                titleUnselected: i18n.widgets.showFeatureTable.listFromRectangle, 
                titleSelected: i18n.widgets.showFeatureTable.listFromMap,
                autoCloseMessage: false, 
                domMessage: dojo.byId('mapDiv_root'),
            }, domConstruct.create('div', {}, featureTableTools));
            this.SelectOnRectangle.startup();

            on(this.SelectOnRectangle, 'change', lang.hitch(this, function(ev) {
                if(this._rectangleGr) {
                    this.map.graphics.remove(this._rectangleGr);
                    this.myFeatureTable.clearFilter();
                }
                if(this._selectSignal) 
                    this._selectSignal.remove();

                if(this.SelectOnRectangle.isChecked()) {
                    this.draw = new Draw(this.map);
                    this.draw.activate(Draw.EXTENT, {
                        showTooltips: false,
                    });
                    this.map.setMapCursor("url(images/Select.cur),auto");
                    this.map.hideZoomSlider();
                    this.SelectOnRectangle.ShowMessage(i18n.widgets.showFeatureTable.selectOnRectangle, 'warning');
                    this.draw.on("draw-end", _endDraw);
                }
            }));

            // this.SelectOnRegion = new ImageToggleButton({
            //     id:'btnSelectOnRegion',
            //     // type:'radio',
            //     group:'selectOn',
            //     imgSelected: 'images/ListRegion.Selected.png',
            //     imgUnselected: 'images/ListRegion.Unselected.png',
            //     titleUnselected: i18n.widgets.showFeatureTable.listFromPolygon, 
            //     titleSelected: i18n.widgets.showFeatureTable.listFromMap, 
            //     domMessage: this.map.container,
            // }, domConstruct.create('div', {}, featureTableTools));
            // this.SelectOnRegion.startup();

            // on(this.SelectOnRegion, 'change', lang.hitch(this, function(ev) {
            //     if(this._rectangleGr) {
            //         this.map.graphics.remove(this._rectangleGr);
            //         this.myFeatureTable.clearFilter();
            //     }
            //     if(this._selectSignal) 
            //         this._selectSignal.remove();

            //     if(this.SelectOnRegion.isChecked()) {
            //         if(this.draw) {
            //             _endDraw();
            //         }

            //         var feature = this.map.infoWindow.getSelectedFeature();
            //         if(!feature || feature.geometry.type==='point') {
            //             this.SelectOnRegion.ShowMessage(i18n.widgets.showFeatureTable.selectOnRegion, 'error');
            //             this.SelectOnRegion.Check(false);
            //         }
            //         else {
            //             this.map.infoWindow.hide();
            //             this.map.infoWindow.clearFeatures();

            //             this._setSelectSymbol(feature.geometry);
            //         }
            //     }
            // }));

            this.SelectOnMapOrView = new ImageToggleButton({
                id:'btnSelectOnMapOrView',
                // type:'radio',
                group:'selectOn',
                imgSelected: 'images/ListExtent.Selected.png',
                imgUnselected: 'images/ListExtent.Unselected.png',
                titleUnselected: i18n.widgets.showFeatureTable.listFromView, 
                titleSelected: i18n.widgets.showFeatureTable.listFromMap, 
            }, domConstruct.create('div', {}, featureTableTools));
            this.SelectOnMapOrView.startup();

            on(this.SelectOnMapOrView, 'change', lang.hitch(this, function(ev) {
                if(this._rectangleGr) {
                    this.map.graphics.remove(this._rectangleGr);
                    this.myFeatureTable.clearFilter();
                }

                if(this.SelectOnMapOrView.isChecked()) {
                    if(this.draw) {
                        _endDraw();
                    }
                    this._selectViewIds();
                    this._selectSignal = on(this.map, "extent-change", 
                        lang.hitch(this, function() {this._selectViewIds();}));
                } else {
                    this._selectSignal.remove();
                }
            }));

            // this.showRegionButton();

            var _endDraw = lang.hitch(this, function(evt) {
                this.SelectOnRectangle.HideMessage();
                this.map.setMapCursor("default");
                
                this.draw.deactivate();
                this.map.showZoomSlider();

                if(evt && evt.geometry) {
                    this._setSelectSymbol(evt.geometry);
                }
            });

            this.set('show', true);

            dojo.create('img', {
                src:'images/reload1.gif',
                alt: 'Refresh',
                title: 'Refresh',
                style:'width:30px; height:30px;'
            }, query('.esri-feature-table-menu-item.esri-feature-table-loading-indicator')[0]);

            var typeLabels = query('.esri-feature-table-column-header-type');
            if(typeLabels && typeLabels.length>0) {
                //evt.toElement.innerText = i18n.widgets.showFeatureTable.showTypes;
                typeLabels.forEach( function(label) { domStyle.set(label, 'display', 'none');});
            }

            var dgridRowTable = query('.dgrid-row-table');
            if(dgridRowTable && dgridRowTable.length>0) {
                dgridRowTable.forEach(function(table) {
                    domAttr.remove(table, 'role');
                });
            }

            on(this.myFeatureTable, "error", function(evt){
                console.error("error event - ", evt);
            });

            on(this.myFeatureTable, "row-select", lang.hitch(this, function(evt){
                //this._selectSignal.remove();

                evt.rows.forEach(lang.hitch(this, function(row) {

                    var objectIdFieldName = this.layer.layerObject.objectIdField;
                    q = new Query();
                    q.where = objectIdFieldName+"="+row.id;
                    q.outFields = [objectIdFieldName];
                    q.returnGeometry = true;
                    new QueryTask(this.layer.layerObject.url).execute(q).then(lang.hitch(this, function(ev) {
                        var graphic = ev.features[0];
                        //console.log(ev, graphic);
                        var markerGeometry;
                        var marker;

                        switch (graphic.geometry.type) {
                            case "point":
                                markerGeometry = graphic.geometry;
                                marker = this.pointMarker;
                                break;
                            //case "extent":
                                // markerGeometry = graphic.getCenter();
                                // marker = new SimpleMarkerSymbol();
                                // break;
                            case "polyline" :
                                markerGeometry = graphic.geometry;
                                marker = this.lineMarker;
                                break;
                            default:
                                // if the graphic is a polygon
                                markerGeometry = graphic.geometry;
                                marker = this.polygonMarker;
                                break;
                        }

                        var gr = new Graphic(markerGeometry, marker);
                        gr.tag = row.id;
                        gr.name = 'ftMarker';
                        this.map.graphics.add(gr);

                        // if(!this.SelectOnMapOrView.isCheckedAny()) { 
                        //     var grs = array.filter(this.map.graphics.graphics, function(gr){ 
                        //         return gr.name && gr.name === 'ftMarker'; 
                        //     });

                        //     this._fitToMapExtent(graphicsUtils.graphicsExtent(grs));
                        // }
                    }));
                }));

                //this._delay(500).then(lang.hitch(this, function() {this._selectSignal = on(this.map, "extent-change", lang.hitch(this, this._selectViewIds, this));}));
            }));

            on(this.myFeatureTable, "row-deselect", lang.hitch(this, function(evt){
                //console.log("deselect event: ", evt.rows.length);
                evt.rows.forEach(lang.hitch(this, function(row) {
                    this.map.graphics.graphics.forEach(lang.hitch(this, function(gr) { 
                        if(gr.tag && gr.tag === row.id) {
                            this.map.graphics.remove(gr);
                        }
                    }));
                }));

                // if(!this.SelectOnMapOrView.isCheckedAny()) { 
                //     var grs = array.filter(this.map.graphics.graphics, function(gr){ return gr.name && gr.name === 'ftMarker'; });
                //     if(grs && grs.length>=2) {
                //         var extent = (this, graphicsUtils.graphicsExtent(grs)).expand(1.5);
                //         this.map.setExtent(extent);
                //     }
                // }
            }));

            on(this.myFeatureTable, "refresh", lang.hitch(this, function(evt){
                this._removeAllGraphics(['ftMarker']);
            }));

            // on(this.myFeatureTable, "column-resize", lang.hitch(this, function(evt){
            // //triggered by ColumnResizer extension
            //     console.log("column-resize event - ", evt);
            // }));

            // on(this.myFeatureTable, "column-state-change", function(evt){
            //     // triggered by ColumnHider extension
            //     console.log("column-state-change event - ", evt);
            // });

            // on(this.myFeatureTable, "sort", function(evt){
            //     console.log("sort event - ", evt);
            // });

            // on(this.myFeatureTable, "filter", function(evt){
            //     console.log("filter event - ", evt);
            // });

            var rolesMenu = query('.dijitPopup');
            rolesMenu.forEach(function(popup) {
                domAttr.set(popup,"role","menu");
            });
            var rolesPresentation = query('.dijitMenuTable');
            rolesPresentation.forEach(function(table) {
                domAttr.set(table,"role","presentation");
            });
        },

        // showRegionButton: function() {
        //     if(!this.layers || !this.SelectOnRegion || this.SelectOnRegion.isChecked()) return;
        //     var regionLayersExist = this.layers.filter(function(l){
        //         return l.visibility && l.layerObject.visibleAtMapScale && l.layerObject.geometryType === "esriGeometryPolygon";
        //     }).length > 0;
        //     if(!regionLayersExist) {
        //         this.SelectOnRegion.Check(false);
        //     }
        //     domStyle.set(this.SelectOnRegion.domNode, 'display', regionLayersExist?'inline-block':'none');
        // },

        _setSelectSymbol : function(shape) {
            var symbol = new SimpleLineSymbol()
                .setColor(this.map.infoWindow.lineSymbol.color)
                .setWidth(this.map.infoWindow.lineSymbol.width);
            this._rectangleGr = new Graphic(shape, symbol);
            this._rectangleGr.name = 'rectView';
            this.map.graphics.add(this._rectangleGr);

            this._selectViewIds(shape);

            this._fitToMapExtent(shape.getExtent());
        },

        _fitToMapExtent : function(extent) {
            var f=1.1;
            this.map.setExtent(extent.expand(f)).then(lang.hitch(this, function() {
                var w = extent.getWidth(), h = extent.getHeight();
                var W = this.map.extent.getWidth(), H = this.map.extent.getHeight();

                while((W*f < w*1.05 || H*f < h*1.05) && f < 5.0) {
                    f*=1.05;
                }
                this.map.setExtent(extent.expand(f));
                // console.log('  f',f);
            }));
            // console.log('f',f);
        },

        _addArrowCarrets: function() {
            var arrowButtons = query('.esri-feature-table .dijitArrowButtonInner');
            if(arrowButtons) {
                arrowButtons.forEach(function(arrowButton) {            
                    if(arrowButton && arrowButton.innerHTML === '') {
                        domConstruct.create('img', {
                            // role: 'presentation',
                            src: 'images/icons_black/carret-down.32.png',
                            alt: 'carret-down'
                        }, arrowButton);
                    }
                });
            }
        },
        _removeAllGraphics: function(names) {
            this.map.graphics.graphics.forEach(lang.hitch(this, function(gr) { 
                if(gr.name && names.contains(gr.name)) { //(gr.name === 'ftMarker' || gr.name === 'rectView')) {
                    this.map.graphics.remove(gr);
                }
            }));
        },

        _selectSignal: null,

        _selectViewIds: function(geometry) {
            var objectIdFieldName = this.layer.layerObject.objectIdField;
            q = new Query();
            q.outFields = [objectIdFieldName];
            q.geometry = geometry ? geometry : this.map.extent;
            var exp=this.layer.layerObject.getDefinitionExpression() || null;
            if(exp) q.where = exp;
            q.returnGeometry = true;
            new QueryTask(this.layer.layerObject.url).execute(q).then(lang.hitch(this, function(ev) {
                var selectedIds = ev.features.map(function(f) {
                    return f.attributes[objectIdFieldName];
                });
                this.myFeatureTable.filterRecordsByIds(selectedIds.length>0 ? selectedIds : [0]);
            }));
        },

        // _delay: function(ms) {
        //     var deferred = new dojo.Deferred();
        //     setTimeout(function() {deferred.resolve(true);}, ms);
        //     return deferred.promise;
        // },

        showBadge : function(show) {
            var indicator = dom.byId('badge_Table');
            if (show) {
                domStyle.set(indicator,'display','');
                domAttr.set(indicator, "title", i18n.widgets.featureList.featureSelected);
                domAttr.set(indicator, "alt", i18n.widgets.featureList.featureSelected);
            } else {
                domStyle.set(indicator,'display','none');
            }
        },

    });

    if (has("extend-esri")) {
        lang.setObject("dijit.ShowFeatureTable", Widget, esriNS);
    }
    return Widget;
});