require([
    "dojo/dom",
    "dojo/on",
    'dojo/_base/lang',
    "dojo/query", 
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/dom-construct',
    "dojo/number",
    "modules/mustache",
    "dojo/text!template/directions.html"
], function(dom, on, lang, query, domClass, domStyle, domConstruct, number, Mustache, dirTemplate) {
    var directions, directionsWidget, output;
    try {
        directions = window.opener.directions;
        directionsWidget = window.opener.directionDijit;
        // console.log(directions, directionsWidget);
    } 
    catch (err) {
        directions = {
            error: true
        };
    }
    if (directions && directionsWidget) {
        window.imagesPath = directionsWidget.imagesPath;

        on(dom.byId('directions'), '#print_area:keyup', function() {
            dom.byId('print_helper').innerHTML = this.value;
        });
        on(dom.byId('directions'), '#closeButton:click', function() {
            window.close();
        });
        on(dom.byId('directions'), '#printButton:click', function() {
            window.print();
        });
        
        directionsWidget.zoomToFullRoute().then(lang.hitch(this,function(){
          directionsWidget._printService.execute(directionsWidget._printParams,lang.hitch(this,function(result){
            const mapNode = document.getElementById("divMap");
            domClass.remove(mapNode,'esriPrintWait');
            domClass.add(mapNode,'esriPageBreak');
            domConstruct.create("img",{src:result.url,"class":"esriPrintMapImg"},mapNode);

            const resultsNode = directionsWidget._resultsNode;
            if(resultsNode) {
                const summary = query('.esriResultsSummary', resultsNode);
                if(summary && summary.length>0) {
                    dojo.place(summary[0].outerHTML, document.getElementById('dirSummary'));
                }
            }

          }),lang.hitch(this,function(error){
            const mapNode = document.getElementById("divMap");
            domClass.remove(mapNode,"esriPrintWait");
            console.log("Error while calling the print service: ",error);
          }));
        }));

        directions.letterIndex = 0;
        const imagePath = 'https://serverapi.arcgisonline.com/jsapi/arcgis/3.5/js/esri/dijit/images/Directions/maneuvers/';
        const imageType = '.png';
        directions.maneuver = function() {
            if (this.attributes.maneuverType) {

                if (this.attributes.maneuverType === 'esriDMTDepart' ||
                    this.attributes.maneuverType === 'esriDMTStop') {
                    if (this.attributes.step === 1) {
                        return window.imagesPath+"/greenPoint.png";
                    }
                    if(this.attributes.step === directions.features.length) {
                        return window.imagesPath+"/redPoint.png";
                    }
                    return window.imagesPath+"/bluePoint.png";
                }

                return imagePath + this.attributes.maneuverType + imageType;
            }
            return false;
        };
        directions.letter = function() {
            const alphabet = "123456789";
            var letter = false;
            if (!directions.letterIndex) {
                directions.letterIndex = 0;
            }
            if (alphabet && alphabet.length) {
                if (directions.letterIndex >= alphabet.length) {
                    directions.letterIndex = alphabet.length - 1;
                }
                if (typeof alphabet === 'string') {
                    // string alphabet
                    letter = alphabet.substr(directions.letterIndex, 1);
                } else if (alphabet instanceof Array) {
                    // array alphabet
                    letter = alphabet[directions.letterIndex];
                }
                if (directions.letterIndex === 0) {
                    directions.letterIndex++;
                } else if (this.attributes.maneuverType === 'esriDMTDepart') {
                    directions.letterIndex++;
                }
            }
            return letter;
        };
        directions.lastColumn = function() {
            return (this.attributes.step === directions.features.length);
        };
        directions.distance = function() {
            var d = Math.round(this.attributes.length * 100) / 100;
            if (d === 0) {
                return "";
            }
            return number.format(d) + " " + "km";
        };
        output = Mustache.render(dirTemplate, directions);
    }

    console.log('directions', directions);
    var node = dom.byId('directions');
    if (node) {
        node.innerHTML = output;
    }
});