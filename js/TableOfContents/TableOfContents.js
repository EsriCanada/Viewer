define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/on",
    "application/ShowFeatureTable/ShowFeatureTable",
    "application/ImageToggleButton/ImageToggleButton",
    "dojo/i18n!application/nls/TableOfContents",
    "dojo/text!application/TableOfContents/Templates/TableOfContents.html",
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event",
    "dojo/_base/array",
    "esri/renderers/SimpleRenderer", "esri/layers/LabelLayer"
    ], function (
        Evented, declare, lang, has, esriNS,
        _WidgetBase, _TemplatedMixin, on,
        ShowFeatureTable, ImageToggleButton,
        i18n, dijitTemplate,
        domClass, domAttr, domStyle, domConstruct, event,
        array,
        SimpleRenderer, LabelLayer
    ) {
    var Widget = declare("esri.dijit.TableOfContents", [_WidgetBase, _TemplatedMixin, Evented], {
        templateString: dijitTemplate,
        // defaults
        options: {
            theme: "TableOfContents",
            map: null,
            layers: null,
            visible: true,
            OnDisplay: function(show) {console.log('Layers featureTable',show);}
        },

        // lifecycle: 1
        constructor: function (options, srcRefNode) {
            // mix in settings and defaults
            var defaults = lang.mixin({}, this.options, options);
            this.defaults = defaults;
            // widget node
            this.domNode = srcRefNode;
            // properties
            this.set("map", defaults.map);
            this.set("layers", defaults.layers);
            this.set("theme", defaults.theme);
            this.set("visible", defaults.visible);
            // listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("layers", this._refreshLayers);
            this.watch("map", this.refresh);
            // classes
            this.css = {
                container: "toc-container",
                layer: "toc-layer",
                firstLayer: "toc-first-layer",
                title: "toc-title",
                //titleContainer: "toc-title-container",
                content: "toc-content",
                titleCheckbox: "checkbox",
                checkboxCheck: "icon-check-1",
                titleText: "checkbox",
                accountText: "toc-account",
                visible: "toc-visible",
                settingsIcon: "icon-cog",
                //settings: "toc-settings",
                actions: "toc-actions",
                account: "toc-account",
                clear: "clear"
            };

            dojo.create("link", {
                href : "js/TableOfContents/Templates/TableOfContents.css",
                type : "text/css",
                rel : "stylesheet",
            }, document.head);

        },

        // start widget. called by user
        startup: function () {
            // map not defined
            if (!this.map) {
                this.destroy();
                console.error("Map required");
                // return;
            }
            // when map is loaded
            if (this.map.loaded) {
                this._init();
            } else {
                on.once(this.map, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }
        },

        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function () {
            this._removeEvents();
            this.inherited(arguments);
        },
        /* ---------------- */
        /* Public Events */
        /* ---------------- */
        // load
        // toggle
        // expand
        // collapse

        /* ---------------- */
        /* Public Functions */
        /* ---------------- */

        show: function () {
            this.set("visible", true);
        },

        hide: function () {
            this.set("visible", false);
        },

        refresh: function () {
            this._createList();
        },

        /* ----------------- */
        /* Private Functions */
        /* ----------------- */

        _createList: function () {
            var layers = this.layers;
            this._nodes = [];
            // kill events
            this._removeEvents();
            // clear node
            this._layersNode.innerHTML = "";
            domAttr.set(this._layersNode, "role", "list");
            // if we got layers
            if (layers && layers.length) {

                for (var i = 0; i < layers.length; i++) {
                    var layer = layers[i];

                    // ceckbox class
                    var titleCheckBoxClass = this.css.titleCheckbox;
                    // layer class
                    var layerClass = this.css.layer;
                    // first layer
                    if (i === (layers.length - 1)) {
                        layerClass += " ";
                        layerClass += this.css.firstLayer;
                    }
                    if (layer.visibility) {
                        layerClass += " ";
                        layerClass += this.css.visible;
                        titleCheckBoxClass += " ";
                        titleCheckBoxClass += this.css.checkboxCheck;
                    }

                    // layer node
                    var layerDiv = domConstruct.create("div", {
                        className: layerClass,
                        role: "listitem",
                    });
                    domConstruct.place(layerDiv, this._layersNode, "first");

                    // title of layer
                    var titleDiv = domConstruct.create("div", {
                        className: this.css.title,
                    }, layerDiv);

                    // title container
                    var tocTitleContainer = domConstruct.create("div", {
                        className: "toc-title-container",
                        tabindex: -1,
                    }, titleDiv);

                    titleCheckbox = domConstruct.create("input",
                    {
                        id: "layer_ck_"+i,
                        className: titleCheckBoxClass,
                        type: "checkbox",
                        tabindex: 0,
                        checked: layer.visibility,
                    }, tocTitleContainer);

                    var titleText = domConstruct.create("label", {
                        "for": "layer_ck_"+i,
                        "className": this.css.titleText,
                        "innerHTML": layer.title,
                        // role: "presentation",
                        //"title" : layer.title
                    }, tocTitleContainer);

                    // this._atachSpaceKey(titleContainerDiv, titleCheckbox);

                    var accountText = '';
                    if (layer.account) {
                        accountText = domConstruct.create("a", {
                            className: this.css.accountText,
                            id: layer.account
                        }, titleText);
                    }

                    // settings
                    var tocSettings, settingsIcon;
                    if ((layer.layerObject &&
                        dojo.exists("settings", layer) &&
                        layer.layerObject.isEditable()) || has("featureTable"))
                    {
                        tocSettings = domConstruct.create("div", {
                            className: "toc-settings",
                            //id: layer.settings
                        }, tocTitleContainer);

                        domStyle.set(tocSettings, "display", layer.visibility ? "inline-block" : "none");

                        if(layer.layerObject &&
                        dojo.exists("settings", layer) &&
                        layer.layerObject.isEditable())
                        {
                            settingsIcon = domConstruct.create("img", {
                                'src' : 'images/icon-cog.png',
                                alt:'Configuration',
                                role: "button,",
                                tabindex:0,
                            }, tocSettings);
                        }

                        if(has("featureTable")) {
                            var cbShowTable = new ImageToggleButton({
                                imgSelected: 'images/icons_black/TableClose.Red.png',
                                imgUnselected: 'images/icons_black/Table.png',
                                value: layer.id,
                                class: 'cbShowTable',
                                imgClass: 'tableBtn',
                                titleSelected: i18n.widgets.tableOfContents.hideFeatureTable,
                                titleUnselected: i18n.widgets.tableOfContents.showFeatureTable,
                            }, domConstruct.create('div',{}, tocSettings));
                            cbShowTable.startup();
                            on(cbShowTable, 'change', lang.hitch(this, this._layerShowTable));
                        }
                    }

                    // clear css
                    var clearCSS = domConstruct.create("div", {
                        className: this.css.clear
                    }, tocTitleContainer);

                    // lets save all the nodes for events
                    var nodesObj = {
                        checkbox: titleCheckbox,
                        title: titleDiv,
                        titleContainer: tocTitleContainer,
                        titleText: titleText,
                        accountText: accountText,
                        settingsIcon: settingsIcon,
                        tocSettings: tocSettings,
                        layer: layerDiv
                    };
                    this._nodes.push(nodesObj);
                    // create click event
                    this._checkboxEvent(i);
                }
                this._setLayerEvents();
            }
        },

        _layerShowTable: function(arg)  {
            var checked = arg.checked;
            this.showBadge(checked);
            if(!checked) {
                this.featureTable.destroy();
                return;
            }

            this._loadTableByLayerId(arg.value);
        },

        _loadTableByLayerId:function(layerId) {
            var cbToggleBtns = dojo.query('.TableOfContents .cbShowTable .cbToggleBtn');
            array.forEach(cbToggleBtns, function(cb) {
                cb.checked = cb.value === layerId;
            });

            for(var i = 0, m = null; i < this.layers.length; ++i) {
                if(this.layers[i].id === layerId) {
                    if(this.featureTable) {
                        this.featureTable.destroy();
                        domConstruct.create("div", {
                            id: 'featureTableNode',
                            //tabindex: 0
                        }, dojo.byId('featureTableContainer'));
                    }
                    this.featureTable.loadTable(this.layers[i]);

                    this.showBadge(true);
                    break;
                }
            }
        },

        // _atachSpaceKey: function(onButton, clickButton) {
        //     on(onButton, 'keyup', lang.hitch(clickButton, function(event){
        //         if(event.keyCode=='32')
        //             this.click();
        //     }));
        // },

        _refreshLayers: function () {
            this.refresh();
        },

        _removeEvents: function () {
            var i;
            // checkbox click events
            if (this._checkEvents && this._checkEvents.length) {
                for (i = 0; i < this._checkEvents.length; i++) {
                    this._checkEvents[i].remove();
                }
            }
            // layer visibility events
            if (this._layerEvents && this._layerEvents.length) {
                for (i = 0; i < this._layerEvents.length; i++) {
                    this._layerEvents[i].remove();
                }
            }
            this._checkEvents = [];
            this._layerEvents = [];
        },

        _toggleVisible: function (index, visible) {
            // update checkbox and layer visibility classes
            domClass.toggle(this._nodes[index].layer, this.css.visible, visible);
            domClass.toggle(this._nodes[index].checkbox, this.css.checkboxCheck, visible);
            domAttr.set(this._nodes[index].checkbox, "checked", visible ? "checked" : "");

            this.emit("toggle", {
                index: index,
                visible: visible
            });

            var tocSettings = dojo.query('.toc-settings',this._nodes[index].titleContainer);
            if(tocSettings && tocSettings.length > 0) {
                tocSettings = tocSettings[0];
                domStyle.set(tocSettings, "display", visible ? "inline-block" : "none");
            }

        },

        _layerEvent: function (layer, index) {
            if(!layer)
                return;
            try {
                // layer visibility changes
                var visChange = on(layer, "visibility-change", lang.hitch(this, function (evt) {
                    // update checkbox and layer visibility classes
                    this._toggleVisible(index, evt.visible);
                }));
                this._layerEvents.push(visChange);
            } catch (ex) {
                console.log('error:',ex);
            }
        },

        _featureCollectionVisible: function (layer, index, visible) {
            // all layers either visible or not
            var equal;
            // feature collection layers turned on by default
            var visibleLayers = layer.visibleLayers;
            // feature collection layers
            var layers = layer.featureCollection.layers;
            // if we have layers set
            if (visibleLayers && visibleLayers.length) {
                // check if all layers have same visibility
                equal = array.every(visibleLayers, function (item) {
                    // check if current layer has same as first layer
                    return layers[item].layerObject.visible === visible;
                });
            }
            else {
                // check if all layers have same visibility
                equal = array.every(layers, function (item) {
                    // check if current layer has same as first layer
                    return item.layerObject.visible === visible;
                });
            }
            // all are the same
            if (equal) {
                this._toggleVisible(index, visible);
            }
        },

        _createFeatureLayerEvent: function (layer, index, i) {
            var layers = layer.featureCollection.layers;
            // layer visibility changes
            var visChange = on(layers[i].layerObject, "visibility-change", lang.hitch(this, function (evt) {
                var visible = evt.visible;
                this._featureCollectionVisible(layer, index, visible);
            }));
            this._layerEvents.push(visChange);
        },

        _featureLayerEvent: function (layer, index) {
            // feature collection layers
            var layers = layer.featureCollection.layers;
            if (layers && layers.length) {
                // make event for each layer
                for (var i = 0; i < layers.length; i++) {
                    this._createFeatureLayerEvent(layer, index, i);
                }
            }
        },

        _setLayerEvents: function () {
            // this function sets up all the events for layers
            var layers = this.get("layers");
            var layerObject;
            if (layers && layers.length) {
                // get all layers
                for (var i = 0; i < layers.length; i++) {
                    var layer = layers[i];
                    // if it is a feature collection with layers
                    if (layer.featureCollection && layer.featureCollection.layers && layer.featureCollection.layers.length) {
                        this._featureLayerEvent(layer, i);
                    } else {
                        // 1 layer object
                        layerObject = layer.layerObject;
                        this._layerEvent(layerObject, i);
                    }
                }
            }
        },

        _toggleLayer: function (layerIndex) {
            // all layers
            if (this.layers && this.layers.length) {
                var newVis;
                var layer = this.layers[layerIndex];
                var layerObject = layer.layerObject;
                var featureCollection = layer.featureCollection;
                var visibleLayers;
                var i;
                if (featureCollection) {
                    // visible feature layers
                    visibleLayers = layer.visibleLayers;
                    // new visibility
                    newVis = !layer.visibility;
                    // set visibility for layer reference
                    layer.visibility = newVis;
                    // toggle all feature collection layers
                    if (visibleLayers && visibleLayers.length) {
                        // toggle visible sub layers
                        for (i = 0; i < visibleLayers.length; i++) {
                            layerObject = featureCollection.layers[visibleLayers[i]].layerObject;
                            // toggle to new visibility
                            layerObject.setVisibility(newVis);
                        }
                    }
                    else {
                        // toggle all sub layers
                        for (i = 0; i < featureCollection.layers.length; i++) {
                            layerObject = featureCollection.layers[i].layerObject;
                            // toggle to new visibility
                            layerObject.setVisibility(newVis);
                        }
                    }
                } else if (layerObject) {
                    newVis = !layer.layerObject.visible;
                    layer.visibility = newVis;
                    layerObject.setVisibility(newVis);
                }
            }
        },

        _checkboxEvent: function (index) {
            // when checkbox is clicked
            var checkEvent = on(this._nodes[index].checkbox, "click", lang.hitch(this,
                function (evt) {
                // toggle layer visibility
                this._toggleLayer(index);
                //event.stop(evt);
            }));
            this._checkEvents.push(checkEvent);
        },

        _forceClose: function() {
            var checkedBtns = dojo.query('.TableOfContents .cbShowTable input:checked');
            array.forEach(checkedBtns, function(checkedBtn) {
                checkedBtn.click();
            });
        },

        _init: function () {
            this._visible();
            this._createList();

            if(has('featureTable')) {
                var ft = this.featureTable = new ShowFeatureTable({
                    map: this.map,
                    layers: this.layers,
                    OnDisplay: this.defaults.OnDisplay
                }, dojo.byId('mapPlace'));
                ft.startup();
                on(ft, "destroy", lang.hitch(this, function(evy) {
                    this._forceClose();
                }));
                on(ft, "change", lang.hitch(this, function(evt) {
                    this._forceClose();
                    this._loadTableByLayerId(evt.layerId);
                }));

                on(ft, "destroied", lang.hitch(this, function(evt) {
                    this.showBadge(false);
                }));
            }

            this.set("loaded", true);
            this.emit("load", {});
        },

        _updateThemeWatch: function () {
            var oldVal = arguments[1];
            var newVal = arguments[2];
            domClass.remove(this.domNode, oldVal);
            domClass.add(this.domNode, newVal);
        },

        _visible: function () {
            if (this.get("visible")) {
                domStyle.set(this.domNode, "display", "block");
            } else {
                domStyle.set(this.domNode, "display", "none");
            }
        },

        showBadge: function(show) {
            var indicator = dojo.byId('badge_Table'); // !
            if (show) {
                domStyle.set(indicator,'display','');
                domAttr.set(indicator, "title", i18n.widgets.tableOfContents.showFeatureTable);
                domAttr.set(indicator, "alt", '');
            } else {
                domStyle.set(indicator,'display','none');
            }
        },

    });
    if (has("extend-esri")) {
        lang.setObject("dijit.TableOfContents", Widget, esriNS);
    }
    return Widget;
});
