define([
    "dojo/Evented", "dijit/_WidgetBase", "dijit/_TemplatedMixin", 
    "dojo/text!application/PrintWidget/Templates/PrintTemplate.html",
    "dojo/_base/declare", "dojo/_base/window",
    "dojo/_base/html", "dojo/_base/lang", "dojo/has", "dojo/dom",
    "esri/arcgis/utils", "dojo/_base/array",
    "dojo/dom-class", "dojo/dom-style", "dojo/dom-attr", "dojo/dom-construct", "dojo/dom-geometry",
    "dojo/on", "dojo/mouse", "dojo/query", "dojo/Deferred"], function (
    Evented, _WidgetBase, _TemplatedMixin, 
    printTemplate,
    declare, win, html, lang, has, dom,
    arcgisUtils, array,
    domClass, domStyle, domAttr, domConstruct, domGeometry,
    on, mouse, query, Deferred) {
    return declare("esri.dijit.PrintWidget", [_WidgetBase, _TemplatedMixin, Evented], {

        options : {
            map: null,
            deferred: null,
        },

        templateString: printTemplate,

        constructor: function (options, srcRefNode) {
            this.config = lang.mixin({}, this.options, options);
            this.map = this.config.map;
            this.domNode = srcRefNode;

            this.deferred = (this.config.deferred) ? this.config.deferred : new Deferred();
            this.Print = this.config.Print;
            this.toolbar = this.config.toolbar;
            this.tool = this.config.tool;
            
            // this.errorMessage.innerHTML = 'Error';

            dojo.create("link", {
                href : "js/PrintWidget/Templates/Print.css",
                type : "text/css",
                rel : "stylesheet",
            }, document.head);

        },

        startup: function() {

            return this.deferred;
        },

        postCreate: function() {
            // let legendNode = null;
            const layoutOptions = {
                titleText: this.config.title,
                scalebarUnit: this.config.units,
                legendLayers: []
            };

                //get format
                this.format = (this.config.hasOwnProperty("tool_print_format")) ? this.config.tool_print_format : "pdf";
                for (let i = 0; i < this.config.tools.length; i++) {
                    if (this.config.tools[i].name === "print") {
                        let f = this.config.tools[i].format;
                        this.format = f.toLowerCase();
                        break;
                    }
                }

                if (!has("print-legend")) {
                    domStyle.set(this.legend, "display", "none");
                }

                require([
                    "application/has-config!print-layouts?esri/request",
                    "application/has-config!print-layouts?esri/tasks/PrintTemplate"
                ], lang.hitch(this, function(esriRequest, PrintTemplate) {
                    if (!esriRequest && !PrintTemplate) {
                        //Use the default print templates
                        const templates = [
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

                        this.print = new this.Print(
                            {
                                map: this.map,
                                templates: templates,
                                url: this.config.printUrl
                            },
                            domConstruct.create("div")
                        );
                        domConstruct.place(
                            this.print.printDomNode,
                            this.printDiv,
                            "first"
                        );

                        this.print.startup();

                        on(this.print, "print-start",
                            lang.hitch(this, function(ev) {
                                // const printError = dojo.byId("printError");
                                this.errorMessage.innerHTML = 'Printing';
                                domStyle.set(this.printError, "display", "none");

                                this._showLoadingIndicator(true);

                            })
                        );

                        on(this.print, "print-complete",
                            lang.hitch(this, function(ev) {
                                this.errorMessage.innerHTML = '';
                                // domStyle.set(this.printError, "display", ""); //

                                this._showLoadingIndicator(false);
                            })
                        );

                        on(this.print, "error",
                            lang.hitch(this, function(error) {
                                this.errorMessage.innerHTML = error.message;
                                domStyle.set(this.printError, "display", "");

                                this._showLoadingIndicator(false);
                            })
                        );

                        this.deferred.resolve(true);
                    return;
                }

                esriRequest({
                    url: this.config.printUrl,
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

                        this.print = new this.Print(
                            {
                                map: this.map,
                                templates: templates,
                                url: this.config.printUrl
                            },
                            domConstruct.create("div")
                        );
                        domConstruct.place(
                            this.print.printDomNode,
                            this.printDiv,
                            "first"
                        );

                        this.print.startup();
                        this.deferred.resolve(true);
                    })
                );
            }))

            this.deferred.resolve();
        },

        _clearGraphicLayer: function() {
            this.map.graphics.clear();
        },

        _showLoadingIndicator: function(show) {
            const loading_print = dojo.byId("loading_print");
            domClass.replace(loading_print, show ? "showLoading" : "hideLoading", show ? "hideLoading" : "showLoading");
        },

        _legendChange: function(arg) {
            if (arg.target.checked) {
                const layers = arcgisUtils.getLegendLayers(
                    this.config.response
                );
                const legendLayers = array.map(layers, function(layer) {
                    return {
                        layerId: layer.layer.id
                    };
                });
                // if (legendLayers.length > 0) {
                //     layoutOptions.legendLayers = legendLayers;
                // }
                array.forEach(this.print.templates, function(template) {
                    template.layoutOptions.legendLayers = legendLayers;
                });
            } else {
                array.forEach(this.print.templates, function(template) {
                    if (
                        template.layoutOptions &&
                        template.layoutOptions.legendLayers
                    ) {
                        template.layoutOptions.legendLayers = [];
                    }
                });
            }
        },

    });
    if (has("extend-esri")) {
        lang.setObject("dijit.PrintWidget", Widget, esriNS);
    }
    return Widget;
});        