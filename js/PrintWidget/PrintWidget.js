define([
    "dojo/Evented", "dijit/_WidgetBase", "dijit/_TemplatedMixin", 
    "dojo/text!application/PrintWidget/Templates/PrintTemplate.html",
    "dojo/_base/declare", "dojo/_base/window",
    "dojo/_base/html", "dojo/_base/lang", "dojo/has", "dojo/dom",
    "dojo/dom-class", "dojo/dom-style", "dojo/dom-attr", "dojo/dom-construct", "dojo/dom-geometry",
    "dojo/on", "dojo/mouse", "dojo/query", "dojo/Deferred"], function (
Evented, _WidgetBase, _TemplatedMixin, 
printTemplate,
declare, win, html, lang, has, dom,
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
        },

        startup: function() {

            return this.deferred;
        },

        postCreate: function() {
            let legendNode = null;
            let print = null;

            const layoutOptions = {
                titleText: this.config.title,
                scalebarUnit: this.config.units,
                legendLayers: []
            };

            // var printDiv = domConstruct.create(
            //     "div",
            //     {
            //         class: "PrintDialog",
            //         id: "printDialog"
            //     },
            //     toolbar.createTool(tool, "", "reload1.gif")
            // );

            this.toolbar.createTool(this.toolbar, this.tool, "", "reload1.gif").then(lang.hitch(this, function(printDiv) {
                // const printError = domConstruct.create(
                //     "div",
                //     {
                //         id: "printError",
                //         class: "printError"
                //     },
                //     this.printDiv
                // ).then(lang.hitch(this, function() {

                // }));

                //get format
                this.format = "PDF"; //default if nothing is specified
                for (let i = 0; i < this.config.tools.length; i++) {
                    if (this.config.tools[i].name === "print") {
                        let f = this.config.tools[i].format;
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

                        const print = new this.Print(
                            {
                                map: this.map,
                                id: "printButton",
                                templates: templates,
                                url: this.config.printUrl
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
                                // const printError = dojo.byId("printError");
                                if (this.printError) this.printError.innerHTML = "";

                                const loading_print = dojo.byId("loading_print");
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
                                const loading_print = dojo.byId("loading_print");
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
                                // var printError = dojo.byId("printError");
                                if (this.printError) {
                                    this.printError.innerHTML =
                                        "<span>" + ev + "</span><br/>";
                                    var a = domConstruct.create(
                                        "a",
                                        {
                                            href: "#",
                                            innerHTML: this.config.i18n.tools
                                                .print.clearGraphicLayer
                                        },
                                        this.printError
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

                        this.deferred.resolve(true);
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
            }))
            }));
            

            this.deferred.resolve();
        },

        _addPrintArrowButton: function() {
            var arrowButton = dojo.query('.PrintDialog .dijitArrowButtonInner')[0];
            domConstruct.create(
                "img",
                {
                    src: "images/icons_black/carret-down.32.png",
                    alt: "down",
                    'aria-hidden': 'true'
                },
                arrowButton
            );
        },

    });
    if (has("extend-esri")) {
        lang.setObject("dijit.PrintWidget", Widget, esriNS);
    }
    return Widget;
});        