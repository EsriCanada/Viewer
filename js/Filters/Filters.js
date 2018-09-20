define(["dojo/_base/declare", "dojo/_base/lang", "dojo/has", "dojo/dom","esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/on", "dijit/form/DateTextBox",
    "dojo/Deferred", "dojo/promise/all",
    "dojo/query",
    "dojo/text!application/Filters/Templates/Filters.html",
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event",
    "application/Filters/FilterTab","application/Filters/FilterItem",   
    ], function (
        declare, lang, has, dom, esriNS,
        _WidgetBase, _TemplatedMixin, on, DateTextBox,
        Deferred, all,
        query,
        Filters,
        domClass, domAttr, domStyle, domConstruct, event,
        FilterTab, FilterItem,
    ) {
    const Widget = declare("esri.dijit.Filters", [_WidgetBase, _TemplatedMixin], {
        templateString: Filters,

        options: {
            map: null,
            layers: null,
            visible: true,
        },

        constructor: function (options, srcRefNode) {
            const defaults = lang.mixin({}, this.options, options);

            this.domNode = srcRefNode;
            // properties
            this.set("map", defaults.map);
            this.set("toolbar", defaults.toolbar);
            this.set("badgeTip", defaults.badgeTip);

            this.filters = [];
            this.filtersOn = [];

            const Layers = this._getLayers(defaults.layers);
            Layers.forEach(lang.hitch(this,function(layer){
                if(layer.popupInfo) {
                    this.filters.push({
                        id: layer.id,
                        layer: layer,
                        fields:layer.popupInfo.fieldInfos.filter(function(l){return l.visible;})
                    });
                }
            }));
        },

        _getLayers : function(layers) {
            var l1 = layers.filter(function (l) { return l.hasOwnProperty("url");});
            var l2 = layers.filter(function (l) { return !l.hasOwnProperty("url");});
            if(l2.length>0) {
                console.info("Filters - These Layers are not services: ", l2);
            }
            return l1;
        },

        startup: function () {
            if (!this.map) {
                this.destroy();
                console.log("Filter::map required");
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
            let ck='checked';
            this.filters.forEach(lang.hitch(this, function(filter){
                const filterTab = new FilterTab({
                    map: this.map,
                    toolbar: this.toolbar,
                    filter: filter, 
                    checked: ck,
                    badgeTip: this.badgeTip, 
                    filters:this,
                });
                dojo.place(filterTab.domNode, this.filterTabs);
                filterTab.startup();

                const tab = document.querySelector('#'+filterTab.domNode.id+' .tab');
                const content = document.querySelector('#'+filterTab.domNode.id+' .tabContent');

                dojo.place(tab, this.filterTabsZone);
                dojo.place(content, this.filterTabsContent);

                this.filterTabs.innerHTML = '';

                if(ck!=='') {
                    domClass.add(content, 'tabShow');
                    domClass.remove(content, 'tabHide');
                    ck='';
                }
            }));

            on(this.toolbar, 'updateTool_filter', lang.hitch(this, function(name) {
                dom.byId('pageBody_filter').focus();
            }));

        },
    });
    if (has("extend-esri")) {
        lang.setObject("dijit.Filters", Widget, esriNS);
    }
    return Widget;
});
