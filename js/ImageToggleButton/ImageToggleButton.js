define([
    "dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has",
    "dojo/dom", "esri/kernel",
    "dijit/_WidgetBase", "dijit/_TemplatedMixin",
    "dojo/on", "dojo/query", "dijit/registry",
    "dojo/text!application/ImageToggleButton/Templates/ImageToggleButton.html",
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style",
    "dojo/dom-construct", "dojo/_base/event", "esri/lang",
    "dojo/NodeList-dom", "dojo/NodeList-traverse"

    ], function (
        Evented, declare, lang, has, dom, esriNS,
        _WidgetBase, _TemplatedMixin,
        on, query, registry,
        dijitTemplate,
        domClass, domAttr, domStyle,
        domConstruct, event, esriLang
    ) {
    var Widget = declare("esri.dijit.ImageToggleButton", [
        _WidgetBase,
        _TemplatedMixin,
        Evented], {
        templateString: dijitTemplate,

        options: {
            class: null,
            value: null,
            type: 'checkbox',
            group: null,
            imgSelected: null,
            imgUnselected: null,
            imgClass: null,
            imgSelectedClass: null,
            imgUnselectedClass: null,
            titleSelected: 'Selected',
            titleUnselected: 'Unselected',
            autoCloseMessage: true,
            domMessage: null,
        },

        constructor: function (options, srcRefNode) {
            this.defaults = lang.mixin({}, this.options, options);
            this.id = this.defaults.id || dijit.registry.getUniqueId(this.declaredClass);
            this.domNode = srcRefNode;
            this.type = this.defaults.type;
            this.name = this.defaults.group ? " name="+this.defaults.group : "";
            this._value = this.defaults.value !== '' ? " value="+this.defaults.value:'';
            this._class = this.defaults.class !== ''? " class='"+this.defaults.class+"'":'';

            var cssFile = "js/ImageToggleButton/Templates/ImageToggleButton.css";
            if(query('html link[href="'+cssFile+'"]').length===0) {
                var link = document.createElement("link");
                link.href = cssFile;
                link.type = "text/css";
                link.rel = "stylesheet";
                query('head')[0].appendChild(link);
            }
        },

        startup: function() {
            if(this.defaults.domMessage) {
                domConstruct.place(this.myMessage, this.defaults.domMessage);
            }
        },

        postCreate : function() {
            domAttr.set(this.myLabel,'aria-label',this.myInput.checked?this.defaults.titleSelected:this.defaults.titleUnselected)

            on(this.myLabel, 'keypress', lang.hitch(this, this._keyDown));

            on(this.myInput, 'change', lang.hitch(this, function(ev) {
                if(this.type === "checkbox" && this.defaults.group && this.myInput.checked) {
                    var elements = query(".ImageToggleButton .cbToggleBtn[name="+this.defaults.group+"]:not(#"+this.id+"_cb):checked");
                    // console.log('elements', elements);
                    if(elements)
                        elements.forEach(function(cb) {
                            cb.checked = false;
                        });
                }
                domAttr.set(this.myLabel,'aria-label',this.myInput.checked?this.defaults.titleSelected:this.defaults.titleUnselected);
                domAttr.set(this.myLabel,'aria-checked',this.myInput.checked.toString());
                this.emit('change', {
                    checked: this.myInput.checked,
                    value: this.myInput.value,
                });
            }));

            if(this.defaults.autoCloseMessage) {
                on(this.myMessage, 'click', lang.hitch(this, this.HideMessage));
                on(this.myMessage, 'focusout', lang.hitch(this, this.HideMessage));
                on(this.myMessage, 'keydown', lang.hitch(this, this.HideMessage));
            }
        },

        focus: function() {
            this.myLabel.focus();
        },

        preset: function(value) {
            if(!value != ! this.myInput.checked) {
                this.myInput.click();
            }
        },

        _keyDown: function(evt) {
            switch(evt.key) {
                case " " :
                case "Enter" :
                    evt.preventDefault();
                    evt.stopPropagation();
                    if(this.type === 'radio' && this.isChecked())
                        this._uncheck();
                    else
                        this.myInput.click();
                    break;
                case "Escape" :
                    evt.preventDefault();
                    this._uncheck();
                    break;
            }
        },

        _uncheck: function() {
            this.myInput.checked = false;
            this.HideMessage();
            this.emit('change', {
                checked: false,
                value: this.myInput.value,
            });
        },

        isChecked : function() {
            return this.myInput.checked;
        },

        Check: function(value) {
            if(this.myInput.checked !== value) {
                this.myInput.checked = value;
                this.emit('change', {
                    checked: this.myInput.checked,
                    value: this.myInput.value
                });
            }
        },

        msgType : null,
        ShowMessage: function(message, messageType) {
            if(!this.myMessage) return;
            domClass.add(this.myMessage, this.msgType = messageType);
            this.myMessage.innerHTML = message;
            this.myMessage.focus();
        },

        HideMessage: function(evn) {
            if(!this.msgType || !this.myMessage || this.myMessage==='') return;
            if(this.myMessage === document.activeElement) {
                this.focus();
            }
            domClass.remove(this.myMessage, this.msgType);
            this.msgType = null;
        },

        IsCheckedAny: function(group) {
            var checked = query(".ImageToggleButton .cbToggleBtn[name="+group+"]:checked");
            return checked && checked.length>0;
        },

        isCheckedAny: function() {
            return this.IsCheckedAny(this.group);
        },

    });

    if (has("extend-esri")) {
        lang.setObject("dijit.ImageToggleButton", Widget, esriNS);
    }
    return Widget;
});
