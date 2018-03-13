define({
    widgets: ({
        popupInfo: ({
            "Next":"Caractéristique suivante",
            "Prev":"Caractéristique précédente",
            "clickToSelect":"Cliquez sur la carte pour sélectionner des caractéristiques",
            "current":"Caractéristique actuelle",
            "total": "Le total du caractéristiques sélectionnées",
            "zoomTo": "Zoomer sur caractéristique",
            "map": "Aller à la carte",
            "clear": "Effacer la sélection",
            "noFeatures": "Pas des caractéristiques",
            "instructions" : 
                "Cliquez sur la carte pour sélectionner des caractéristiques, <br/>ou <br/>"+
                "<a href='#' onclick='dojo.byId(\"mapDiv\").focus();'>Aller à la carte</a> et:"+
                "<ul>"+
                "<li>déplacer la carte avec <myKey>flèches</myKey>, ou</li>"+
                "<li>déplacer le curseur de carte avec <myKey>MAJ</myKey> + <myKey>flèches</myKey>, puis</li>"+
                "<li>appuyez sur <myKey>Entrée</myKey> pour sélectionner au curseur,</li>"+
                "<li>appuyez <myKey>MAJ</myKey> + <myKey>Entrée</myKey> pour sélectionner au curseur (x 10),</li>"+
                "<li>appuyez <myKey aria-label='Contrôle'>CTRL</myKey> + <myKey>Entrée</myKey> pour sélectionner toute dans l'étendue de la carte,</li>"+
                "<li>appuyez <myKey aria-label='Contrôle'>CTRL</myKey> + <myKey>MAJ</myKey> + <myKey>Entrée</myKey> pour sélectionner l'intérieur de la caractéristique sélectionnée.</li>"+
                "</ul>"+
                "En sélectionnant l'étendue, commence le mode 'Suivre la Carte'.",
            "followTheMap": "Mode Suivez la carte"
        }),
        geoCoding : {
            "zoomTo": "Zoomer sur l'emplacement",
            "clear": "Effacer la sélection",
            "noAddress": "Pas d'adresse au point",
            "instructions" : 
                "Cliquez sur la carte pour obtenir l'adresse du lieu, <br/>ou <br/>"+
                "<a href='#' onclick='dojo.byId(\"mapDiv\").focus();'>Aller à la carte</a> et:"+
                "<ul>"+
                "<li>déplacer la carte avec <myKey>flèches</myKey>, ou</li>"+
                "<li>déplacer le curseur de carte avec <myKey>MAJ</myKey> + <myKey>flèches</myKey>, puis</li>"+
                "<li>appuyez sur <myKey>Entrée</myKey> pour sélectionner au curseur.</li>"+
                "</ul>",
            "Location": "Emplacement",
            "Address": "Adresse&nbsp;:",
            "Block": "Bloc&nbsp;:",
            "City": "Ville&nbsp;:",
            "CountryCode": "Code&nbsp;pays&nbsp;:",
            "District": "District&nbsp;:",
            "MetroArea": "Zone&nbsp;métropolitaine&nbsp;:",
            "Neighborhood": "Quartier&nbsp;:",
            "PlaceName": "Nom&nbsp;de&nbsp;lieu&nbsp;:",
            "PostalCode": "Code&nbsp;Postal&nbsp;:",
            "Region": "Région&nbsp;:",
            "Sector": "Secteur&nbsp;:",
            "Territory": "Territoire&nbsp;:",
            "Type": "Type&nbsp;:",
            "Addr_type": "Type&nbsp;d'addr&nbsp;:"
        },
        "addrType" : {
            PointAddress : "Adresse",
            StreetName : "Nom de rue",
            StreetAddress : "Adresse de rue",
            POI: "Point d'intérêt",
            Locality: "Localité",
            Neighborhood: "Quartier",
            City: "Ville",
            Zone: "Zoné",
            Bank: "Banque",
            Park: "Parc",
            Postal: "Code Postal",
            College: "Collège",
            School: "École",
            ShoppingCenter: "Centre commercial",
            BusinessFacility: "Facilité d'affaires",
            County: "Département",
            GolfCourse: "Terrain de golf",
            Parking: "Stationnement"
        }

    })
});
