define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel",
    "dijit/_WidgetBase",
    //"dijit/_TemplatedMixin",
    "dojo/i18n!application/nls/resources",
    "dojo/i18n!application/nls/BaseMapLabels",
    "dojo/on", "dojo/Deferred",
    // "esri/dijit/Legend",
    "esri/dijit/BasemapGallery",
    // "esri/dijit/BasemapLayer",
    "esri/dijit/Basemap",
    // "application/ShowFeatureTable/ShowFeatureTable",
    "dojo/text!application/LayerManager/Templates/LayerManager.html",
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event",
    "dojo/_base/array",
    // "esri/symbols/TextSymbol", "esri/renderers/SimpleRenderer", "esri/layers/LabelLayer"
    ], function (
        Evented, declare, lang, has, esriNS,
        _WidgetBase,
        //_TemplatedMixin,
        i18n, i18n_BaseMapLabels,
        on, Deferred,
        // Legend,
        BasemapGallery,
        // BasemapLayer,
        Basemap,
        // ShowFeatureTable,
        dijitTemplate,
        domClass, domAttr, domStyle, domConstruct, event,
        array
        // TextSymbol, SimpleRenderer, LabelLayer
    ) {
    var Widget = declare("esri.dijit.ShowBasemapGallery", [
        _WidgetBase,
        //_TemplatedMixin,
        Evented], {
        templateString: dijitTemplate,
        // defaults
        options: {
            map: null,
            visible: true,
            basemapHost: {
                sharinghost:'',
                basemapgroup:'',
            },
            initialMap : '',
        },

        // lifecycle: 1
        constructor: function (options, srcRefNode) {
            // mix in settings and defaults
            var defaults = lang.mixin({}, this.options, options);
            // widget node
            this.domNode = srcRefNode;

            dojo.create("link", {
                href : "js/ShowBasemapGallery/Templates/ShowBasemapGallery.css",
                type : "text/css",
                rel : "stylesheet",
            }, document.head);

            // properties
            this.set("defaults", defaults);

            this.set("map", defaults.map);
            // listeners
            //this.watch("theme", this._updateThemeWatch);
            // this.watch("visible", this._visible);
            // this.watch("layers", this._refreshLayers);
            //this.watch("map", this.refresh);
            // classes

            // this.toolsDiv = dojo.byId('tools_layers');
            // this.iconset = this.toolsDiv.dataset.iconset;
        },

        // start widget. called by user
        startup: function () {
            // map not defined
            if (!this.map) {
                this.destroy();
                console.log("Error: ShowBasemapGallery, map required");
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

        _init: function () {
            var deferred = new Deferred();
            if (has("basemap")) {
                this.basemap = new BasemapGallery({
                    id: "basemapGallery1",
                    map: this.map,
                    showArcGISBasemaps: true,
                    portalUrl: this.defaults.basemapHost.sharinghost,
                    basemapsGroup: this._getBasemapGroup(),
                    //class:"verticalScrollContainer"
                }, domConstruct.create("div", {

                }, domConstruct.create("div", {
                        id:'showBasemapGallery',
                        style:'display:none;',
                }, this.domNode)));

                // on(this.basemap, 'load', lang.hitch(this, function() {
                //     // var dataItems =
                //     //this.config.response.itemInfo.itemData;
                //     var bm = this.defaults.initialMap; //dataItems.baseMap;

                //     var bmIndex = this.basemap.basemaps.findIndex(function(b) {
                //         return b.title==bm.title;
                //     });
                //     if(bmIndex<0)
                //     {
                //         var basemap1 = new Basemap({
                //             layers: bm.baseMapLayers,
                //             title: bm.title,
                //             thumbnailUrl: bm.title.includes('Canada')? "images/genericCanadaThumbMap.png":"images/genericThumbMap.png"
                //         });
                //         this.basemap.add(basemap1);

                //         this.basemap.select(basemap1.id);
                //     }
                //     else {
                //         this.basemap.select(this.basemap.basemaps[bmIndex].id);
                //     }

                // }));
                this.basemap.startup();

                // if(this.defaults.selectId !== '') {
                //     basemap.select(this.defaults.selectId);
                // }

                // var layer1 = new BasemapLayer({
                //     url:"https://basemaps.arcgis.com/v1/arcgis/rest/services/World_Basemap/VectorTileServer"
                // });
                // var basemap1 = new Basemap({
                //     layers:[layer1],
                //     title:"Vector Tiles Layer",
                //     thumbnailUrl:"images/icons_black/VectorTiles.png"
                // });
                // basemap.add(basemap1);


                var flowContainer = dojo.query('div[dojoattachpoint="flowContainer"]', this.basemap.domNode)[0];
                domAttr.set(flowContainer, 'class', 'basemapFlowContainer');

                on(this.basemap, "load", lang.hitch(this, function () {

                    this.basemap.on("selection-change",lang.hitch(this, function(){
                        var basemapObject = this.basemap.getSelected();
                        this.emit("changed", {
                            newBasemap: basemapObject,
                            loaded: this.basemap.loaded,
                            localizedLabel: i18n_BaseMapLabels.baseMapLabels[basemapObject.title],
                        } );
                    }));

                    var bm = this.defaults.initialMap;
                    var mapTitle = bm.title;
                    var bmIndex = this.basemap.basemaps.findIndex(function(b) {
                        return b.title==mapTitle;
                    });
                    if(bmIndex<0)
                    {
                        var basemap1 = new Basemap({
                            layers: bm.baseMapLayers,
                            title: mapTitle,
                            thumbnailUrl: mapTitle.includes('Canada')? "images/genericCanadaThumbMap.png":"images/genericThumbMap.png"
                        });
                        this.basemap.add(basemap1);
                    }

                    var ids = this.basemap.basemaps.filter(function(b) {return b.title == mapTitle;}).map(function(b) { return b.id;});
                    if(ids && ids.length===1) {
                        this.basemap.select(ids[0]);
                    }

                    var list = this.basemap.domNode.querySelector("div");
                    domAttr.set(list, "role", "list");

                    var nodes = this.basemap.domNode.querySelectorAll(".esriBasemapGalleryNode");
                    var galleryNodeObserver = new MutationObserver(function(mutations) {
                        mutations.forEach(function(mutation) {
                            //console.log(mutation);
                            var node = mutation.target;
                            var aSpan = node.querySelector("a span");
                            var l = aSpan.innerText;
                            if(dojo.hasClass(node, "esriBasemapGallerySelectedNode"))
                            {
                                l += ' '+this.config.i18n.tools.basemapGallery.selected;
                            }
                            l += '.';
                            domAttr.set(aSpan, 'aria-label', l);
                        });
                    });
                    var observerCfg = { attributes: true, childList: false, characterData: false };

                    array.forEach(nodes, function(node){
                        domAttr.set(node, "role", "listitem");
                        //domAttr.set(node, "aria-hidden", "true");

                        galleryNodeObserver.observe(node, observerCfg);

                        var img = node.querySelector("img");
                        img.alt='';
                        // domAttr.set(img, "aria-hidden", "true");
                        domAttr.remove(img, "title");
                        domAttr.remove(img, "tabindex");

                        var aNode = node.querySelector("a");
                        domAttr.set(aNode, "tabindex", -1);
                        var labelNode = node.querySelector(".esriBasemapGalleryLabelContainer");
                        domAttr.remove(labelNode.firstChild, "alt");
                        domAttr.remove(labelNode.firstChild, "title");
                        dojo.place(labelNode, aNode, "last");

                        var aSpan = node.querySelector("a span");

                        var aSpanLabel = aSpan.innerHTML.toLowerCase().replace(/\s/g, '_');
                        var localizedLabel = i18n_BaseMapLabels.baseMapLabels[aSpanLabel];
                        if(localizedLabel && localizedLabel !== undefined)
                            aSpan.innerText = localizedLabel;
                        var l = aSpan.innerText;

                        //var l = aSpan.innerText = this.getLocalizedMapName(aSpan.innerHTML);

                        if(dojo.hasClass(node, "esriBasemapGallerySelectedNode"))
                        {
                            l += ' '+this.config.i18n.tools.basemapGallery.selected;
                        }
                        l += '.';
                        domAttr.set(aSpan, 'aria-label', l);
                        //img.alt=aSpan.innerText;

                        domAttr.set(labelNode, "tabindex", 0);
                        on(img, "click", function() { node.focus();});
                        on(node,"keydown", function(ev) {
                            if(ev.key === "Enter" || ev.key === " " || ev.char === " ") {
                                aNode.click();
                            } else if(ev.key === "Tab" && !ev.shiftKey) {
                                if(node.nextElementSibling.nodeName != "BR") {
                                    node.nextElementSibling.focus();
                                } else {
                                   document.querySelector('#dijit_layout_ContentPane_0_splitter').focus();
                                }
                            } else if(ev.key === "Tab" && ev.shiftKey) {
                                node.focus();
                            }
                        });
                    });
                }));
                deferred.resolve(true);
            } else {
                deferred.resolve(false);
            }

            return deferred.promise;
        },

        getLocalizedMapName: function(mapName) {
            var aString = mapName.toLowerCase().replace(/\s/g, '_');
            var localized= i18n_BaseMapLabels.baseMapLabels[aString];
            if(localized && localized !== undefined)
                return localized;
            return mapName;
        },

        getSelected: function() {
            return this.basemap.getSelected();
        },

        _getBasemapGroup: function () {
            //Get the id or owner and title for an organizations custom basemap group.
            var basemapGroup = null;
            if (this.defaults.basemapHost.basemapgroup &&
                this.defaults.basemapHost.basemapgroup.title &&
                this.defaults.basemapHost.basemapgroup.owner) {
                basemapGroup = {
                    "owner": this.defaults.basemapHost.basemapgroup.owner,
                    "title": this.defaults.basemapHost.basemapgroup.title
                };
            } else if (this.defaults.basemapHost.basemapgroup &&
                this.defaults.basemapHost.basemapgroup.id) {
                basemapGroup = {
                    "id": this.defaults.basemapHost.basemapgroup.id
                };
            }
            return basemapGroup;
        },
    });

    if (has("extend-esri")) {
        lang.setObject("dijit.ShowBasemapGallery", Widget, esriNS);
    }
    return Widget;
});
