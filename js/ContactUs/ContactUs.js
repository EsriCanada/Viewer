define([
    "dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "dojo/dom", "esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/on",
    "dojo/query", "dijit/registry",

    "dijit/form/Button", "dijit/form/DropDownButton", "dijit/TooltipDialog", 

    "dojo/text!application/ContactUs/Templates/ContactUs.html",
    "dojo/i18n!application/nls/resources",
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style",
    "dojo/_base/event", 
    "dojo/NodeList-dom", "dojo/NodeList-traverse"

], function(
    Evented, declare, _lang, has, dom, esriNS,
    _WidgetBase, _TemplatedMixin, on,
    query, registry,

    Button, DropDownButton, TooltipDialog,

    ContactUsTemplate,
    i18n,
    domClass, domAttr, domStyle,
    event
) {
    var Widget = declare("esri.dijit.ContactUs", [_WidgetBase, _TemplatedMixin, Evented], {
        templateString: ContactUsTemplate,

        options: {
            emailAddress: 'example@email.com',
            subject: 'Email Subject',
            body: 'Email Body Text'
        },

        constructor: function(options, srcRefNode) {
            this.defaults = _lang.mixin({}, this.options, options);
            this._i18n = i18n;
            this.domNode = srcRefNode;

            if (this.defaults.emailAddress.isNonEmpty()) {
                this.defaults.subject = escape(this.defaults.subject);
                this.defaults.body = escape(this.defaults.body);

                const link = document.createElement("link");
                link.href = "js/ContactUs/Templates/ContactUs.css";
                link.type = "text/css";
                link.rel = "stylesheet";
                query('head')[0].appendChild(link);
            }
        },

        startup: function() {
            if (!this.defaults.emailAddress.isNonEmpty()) {
                domStyle.set(dojo.byId('contactUsNode'), 'display', 'none');
            }
        },

        // postCreate : function () {
        //     const sendBtn = registry.byId('sendBtn');
        //     console.log(sendBtn);
        //     // on(sendBtn, 'click', this.sendExecute);
        //     // sendDialog.onExecute(function(event) {console.log('onExecute', event)});
        // },

        sendExecute : function(event) {
            console.log('sendExecute: ', dijit.byId('sendDialog'));
        },

    });

    if (has("extend-esri")) {
        _lang.setObject("dijit.ContactUs", Widget, esriNS);
    }
    return Widget;
});