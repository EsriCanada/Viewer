define(["dojo/Evented", "dojo/_base/declare",
    "dojo/_base/lang", "dojo/dom",
    "dojo/has", "esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/on", "dojo/Deferred",
    "esri/dijit/Legend", "application/ShowFeatureTable/ShowFeatureTable",
    "application/ShowBasemapGallery/ShowBasemapGallery",
    "application/ImageToggleButton/ImageToggleButton",
    "dojo/i18n!application/nls/LayerManager",
    "dojo/i18n!application/nls/resources",
    "dojo/text!application/LayerManager/Templates/LayerManager.html",
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event",
    "dojo/_base/array",
    "esri/layers/LabelLayer"
    ], function (
        Evented, declare, lang, dom, has, esriNS,
        _WidgetBase, _TemplatedMixin, on, Deferred,
        Legend, ShowFeatureTable, ShowBasemapGallery, ImageToggleButton,
        i18n, i18n_app, dijitTemplate,
        domClass, domAttr, domStyle, domConstruct, event,
        array,
        LabelLayer
    ) {
    var Widget = declare("esri.dijit.LayerManager", [_WidgetBase, _TemplatedMixin, Evented], {
        templateString: dijitTemplate,

        options: {
            theme: "LayerManager",
            map: null,
            layers: null,
            dataItems:null,
            visible: true,
            hasLegend:true,
            hasFeatureTable:false,
            hasBasemapGallery:true,
            mapNode: dojo.byId('mapPlace'),
            toolbar: null,
            OnDisplay: function(show) { console.log('LayerManager featureTable',show);}
        },

        constructor: function (options, srcRefNode) {
            var defaults = lang.mixin({}, this.options, options);
            this.domNode = srcRefNode;

            dojo.create("link", {
                href : "js/LayerManager/Templates/Slider.css",
                type : "text/css",
                rel : "stylesheet",
            }, document.head);

            dojo.create("link", {
                href : "js/LayerManager/Templates/LayerManager.css",
                type : "text/css",
                rel : "stylesheet",
            }, document.head);

            // properties
            this.set("defaults", defaults);

            this.set("map", defaults.map);
            this.set("layers", defaults.layers);
            this.set("dataItems", defaults.dataItems);
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
                title: "toc-title",
                content: "toc-content",
                checkboxCheck: "icon-check-1",
                accountText: "toc-account",
                settingsIcon: "icon-cog",
                actions: "toc-actions",
                account: "toc-account",
                clear: "clear"
            };

        },

        // start widget. called by user
        startup: function () {
            // map not defined
            if (!this.map) {
                this.destroy();
                console.log("Error: LayerManager, map required");
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

        show: function () {
            this.set("visible", true);
        },

        hide: function () {
            this.set("visible", false);
        },

        refresh: function () {
            this._createList();
        },

        _startTarget: null,
        _dropTarget: null,

        _allowDrop: function (evt) {
            var target = evt.target.closest('.toc-layer');
            if(target && target.firstChild && target.firstChild.id !== this._dropTarget.firstChild.id)
            {
                this._dropTarget = target;
            }
            evt.preventDefault();
        },

        _drag: function(evt) {
            this._dropTarget =
            this._startTarget = evt.target.closest('.toc-layer');
            if(!this._startTarget) {
                evt.cancelBubble = true;
                evt.preventDefault();
                return;
            }
            if(isChrome() && evt.target.type && evt.target.type==="range") {
                evt.cancelBubble = true;
                evt.preventDefault();
                return;
            }
            var bar = dojo.query('.dragabble', this._startTarget)[0];
            if(bar) {
                if(bar.setActive) {
                    bar.setActive();
                }
                else if(bar.focus) {
                    bar.focus();
                }
            }
            else {
                evt.preventDefault();
            }
        },

        _drop: function (evt) {
            var indexStart = this._getLayerPosition(this._startTarget.firstChild.id);
            var indexDrop = this._getLayerPosition(this._dropTarget.firstChild.id);
            dojo.place(this._startTarget, this._dropTarget, indexStart<indexDrop?"after":"before");
            this.map.reorderLayer(this._startTarget.firstChild.dataset.layerid, indexDrop);
            this._dropTarget = null;
            evt.preventDefault();
        },

        _flipLayers: function(evt) {
            // console.log('_flipLayers', evt);
            var startTarget = evt.target.closest('.toc-layer');
            var indexStart = this._getLayerPosition(startTarget.firstChild.id);
            var indexDrop = null;
            var dropTarget = null;
            var dropTargets = dojo.query('.toc-layer[data-layerid]', dojo.byId('pageBody_layers'));
            switch(evt.key) {
                case "ArrowDown" :
                case "Down" :
                    if(dropTargets && indexStart<dropTargets.length-1) {
                        indexDrop = indexStart+1;
                        // console.log('indexStart indexEnd',indexStart, indexEnd);
                        dropTarget = dropTargets[indexDrop];
                        dojo.place(startTarget, dropTarget, indexStart<indexDrop?"after":"before");
                        this.map.reorderLayer(startTarget.firstChild.dataset.layerid, indexDrop);
                        evt.target.focus();
                    }
                    evt.stopPropagation();
                    evt.preventDefault();
                    break;
                case "ArrowUp" :
                case "Up" :
                    if(dropTargets && indexStart>0) {
                        indexDrop = indexStart-1;
                        // console.log('indexStart indexEnd',indexStart, indexEnd);
                        dropTarget = dropTargets[indexDrop];
                        dojo.place(startTarget, dropTarget, indexStart<indexDrop?"after":"before");
                        this.map.reorderLayer(startTarget.firstChild.dataset.layerid, indexDrop);
                        evt.target.focus();
                    }
                    evt.stopPropagation();
                    evt.preventDefault();
                    break;
            }
        },

        _getLayerPosition:function(layerId) {
            var layers = dojo.query('.toc-title', dojo.byId('pageBody_layers'));
            var layersIds = layers.map(function(l) {return l.id;});
            for(var i=0; i<layers.length; i++) {
                if(layers[i].id === layerId) {
                    return i;
                }
            }
            return -1;
        },

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
                let fixLegend = function(node) {
                    if(!node) {
                        node = dom.byId('esri_dijit_LayerManager_0');
                    }
                    if(typeof node.querySelectorAll !== 'function')
                        return;
                    var tables = node.querySelectorAll("table");
                    if (tables) {
                        array.forEach(tables, function(table) {
                            domAttr.set(table, "role", "presentation");
                        });
                    }

                    var svgs = node.querySelectorAll("svg");
                    if (svgs) {
                        array.forEach(svgs, function(svg) {
                            domAttr.set(svg, "title", i18n_app.map.symbol);
                        });
                    }

                    var legendServiceLabels = node.querySelectorAll(
                        ".esriLegendServiceLabel"
                    );
                    if (legendServiceLabels) {
                        for (
                            var kk = 0;
                            kk < legendServiceLabels.length;
                            kk++
                        ) {
                            var legendServiceLabel =
                                legendServiceLabels[kk];

                            var service = legendServiceLabel.closest(
                                ".esriLegendService"
                            );
                            var tabindex = service && (!service.style || service.style.display !== "none") ? 0 : -1;

                            if (legendServiceLabel.nodeName !== "H2") {
                                var h2 = domConstruct.create("h2", {
                                    className: legendServiceLabel.className,
                                    innerHTML: legendServiceLabel.innerHTML,
                                    tabindex: tabindex
                                });
                                legendServiceLabel.parentNode.replaceChild(
                                    h2,
                                    legendServiceLabel
                                );
                            } else {
                                domAttr.set(
                                    legendServiceLabel,
                                    "tabindex",
                                    tabindex
                                );
                            }
                        }
                    }

                    var legendLayers = node.querySelectorAll(
                        ".esriLegendLayer"
                    );
                    for (let i = 0; i < legendLayers.length; i++) {
                        domAttr.set(legendLayers[i], "role", "presentation");
                        var legendServiceList = legendLayers[i].querySelector("tbody");

                        domAttr.set(legendServiceList, "role", "list");
                        //domAttr.set(legendServiceList, "aria-label", legendServiceLabel.innerHTML);

                        for (let j = 0; j < legendServiceList.childNodes.length; j++) {
                            var item = legendServiceList.childNodes[j];
                            domAttr.set(item, "role", "listitem");
                            domAttr.set(item, "tabindex", "0");
                        }
                    }

                    var legendLayerImages = node.querySelectorAll(
                        ".esriLegendLayer image, .esriLegendLayer img"
                    );
                    if (legendLayerImages && legendLayerImages.length > 0) {
                        let symbol = i18n_app.map.symbol;
                        for (let i = 0; i < legendLayerImages.length; i++)
                            domAttr.set(legendLayerImages[i], "alt", symbol);
                    }

                    var messages = node.querySelectorAll(".esriLegendMsg");
                    if (messages) {
                        for (var iiii = 0; iiii < messages.length; iiii++)
                            domAttr.set(messages[iiii], "tabindex", 0);
                    }
                };

                for (let i = 0; i < layers.length; i++) {
                    let layer = layers[i];

                    // layer node
                    let layerDiv = domConstruct.create("div", {
                        className: "toc-layer",
                        role: "listitem",
                        'data-layerid': layer.id,
                    });
                    domConstruct.place(layerDiv, this._layersNode, "first");

                    // title of layer
                    let titleDiv = domConstruct.create("div", {
                        className: 'toc-title',
                        id: 'tocTitle_'+i,
                        draggable: true,
                        'data-layerid': layer.id,
                    }, layerDiv);

                    if(layers.length > 1) {
                        var layerHandleDiv = domConstruct.create("div", {
                            className: 'dragabble',
                            title: i18n.widgets.layerManager.dragLayer,//"Drag to change layers' order, or\nclick and use up/down arrow keys.",
                            tabindex:0,
                        }, titleDiv);
                        on(titleDiv, 'dragstart', lang.hitch(this, this._drag));
                        on(titleDiv, 'dragover', lang.hitch(this, this._allowDrop));
                        on(titleDiv, 'dragend', lang.hitch(this, this._drop));
                        on(layerHandleDiv, 'keyup', lang.hitch(this, this._flipLayers));
                    }

                    // title container
                    var titleContainerDiv = domConstruct.create("div", {
                        className: "toc-title-container",
                        tabindex: -1,
                        // draggable: true,
                        id: 'titleContainerDiv_'+i,
                    }, titleDiv);

                    var titleText = domConstruct.create("div", {
                        className: "checkbox",
                        title : layer.title,
                        // role: "presentation",
                        tabindex:-1,
                    }, titleContainerDiv);

                    var titleCheckbox = domConstruct.create("input",
                    {
                        id: "layer_ck_"+i,
                        'data-layerid': layer.id,
                        className: "checkbox",
                        type: "checkbox",
                        tabindex: 0,
                        checked: layer.visibility,
                    }, titleText);

                    domConstruct.create('label',{
                        for: 'layer_ck_'+i,
                        class: 'labelText',
                        tabindex: 0,
                        innerHTML: layer.title
                    }, titleText);

                    var accountText = '';
                    if (layer.account) {
                        accountText = domConstruct.create("a", {
                            className: this.css.accountText,
                            id: layer.account
                        }, titleText);
                    }

                    if(this.defaults.hasFeatureTable) {
                        settingsDiv = domConstruct.create("div", {
                            className: "toc-settings",
                            //id: layer.settings
                            'data-layerid': layer.id,
                        }, titleText);//titleContainerDiv);

                        if(layer.layerType === "VectorTileLayer")
                        {
                            domConstruct.create("img", {
                                src: 'images/VectorTiles.png',
                                class: 'VectorTilesBtn',
                                alt:'Vector Tiles',
                                //role: "button",
                                //tabindex:0,
                                title: 'Vector Tiles',
                            }, settingsDiv);
                        }
                        else
                        {
                            var cbShowTable = new ImageToggleButton({
                                imgSelected: 'images/icons_black/TableClose.Red.png',
                                imgUnselected: 'images/icons_black/Table.png',
                                value: layer.id,
                                id: layer.id+'_btn',
                                class: 'cbShowTable',
                                group: 'grShowTable',
                                imgClass: 'tableBtn',
                                titleSelected: i18n.widgets.layerManager.hideFeatureTable,
                                titleUnselected: i18n.widgets.layerManager.showFeatureTable,
                            }, domConstruct.create('div',{}, settingsDiv));
                            cbShowTable.startup();
                            on(cbShowTable, 'change', lang.hitch(this, this._layerShowTable));
                        }

                        domStyle.set(settingsDiv, "display", layer.visibility ? "inline-block" : "none");
                    }

                    // settings
                    var settingsDiv, settingsIcon;
                    if (layer.layerObject && dojo.exists("settings", layer) && layer.layerObject.isEditable())
                    {
                        settingsIcon = domConstruct.create("img", {
                            'src' : 'images/icon-cog.png',
                            alt:'Configuration',
                            role: "button",
                            tabindex:0,
                        }, settingsDiv);
                    }

                    if(this.defaults.hasLegend && this._showLegend(layer)) {

                        var expandLegend = new ImageToggleButton({
                                imgSelected: 'images/icons_black/down.png',
                                imgUnselected: 'images/icons_black/up.png',
                                value: i,
                                class: 'showLegendBtn',
                                titleSelected: i18n.widgets.layerManager.hideLegend,
                                titleUnselected: i18n.widgets.layerManager.showLegend,
                            }, domConstruct.create('div',{},
                                domConstruct.create('div',{
                                id: 'legendBtn_'+i,
                            }, titleDiv)));
                            expandLegend.startup();

                            // var thisLabel = dojo.byId('layerExpandArea_'+i);
                            // domStyle.set(dojo.byId(thisLabel), 'display', expand?'':'none');

                            on(expandLegend, 'change', lang.hitch(this, this._showHidelayerExpandArea));

                        var layerExpandArea = domConstruct.create('div', {
                            id: 'layerExpandArea_'+i,
                            class: 'layerExpandArea',
                            style: 'display: none;'
                        }, titleDiv);

                        var slider = domConstruct.create('input', {
                            type:'range',
                            class:'layerOpacitySlider',
                            value:100,
                            draggable: isChrome(),
                            'data-layerid':layer.id,
                            title: i18n.widgets.layerManager.opacity,
                        }, layerExpandArea);

                        on(slider, isIE11() ?'change':'input', lang.hitch(this, this._layerSliderChanged));

                        var legendTitle = i18n.widgets.layerManager.legendFor+layer.title;
                        var legend = new Legend({
                            map: this.map,
                            layerInfos: [{
                                defaultSymbol:true,
                                layer: layer.layerObject,
                                title: layer.title,
                            }],
                        }, domConstruct.create("div", {
                            // role:'application',
                            class:'legend',
                            tabindex: 0,
                            title: legendTitle,
                            'aria-label': legendTitle,
                        }, layerExpandArea));

                        domStyle.set(dojo.byId('legendBtn_'+i), 'display', layer.visibility?'table':'none');

                        new MutationObserver(function(mutations) {
                            mutations.forEach(function(mutation) {
                                if (
                                    mutation.addedNodes &&
                                    mutation.addedNodes.length > 0
                                ) {
                                    for (
                                        var i = 0; i < mutation.addedNodes.length; i++) {
                                        var node = mutation.addedNodes[i];
                                        try{
                                            if (
                                                !node.hasOwnProperty('display')  ||
                                                domStyle.get(node, "display") !== "none"
                                            ) {
                                                fixLegend(node);
                                            }
                                        } catch (ex) {
                                            console.log('error', ex);
                                        }
                                    }
                                }
                            });
                        }).observe(legend.domNode, {
                            attributes: true,
                            childList: true,
                            characterData: false
                        });

                        legend.startup();
                        fixLegend();

                        on(titleCheckbox, 'click', lang.hitch(this, this._showHidelayerExpandAreaBtn));
                    }

                    // lets save all the nodes for events
                    this._nodes.push({
                        checkbox: titleCheckbox,
                        title: titleDiv,
                        titleContainer: titleContainerDiv,
                        titleText: titleText,
                        accountText: accountText,
                        settingsIcon: settingsIcon,
                        settingsDiv: settingsDiv,
                        layer: layerDiv
                    });

                    this._checkboxEvent(i);
                }
                this._setLayerEvents();
            }


            this.baseMap = this.dataItems.baseMap;
            if(this.baseMap) {

                var titleBaseCheckBoxClass = "checkbox";

                var layerBaseDiv = domConstruct.create("div", {
                    id:'layerBaseDiv',
                    className: "toc-layer",
                    role: "listitem",
                    style:"background-color: silver;"
                });
                domConstruct.place(layerBaseDiv, this._layersNode, "last");

                // title of layer
                var titleBaseDiv = domConstruct.create("div", {
                    className: this.css.title,
                    style: 'min-height: 24px;',
                }, layerBaseDiv);

                // title container
                var titleBaseContainerDiv = domConstruct.create("div", {
                    className: "toc-title-container",
                    tabindex: -1,
                }, titleBaseDiv);

                var titleBaseText = domConstruct.create("div", {
                    className: "checkbox",
                }, titleBaseContainerDiv);

                var baseMapLabel = domConstruct.create('label',{
                    // for: 'layer_ck_baseMap',
                    class: 'labelText',
                    style: 'font-style: italic; font-weight: bold;',
                    tabindex: 0,
                    innerHTML: this.baseMap.title,
                    title : "BaseMap: "+this.baseMap.title,
                }, titleBaseText);

                var expandBaseMaps = new ImageToggleButton({
                    imgSelected: 'images/icons_black/down.png',
                    imgUnselected: 'images/icons_black/up.png',
                    //value: i,
                    class: 'showLegendBtn',
                    titleSelected: i18n.widgets.layerManager.hideLegend,
                    titleUnselected: i18n.widgets.layerManager.showLegend,
                }, domConstruct.create('div',{},
                    domConstruct.create('div',{
                    id: 'basemapsBtn',
                    style:"padding-bottom: 3px;"
                }, titleBaseDiv)));
                expandBaseMaps.startup();

                var hideBasemapArea = domConstruct.create('div', {
                    style:'display:block',
                    class: 'hideBasemapArea',
                }, titleBaseDiv);

                var basemapSlider = domConstruct.create('input', {
                    type: 'range',
                    id: 'basemapSlider',
                    class:'layerOpacitySlider',
                    value:100,
                    //'data-layerid':layer.id,
                    title: i18n.widgets.layerManager.baseMapOpacity,
                    style: 'display:none;',
                }, hideBasemapArea);

                on(basemapSlider, isIE11() ?'change':'input', lang.hitch(this, function(ev) {
                    this.baseMap.setOpacity(ev.currentTarget.value/100);
                }));

                on(expandBaseMaps, 'change', lang.hitch(this, function(evt) {
                    var expand = expandBaseMaps.isChecked();
                    domStyle.set(dojo.byId('showBasemapGallery'), 'display', expand?'inline':'none');
                    domStyle.set(basemapSlider, 'display', expand?'inline':'none');
                }));

                if(this.defaults.hasBasemapGallery) {

                    var basemapGallery = new ShowBasemapGallery({
                        map: this.map,
                        basemapHost:{
                            sharinghost:'',
                            basemapgroup:'',
                        },
                        initialMap: this.baseMap,
                    }, hideBasemapArea);
                    basemapGallery.startup();

                    on(basemapGallery, "changed", lang.hitch(this, function(evt) {
                        var newBasemap = evt.newBasemap;
                        baseMapLabel.innerHTML = this.baseMap.title = basemapGallery.getLocalizedMapName(newBasemap.title);

                        // this.baseMap = array.filter(Object.values(this.map._layers), function(l) {return l._basemapGalleryLayerType === "basemap";})[0];
                        var bm = array.filter(Object.keys(this.map._layers),
                            lang.hitch(this.map._layers, function(k) {
                                return this[k]._basemapGalleryLayerType === "basemap";
                            })
                        )[0];
                        if(bm) {
                            this.baseMap = this.map._layers[bm]; // !
                            this.baseMap.setOpacity(basemapSlider.value/100);
                        }
                    }));
                }
            }
        },

        _showHidelayerExpandArea : function(evt) {
            var expand = evt.checked;
            var thisLabel = dojo.byId('layerExpandArea_'+evt.value);
            domStyle.set(dojo.byId(thisLabel), 'display', expand?'':'none');
        },

        _showHidelayerExpandAreaBtn : function(evt) {
            var i = evt.target.id.split('_')[2];

            var expand = evt.target.checked;
            domStyle.set(dojo.byId('legendBtn_'+i), 'display', expand?'table':'none');

            var ck = dojo.query('#legendBtn_'+i+' input')[0].checked;
            domStyle.set(dojo.byId('layerExpandArea_'+i), 'display', (ck && expand)?'':'none');

            var toc_settings = dojo.query('.toc-settings[data-layerid='+evt.target.dataset.layerid+']');
            if(toc_settings && toc_settings.length>0){
                domStyle.set(toc_settings[0],'display', expand?'initial': 'none');
            }
        },

        _showLegend : function(layer) {
            for(var il=0; il < this.defaults.layers.length; il++) {
                if(this.defaults.layers[il].id === layer.id &&
                    (!layer.hasOwnProperty("showLegend") || layer.showLegend))
                    return true;
            }
            return false;
        },

        _getLayerById: function(layerid) {
            for(var il=0; il < this.layers.length; il++) {
                var layer = this.defaults.layers[il];
                if(layer.id === layerid) {
                    return layer;
                }
            }
            return null;
        },

        _layerSliderChanged: function(evt) {
            var layer = this._getLayerById(evt.target.dataset.layerid);
            if(layer) {
                layer.layerObject.setOpacity(evt.target.value / 100.0);
            }
        },

        _layerShowTable: function(arg)  {
            var checked = arg.checked;
            this.showBadge(checked);
            if(!checked) {
                this.featureTable.destroy();
                return;
            }

            var layerId = arg.value;
            for(var i = 0, m = null; i < this.layers.length; ++i) {
                if(this.layers[i].id === layerId) {
                    if(this.featureTable) {
                        this.featureTable.destroy();
                        domConstruct.create("div", { id: 'featureTableNode'}, dojo.byId('featureTableContainer'));
                    }
                    this.featureTable.loadTable(this.layers[i]);

                    this.showBadge(true);
                    break;
                }
            }
        },

        _atachSpaceKey: function(onButton, clickButton) {
            on(onButton, 'keyup', lang.hitch(clickButton, function(event){
                if(event.keyCode=='32')
                    this.click();
            }));
        },

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
            // layer visibility changes
            var visChange = on(layer, "visibility-change", lang.hitch(this, function (evt) {
                // update checkbox and layer visibility classes
                this._toggleVisible(index, evt.visible);
            }));
            this._layerEvents.push(visChange);
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

        _init: function () {
            this._visible();
            this._createList();

            if(this.defaults.hasFeatureTable) {
                var ft = new ShowFeatureTable({
                    map: this.map,
                    layers: this.layers,
                    OnDisplay: this.defaults.OnDisplay
                }, this.defaults.mapNode);
                ft.startup();
                this.featureTable = ft;
                on(ft, "destroy", lang.hitch(this, function(evt) {
                    var checkedBtns = dojo.query('.LayerManager .cbShowTable input:checked');
                    array.forEach(checkedBtns, function(checkedBtn) {
                        checkedBtn.click();
                    });
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

        _forceClose: function() {
            var checkedBtns = dojo.query('.LayerManager .cbShowTable input:checked');
            array.forEach(checkedBtns, function(checkedBtn) {
                checkedBtn.click();
            });
        },

        _loadTableByLayerId:function(layerId) {
            var cbToggleBtns = dojo.query('.LayerManager .cbShowTable .cbToggleBtn');
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

        _delay: function(ms) {
            var deferred = new Deferred();
            setTimeout(function() {deferred.resolve(true);}, ms);
            return deferred.promise;
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
                domAttr.set(indicator, "title", i18n.widgets.layerManager.showFeatureTable);
                domAttr.set(indicator, "alt", '');
            } else {
                domStyle.set(indicator,'display','none');
            }
        },

    });
    if (has("extend-esri")) {
        lang.setObject("dijit.LayerManager", Widget, esriNS);
    }
    return Widget;
});
