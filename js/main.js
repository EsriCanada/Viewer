/*
 | Copyright 2014 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */

var _gaq = _gaq || [];

(function() {
    var ga = document.createElement("script");
    ga.type = "text/javascript";
    ga.async = true;
    ga.src = "https://ssl.google-analytics.com/ga.js";
    var s = document.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(ga, s);
})();

define([
    "dojo/ready",
    "dojo/aspect",
    "dijit/registry",
    "dojo/json",
    "dojo/_base/array",
    "dojo/_base/Color",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom",
    "dojo/dom-geometry",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/on",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/query",
    "dijit/Menu",
    "dijit/CheckedMenuItem",
    "application/toolbar",
    "application/has-config",
    "esri/arcgis/utils",
    "esri/lang",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/focus",
    "esri/tasks/query",
    "esri/dijit/Search",
    "esri/tasks/locator",
    "esri/dijit/HomeButton",
    "esri/dijit/LocateButton",
    "esri/dijit/Legend",
    "esri/dijit/BasemapGallery",
    "esri/dijit/Basemap",
    "dojo/i18n!application/nls/resources",
    "dojo/i18n!application/nls/BaseMapLabels",
    "esri/dijit/Measurement",
    "esri/dijit/OverviewMap",
    "esri/geometry/Extent",
    "esri/layers/FeatureLayer",
    "esri/geometry/ScreenPoint",

    "application/LayerManager/LayerManager",
    "application/NavToolBar/NavToolBar",
    "application/SuperNavigator/SuperNavigator",
    "application/PopupInfo/PopupInfo",
    "application/GeoCoding/GeoCoding",
    "application/ImageToggleButton/ImageToggleButton",
    "application/FeatureList/FeatureList",
    "application/Filters/Filters",
    "application/TableOfContents/TableOfContents",

    "application/LanguageSelect/LanguageSelect",
    "application/ShareDialog",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/PictureMarkerSymbol",
    "esri/graphic",
    "esri/dijit/InfoWindow",
    "dojo/NodeList-dom",
    "dojo/NodeList-traverse"
], function(
    ready,
    aspect,
    registry,
    JSON,
    array,
    Color,
    declare,
    lang,
    dom,
    domGeometry,
    domAttr,
    domClass,
    domConstruct,
    domStyle,
    on,
    Deferred,
    all,
    query,
    Menu,
    CheckedMenuItem,
    Toolbar,
    has,
    arcgisUtils,
    esriLang,
    BorderContainer,
    ContentPane,
    focusUtil,
    Query,
    Search,
    Locator,
    HomeButton,
    LocateButton,
    Legend,
    BasemapGallery,
    Basemap,
    i18n,
    i18n_BaseMapLabels,
    Measurement,
    OverviewMap,
    Extent,
    FeatureLayer,
    ScreenPoint,
    LayerManager,
    NavToolBar,
    SuperNavigator,
    PopupInfo,
    GeoCoding,
    ImageToggleButton,
    FeatureList,
    Filters,
    TableOfContents,
    LanguageSelect,
    ShareDialog,
    SimpleMarkerSymbol,
    PictureMarkerSymbol,
    Graphic,
    InfoWindow
) {
    return declare(null, {
        config: {},
        color: null,
        theme: null,
        map: null,
        initExt: null,
        mapExt: null,
        editorDiv: null,
        editor: null,
        editableLayers: null,
        timeFormats: [
            "shortDateShortTime",
            "shortDateLEShortTime",
            "shortDateShortTime24",
            "shortDateLEShortTime24",
            "shortDateLongTime",
            "shortDateLELongTime",
            "shortDateLongTime24",
            "shortDateLELongTime24"
        ],

        startup: function(config) {
            // config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id and any url parameters and any application specific configuration information.
            if (config) {
                this.config = config;
                this.color = this.setColor(this.config.color);
                this.hoverColor =
                    typeof this.config.hoverColor == "undefined"
                        ? this.setColor("#000000", 0.4)
                        : this.setColor(this.config.hoverColor, 0.9);
                this.focusColor =
                    typeof this.config.focusColor == "undefined"
                        ? this.setColor("#1f1f1f", 0.4)
                        : this.setColor(this.config.focusColor, 0.9);
                this.activeColor =
                    typeof this.config.activeColor == "undefined"
                        ? this.focusColor
                        : this.setColor(this.config.activeColor, 0.9);
                this.theme = this.setColor(this.config.theme);

                if (config.useGoogleAnalytics) {
                    var gaqUserAccount = config.googleAnalyticsUserAccount;
                    if (!gaqUserAccount || gaqUserAccount.trim() === "") {
                        gaqUserAccount = "UA-109917224-4";
                    }
                    _gaq.push(["_setAccount", gaqUserAccount]);
                    _gaq.push(["_trackPageview"]);
                } else {
                    _gaq = null;
                }

                // document ready
                ready(
                    lang.hitch(this, function() {
                        var description = this.config.description;
                        if (!description && this.config.response) {
                            description =
                                this.config.response.itemInfo.item
                                    .description ||
                                this.config.response.itemInfo.item.snippet;
                        }
                        if (description) {
                            dojo.byId(
                                "splashScreenContent"
                            ).innerHTML = description;
                            domStyle.set("splashScreen", "display", "block");
                        }

                        //supply either the webmap id or, if available, the item info
                        var itemInfo =
                            this.config.itemInfo || this.config.webmap;
                        //If a custom extent is set as a url parameter handle that before creating the map
                        if (this.config.extent) {
                            var extArray = decodeURIComponent(
                                this.config.extent
                            ).split(",");

                            if (extArray.length === 4) {
                                itemInfo.item.extent = [
                                    [
                                        parseFloat(extArray[0]),
                                        parseFloat(extArray[1])
                                    ],
                                    [
                                        parseFloat(extArray[2]),
                                        parseFloat(extArray[3])
                                    ]
                                ];
                            } else if (extArray.length === 5) {
                                this.initExt = new Extent(
                                    JSON.parse(this.config.extent)
                                );
                            }
                        }
                        this._createWebMap(itemInfo);
                    })
                );
            } else {
                var error = new Error("Main:: Config is not defined");
                this.reportError(error);
            }

            var languages = [
                {
                    code: this.config.lang1code,
                    img: this.config.lang1imageSrc,
                    shortName: this.config.lang1shortName,
                    name: this.config.lang1name,
                    appId: this.config.lang1appId
                },
                {
                    code: this.config.lang2code,
                    img: this.config.lang2imageSrc,
                    shortName: this.config.lang2shortName,
                    name: this.config.lang2name,
                    appId: this.config.lang2appId
                },
                {
                    code: this.config.lang3code,
                    img: this.config.lang3imageSrc,
                    shortName: this.config.lang3shortName,
                    name: this.config.lang3name,
                    appId: this.config.lang3appId
                }
            ];

            new LanguageSelect(
                {
                    locale: document.documentElement.lang,
                    //location: window.location,
                    languages: languages,

                    textColor: this.color,

                    showLabel: this.config.languageLabel
                },
                dojo.byId("languageSelectNode")
            ).startup();
        },

        reportError: function(error) {
            // remove loading class from body
            domClass.replace(document.body, "app-error", "app-loading");
            // an error occurred - notify the user. In this example we pull the string from the
            // resource.js file located in the nls folder because we've set the application up
            // for localization. If you don't need to support multiple languages you can hardcode the
            // strings here and comment out the call in index.html to get the localization strings.
            // set message
            var node = dom.byId("loading_message");

            if (node) {
                if (this.config && this.config.i18n) {
                    node.innerHTML =
                        this.config.i18n.map.error + ": " + error.message;
                } else {
                    node.innerHTML = "Unable to create map: " + error.message;
                }
            }
        },

        setColor: function(color, tr) {
            var rgb = Color.fromHex(color).toRgb();
            var outputColor = null;
            if (has("ie") < 9) {
                outputColor = color;
            } else {
                //rgba supported so add
                rgb.push(tr);
                outputColor = Color.fromArray(rgb);
            }
            return outputColor;
        },

        stepX: null,
        stepY: null,

        _mapLoaded: function() {
            // this.map.resize();
            // this.map.reposition();

            // domClass.remove(document.body, "app-loading");
            // domStyle.set("splashScreen", "display", "block");

            query(".esriSimpleSlider").style(
                "backgroundColor",
                this.theme.toString()
            );
            on(
                window,
                "orientationchange",
                lang.hitch(this, this._adjustPopupSize)
            );
            this._adjustPopupSize();

            on(
                this.map.infoWindow,
                "show",
                lang.hitch(this, function() {
                    this._initPopup(this.map.infoWindow.domNode);
                })
            );

            on(
                this.map.infoWindow,
                "selection-change",
                lang.hitch(this, function() {
                    this._initPopup(this.map.infoWindow.domNode);
                })
            );

            this.stepX = this.map.width * 0.0135;
            this.stepY = this.map.height * 0.0135;
        },

        _initPopup: function(node) {
            images = node.querySelectorAll("img");
            for (var i = 0; i < images.length; i++) {
                if (!dojo.getAttr(images[i], "alt")) {
                    dojo.setAttr(images[i], "alt", "");
                }
            }

            dojo.setAttr(node, "role", "dialog");
            header = node.querySelector(".header");
            if (header) {
                dojo.setAttr(node, "tabindex", 0);
                node.blur();
                label = header.innerHTML;
                title = node.querySelector(".title");
                if (title && title.innerHTML != "&nbsp;") {
                    label = title.innerHTML + ": " + label;
                }
                dojo.setAttr(node, "aria-label", label);
                node.focus();
            }

            attrNames = node.querySelectorAll(".attrName");
            if (attrNames) {
                for (i = 0; i < attrNames.length; i++) {
                    attrName = attrNames[i];

                    dojo.create(
                        "th",
                        {
                            id: "h_" + i,
                            scope: "row",
                            className: "attrName",
                            innerHTML: attrName.innerHTML
                        },
                        attrName.parentNode,
                        "first"
                    );

                    attrValues = attrName.parentNode.querySelectorAll(
                        ".attrValue"
                    );
                    if (attrValues) {
                        for (j = 0; j < attrValues.length; j++) {
                            var attrValue = attrValues[j];
                            dojo.setAttr(attrValue, "headers", "h_" + i);
                        }
                    }
                    dojo.destroy(attrName);
                }
            }

            zoom = node.querySelector(".zoomTo");
            if (zoom) {
                hint = "Zoom to";
                dojo.setAttr(zoom, "aria-label", hint);
                dojo.setAttr(zoom, "title", hint);
                //dojo.setAttr(zoom.parentNode, "data-title", hint);
                dojo.removeAttr(zoom, "to");
                dojo.setAttr(zoom, "role", "button");
            }
        },

        _saveLeftPanelWidth: -1,
        // Create UI
        _createUI: function() {
            var borderContainer = (this.mainBorderContainer = new BorderContainer(
                {
                    gutters: false,
                    liveSplitters: true,
                    id: "borderContainer"
                }
            ));

            var contentPaneTop = new ContentPane({
                region: "top",
                splitter: false,
                style: "padding:0;",
                content: dojo.byId("panelTitle")
            });
            borderContainer.addChild(contentPaneTop);

            var contentPaneLeft = (this.contentPaneLeft = new ContentPane({
                region: "leading",
                splitter: "true",
                style: "width:425px; padding:0; overflow: none;",
                content: dojo.byId("leftPanel"),
                class: "splitterContent"
            }));
            borderContainer.addChild(contentPaneLeft);

            var contentPaneRight = (this.contentPaneRight = new ContentPane({
                style: "padding:1px; background-color:white;",
                region: "center",
                splitter: "true",
                // class: "bg",
                content: dojo.byId("mapPlace")
            }));
            borderContainer.addChild(contentPaneRight);

            borderContainer.placeAt(document.body);
            borderContainer.startup();

            aspect.after(
                contentPaneRight,
                "resize",
                lang.hitch(this, function() {
                    this.map.emit("parentSize_changed", {});
                    this.map.resize();
                    this.map.reposition();
                })
            );

            domStyle.set("panelPages", "visibility", "hidden");
            //Add tools to the toolbar. The tools are listed in the defaults.js file
            var toolbar = new Toolbar(this.config);
            toolbar.startup().then(
                lang.hitch(this, function() {
                    var vSplitterTools = domConstruct.create(
                        "div",
                        {
                            id: "vSplitterTools",
                            class: "bg"
                        },
                        dojo.byId("panelTools")
                    );
                    var collapseLeftPanelButton = (this.collapseLeftPanelButton =
                        domConstruct.create("input", {
                            type: 'image',
                            src: "images/icons_"+this.config.icons+"/left.png",
                            alt: i18n.leftCollapse,
                            title: i18n.leftCollapse,
                        }, vSplitterTools));

                    var expandLeftPanelButton = (this.expandLeftPanelButton =
                        domConstruct.create("input", {
                            id: 'expandLeftPanelButton',
                            type: 'image',
                            src: "images/icons_black/right.png",
                            alt: i18n.leftExpand,
                            title: i18n.leftExpand,
                            style: "display:none;"
                        }, dojo.byId("mapFocus"),"before"));

                    // aspect.after(this.contentPaneLeft, "resize", lang.hitch(this, function(size) {
                    //     // console.log(size);
                    //     if(size && size.w != undefined) {
                    //         domAttr.set(
                    //             this.contentPaneLeft,
                    //             "aria-hidden",
                    //             (size.w == 0).toString()
                    //         );
                    //         domAttr.set(
                    //             dojo.byId(
                    //                 this.contentPaneLeft.id + "_splitter"
                    //             ),
                    //             "aria-hidden",
                    //             (size.w == 0).toString()
                    //         );
                    //     }
                    // }), true);

                    on(
                        collapseLeftPanelButton,
                        "click",
                        lang.hitch(this, function(ev) {
                            this._saveLeftPanelWidth = this.contentPaneLeft.domNode.clientWidth+'px';
                            this.collapseLeftPanelWidth();
                        })
                    );

                    on(
                        expandLeftPanelButton,
                        "click",
                        lang.hitch(this, function(ev) {
                            this.restoreLeftPanelWidth(this._saveLeftPanelWidth);
                        })
                    );

                    //     new ImageToggleButton(
                    //     {
                    //         id: "collapseLeftPanelButton",
                    //         imgSelected: "images/icons_"+this.config.icons+"/right.png",
                    //         imgUnselected: "images/icons_"+this.config.icons+"/left.png",
                    //         titleUnselected: i18n.leftCollapse,
                    //         titleSelected: i18n.leftExpand
                    //     },
                    //     domConstruct.create("div", {}, vSplitterTools)
                    // ));
                    // collapseLeftPanelButton.startup();

                    // on(
                    //     collapseLeftPanelButton,
                    //     "change",
                    //     lang.hitch(this, function(ev) {
                    //         var vSplitterTools = dojo.byId("vSplitterTools");
                    //         if (collapseLeftPanelButton.isChecked()) {
                    //             this._saveLeftPanelWidth = this.contentPaneLeft.domNode.clientWidth;
                    //             dojo.hitch(
                    //                 this.mainBorderContainer,
                    //                 this.mainBorderContainer._layoutChildren(
                    //                     this.contentPaneLeft.id,
                    //                     0
                    //                 )
                    //             );
                    //             dojo.hitch(
                    //                 this.mainBorderContainer,
                    //                 this.mainBorderContainer._layoutChildren(
                    //                     this.contentPaneLeft.id + "_splitter",
                    //                     0
                    //                 )
                    //             );
                    //             domAttr.set(
                    //                 dojo.byId(this.contentPaneLeft.id),
                    //                 "aria-hidden",
                    //                 "true"
                    //             );
                    //             domAttr.set(
                    //                 dojo.byId(
                    //                     this.contentPaneLeft.id + "_splitter"
                    //                 ),
                    //                 "aria-hidden",
                    //                 "true"
                    //             );
                    //             domConstruct.place(
                    //                 vSplitterTools,
                    //                 dojo.byId("mapFocus"),
                    //                 "before"
                    //             );
                    //             domClass.add(vSplitterTools, "onMap");
                    //         } else {
                    //             dojo.hitch(
                    //                 this.mainBorderContainer,
                    //                 this.mainBorderContainer._layoutChildren(
                    //                     this.contentPaneLeft.id,
                    //                     this._saveLeftPanelWidth
                    //                 )
                    //             );
                    //             dojo.hitch(
                    //                 this.mainBorderContainer,
                    //                 this.mainBorderContainer._layoutChildren(
                    //                     this.contentPaneLeft.id + "_splitter",
                    //                     12
                    //                 )
                    //             );
                    //             domAttr.set(
                    //                 dojo.byId(this.contentPaneLeft.id),
                    //                 "aria-hidden",
                    //                 "false"
                    //             );
                    //             domAttr.set(
                    //                 dojo.byId(
                    //                     this.contentPaneLeft.id + "_splitter"
                    //                 ),
                    //                 "aria-hidden",
                    //                 "false"
                    //             );
                    //             domConstruct.place(
                    //                 vSplitterTools,
                    //                 dojo.byId("panelTools"),
                    //                 "before"
                    //             );
                    //             domClass.remove(vSplitterTools, "onMap");
                    //         }
                    //         collapseLeftPanelButton.focus();
                    //     })
                    // );

                    // set map so that it can be repositioned when page is scrolled
                    toolbar.map = this.map;
                    var toolList = [
                        this._addNavigation(
                            "navigation",
                            query("#mapDiv_zoom_slider")[0],
                            (this.navDeferred = new Deferred())
                        )
                    ];

                    var deferredDetails = new Deferred();
                    for (var i = 0; i < this.config.tools.length; i++) {
                        switch (this.config.tools[i].name) {
                            case "mapKeyboardNavigation":
                                if (has("mapKeyboardNavigation"))
                                    this._addMapKeyboardNavigation(toolbar);
                                break;
                            case "details":
                                toolList.push(
                                    this._addDetails(
                                        this.config.tools[i],
                                        toolbar,
                                        deferredDetails
                                    )
                                );
                                break;
                            case "instructions":
                                toolList.push(
                                    this._addInstructions(
                                        this.config.tools[i],
                                        toolbar,
                                        deferredDetails
                                    )
                                );
                                break;
                            case "infoPanel":
                                toolList.push(
                                    this._addInfoPanel(
                                        this.config.tools[i],
                                        toolbar
                                    )
                                );
                                break;
                            case "geoCoding":
                                toolList.push(
                                    this._addGeoCoding(
                                        this.config.tools[i],
                                        toolbar
                                    )
                                );
                                break;
                            case "features":
                                toolList.push(
                                    this._addFeatures(
                                        this.config.tools[i],
                                        toolbar
                                    )
                                );
                                break;
                            case "filter":
                                toolList.push(
                                    this._addFilter(
                                        this.config.tools[i],
                                        toolbar
                                    )
                                );
                                break;
                            case "legend":
                                toolList.push(
                                    this._addLegend(
                                        this.config.tools[i],
                                        toolbar
                                    )
                                );
                                break;
                            case "layerManager":
                                toolList.push(
                                    this._addLayerManager(
                                        this.config.tools[i],
                                        toolbar
                                    )
                                );
                                break;
                            case "layers":
                                toolList.push(
                                    this._addLayers(
                                        this.config.tools[i],
                                        toolbar
                                    )
                                );
                                break;
                            case "basemap":
                                toolList.push(
                                    this._addBasemapGallery(
                                        this.config.tools[i],
                                        toolbar
                                    )
                                );
                                break;
                            case "overview":
                                toolList.push(
                                    this._addOverviewMap(
                                        this.config.tools[i],
                                        toolbar
                                    )
                                );
                                break;
                            case "measure":
                                toolList.push(
                                    this._addMeasure(
                                        this.config.tools[i],
                                        toolbar
                                    )
                                );
                                break;
                            case "edit":
                                toolList.push(
                                    this._addEditor(
                                        this.config.tools[i],
                                        toolbar
                                    )
                                );
                                break;
                            case "share":
                                toolList.push(
                                    this._addShare(
                                        this.config.tools[i],
                                        toolbar
                                    )
                                );
                                break;
                            case "bookmarks":
                                toolList.push(
                                    this._addBookmarks(
                                        this.config.tools[i],
                                        toolbar
                                    )
                                );
                                break;
                            case "print":
                                toolList.push(
                                    this._addPrint(
                                        this.config.tools[i],
                                        toolbar
                                    )
                                );
                                break;
                            case "navigation":
                                break;
                            default:
                                break;
                        }
                    }

                    all(toolList).then(
                        lang.hitch(this, function(results) {
                            var tools = array.some(results, function(r) {
                                return r;
                            });

                            this._updateTheme();

                            toolbar._activateDefautTool();

                            on(
                                toolbar,
                                "updateTool",
                                lang.hitch(this, function(name) {
                                    if (name === "measure") {
                                        this._destroyEditor();
                                        this.map.setInfoWindowOnClick(false);
                                    } else if (name === "edit") {
                                        this._destroyEditor();
                                        this.map.setInfoWindowOnClick(false);
                                        this._createEditor();
                                    } else {
                                        //activate the popup and destroy editor if necessary
                                        this._destroyEditor();
                                        this.map.setInfoWindowOnClick(true); // ? With InfoPopup!
                                    }

                                    if (has("measure") && name !== "measure") {
                                        query(".esriMeasurement").forEach(
                                            lang.hitch(this, function(node) {
                                                var m = registry.byId(node.id);
                                                if (m) {
                                                    m.clearResult();
                                                    m.setTool(
                                                        "location",
                                                        false
                                                    );
                                                    m.setTool("area", false);
                                                    m.setTool(
                                                        "distance",
                                                        false
                                                    );
                                                }
                                            })
                                        );
                                    }
                                })
                            );

                            domStyle.set("panelPages", "visibility", "visible");

                            // domStyle.set("splashScreen", "display", "none");
                            domClass.remove(document.body, "app-loading");
                        })
                    );
                })
            );

            on(
                document.body,
                "keydown",
                lang.hitch(this, function(event) {
                    if (event.altKey) {
                        query(".goThereHint").forEach(function(h) {
                            domStyle.set(h, "display", "inline-table");
                        });
                    }
                    switch (event.key) {
                        case "Esc":
                        case "Escape":
                            var activeElement = focusUtil.curNode;
                            if (!activeElement) break;
                            if (dojo.hasClass(activeElement, "pageBody")) {
                                var id = activeElement.id.replace(
                                    "pageBody",
                                    "toolButton"
                                );
                                var toolBtn = document
                                    .querySelector(
                                        "#" + id// + " input[type='image'"
                                    )
                                    .focus();

                                break;
                            }
                            var upper = query(activeElement)
                                .parent()
                                .closest("[tabindex=0]");
                            if (upper && upper.length >= 1) {
                                upper[0].focus();
                            } else {
                                this.skipToMap();
                            }
                            break;
                        case "0":
                            if (event.altKey) {
                                skipSkip();
                            }
                            break;
                        default:
                            break;
                    }
                })
            );

            on(document.body, "keyup", function(event) {
                if (!event.altKey) {
                    query(".goThereHint").forEach(function(h) {
                        domStyle.set(h, "display", "");
                    });
                }
            });

            if (this.config.alt_keys) {
                domConstruct.create(
                    "div",
                    {
                        class: "goThereHint",
                        innerHTML:
                            "<b>Alt&nbsp;+&nbsp;1</b> " +
                            this.config.i18n.skip.tools,
                        style: "left:20%; top:10px;"
                    },
                    dom.byId("panelTools")
                );

                domConstruct.create(
                    "div",
                    {
                        class: "goThereHint",
                        innerHTML:
                            "<b>Alt&nbsp;+&nbsp;2</b> " +
                            this.config.i18n.skip.search,
                        style: "left:20%; top:50%;"
                    },
                    dom.byId("panelSearch")
                );

                domConstruct.create(
                    "div",
                    {
                        class: "goThereHint",
                        innerHTML:
                            "<b>Alt&nbsp;+&nbsp;3</b> " +
                            this.config.i18n.skip.content,
                        style: "left:20%; top:45%;"
                    },
                    dom.byId("panelPages")
                );

                domConstruct.create(
                    "div",
                    {
                        class: "goThereHint",
                        innerHTML:
                            "<b>Alt&nbsp;+&nbsp;4</b> " +
                            this.config.i18n.skip.vsplitter,
                        style: "left:5px; top:55%; z-index:1000;"
                    },
                    this.map.container
                    // dom.byId("leftPanel")
                );

                domConstruct.create(
                    "div",
                    {
                        class: "goThereHint",
                        innerHTML:
                            "<b>Alt&nbsp;+&nbsp;5</b> " +
                            this.config.i18n.skip.map,
                        style: "left:10%; top:30%"
                    },
                    this.map.container
                );

                domConstruct.create(
                    "div",
                    {
                        class: "goThereHint",
                        innerHTML:
                            "<b>Alt&nbsp;+&nbsp;6</b> " +
                            this.config.i18n.skip.help,
                        style: "left:20%; top:-75%;"
                    },
                    dom.byId("panelBottom")
                );
            }

            var skipTools = query(".skip #skip-tools")[0];
            var skipSearch = query(".skip #skip-search")[0];
            var skipContent = query(".skip #skip-content")[0];
            var skipVSplitter = query(".skip #skip-Vsplitter")[0];
            var skipMap = query(".skip #skip-map")[0];
            var skipInstructions = query(".skip #skip-instructions")[0];
            var skipFeature = query(".skip #skip-feature")[0];

            var skipHSplitter = query(".skip #skip-Hsplitter")[0];
            var skipTableHeader = query(".skip #skip-tableHeader")[0];
            var skipTable = query(".skip #skip-table")[0];
            // if (!has("featureTable")) {
            //     domStyle.set(skipHSplitter, "display", "none");
            //     domStyle.set(skipTableHeader, "display", "none");
            //     domStyle.set(skipTable, "display", "none");
            // }

            dojo.html.set(skipTools, "1. " + this.config.i18n.skip.tools);
            dojo.html.set(skipSearch, "2. " + this.config.i18n.skip.search);
            dojo.html.set(skipContent, "3. " + this.config.i18n.skip.content);
            dojo.html.set(skipVSplitter,"4. " + this.config.i18n.skip.vsplitter);
            dojo.html.set(skipMap, "5. " + this.config.i18n.skip.map);
            dojo.html.set(skipInstructions, "6. " + this.config.i18n.skip.help);
            dojo.html.set(skipHSplitter,"7. " + this.config.i18n.skip.hsplitter);
            dojo.html.set(skipTableHeader,"8. " + this.config.i18n.skip.tableHeader);
            dojo.html.set(skipTable, "9. " + this.config.i18n.skip.table);

            skipTools.addEventListener(
                "click",
                lang.hitch(this, this.skipToTools)
            );
            skipSearch.addEventListener(
                "click",
                lang.hitch(this, this.skipToSearch)
            );
            skipContent.addEventListener(
                "click",
                lang.hitch(this, this.skipToContent)
            );
            skipVSplitter.addEventListener(
                "click",
                lang.hitch(this, this.skipToVSplitter)
            );
            skipMap.addEventListener("click", lang.hitch(this, this.skipToMap));
            skipInstructions.addEventListener(
                "click",
                lang.hitch(this, this.skipToInstructions)
            );
            skipHSplitter.addEventListener(
                "click",
                lang.hitch(this, this.skipToHSplitter)
            );
            skipTableHeader.addEventListener(
                "click",
                lang.hitch(this, this.skipToTableHeader)
            );
            skipTable.addEventListener(
                "click",
                lang.hitch(this, this.skipToTable)
            );

            query(".skip").forEach(function(h) {
                on(h, "keydown", function(e) {
                    if (e.key === "Enter" || e.key === " " || e.char === " ") {
                        e.target.click();
                        e.preventDefault();
                    }
                });
            });

            query(".skip a").forEach(function(a) {
                a.onfocus = lang.hitch(a, function() {
                    domAttr.set(this, "aria-hidden", "false");
                });
                a.onblur = lang.hitch(a, function() {
                    domAttr.set(this, "aria-hidden", "true");
                });
            });

            dojo.html.set(
                dom.byId("panelBottomSpan"),
                this.config.i18n.pressAlt
            );
            dojo.html.set(dom.byId("searchLabel"), this.config.i18n.search);

            skipSkip = function() {
                dom.byId("skip-tools").focus();
            };

            skipToMap = lang.hitch(this, function() {
                this.map.container.focus();
            });

            var verticalSplitter = query(".dijitSplitterV");
            if (verticalSplitter && verticalSplitter.length > 0) {
                verticalSplitter = verticalSplitter[0];
                domAttr.set(verticalSplitter, "title", i18n.tooltips.vsplitter);

                on(
                    verticalSplitter,
                    "keydown",
                    lang.hitch(this, function(ev) {
                        if (ev.keyCode === 13) {
                            this.restoreLeftPanelWidth();
                        }
                    })
                );

                on(
                    verticalSplitter,
                    "dblclick",
                    lang.hitch(this, function(ev) {
                        this.restoreLeftPanelWidth();
                    })
                );
            }
        },

        collapseLeftPanelAction: function(show) {
            if(show) {
                this.restoreLeftPanelWidth(this._saveLeftPanelWidth);
            } else {
                this.collapseLeftPanelWidth();
            }
        },

        showLefPanelArea: function(hide) {
            domAttr.set(
                this.contentPaneLeft,
                "aria-hidden",
                hide.toString()
            );
            domAttr.set(
                dojo.byId(
                    this.contentPaneLeft.id + "_splitter"
                ),
                "aria-hidden",
                hide.toString()
            );
        },

        collapseLeftPanelWidth: function() {
            domStyle.set(this.expandLeftPanelButton, 'display', '');
            this.expandLeftPanelButton.focus();
            this.showLefPanelArea(true);
            dojo.hitch(
                this.mainBorderContainer,
                this.mainBorderContainer._layoutChildren(
                    this.contentPaneLeft.id,
                    0
                )
            );
            dojo.hitch(
                this.mainBorderContainer,
                this.mainBorderContainer._layoutChildren(
                    this.contentPaneLeft.id + "_splitter",
                    0
                )
            );
        },

        restoreLeftPanelWidth: function(width) {
            domStyle.set(this.expandLeftPanelButton, 'display', 'none');
            this.collapseLeftPanelButton.focus();
            this.showLefPanelArea(false);

            if(!width) {
                var leftPanel = dojo.byId("leftPanel");
                width = window.getComputedStyle(leftPanel)[
                    "min-width"
                ];
            }
            domStyle.set(
                this.contentPaneLeft.domNode,
                "width", width
            );
            dojo.hitch(
                this.mainBorderContainer,
                this.mainBorderContainer._layoutChildren(
                    this.contentPaneLeft.id + "_splitter",
                    12
                )
            );

            this.mainBorderContainer.resize();
        },

        skipToTools: function() {
            this.restoreLeftPanelWidth();
            query(
                '#panelTools .panelToolActive'
            )[0].focus();
        },

        skipToSearch: function() {
            this.restoreLeftPanelWidth();
            dom.byId("search_input").focus();
        },

        skipToContent: function() {
            this.restoreLeftPanelWidth();
            dojo.query(".page.showAttr .pageBody")[0].focus();
        },

        skipToVSplitter: function() {
            dojo.byId("dijit_layout_ContentPane_1_splitter").focus();
        },

        skipToMap: function() {
            dojo.byId("mapDiv").focus();
        },

        skipToInstructions: function() {
            var activeTool = query(".panelToolActive");
            if (activeTool && activeTool.length > 0) {
                activeTool = activeTool[0].childNodes[0];
                activeTool.click();
            }
            dom.byId("instructionsDiv").focus();
        },

        skipToHSplitter: function() {
            var featureTableContainer = dojo.byId("featureTableContainer");
            if (
                !featureTableContainer ||
                featureTableContainer.clientHeight === 0
            )
                return;
            dojo.byId("featureTableContainer_splitter").focus();
        },

        skipToTable: function() {
            var featureTableContainer = dojo.byId("featureTableContainer");
            if (
                !featureTableContainer ||
                featureTableContainer.clientHeight === 0
            )
                return;
            var focusCells = query(
                "#featureTableNode div.dgrid-content .dgrid-focus"
            );
            if (focusCells && focusCells.length > 0) {
                focusCells[0].scrollIntoView();
                focusCells[0].focus();
            } else {
                var cells = query(
                    "#featureTableNode div.dgrid-content .dgrid-cell"
                );
                if (cells && cells.length > 0) {
                    var i = -1;
                    var visible = false;
                    while (++i < 10 && !visible) {
                        visible =
                            window
                                .getComputedStyle(cells[i], null)
                                .getPropertyValue("display") != "none";
                        if (visible) {
                            // domClass.add(cells[i], "dgrid-focus");
                            dojo.setAttr(cells[i], "tabindex", 0);
                            cells[i].scrollIntoView();
                            cells[i].focus();
                        }
                    }
                }
            }
        },

        skipToTableHeader: function() {
            var featureTableContainer = dojo.byId("featureTableContainer");
            if (
                !featureTableContainer ||
                featureTableContainer.clientHeight === 0
            )
                return;
            var header = query("#featureTableNode div.dgrid-header");
            if (header && header.length > 0) {
                header[0].focus();
            }
        },

        featureList: null,

        _addFeatures: function(tool, toolbar) {
            //Add the legend tool to the toolbar. Only activated if the web map has operational layers.
            var deferred = new Deferred();
            if (has("features")) {
                var featuresDiv = toolbar.createTool(
                    tool,
                    "",
                    "reload1.gif",
                    "featureSelected"
                );

                var layers = this.config.response.itemInfo.itemData
                    .operationalLayers;

                featureList = new FeatureList(
                    {
                        map: this.map,
                        layers: layers,
                        toolbar: toolbar,
                        animatedMarker: this.config.animated_marker,
                        markerImage: this.config.marker,
                        markerSize: this.config.marker_size
                    },
                    featuresDiv
                );
                featureList.startup();

                // on(toolbar, 'updateTool_features', lang.hitch(this, function(name) {
                //     dom.byId('pageBody_features').focus();
                // }));

                deferred.resolve(true);
            } else {
                // window._prevSelected = null;
                deferred.resolve(false);
            }

            return deferred.promise;
        },

        navDeferred: null,

        _addNavigation: function(tool, oldNaviagationToolBar, deferred) {
            var navToolBar = domConstruct.create("div", {
                id: "newNaviagationToolBar"
            });

            nav = new NavToolBar(
                {
                    map: this.map,
                    navToolBar: oldNaviagationToolBar,
                    iconColor: this.config.icons,
                    newIcons: this.config.new_icons ? ".new" : "",
                    zoomColor: this.focusColor
                },
                navToolBar
            );
            nav.startup();

            deferred.resolve(true);
            return deferred.promise;
        },

        _addMapKeyboardNavigation: function(toolbar) {
            this.superNav = new SuperNavigator({
                map: this.map,
                toolBar: toolbar,
                cursorColor: "black",
                selectionColor: this.config.mapSelectionColor,
                cursorFocusColor: this.config.focusColor,
                operationalLayers: this.config.response.itemInfo.itemData
                    .operationalLayers
            });
            this.superNav.startup();
        },

        _addFilter: function(tool, toolbar) {
            //Add the legend tool to the toolbar. Only activated if the web map has operational layers.
            var deferred = new Deferred();
            if (has("filter")) {
                var filterDiv = toolbar.createTool(tool, "", "", "someFilters");

                var layers = this.config.response.itemInfo.itemData
                    .operationalLayers;

                filter = new Filters(
                    {
                        map: this.map,
                        layers: layers,
                        toolbar: toolbar
                    },
                    filterDiv
                );
                filter.startup();

                // on(toolbar, 'updateTool_filter', lang.hitch(this, function(name) {
                //     dom.byId('pageBody_filter').focus();
                // }));

                deferred.resolve(true);
            } else {
                // window._prevSelected = null;
                deferred.resolve(false);
            }

            return deferred.promise;
        },

        _addBasemapGallery: function(tool, toolbar) {
            var deferred = new Deferred();
            if (has("layerManager")) {
                deferred.resolve(true);
            } else if (has("basemap")) {
                var basemapDiv = toolbar.createTool(tool);
                var basemap = new BasemapGallery(
                    {
                        id: "basemapGallery",
                        map: this.map,
                        showArcGISBasemaps: true,
                        portalUrl: this.config.sharinghost,
                        basemapsGroup: this._getBasemapGroup()
                    },
                    domConstruct.create("div", {}, basemapDiv)
                );

                on(basemap, 'load', lang.hitch(this, function() {
                    var dataItems = this.config.response.itemInfo.itemData;
                    var bm = dataItems.baseMap;

                    var bmIndex=-1;
                    try {
                        if(isIE11) {
                            basemap.basemaps.some(function(b, i) {
                                if (b.title==bm.title) {
                                    bmIndex = i;
                                    return true;
                                }
                            });
                        }
                        else {
                            bmIndex = basemap.basemaps.findIndex(function(b) {
                                return b.title==bm.title;
                            });
                        }
                        if(bmIndex<0)
                        {
                            var basemap1 = new Basemap({
                                layers: bm.baseMapLayers,
                                title: bm.title,
                                thumbnailUrl: (bm.title.indexOf('Canada') >= 0) ? "images/genericCanadaThumbMap.png":"images/genericThumbMap.png"
                            });
                            basemap.add(basemap1);

                            basemap.select(basemap1.id);
                        }
                        else {
                            basemap.select(basemap.basemaps[bmIndex].id);
                        }
                    } catch (ex) {
                        console.log('IE11 Error', ex);
                    }

                }));
                basemap.startup();

                on(
                    basemap,
                    "load",
                    lang.hitch(basemap, function() {
                        var list = this.domNode.querySelector("div");
                        domAttr.set(list, "role", "list");

                        var galleryNodeObserver = new MutationObserver(function(
                            mutations
                        ) {
                            mutations.forEach(function(mutation) {
                                //console.log(mutation);
                                var node = mutation.target;
                                var aSpan = node.querySelector("a span");
                                var l = aSpan.innerText;
                                if (
                                    dojo.hasClass(
                                        node,
                                        "esriBasemapGallerySelectedNode"
                                    )
                                ) {
                                    l +=
                                        " " +
                                        this.config.i18n.tools.basemapGallery
                                            .selected;
                                }
                                l += ".";
                                //node.querySelector('a').focus();
                                domAttr.set(aSpan, "aria-label", l);
                                //aSpan.focus();
                            });
                        });

                        var observerCfg = {
                            attributes: true,
                            childList: false,
                            characterData: false
                        };

                        var nodes = this.domNode.querySelectorAll(
                            ".esriBasemapGalleryNode"
                        );
                        array.forEach(nodes, function(node) {
                            domAttr.set(node, "role", "listitem");
                            //domAttr.set(node, "aria-hidden", "true");

                            galleryNodeObserver.observe(node, observerCfg);

                            var img = node.querySelector("img");
                            img.alt = "";
                            domAttr.set(img, "aria-hidden", true);
                            domAttr.remove(img, "title");
                            domAttr.remove(img, "tabindex");

                            var aNode = node.querySelector("a");
                            domAttr.set(aNode, "tabindex", -1);
                            var labelNode = node.querySelector(
                                ".esriBasemapGalleryLabelContainer"
                            );
                            domAttr.remove(labelNode.firstChild, "alt");
                            domAttr.remove(labelNode.firstChild, "title");
                            dojo.place(labelNode, aNode, "last");

                            var aSpan = node.querySelector("a span");
                            var aSpanLabel = aSpan.innerHTML
                                .toLowerCase()
                                .replace(/\s/g, "_");
                            try {
                                var localizedLabel =
                                    i18n_BaseMapLabels.baseMapLabels[
                                        aSpanLabel
                                    ];
                                if (
                                    localizedLabel &&
                                    localizedLabel !== undefined
                                )
                                    aSpan.innerText = localizedLabel;
                                var l = aSpan.innerText;
                                if (
                                    dojo.hasClass(
                                        node,
                                        "esriBasemapGallerySelectedNode"
                                    )
                                ) {
                                    l +=
                                        " " +
                                        this.config.i18n.tools.basemapGallery
                                            .selected;
                                }
                                l += ".";
                                domAttr.set(aSpan, "aria-label", l);
                                //img.alt=aSpan.innerText;
                            } catch (e) {}

                            domAttr.set(labelNode, "tabindex", 0);
                            on(img, "click", function() {
                                node.focus();
                            });
                            on(node, "keydown", function(ev) {
                                if (
                                    ev.key === "Enter" ||
                                    ev.key === " " ||
                                    ev.char === " "
                                ) {
                                    aNode.click();
                                } else if (ev.key === "Tab" && !ev.shiftKey) {
                                    if (
                                        node.nextElementSibling.nodeName != "BR"
                                    ) {
                                        node.nextElementSibling.focus();
                                    } else {
                                        document
                                            .querySelector(
                                                "#dijit_layout_ContentPane_0_splitter"
                                            )
                                            .focus();
                                    }
                                } else if (ev.key === "Tab" && ev.shiftKey) {
                                    node.focus();
                                }
                            });
                        });
                    })
                );
                deferred.resolve(true);
            } else {
                deferred.resolve(false);
            }

            return deferred.promise;
        },

        _addBookmarks: function(tool, toolbar) {
            var deferred = new Deferred();
            if (this.config.response.itemInfo.itemData.bookmarks) {
                require([
                    "application/has-config!bookmarks?esri/dijit/Bookmarks"
                ], lang.hitch(this, function(Bookmarks) {
                    if (!Bookmarks) {
                        deferred.resolve(false);
                        return;
                    }
                    var bookmarkDiv = toolbar.createTool(tool);
                    // var bookmarkDiv = domConstruct.create("div",{ class: "margin"}, bDiv);
                    var bookmarks = new Bookmarks(
                        {
                            map: this.map,
                            bookmarks: this.config.response.itemInfo.itemData
                                .bookmarks
                        },
                        domConstruct.create("div", {}, bookmarkDiv)
                    );

                    items = bookmarks.bookmarkDomNode.querySelectorAll(
                        ".esriBookmarkItem"
                    );
                    if (items && items.length > 0) {
                        itemsTable =
                            items[0].parentNode.parentNode.parentNode
                                .parentNode;
                        var header = document.createElement("tr");
                        header.innerHTML =
                            "<th style='display:none;'>Bookmarks</th>";
                        itemsTable.insertBefore(
                            header,
                            items[0].parentNode.parentNode.parentNode
                        );
                        domAttr.set(itemsTable, "role", "list");

                        for (i = 0; i < items.length; i++) {
                            var item = items[i];
                            // domAttr.set(item, 'tabindex', 0);
                            var label = item.querySelector(
                                ".esriBookmarkLabel"
                            );
                            // domAttr.remove(label, 'tabindex');
                            this._atachEnterKey(item, label);
                            domStyle.set(label, "width", "");

                            domAttr.set(
                                item.parentNode.parentNode,
                                "role",
                                "listitem"
                            );
                        }
                    }
                    deferred.resolve(true);
                }));
            } else {
                deferred.resolve(false);
            }

            return deferred.promise;
        },

        _addDetails: function(tool, toolbar, deferred) {
            //Add the default map description panel
            if (has("details")) {
                var description =
                    this.config.description ||
                    this.config.response.itemInfo.item.description ||
                    this.config.response.itemInfo.item.snippet ||
                    " ";

                if (description) {
                    var detailDiv = toolbar.createTool(tool);

                    detailDiv.innerHTML =
                        "<div id='detailDiv' tabindex=0>" + description + "</div>";
                    detailDiv = dom.byId("detailDiv");
                    if (!has("instructions")) {
                        domClass.add(detailDiv, "detailFull");
                    }
                    else {
                        domClass.add(detailDiv, "detailHalf");
                    }

                    var detailBtn = dojo.query("#toolButton_details")[0];
                    domClass.add(detailBtn, "panelToolDefault");
                }
                deferred.resolve(true);
            } else {
                deferred.resolve(true);
            }

            return deferred.promise;
        },

        _addInstructions: function(tool, toolbar, deferedDetails) {
            var deferred = new Deferred();
            if (!has("instructions")) {
                deferred.resolve(false);
            } else {
                if (!has("details")) {
                    require([
                        "dojo/text!application/dijit/templates/" +
                            this.config.i18n.instructions +
                            ".html"
                    ], function(instructionsText) {
                        var instructionsDiv = toolbar.createTool(tool);
                        domConstruct.create(
                            "div",
                            {
                                id: "instructionsDiv",
                                innerHTML: instructionsText,
                                tabindex: 0
                            },
                            domConstruct.create("div", {}, instructionsDiv)
                        );
                    });

                    var instructionsBtn = dom.byId("toolButton_instructions");
                    domClass.add(instructionsBtn, "panelToolDefault");
                } else {
                    deferedDetails.then(
                        lang.hitch(this, function(r) {
                            require([
                                "dojo/text!application/dijit/templates/" +
                                    this.config.i18n.instructions +
                                    ".html"
                            ], function(instructionsText) {
                                if (this.config.moreHelpURL.isNonEmpty())
                                    instructionsText +=
                                        "<a href='" +
                                        this.config.moreHelpURL +
                                        "' target='blank' class='more_help'>" +
                                        this.config.i18n.moreHelp +
                                        "</a>";

                                var instructionsDiv = domConstruct.create(
                                    "div",
                                    {
                                        id: "instructionsDiv",
                                        innerHTML: instructionsText,
                                        tabindex: 0
                                    },
                                    dom.byId("pageBody_details")
                                );
                            });

                            on(
                                toolbar,
                                "updateTool_details",
                                this._adjustDetails
                            );
                            on(this.map, "resize", this._adjustDetails);
                            document.body.onresize = this._adjustDetails;
                        })
                    );
                }
                deferred.resolve(true);
            }
            return deferred.promise;
        },

        _adjustDetails: function() {
            try {
                var pageBody = dojo.byId("pageBody_details");
                var detailDiv = dojo.byId("detailDiv");
                detailDiv.style.maxHeight =
                    pageBody.clientHeight -
                    instructionsDiv.clientHeight -
                    30 +
                    "px";
            } catch (e) {
                /* ignore instructionDiv not defined error: will come defined next time! */
            }
        },

        _addEditor: function(tool, toolbar) {
            //Add the editor widget to the toolbar if the web map contains editable layers
            var deferred = new Deferred();
            this.editableLayers = this._getEditableLayers(
                this.config.response.itemInfo.itemData.operationalLayers
            );
            if (has("edit") && this.editableLayers.length > 0) {
                if (this.editableLayers.length > 0) {
                    this.editorDiv = toolbar.createTool(tool);
                    return this._createEditor();
                } else {
                    console.error("No Editable Layers");
                    deferred.resolve(false);
                }
            } else {
                deferred.resolve(false);
            }

            return deferred.promise;
        },

        _createEditor: function() {
            var deferred = new Deferred();
            //Dynamically load since many apps won't have editable layers
            require([
                "application/has-config!edit?esri/dijit/editing/Editor"
            ], lang.hitch(this, function(Editor) {
                if (!Editor) {
                    deferred.resolve(false);
                    return;
                }

                //add field infos if necessary. Field infos will contain hints if defined in the popup and hide fields where visible is set
                //to false. The popup logic takes care of this for the info window but not the edit window.
                array.forEach(
                    this.editableLayers,
                    lang.hitch(this, function(layer) {
                        if (
                            layer.featureLayer &&
                            layer.featureLayer.infoTemplate &&
                            layer.featureLayer.infoTemplate.info &&
                            layer.featureLayer.infoTemplate.info.fieldInfos
                        ) {
                            //only display visible fields
                            var fields =
                                layer.featureLayer.infoTemplate.info.fieldInfos;
                            var fieldInfos = [];
                            array.forEach(
                                fields,
                                lang.hitch(this, function(field) {
                                    //added support for editing date and time
                                    if (
                                        field.format &&
                                        field.format.dateFormat &&
                                        array.indexOf(
                                            this.timeFormats,
                                            field.format.dateFormat
                                        ) > -1
                                    ) {
                                        field.format = {
                                            time: true
                                        };
                                    }

                                    if (field.visible) {
                                        fieldInfos.push(field);
                                    }
                                })
                            );

                            layer.fieldInfos = fieldInfos;
                        }
                    })
                );

                var settings = {
                    map: this.map,
                    layerInfos: this.editableLayers,
                    toolbarVisible: has("edit-toolbar")
                };
                this.editor = new Editor(
                    {
                        settings: settings
                    },
                    domConstruct.create("div", {}, this.editorDiv)
                );

                this.editor.startup();
                deferred.resolve(true);
            }));

            return deferred.promise;
        },

        _getEditableLayers: function(layers) {
            var layerInfos = [];
            array.forEach(
                layers,
                lang.hitch(this, function(layer) {
                    if (layer && layer.layerObject) {
                        var eLayer = layer.layerObject;
                        if (
                            eLayer instanceof FeatureLayer &&
                            eLayer.isEditable()
                        ) {
                            layerInfos.push({
                                featureLayer: eLayer
                            });
                        }
                    }
                })
            );
            return layerInfos;
        },

        _destroyEditor: function() {
            if (this.editor) {
                this.editor.destroy();
                this.editor = null;
            }
        },

        _OnFeatureTableDisplay: function(show) {
            // console.log('main featureTable',show);
            var skipHSplitter = query(".skip #skip-Hsplitter")[0];
            var skipTableHeader = query(".skip #skip-tableHeader")[0];
            var skipTable = query(".skip #skip-table")[0];
            if(skipHSplitter && skipTableHeader && skipTable) {
                domStyle.set(skipHSplitter, "display", show ? "inline-block":"none");
                domStyle.set(skipTableHeader, "display", show ? "inline-block":"none");
                domStyle.set(skipTable, "display", show ? "inline-block":"none");
            }
            this.collapseLeftPanelAction(!show);
        },

        _addLayers: function(tool, toolbar) {
            //Toggle layer visibility if web map has operational layers
            var deferred = new Deferred();

            var layers = this.config.response.itemInfo.itemData
                .operationalLayers;

            if (layers.length === 0 || has("layerManager")) {
                deferred.resolve(false);
            } else {
                if (has("layers")) {
                    panelClass = "";

                    var layersDivDesc = toolbar.createTool(
                        tool,
                        "",
                        "reload1.gif",
                        "Table"
                    );
                    // var layersDivDesc = domConstruct.create("div", {class:'margin'}, layersDiv);

                    var toc = new TableOfContents(
                        {
                            map: this.map,
                            layers: layers,
                            OnDisplay: lang.hitch(this, this._OnFeatureTableDisplay)
                        },
                        domConstruct.create("div", {}, layersDivDesc)
                    );
                    toc.startup();
                    domAttr.set(toc.domNode, 'tabindex', '0');

                    deferred.resolve(true);
                } else {
                    deferred.resolve(false);
                }
            }
            return deferred.promise;
        },

        _addLayerManager: function(tool, toolbar) {
            var deferred = new Deferred();

            var layers = this.config.response.itemInfo.itemData
                .operationalLayers;

            if (layers.length === 0) {
                deferred.resolve(false);
            } else {
                if (has("layerManager")) {
                    panelClass = "";

                    var layersDivDesc = toolbar.createTool(
                        tool,
                        "",
                        "reload1.gif",
                        "Table"
                    );

                    var toc = new LayerManager(
                        {
                            map: this.map,
                            layers: layers,
                            dataItems: this.config.response.itemInfo.itemData,
                            hasLegend: has("legend"),
                            hasFeatureTable: has("featureTable"),
                            hasBasemapGallery: has("basemap"),
                            mapNode: dojo.byId("mapPlace"),
                            toolbar: toolbar,
                            OnDisplay: lang.hitch(this, this._OnFeatureTableDisplay)
                        },
                        domConstruct.create("div", {}, layersDivDesc)
                    );
                    toc.startup();

                    deferred.resolve(true);
                } else {
                    deferred.resolve(false);
                }
            }
            return deferred.promise;
        },

        _addLegend: function(tool, toolbar) {
            //Add the legend tool to the toolbar. Only activated if the web map has operational layers.
            var deferred = new Deferred();
            var layers = arcgisUtils.getLegendLayers(this.config.response);

            if (layers.length === 0 || has("layerManager")) {
                deferred.resolve(false);
            } else {
                if (has("legend")) {
                    var legendDiv = toolbar.createTool(tool, "");
                    var legend = new Legend(
                        {
                            map: this.map,
                            layerInfos: layers
                        },
                        domConstruct.create(
                            "div",
                            { role: "application" },
                            legendDiv
                        )
                    );
                    domClass.add(legend.domNode, "legend");
                    legend.startup();
                    domAttr.set(legend.domNode, 'tabindex', 0);

                    var fixLegend = function(node) {
                        if(typeof node.querySelectorAll !== 'function')
                            return;
                        var tables = node.querySelectorAll("table");
                        if (tables) {
                            array.forEach(tables, function(table) {
                                // for(var i=0; i<tables.length; i++) {
                                // var table=tables[i];
                                domAttr.set(table, "role", "presentation");
                                // }
                            });
                        }

                        var svgs = node.querySelectorAll("svg");
                        if (svgs) {
                            array.forEach(svgs, function(svg) {
                                domAttr.set(svg, "title", "symbol");
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
                                var tabindex =
                                    service &&
                                    (!service.style ||
                                        service.style.display !== "none")
                                        ? 0
                                        : -1;

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
                        for (var j = 0; j < legendLayers.length; j++) {
                            domAttr.set(
                                legendLayers[j],
                                "role",
                                "presentation"
                            );
                            var legendServiceList = legendLayers[
                                j
                            ].querySelector("tbody");

                            domAttr.set(legendServiceList, "role", "list");
                            //domAttr.set(legendServiceList, "aria-label", legendServiceLabel.innerHTML);

                            for (
                                var k = 0;
                                k < legendServiceList.childNodes.length;
                                k++
                            ) {
                                var item = legendServiceList.childNodes[k];
                                domAttr.set(item, "role", "listitem");
                                domAttr.set(item, "tabindex", "0");
                            }
                        }

                        var legendLayerImages = node.querySelectorAll(
                            ".esriLegendLayer image, .esriLegendLayer img"
                        );
                        if (legendLayerImages) {
                            for (
                                var iii = 0;
                                iii < legendLayerImages.length;
                                iii++
                            )
                                domAttr.set(
                                    legendLayerImages[iii],
                                    "alt",
                                    i18n.map.symbol
                                );
                        }

                        var messages = node.querySelectorAll(".esriLegendMsg");
                        if (messages) {
                            for (var iiii = 0; iiii < messages.length; iiii++)
                                domAttr.set(messages[iiii], "tabindex", 0);
                        }
                    };

                    fixLegend(dom.byId('esri_dijit_Legend_0'));

                    this.legendNodeObserver = new MutationObserver(function(mutations) {
                        mutations.forEach(function(mutation) {
                            if (
                                mutation.addedNodes &&
                                mutation.addedNodes.length >= 1
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
                    });

                    this.legendNodeObserver.observe(
                        dojo.byId("esri_dijit_Legend_0"),
                        {
                            attributes: true,
                            childList: true,
                            characterData: false,
                            subtree: true
                        }
                    );

                    deferred.resolve(true);
                } else {
                    deferred.resolve(false);
                }
            }
            return deferred.promise;
        },

        _addInfoPanel: function(tool, toolbar) {
            //Add the legend tool to the toolbar. Only activated if the web map has operational layers.
            var deferred = new Deferred();
            if (has("infoPanel")) {
                var infoPanelDiv = toolbar.createTool(
                    tool,
                    "",
                    "reload1.gif",
                    "followTheMapMode"
                );

                popupInfo = new PopupInfo(
                    {
                        map: this.map,
                        toolbar: toolbar,
                        superNavigator: this.superNav,
                        search: this.search,
                        maxSearchResults: this.config.maxSearchResults,
                        showSearchScore: this.config.showSearchScore,
                        searchMarker: this.config.searchMarker,
                        geolocatorLabelColor: this.config.geolocatorLabelColor,
                        iconsColor: this.config.icons,
                    },
                    infoPanelDiv
                );
                popupInfo.startup();

                deferred.resolve(true);
            } else {
                this._fixFocusOnNativeInfoWindows();
                deferred.resolve(false);
            }
            return deferred.promise;
        },

        _addGeoCoding: function(tool, toolbar) {
            //Add the legend tool to the toolbar. Only activated if the web map has operational layers.
            var deferred = new Deferred();
            if (has("geoCoding")) {
                var geoCodingDiv = toolbar.createTool(tool, "");

                geoCoding = new GeoCoding(
                    {
                        map: this.map,
                        toolbar: toolbar,
                        superNavigator: this.superNav,
                        themeColor: this.config.theme,
                        iconColor: this.config.icons,
                        search: this.search,
                        maxSearchResults: this.config.maxSearchResults,
                        searchMarker: this.config.geoCodingMarker,
                        geolocatorLabelColor: this.config.geolocatorLabelColor
                    },
                    geoCodingDiv
                );
                geoCoding.startup();

                deferred.resolve(true);
            } else {
                deferred.resolve(false);
            }
            return deferred.promise;
        },

        _fixFocusOnNativeInfoWindows: function() {
            on(
                this.map.infoWindow,
                "show",
                lang.hitch(this, function(ev) {
                    query(".esriPopup .titleButton").forEach(function(btn) {
                        domAttr.set(btn, "tabindex", 0);
                        on(
                            btn,
                            "keypress",
                            lang.hitch(this, function(ev) {
                                // console.log(ev);
                                if (ev.keyCode == 13) {
                                    ev.target.click();
                                }
                            })
                        );
                    });
                    query(".esriPopup .sizer.content").forEach(function(
                        content
                    ) {
                        domAttr.set(content, "tabindex", 0);
                        domStyle.set(content, "color", "black");
                    });
                    // query('.esriPopup.light .sizer.content')[0].focus();
                })
            );
        },

        _addMeasure: function(tool, toolbar) {
            //Add the measure widget to the toolbar.
            var deferred = new Deferred();
            if (has("measure")) {
                var measureDiv = toolbar.createTool(tool);
                var areaUnit =
                    this.config.units === "metric"
                        ? "esriSquareKilometers"
                        : "esriSquareMiles";
                var lengthUnit =
                    this.config.units === "metric"
                        ? "esriKilometers"
                        : "esriMiles";

                var measure = new Measurement(
                    {
                        map: this.map,
                        defaultAreaUnit: areaUnit,
                        defaultLengthUnit: lengthUnit
                    },
                    domConstruct.create("div", {}, measureDiv)
                );

                measure.startup();

                dijitButtonNodes = measureDiv.querySelectorAll(
                    ".dijitButtonNode"
                );
                array.forEach(dijitButtonNodes, function(node) {
                    domAttr.set(node, "tabindex", 0);
                    domAttr.set(
                        node.querySelector(".dijitButtonContents"),
                        "tabindex",
                        ""
                    );
                });

                var esriMeasurementResultTable = measureDiv.querySelector(
                    ".esriMeasurementResultTable"
                );
                var esriMeasurementTableHeaders = esriMeasurementResultTable.querySelectorAll(
                    ".esriMeasurementTableHeader"
                );
                for (i = 0; i < esriMeasurementTableHeaders.length; i++) {
                    esriMeasurementTableHeader = esriMeasurementTableHeaders[i];
                    //alert(esriMeasurementTableHeader.innerHTML);
                    var newHeader = document.createElement("th");
                    newHeader.innerHTML = esriMeasurementTableHeader.innerHTML;
                    colspan = esriMeasurementTableHeader.getAttribute(
                        "colspan"
                    );
                    if (colspan) {
                        newHeader.setAttribute("colspan", colspan);
                    }
                    newHeader.className = esriMeasurementTableHeader.className;
                    esriMeasurementTableHeader.parentNode.replaceChild(
                        newHeader,
                        esriMeasurementTableHeader
                    );
                }

                var AccessAuditMarkers = esriMeasurementResultTable.querySelectorAll(
                    "img"
                );
                for (i = 0; i < AccessAuditMarkers.length; i++) {
                    AccessAuditMarkers[i].setAttribute("Alt", "");
                }

                areaIconNode = measureDiv.querySelector(".areaIcon");
                domClass.remove(areaIconNode, "areaIcon");
                areaIconNode.innerHTML =
                    '<img src="images/area_measure.png" alt="Area Button"/>';

                distanceIconNode = measureDiv.querySelector(".distanceIcon");
                domClass.remove(distanceIconNode, "distanceIcon");
                distanceIconNode.innerHTML =
                    '<img src="images/dist_measure.png" alt="Distance Button"/>';

                locationIconNode = measureDiv.querySelector(".locationIcon");
                domClass.remove(locationIconNode, "locationIcon");
                locationIconNode.innerHTML =
                    '<img src="images/dist_point.png" alt="Location Button"/>';

                deferred.resolve(true);
            } else {
                deferred.resolve(false);
            }
            return deferred.promise;
        },

        _addOverviewMap: function(tool, toolbar) {
            //Add the overview map to the toolbar
            var deferred = new Deferred();

            if (has("overview")) {
                var ovMapDiv = toolbar.createTool(tool);

                var panelHeight = this.map.height;

                this.createOverviewMap(ovMapDiv, panelHeight);

                on(
                    this.map,
                    "layer-add",
                    lang.hitch(this, function(args) {
                        //delete and re-create the overview map if the basemap gallery changes
                        if (
                            args.layer.hasOwnProperty(
                                "_basemapGalleryLayerType"
                            ) &&
                            args.layer._basemapGalleryLayerType === "basemap"
                        ) {
                            registry.byId("overviewMap").destroy();
                            this.createOverviewMap(ovMapDiv, panelHeight);
                        }
                    })
                );
                deferred.resolve(true);
            } else {
                deferred.resolve(false);
            }

            return deferred.promise;
        },

        createOverviewMap: function(div, height) {
            var ovMap = new OverviewMap(
                {
                    id: "overviewMap",
                    map: this.map,
                    height: height,
                    visible: false,
                    opacity: 1,
                    color: "#1f1f1f0f"
                },
                domConstruct.create("div", {}, div)
            );

            ovMap.startup();

            ovwHighlight = div.querySelector(".ovwHighlight");
            dojo.setAttr(ovwHighlight, "tabindex", 0);
            dojo.setAttr(ovwHighlight, "title", i18n.map.overviewTip);

            on(
                ovwHighlight,
                "keydown",
                lang.hitch({ div: ovwHighlight, map: ovMap }, function(event) {
                    var top = dojo.style(this.div, "top");
                    var left = dojo.style(this.div, "left");
                    switch (event.keyCode) {
                        case 38: // up
                            if (top > -this.div.clientHeight / 2) {
                                dojo.style(this.div, "top", --top + "px");
                            }
                            break;
                        case 40: // down
                            if (
                                top <
                                this.div.parentElement.offsetHeight -
                                    this.div.clientHeight / 2
                            ) {
                                dojo.style(this.div, "top", ++top + "px");
                            }
                            break;
                        case 37: // left
                            if (left > -this.div.clientWidth / 2) {
                                dojo.style(this.div, "left", --left + "px");
                            }
                            break;
                        case 39: // right
                            if (
                                left <
                                this.div.parentElement.offsetWidth -
                                    this.div.clientWidth / 2
                            ) {
                                dojo.style(this.div, "left", ++left + "px");
                            }
                            break;
                        case 33: //pgup
                            if (
                                top > -this.div.clientHeight / 2 &&
                                left > -this.div.clientWidth / 2
                            ) {
                                dojo.style(this.div, "left", ++left + "px");
                                dojo.style(this.div, "top", --top + "px");
                            }
                            break;
                        case 34: //pgdn
                            if (
                                top <
                                    this.div.parentElement.offsetHeight -
                                        this.div.clientHeight / 2 &&
                                left > -this.div.clientWidth / 2
                            ) {
                                dojo.style(this.div, "left", ++left + "px");
                                dojo.style(this.div, "top", ++top + "px");
                            }
                            break;
                        case 36: //home
                            if (
                                top > -this.div.clientHeight / 2 &&
                                left <
                                    this.div.parentElement.offsetWidth -
                                        this.div.clientWidth / 2
                            ) {
                                dojo.style(this.div, "left", --left + "px");
                                dojo.style(this.div, "top", --top + "px");
                            }
                            break;
                        case 35: //end
                            if (
                                top <
                                    this.div.parentElement.offsetHeight -
                                        this.div.clientHeight / 2 &&
                                left <
                                    this.div.parentElement.offsetWidth -
                                        this.div.clientWidth / 2
                            ) {
                                dojo.style(this.div, "left", --left + "px");
                                dojo.style(this.div, "top", ++top + "px");
                            }
                            break;
                    }
                    switch (event.keyCode) {
                        case 9: // tab
                        case 33: // PgUp
                        case 34: // PgDn
                        case 27: // Esc
                            break;
                        default:
                            event.stopPropagation();
                            event.preventDefault();
                            break;
                    }
                })
            );

            on(
                ovwHighlight,
                "keyup",
                lang.hitch(ovMap, function(event) {
                    switch (event.keyCode) {
                        case 38: // up
                        case 40: // down
                        case 37: // left
                        case 39: // right
                        case 34: //pgdn
                        case 33: //pgup
                        case 36: //home
                        case 35: //end
                            this._moveStopHandler();
                            break;
                    }
                    switch (event.keyCode) {
                        case 9: // tab
                        case 33: // PgUp
                        case 34: // PgDn
                        case 27: // Esc
                            break;
                        default:
                            event.stopPropagation();
                            event.preventDefault();
                            break;
                    }
                })
            );

            on(
                ovMap.overviewMap,
                "extent-change",
                lang.hitch(ovMap.overviewMap.container, function() {
                    var images = this.querySelectorAll("img");
                    for (var i = 0; i < images.length; i++)
                        domAttr.set(images[i], "alt", "");
                })
            );
        },

        _addPrint: function(tool, toolbar) {
            //Add the print widget to the toolbar. TODO: test custom layouts.
            var deferred = new Deferred(),
                legendNode = null,
                print = null;

            require([
                "application/has-config!print?esri/dijit/Print"
            ], lang.hitch(this, function(Print) {
                if (!Print) {
                    deferred.resolve(false);
                    return;
                }

                var layoutOptions = {
                    titleText: this.config.title,
                    scalebarUnit: this.config.units,
                    legendLayers: []
                };

                var printDiv = domConstruct.create(
                    "div",
                    {
                        class: "PrintDialog",
                        id: "printDialog"
                    },
                    toolbar.createTool(tool, "", "reload1.gif")
                );

                var printError = domConstruct.create(
                    "div",
                    {
                        id: "printError",
                        class: "printError"
                    },
                    printDiv
                );

                //get format
                this.format = "PDF"; //default if nothing is specified
                for (var i = 0; i < this.config.tools.length; i++) {
                    if (this.config.tools[i].name === "print") {
                        var f = this.config.tools[i].format;
                        this.format = f.toLowerCase();
                        break;
                    }
                }

                if (this.config.hasOwnProperty("tool_print_format")) {
                    this.format = this.config.tool_print_format.toLowerCase();
                }

                if (has("print-legend")) {
                    legendNode = domConstruct.create(
                        "input",
                        {
                            id: "legend_ck",
                            className: "checkbox",
                            type: "checkbox",
                            checked: false
                        },
                        domConstruct.create("div", {
                            class: "checkbox"
                        })
                    );
                    var labelNode = domConstruct.create(
                        "label",
                        {
                            for: "legend_ck",
                            className: "checkbox",
                            innerHTML: this.config.i18n.tools.print.legend
                        },
                        domConstruct.create("div")
                    );
                    domConstruct.place(legendNode, printDiv);
                    domConstruct.place(labelNode, printDiv);

                    on(
                        legendNode,
                        "change",
                        lang.hitch(this, function(arg) {
                            if (legendNode.checked) {
                                var layers = arcgisUtils.getLegendLayers(
                                    this.config.response
                                );
                                var legendLayers = array.map(layers, function(
                                    layer
                                ) {
                                    return {
                                        layerId: layer.layer.id
                                    };
                                });
                                if (legendLayers.length > 0) {
                                    layoutOptions.legendLayers = legendLayers;
                                }
                                array.forEach(print.templates, function(
                                    template
                                ) {
                                    template.layoutOptions = layoutOptions;
                                });
                            } else {
                                array.forEach(print.templates, function(
                                    template
                                ) {
                                    if (
                                        template.layoutOptions &&
                                        template.layoutOptions.legendLayers
                                    ) {
                                        template.layoutOptions.legendLayers = [];
                                    }
                                });
                            }
                        })
                    );
                }

                require([
                    "application/has-config!print-layouts?esri/request",
                    "application/has-config!print-layouts?esri/tasks/PrintTemplate"
                ], lang.hitch(this, function(esriRequest, PrintTemplate) {
                    if (!esriRequest && !PrintTemplate) {
                        //Use the default print templates
                        var templates = [
                            {
                                layout: "Letter ANSI A Landscape",
                                layoutOptions: layoutOptions,
                                label:
                                    this.config.i18n.tools.print.layouts
                                        .label1 +
                                    " ( " +
                                    this.format +
                                    " )",
                                format: this.format
                            },
                            {
                                layout: "Letter ANSI A Portrait",
                                layoutOptions: layoutOptions,
                                label:
                                    this.config.i18n.tools.print.layouts
                                        .label2 +
                                    " ( " +
                                    this.format +
                                    " )",
                                format: this.format
                            },
                            {
                                layout: "Letter ANSI A Landscape",
                                layoutOptions: layoutOptions,
                                label:
                                    this.config.i18n.tools.print.layouts
                                        .label3 + " ( image )",
                                format: "PNG32"
                            },
                            {
                                layout: "Letter ANSI A Portrait",
                                layoutOptions: layoutOptions,
                                label:
                                    this.config.i18n.tools.print.layouts
                                        .label4 + " ( image )",
                                format: "PNG32"
                            }
                        ];

                        print = new Print(
                            {
                                map: this.map,
                                id: "printButton",
                                templates: templates,
                                url: this.config.helperServices.printTask.url
                            },
                            domConstruct.create("div")
                        );
                        domConstruct.place(
                            print.printDomNode,
                            printDiv,
                            "first"
                        );

                        print.startup();

                        this._addPrintArrowButton();

                        on(
                            print,
                            "print-start",
                            lang.hitch(this, function(ev) {
                                var printError = dojo.byId("printError");
                                if (printError) printError.innerHTML = "";

                                var loading_print = dojo.byId("loading_print");
                                domClass.replace(
                                    loading_print,
                                    "showLoading",
                                    "hideLoading"
                                );
                            })
                        );

                        on(
                            print,
                            "print-complete",
                            lang.hitch(this, function(ev) {
                                this._addPrintArrowButton();
                                var loading_print = dojo.byId("loading_print");
                                domClass.replace(
                                    loading_print,
                                    "hideLoading",
                                    "showLoading"
                                );
                            })
                        );

                        on(
                            print,
                            "error",
                            lang.hitch(this, function(ev) {
                                // console.log(ev);
                                // alert(ev);
                                var printError = dojo.byId("printError");
                                if (printError) {
                                    printError.innerHTML =
                                        "<span>" + ev + "</span><br/>";
                                    var a = domConstruct.create(
                                        "a",
                                        {
                                            href: "#",
                                            innerHTML: this.config.i18n.tools
                                                .print.clearGraphicLayer
                                        },
                                        printError
                                    );
                                    on(
                                        a,
                                        "click",
                                        lang.hitch(this, function() {
                                            this.map.graphics.clear();
                                        })
                                    );
                                }

                                var loading_print = dojo.byId("loading_print");
                                domClass.replace(
                                    loading_print,
                                    "hideLoading",
                                    "showLoading"
                                );
                                this._addPrintArrowButton();
                            })
                        );

                        deferred.resolve(true);
                        return;
                    }

                    esriRequest({
                        url: this.config.helperServices.printTask.url,
                        content: {
                            f: "json"
                        },
                        callbackParamName: "callback"
                    }).then(
                        lang.hitch(this, function(response) {
                            var layoutTemplate,
                                templateNames,
                                mapOnlyIndex,
                                templates;

                            layoutTemplate = array.filter(
                                response.parameters,
                                function(param, idx) {
                                    return param.name === "Layout_Template";
                                }
                            );

                            if (layoutTemplate.length === 0) {
                                console.error(
                                    'Print service parameters name for templates must be "Layout_Template"'
                                );
                                return;
                            }
                            templateNames = layoutTemplate[0].choiceList;

                            // remove the MAP_ONLY template then add it to the end of the list of templates
                            mapOnlyIndex = array.indexOf(
                                templateNames,
                                "MAP_ONLY"
                            );
                            if (mapOnlyIndex > -1) {
                                var mapOnly = templateNames.splice(
                                    mapOnlyIndex,
                                    mapOnlyIndex + 1
                                )[0];
                                templateNames.push(mapOnly);
                            }

                            // create a print template for each choice
                            templates = array.map(
                                templateNames,
                                lang.hitch(this, function(name) {
                                    var plate = new PrintTemplate();
                                    plate.layout = plate.label = name;
                                    plate.format = this.format;
                                    plate.layoutOptions = layoutOptions;
                                    return plate;
                                })
                            );

                            print = new Print(
                                {
                                    map: this.map,
                                    templates: templates,
                                    url: this.config.helperServices.printTask
                                        .url
                                },
                                domConstruct.create("div")
                            );
                            domConstruct.place(
                                print.printDomNode,
                                printDiv,
                                "first"
                            );

                            print.startup();
                            deferred.resolve(true);
                        })
                    );
                }));
            }));

            return deferred.promise;
        },

        _addPrintArrowButton: function() {
            var arrowButton = dojo.query(
                ".PrintDialog .dijitArrowButtonInner"
            )[0];
            domConstruct.create(
                "img",
                {
                    // role: 'presentation',
                    src: "images/icons_black/carret-down.32.png",
                    alt: "carret-down"
                },
                arrowButton
            );
        },

        _addShare: function(tool, toolbar) {
            //Add share links for facebook, twitter and direct linking.
            //Add the measure widget to the toolbar.
            var deferred = new Deferred();

            if (has("share")) {
                var shareDiv = domConstruct.create(
                    "div",
                    { class: "pageBody" },
                    toolbar.createTool(tool)
                ); //);

                var shareDialog = new ShareDialog(
                    {
                        bitlyLogin: this.config.bitlyLogin,
                        bitlyKey: this.config.bitlyKey,
                        map: this.map,
                        image:
                            this.config.sharinghost +
                            "/sharing/rest/content/items/" +
                            this.config.response.itemInfo.item.id +
                            "/info/" +
                            this.config.response.itemInfo.thumbnail,
                        title: this.config.title,
                        summary:
                            this.config.response.itemInfo.item.snippet || ""
                    },
                    shareDiv
                );
                // domClass.add(shareDialog.domNode, "margin");
                shareDialog.startup();

                //domClass.add(dom.byId('_dialogNode'),'margin')
                deferred.resolve(true);
            } else {
                deferred.resolve(false);
            }

            return deferred.promise;
        },

        _getBasemapGroup: function() {
            //Get the id or owner and title for an organizations custom basemap group.
            var basemapGroup = null;
            if (
                this.config.basemapgroup &&
                this.config.basemapgroup.title &&
                this.config.basemapgroup.owner
            ) {
                basemapGroup = {
                    owner: this.config.basemapgroup.owner,
                    title: this.config.basemapgroup.title
                };
            } else if (
                this.config.basemapgroup &&
                this.config.basemapgroup.id
            ) {
                basemapGroup = {
                    id: this.config.basemapgroup.id
                };
            }
            return basemapGroup;
        },

        _createMapUI: function() {
            if (!has("touch")) {
                domClass.remove(document.body, "no-touch");
            }

            require([
                "application/has-config!scalebar?esri/dijit/Scalebar"
            ], lang.hitch(this, function(Scalebar) {
                if (!Scalebar) {
                    return;
                }
                var scalebar = new Scalebar({
                    map: this.map,
                    scalebarUnit: this.config.units
                });
            }));

            this.search = this._addSearch();

            //create the tools
            this._createUI();
        },

        _addSearch: function() {
            // require(["application/has-config!search?esri/dijit/Search",
            //     "application/has-config!search?esri/tasks/locator"],
            //     lang.hitch(this, function (Search, Locator) {
            if (!Search && !Locator) {
                //add class so we know we don't have to hide title since search isn't visible
                domClass.add("panelTop", "no-search");
                return;
            }

            var options = {
                map: this.map,
                addLayersFromMap: false,
                enableSearchingAll: true,
                activeSourceIndex: "All"
            };

            var searchLayers = false;
            var search = new Search(
                options,
                domConstruct.create(
                    "div",
                    {
                        id: "search"
                        // role: "search"
                    },
                    this.map.container
                )
            );
            var defaultSources = [];

            //setup geocoders defined in common config
            if (
                this.config.helperServices.geocode &&
                this.config.locationSearch
            ) {
                var geocoders = lang.clone(this.config.helperServices.geocode);
                // var searchSymbol = new esri.symbol.PictureMarkerSymbol({
                //             "angle": 0,
                //             "xoffset": 0,
                //             "yoffset": 20,
                //             "type": "esriPMS",
                //             "url": require.toUrl("./images/SearchPin.png"),
                //             "contentType": "image/png",
                //             "width": 25,
                //             "height": 25
                //         });
                array.forEach(
                    geocoders,
                    lang.hitch(this, function(geocoder) {
                        if (
                            geocoder.url.indexOf(
                                ".arcgis.com/arcgis/rest/services/World/GeocodeServer"
                            ) > -1
                        ) {
                            geocoder.hasEsri = true;
                            geocoder.locator = new Locator(geocoder.url);

                            geocoder.singleLineFieldName = "SingleLine";
                            // geocoder.highlightSymbol = searchSymbol;

                            geocoder.outFields = ["*"]; //["Match_addr"];
                            if (
                                this.config.countryCodeSearch &&
                                this.config.countryCodeSearch !== ""
                            ) {
                                geocoder.countryCode = this.config.countryCodeSearch;
                            }

                            geocoder.name =
                                geocoder.name || "Esri World Geocoder";
                            if (geocoder.name === "Esri World Geocoder") {
                                geocoder.name = this.config.i18n.EsriWorldGeocoder;
                            }

                            if (this.config.searchExtent) {
                                geocoder.searchExtent = this.map.extent;
                                geocoder.localSearchOptions = {
                                    minScale: 300000,
                                    distance: 50000
                                };
                            }
                            defaultSources.push(geocoder);
                        } else if (
                            esriLang.isDefined(geocoder.singleLineFieldName)
                        ) {
                            //Add geocoders with a singleLineFieldName defined
                            geocoder.locator = new Locator(geocoder.url);

                            defaultSources.push(geocoder);
                        }
                    })
                );
            }

            //add configured search layers to the search widget
            var configuredSearchLayers =
                this.config.searchLayers instanceof Array
                    ? this.config.searchLayers
                    : JSON.parse(this.config.searchLayers);
            configuredSearchLayers.forEach(
                lang.hitch(this, function(layer) {
                    var mapLayer = this.map.getLayer(layer.id);
                    if (mapLayer) {
                        var source = {};
                        source.featureLayer = mapLayer;

                        if (
                            layer.fields &&
                            layer.fields.length &&
                            layer.fields.length > 0
                        ) {
                            source.searchFields = layer.fields;
                            source.displayField = layer.fields[0];
                            source.outFields = ["*"];
                            searchLayers = true;
                            defaultSources.push(source);
                        }
                    }
                })
            );

            //Add search layers defined on the web map item
            if (
                this.config.response.itemInfo.itemData &&
                this.config.response.itemInfo.itemData.applicationProperties &&
                this.config.response.itemInfo.itemData.applicationProperties
                    .viewing &&
                this.config.response.itemInfo.itemData.applicationProperties
                    .viewing.search
            ) {
                var searchOptions = this.config.response.itemInfo.itemData
                    .applicationProperties.viewing.search;

                array.forEach(
                    searchOptions.layers,
                    lang.hitch(this, function(searchLayer) {
                        //we do this so we can get the title specified in the item
                        var operationalLayers = this.config.itemInfo.itemData
                            .operationalLayers;
                        var layer = null;
                        array.some(operationalLayers, function(opLayer) {
                            if (opLayer.id === searchLayer.id) {
                                layer = opLayer;
                                return true;
                            }
                        });

                        if (layer && layer.hasOwnProperty("url")) {
                            var source = {};
                            var url = layer.url;
                            var name = layer.title || layer.name;

                            if (esriLang.isDefined(searchLayer.subLayer)) {
                                url = url + "/" + searchLayer.subLayer;
                                array.some(
                                    layer.layerObject.layerInfos,
                                    function(info) {
                                        if (info.id == searchLayer.subLayer) {
                                            name +=
                                                " - " +
                                                layer.layerObject.layerInfos[
                                                    searchLayer.subLayer
                                                ].name;
                                            return true;
                                        }
                                    }
                                );
                            }

                            source.featureLayer = new FeatureLayer(url);

                            source.name = name;

                            source.exactMatch = searchLayer.field.exactMatch;
                            source.displayField = searchLayer.field.name;
                            source.searchFields = [searchLayer.field.name];
                            source.placeholder = searchOptions.hintText;
                            // source.infoTemplate = layer.infoTemplate;
                            defaultSources.push(source);
                            searchLayers = true;
                        }
                    })
                );
            }

            defaultSources.forEach(function(source) {
                if (
                    !source.placeholder ||
                    source.placeholder === undefined ||
                    source.placeholder === ""
                ) {
                    if (source.featureLayer && source.featureLayer.name) {
                        source.placeholder =
                            i18n.searchEnterCriteria +
                            " " +
                            source.featureLayer.name;
                    } else {
                        source.placeholder = i18n.searchPlaceholder;
                    }
                }
            });
            search.set("sources", defaultSources);

            var searchInputGroup = dojo.byId("search_input");
            dojo.setAttr(searchInputGroup, "role", "search");
            dojo.setAttr(searchInputGroup, "aria-label", "Search Input");

            search.startup();

            if (search && search.domNode) {
                domConstruct.place(search.domNode, "panelGeocoder");

                var esriIconDownArrowNode = dojo.query(
                    ".searchIcon.esri-icon-down-arrow"
                )[0];
                if (esriIconDownArrowNode) {
                    domClass.remove(
                        esriIconDownArrowNode,
                        "searchIcon esri-icon-down-arrow"
                    );

                    esriIconDownArrowNode.innerHTML =
                        '<img src="images\\downArrow.png" alt="Search in" width="20" height="20">';
                }

                // var searchInputGroup = dojo.query(".searchInputGroup")[0];
                // dojo.setAttr(searchInputGroup, 'role', 'search');

                var esriIconZoomNode = dojo.query(
                    ".searchIcon.esri-icon-search"
                )[0];
                if (esriIconZoomNode) {
                    domClass.remove(
                        esriIconZoomNode,
                        "searchIcon esri-icon-search"
                    );
                    esriIconZoomNode.innerHTML =
                        // '<img src="images\\searchZoom.png" alt="Search" width="20" height="20">';
                        '<img src="images\\searchZoom.png" alt="Search Button" width="20" height="20">';
                }

                var esriIconCloseNode = dojo.query(
                    ".searchIcon.esri-icon-close.searchClose"
                )[0];
                if (esriIconCloseNode) {
                    domClass.remove(
                        esriIconCloseNode,
                        "searchIcon esri-icon-close"
                    );
                    esriIconCloseNode.innerHTML =
                        '<img src="images\\searchClear.png" alt="Clear search" width="19" height="19">';
                }
            }

            var emptySearchItems = query(
                '.searchInputGroup > input[type="text"] '
            );
            emptySearchItems.forEach(function(s) {
                if (domAttr.get(s, "placeholder") === "") {
                    domAttr.set(s, "placeholder", i18n.searchPlaceholder);
                    domAttr.set(s, "title", i18n.searchPlaceholder);
                }
            });

            var containerNode = dojo.query(
                "#search [data-dojo-attach-point=containerNode]"
            );
            if (containerNode && containerNode.length > 0) {
                var containerNodeObserver = new MutationObserver(function(
                    mutations
                ) {
                    mutations.forEach(function(mutation) {
                        //console.log(mutation.target);
                        var box = dojo.query("#search .searchInputGroup")[0];
                        if (dojo.hasClass(mutation.target, "showNoResults")) {
                            var nrText = "";
                            var h = query("#search .noResultsText");
                            if (h && h.length > 0) {
                                nrText =
                                    query("#search .noResultsHeader")[0]
                                        .innerHTML +
                                    ": " +
                                    h[0].innerHTML;
                            } else {
                                h = query("#search .noValueText");
                                if (h && h.length > 0) {
                                    nrText = h[0].innerHTML;
                                }
                            }
                            //console.log(nrText);
                            //console.log(mutation.target);
                            dojo.attr(box, "aria-label", nrText);
                            dojo.attr(box, "tabindex", 0);
                            box.focus();
                        } else {
                            dojo.removeAttr(box, "tabindex");
                            dojo.removeAttr(box, "aria-label");
                        }
                    });
                });

                var observerCfg = {
                    attributes: true,
                    childList: false,
                    characterData: false
                };

                containerNodeObserver.observe(containerNode[0], observerCfg);
            }

            return search;
            // }));
        },

        _updateTheme: function() {
            if (!dojo.byId("themeColors")) {
                var themeCss =
                    // '<style id="themeColors">' +
                    ".bg, .esriPopup .pointer, .esriPopup .titlePane {\n" +
                    "   background-color:" +
                    this.theme.toString() +
                    " !important;\n" +
                    "}\n" +
                    ".fc, .esriPopup .titlePane, .esriPopup .titleButton {\n" +
                    "   color:" +
                    this.color.toString() +
                    " !important;\n" +
                    "}\n" +
                    ".dijitSplitter {\n" +
                    "  border-color:" +
                    this.theme.toString() +
                    " !important;\n" +
                    "}\n" +
                    ".dijitSplitterThumb{\n" +
                    "   background-color:" +
                    this.activeColor.toString() +
                    " !important;\n" +
                    "}\n" +
                    "";
                // '</style>';

                dojo.create(
                    "style",
                    {
                        id: "themeColors",
                        innerHTML: themeCss
                    },
                    document.head
                );
            }

            //Set the Slider +/- color to match the icon style. Valid values are white and black
            // White is default so we just need to update if using black.
            //Also update the menu icon to match the tool color. Default is white.
            if (this.config.icons === "black") {
                query(".esriSimpleSlider").style("color", "#000");
                query(".icon-color").style("color", "#000");
            }

            var styleSheetList = document.styleSheets;
            var styleCss = null;

            for (var i = 0; i < styleSheetList.length; i++) {
                var css = styleSheetList[i];
                if (css.href.indexOf("styles1.css") > 0) {
                    styleCss = css;
                    break;
                }
            }

            if (styleCss) {
                for (var ii = 0; ii < styleCss.cssRules.length; ii++) {
                    var rule = styleCss.cssRules[ii];
                    if (
                        typeof rule.selectorText != "undefined" &&
                        rule.selectorText !== null
                    ) {
                        var rgbaColor = function(color) {
                            return (
                                "rgb(" +
                                color.r +
                                ", " +
                                color.g +
                                ", " +
                                color.b +
                                ")"
                            );
                        };
                        //hover
                        if (rule.selectorText.indexOf(":hover") >= 0) {
                            rule.style.backgroundColor = rgbaColor(
                                this.hoverColor
                            );
                        }
                        //active
                        if (rule.selectorText.indexOf(".activeBg") >= 0) {
                            rule.style.backgroundColor = rgbaColor(
                                this.activeColor
                            );
                        }

                        if (rule.selectorText.indexOf("#addrHintTitle") >= 0) {
                            rule.style.backgroundColor = rgbaColor(this.theme);
                            rule.style.color = rgbaColor(this.color);
                        }
                        if (rule.selectorText.indexOf("div[data-tip]::before") >= 0) {
                            rule.style.borderBottomColor = rgbaColor(
                                this.color
                            );
                        }

                        //focus
                        if (rule.selectorText.indexOf(":focus") >= 0) {
                            if (rule.selectorText.indexOf("#mapDiv") >= 0) {
                                rule.style.outlineStyle = "none";
                                rule.style.outlineColor = "transparent";
                                rule.style.boxShadow =
                                    "inset rgba(255, 170, 0, 0.901961) 0px 0px 0px 2px";
                            } else {
                                rule.style.outlineColor = rgbaColor(
                                    this.focusColor
                                );
                            }
                        }
                        if (rule.selectorText.indexOf(".goThereHint") >= 0) {
                            rule.style.borderColor = rgbaColor(this.focusColor);
                        }
                    }
                }
            }
        },

        _checkExtent: function() {
            var pt = this.map.extent.getCenter();
            if (this.mapExt && !this.initExt.contains(pt)) {
                this.map.setExtent(this.mapExt);
            } else {
                this.mapExt = this.map.extent;
            }
        },

        _adjustPopupSize: function(evn) {
            // if (!this.map)  return;
            // var box = domGeometry.getContentBox(this.map.container);
            // if(box.w === 0 || box.h === 0) return;
            // var width = Math.round(box.w * 0.50);
            // var height = Math.round(box.h * 0.35);
            // this.map.infoWindow.resize(width, height);
        },

        _createWebMap: function(itemInfo) {
            window.config = this.config;

            var options = {};
            //specify center and zoom if provided as url params
            if (this.config.level) {
                options.zoom = this.config.level;
            }
            if (this.config.center) {
                var points = this.config.center.split(",");
                if (points && points.length === 2) {
                    options.center = [
                        parseFloat(points[0]),
                        parseFloat(points[1])
                    ];
                }
            }

            // create a map based on the input web map id
            arcgisUtils
                .createMap(itemInfo, "mapDiv", {
                    mapOptions: options,
                    editable: has("edit"),
                    usePopupManager: true
                })
                .then(
                    lang.hitch(this, function(response) {
                        this.map = response.map;
                        domClass.add(this.map.infoWindow.domNode, "light");
                        this._updateTheme();

                        var mapDiv = response.map.container;

                        on.once(
                            mapDiv,
                            "focus",
                            lang.hitch(this, function() {
                                this.map.enableKeyboardNavigation();
                            })
                        );

                        on(
                            mapDiv,
                            "focus",
                            lang.hitch(this, function() {
                                this.map.disableKeyboardNavigation();
                            })
                        );

                        on(
                            mapDiv,
                            "blur",
                            lang.hitch(this, function() {
                                this.map.enableKeyboardNavigation();
                            })
                        );

                        var mapScroll = function(event) {
                            var focusElement = document.querySelector(":focus");
                            if (!focusElement || focusElement !== mapDiv)
                                return;
                            // console.log(event.keyCode);

                            var _mapScroll = lang.hitch(this, function(x, y) {
                                var dx = x * this.stepX;
                                var dy = y * this.stepY;
                                if (!this.superNav || !event.shiftKey) {
                                    // var extent = this.map.extent;
                                    // var delta = (extent.ymax-extent.ymin) / 50;
                                    // return this.map.setExtent(extent.offset(x * delta, y * delta));
                                    return this.map._fixedPan(dx, dy);
                                } else {
                                    return this.superNav.cursorScroll(dx, dy);
                                }
                            });

                            switch (event.keyCode) {
                                case 40: //down
                                    mapScrollPausable.pause();
                                    _mapScroll(0, 1).then(
                                        mapScrollPausable.resume
                                    );
                                    // var extent = this.map.extent;
                                    // var delta = (extent.ymax-extent.ymin) / 50;
                                    // this.map.setExtent(extent.offset(0, delta));
                                    break;
                                case 38: //up
                                    mapScrollPausable.pause();
                                    _mapScroll(0, -1).then(
                                        mapScrollPausable.resume
                                    );
                                    break;
                                case 37: //left
                                    mapScrollPausable.pause();
                                    _mapScroll(-1, 0).then(
                                        mapScrollPausable.resume
                                    );
                                    break;
                                case 39: //right
                                    mapScrollPausable.pause();
                                    _mapScroll(1, 0).then(
                                        mapScrollPausable.resume
                                    );
                                    break;
                                case 33: //pgup
                                    mapScrollPausable.pause();
                                    _mapScroll(1, -1).then(
                                        mapScrollPausable.resume
                                    );
                                    break;
                                case 34: //pgdn
                                    mapScrollPausable.pause();
                                    _mapScroll(1, 1).then(
                                        mapScrollPausable.resume
                                    );
                                    break;
                                case 35: //end
                                    mapScrollPausable.pause();
                                    _mapScroll(-1, 1).then(
                                        mapScrollPausable.resume
                                    );
                                    break;
                                case 36: //home
                                    mapScrollPausable.pause();
                                    _mapScroll(-1, -1).then(
                                        mapScrollPausable.resume
                                    );
                                    break;
                            }
                        };

                        var mapScrollPausable = on.pausable(
                            mapDiv,
                            "keydown",
                            lang.hitch(this, mapScroll)
                        );

                        on(
                            mapDiv,
                            "keypress",
                            lang.hitch(this, function(evn) {
                                var focusElement = document.querySelector(
                                    ":focus"
                                );
                                if (!focusElement || focusElement !== mapDiv)
                                    return;
                                if (
                                    evn.keyCode === 43 &&
                                    !evn.ctrlKey &&
                                    !evn.altKey
                                ) {
                                    // Shift-'+'
                                    this.map.setLevel(this.map.getLevel() + 1);
                                    evn.preventDefault();
                                    evn.stopPropagation();
                                }
                                if (
                                    evn.keyCode === 45 &&
                                    !evn.ctrlKey &&
                                    !evn.altKey
                                ) {
                                    // Shift-'-'
                                    this.map.setLevel(this.map.getLevel() - 1);
                                    evn.preventDefault();
                                    evn.stopPropagation();
                                }
                            })
                        );

                        var title;
                        if (
                            this.config.title === null ||
                            this.config.title === ""
                        ) {
                            title =
                                response.itemInfo.item.title +
                                " - " +
                                this.config.i18n.wcagViewer;
                        } else {
                            title =
                                this.config.title +
                                ": " +
                                response.itemInfo.item.title +
                                " - " +
                                this.config.i18n.wcagViewer;
                        }

                        if (this.config.altMapText !== undefined) {
                            var altMapText = esriLang.stripTags(
                                this.config.altMapText
                            );
                            domAttr.set(
                                this.map.container,
                                "aria-label",
                                altMapText
                            );
                        }

                        //Add a logo if provided
                        if (this.config.logo) {
                            var altText = this.config.logoAltText;
                            if (!altText || altText === "") altText = title;
                            var panelLogo = domConstruct.create(
                                "div",
                                {
                                    id: "panelLogo",
                                    // TabIndex: 0,
                                    innerHTML:
                                        "<img id='logo' src=" +
                                        this.config.logo +
                                        " alt='" +
                                        altText +
                                        //"' Title='" + altText +
                                        "' aria-label='" +
                                        altText +
                                        "'></>"
                                },
                                dom.byId("panelTitle")
                            ); //, "first");
                            //domClass.add("panelTop", "largerTitle");
                            dojo.place(
                                panelLogo,
                                dojo.byId("panelText"),
                                "before"
                            );
                        }

                        //Set the application title
                        //this.map = response.map;
                        //Set the title - use the config value if provided.
                        //var title = (this.config.title === null) ? response.itemInfo.item.title : this.config.title;

                        //if title is short make title area smaller
                        if (title && title.length && title.length === 0) {
                            domClass.add("panelTop", "smallerTitle");
                        } else if (
                            title &&
                            title.length &&
                            title.length <= 20 &&
                            !this.config.logo
                        ) {
                            domClass.add("panelTop", "smallerTitle");
                        }

                        document.title = title;
                        if (
                            this.config.title === null ||
                            this.config.title === ""
                        ) {
                            dom.byId("panelText").innerHTML =
                                response.itemInfo.item.title;
                        } else {
                            dom.byId("panelText").innerHTML = this.config.title;
                        }

                        this.config.title = title;
                        if (!response.itemInfo.itemData)
                            response.itemInfo.itemData = {};
                        if (!response.itemInfo.itemData.applicationProperties)
                            response.itemInfo.itemData.applicationProperties = {};
                        if (
                            !response.itemInfo.itemData.applicationProperties
                                .viewing
                        )
                            response.itemInfo.itemData.applicationProperties.viewing = {};
                        if (
                            !response.itemInfo.itemData.applicationProperties
                                .viewing.search
                        )
                            response.itemInfo.itemData.applicationProperties.viewing.search = {
                                hintText: i18n.searchPlaceholder
                            };
                        this.config.response = response;

                        // window.config = this.config;

                        if (this.initExt !== null) {
                            this.map.setExtent(this.initExt);
                        }
                        window.initExt = this.initExt = this.map.extent;

                        on.once(
                            this.map,
                            "extent-change",
                            lang.hitch(this, function() {
                                this.navDeferred.then(
                                    lang.hitch(this, function(results) {
                                        this._checkExtent();
                                        var homeButton = document.querySelector(
                                            ".HomeButton input[type='image']"
                                        );
                                        if (homeButton) homeButton.click();
                                    })
                                );

                                // legend heades missing
                                var dojoxGridRowTables = query(
                                    ".dojoxGridRowTable"
                                );
                                if (dojoxGridRowTables) {
                                    dojoxGridRowTables.forEach(function(table) {
                                        dojo.removeAttr(table, "role");
                                    });
                                }
                            })
                        );

                        on(this.map, "extent-change", function() {
                            var imgs = this.container.querySelectorAll("img");
                            for (i = 0; i < imgs.length; i++)
                                domAttr.set(imgs[i], "alt", "");
                        });

                        this._createMapUI();
                        // make sure map is loaded
                        if (this.map.loaded) {
                            // do something with the map
                            this._mapLoaded();
                        } else {
                            on.once(
                                this.map,
                                "load",
                                lang.hitch(this, function() {
                                    // do something with the map
                                    this._mapLoaded();
                                })
                            );
                        }
                    }),
                    this.reportError
                );
        },

        _atachEnterKey: function(onButton, clickButton) {
            on(
                onButton,
                "keyup",
                lang.hitch(clickButton, function(event) {
                    if (event.keyCode == "13") this.click();
                })
            );
        }
    });
});
