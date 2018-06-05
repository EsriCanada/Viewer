define([
    "dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "dojo/dom", "esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/on",
    "dojo/query", "dijit/registry",

    "dijit/form/Button", "dijit/form/DropDownButton", "dijit/TooltipDialog", 

    "dojo/text!application/ContactUs/Templates/ContactUs.html",
    "dojo/i18n!application/nls/ContactUs",
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style",
    "dojo/_base/event", 
    "dojo/NodeList-dom", "dojo/NodeList-traverse"

], function(
    Evented, declare, lang, has, dom, esriNS,
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
            body: 'Email Body Text',
        },

        constructor: function(options, srcRefNode) {
            this.defaults = lang.mixin({}, this.options, options);
            this.domNode = srcRefNode;
            this._i18n = i18n;

            if (this.defaults.emailAddress.isNonEmpty()) {
                this.defaults.subject = this.defaults.subject;
                this.defaults.body = this.defaults.body;

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

        postCreate : function () {
            // const sendBtn = this.sendBtn;
            // console.log("sendBtn", sendBtn);
            // sendBtn._onClick = this.sendExecute;
            var button = new dijit.form.Button({label:"Send", type:"submit"},"btn").placeAt(this.sendBtn);
            dojo.connect(button, "onClick", lang.hitch(this, this.sendExecute));
        },

        sendExecute : function(event) {
            const optionsList = query('input[type="checkbox"]:checked + label',this.optionsList).map(function(t) {return " "+t.textContent;});
            let subject = new Array(optionsList).join(",").trim();
            if(!subject || subject ==="") 
                subject = this.defaults.subject;
            console.log('sendExecute: ', event, subject);

            const link = 'mailto:'+this.defaults.emailAddress+'?subject='+escape(subject)+'&body='+escape(this.defaults.body);
            window.location.href = link;
            // const page = window.open(link);
            // page.close();
        },

    });

    if (has("extend-esri")) {
        lang.setObject("dijit.ContactUs", Widget, esriNS);
    }
    return Widget;
});