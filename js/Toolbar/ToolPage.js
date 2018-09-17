define([
    "dojo/Evented", "dijit/_WidgetBase", "dijit/_TemplatedMixin", 
    "dojo/text!application/Toolbar/Templates/ToolPage.html",
    "dojo/_base/declare", 
    "dojo/_base/lang", "dojo/has", "dojo/dom",
    "dojo/dom-class", "dojo/dom-style", "dojo/dom-attr", "dojo/dom-construct", 
    "dojo/on", "dojo/query", "dojo/Deferred"], function (
Evented, _WidgetBase, _TemplatedMixin, 
toolPageTemplate,
declare, lang, has, dom,
domClass, domStyle, domAttr, domConstruct, 
on, query, Deferred) {
    return declare("esri.dijit.ToolPage", [_WidgetBase, _TemplatedMixin, Evented], {
        options: {
            name: 'toolname',
            deferrer: null,
            pageTitle: 'ToolName',
            loaderImg: ''
        },
        templateString: toolPageTemplate,

        constructor: function (options, srcRefNode) { 
            this.domNode = srcRefNode;
            this.config = lang.mixin({}, this.options, options);
            this.panelClass = this.config.panelClass ? (' '+this.config.panelClass) : '';
            this.pageTitle = this.config.pageTitle;
            this.deferrer = this.config.deferrer;
            this.toolbar = this.config.toolbar;

            this.name = this.config.name;
            this.id = "page_" + this.name;
        },

        postCreate : function() {
            if(this.config.loaderImg && this.config.loaderImg !=="") {
                domConstruct.create('img',{
                    src: 'images/'+this.config.loaderImg,//reload1.gif',
                    alt: 'Reloading',
                    title: 'Reloading'
                }, this.LoadingIndicator);
            }

            on(this.toolbar, "updateTool_" + this.name, lang.hitch(this, function() {
                var page = dom.byId('pageBody_'+this.name);
                if(page) page.focus();
                var focusables = dojo.query('#pageBody_'+this.name+' [tabindex=0]');
                if(focusables && focusables.length>0){
                    focusables[0].focus();
                }
            }));

            if(this.deferrer) {
                this.deferrer.resolve(this.pageBody);
            }
        },

    });
    if (has("extend-esri")) {
        lang.setObject("dijit.ToolPage", Widget, esriNS);
    }
    return Widget;
});        
