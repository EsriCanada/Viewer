define([
    "dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "dojo/dom", "esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/on",
    "dojo/query", "dijit/registry",

    "dijit/form/Button",

    "dojo/text!application/ContactUs/Templates/ContactUs.html",
    "dojo/i18n!application/nls/resources",
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style",
    "dojo/dom-construct", "dojo/_base/event", "esri/lang",
    "dojo/NodeList-dom", "dojo/NodeList-traverse"

], function(
    Evented, declare, _lang, has, dom, esriNS,
    _WidgetBase, _TemplatedMixin, on,
    query, registry,

    Button,

    ContactUsTemplate,
    i18n,
    domClass, domAttr, domStyle,
    domConstruct, event, esriLang
) {
    var Widget = declare("esri.dijit.ContactUs", [_WidgetBase, _TemplatedMixin, Evented], {
        templateString: ContactUsTemplate,

        options: {
            contactUsURL: ""
        },

        constructor: function(options, srcRefNode) {
            this.defaults = _lang.mixin({}, this.options, options);
            this._i18n = i18n;
            this.domNode = srcRefNode;

            // if (this.defaults.emailAddress.isNonEmpty()) {
            //     this.defaults.subject = escape(this.defaults.subject);
            //     this.defaults.body = escape(this.defaults.body);

            //     const link = document.createElement("link");
            //     link.href = "js/ContactUs/Templates/ContactUs.css";
            //     link.type = "text/css";
            //     link.rel = "stylesheet";
            //     query('head')[0].appendChild(link);
            // }
        },

        startup: function() {
            if (!this.defaults.contactUsURL.isNonEmpty()) {
                domStyle.set(dojo.byId('contactUsNode'), 'display', 'none');
            }
        },

        // openContactUsPage: function() {
        //     window.open(this.defaults.contactUsURL, '_blank').focus();
        // }
    });

    if (has("extend-esri")) {
        _lang.setObject("dijit.ContactUs", Widget, esriNS);
    }
    return Widget;
});