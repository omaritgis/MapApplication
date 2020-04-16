Ext.require([
    'Ext.container.Container',
    'Ext.panel.Panel',
    'Ext.grid.Panel',
    'GeoExt.component.Map',
    'GeoExt.data.store.Features',
    'GeoExt.component.FeatureRenderer'
]);

var olMap;
var gridWest;
var gridEast;
var featStore1;
var featStore2, featStore3, featStore4;
var hazardStyle,stateStyle,nucStyle,popStyle,selPopStyle,selStyle;
var vsHazard,vsStates,vsPopulation,vsNuclear,vsHazardFilt,vsPopulationFilt,vsNuclearFilt;
var vHazard,vStates,vPopulation,vNuclear,vHazardFilt,vPopulationFilt,vNuclearFilt;
var slider;
var content = document.getElementById('description');

Ext.application({
    name: 'FeatureGrids',
    launch: function() {
		var featRenderer = GeoExt.component.FeatureRenderer;
    createStyles();
    createVectors();
    createFeatureRequests();
    createMap();
    createComponents();
    }
});
function createMap(){
  olMap = new ol.Map({
      layers: [
          new ol.layer.Tile({
              source: new ol.source.TileWMS({
                  url: 'https://ows.terrestris.de/osm-gray/service',
                  params: {'LAYERS': 'OSM-WMS', 'TILED': true}
              })
          }),
           vHazard,vStates,vPopulation,vNuclear
           // vHazard
      ],
      view: new ol.View({
          center: ol.proj.transform([-119.417931, 36.778259],'EPSG:4326','EPSG:3857'),
          maxZoom:15,
          zoom: 3
      })
  });
  var selectInteraction = new ol.interaction.Select({
    layers: function(layer) {
      return layer.get('selectable') == true;
    },
    style: [selStyle, selPopStyle,selStyle]
  });
  vStates.set('selectable', true);
  vPopulation.set('selectable', true);
  vHazard.set('selectable',true);
  olMap.getInteractions().extend([selectInteraction]);


}
function sliderHaz(newValue){
  vsHazardFilt = new ol.source.Vector();
  vHazardFilt = new ol.layer.Vector({
   source: vsHazardFilt,
    style: hazardStyle
  });
  var hazardRequest = new ol.format.WFS().writeGetFeature({ //Seismic hazard layer
    srsName: 'EPSG:3857',
    featureNS: 'project',
    featurePrefix: 'project',
    featureTypes: ['seismic-hazard'],
    outputFormat: 'application/json',
    filter: ol.format.filter.greaterThan('ACC_VAL',newValue)
    });
  fetch('http://localhost:8086/geoserver/wfs', {
    method: 'POST',
    body: new XMLSerializer().serializeToString(hazardRequest)
  }).then(function(response1) {
    return response1.json();
  }).then(function(json1) {
    var features1 = new ol.format.GeoJSON().readFeatures(json1);
    vsHazardFilt.addFeatures(features1);
    extent_swe=vsHazardFilt.getExtent();
  });
  olMap.removeLayer(vHazard);
  vsHazard = vsHazardFilt;
  vHazard = vHazardFilt;
  olMap.addLayer(vHazard);

  vsPopulationFilt = new ol.source.Vector();
  vPopulationFilt = new ol.layer.Vector({
    source: vsPopulationFilt,
    style: popStyle
  })
  var populationRequest = new ol.format.WFS().writeGetFeature({
    srsName: 'EPSG:3857',
    featureNS: 'project',
    featurePrefix: 'project',
    featureTypes: ['updatedPop'],
    outputFormat: 'application/json',
    filter: ol.format.filter.and(
      ol.format.filter.greaterThan('POP_MIN','90000'),
      ol.format.filter.greaterThan('ACC_VAL',newValue)
    )
  });
  fetch('http://localhost:8086/geoserver/wfs', {
    method: 'POST',
    body: new XMLSerializer().serializeToString(populationRequest)
  }).then(function(response2) {
    return response2.json();
  }).then(function(json2) {
    var features2 = new ol.format.GeoJSON().readFeatures(json2);
    vsPopulation.addFeatures(features2);
    extent_swe=vsPopulation.getExtent();
  });

  olMap.removeLayer(vPopulation);
  vsPopulation = vsPopulationFilt;
  vPopulation = vPopulationFilt;
  olMap.addLayer(vPopulation);

  vsNuclearFilt = new ol.source.Vector();
  vNuclearFilt = new ol.layer.Vector({
    source: vsNuclearFilt,
    style: nucStyle
  });
  var nuclearRequest = new ol.format.WFS().writeGetFeature({
    srsName:'EPSG:3857',
    featureNS:'project',
    featurePrefix:'project',
    featureTypes: ['updatedNuc'],
    outputFormat:'application/json',
    filter: ol.format.filter.greaterThan('ACC_VAL',newValue)
  });
  fetch('http://localhost:8086/geoserver/wfs', {
    method: 'POST',
    body: new XMLSerializer().serializeToString(nuclearRequest)
  }).then(function(response3) {
    //console.log(response); //prints out information in console
    return response3.json();
  }).then(function(json3) {
    var features3 = new ol.format.GeoJSON().readFeatures(json3);
    vsNuclear.addFeatures(features3);
    extent_swe=vsNuclear.getExtent();
  });

  olMap.removeLayer(vNuclear);
  vsNuclear = vsNuclearFilt;
  vNuclear = vNuclearFilt;
  olMap.addLayer(vNuclear);

  var selectInteraction = new ol.interaction.Select({
    layers: function(layer) {
      return layer.get('selectable') == true;
    },
    style: [selStyle, selPopStyle,selStyle]
  });
  vStates.set('selectable', true);
  vPopulation.set('selectable', true);
  // vHazard.set('selectable',true);
  olMap.getInteractions().extend([selectInteraction]);

  olMap.on('singleclick', function(evt){
    var coordinate = evt.coordinate;
    var stringifyFunc = ol.coordinate.createStringXY(2);
    var out = stringifyFunc(coordinate);
    var feature = olMap.forEachFeatureAtPixel(evt.pixel,function(feature,layer){
      if (feature.getGeometry().getType() == 'Point') { //Nuclear points
        content.innerHTML = '<b>Information:</b>' + '<p>NAME: ' + feature.get('NAME')+'</p>' + '<p>Type: ' + feature.get('TYPE') + '</p>' +
        '<p>State: ' + feature.get('STATE') + '</p><p>City: ' + feature.get('CITY') + '</p>';
      }else if (feature.getGeometry().getType() == 'MultiPolygon') { //Är stater och punkter
        content.innerHTML = '<b>Information:</b>' + '<p>NAME: ' + feature.get('NAME')+'</p>' + '<p>Population: ' + feature.get('POPULATION') + '</p>';
      }
    });
  });
}
function createStyles(){
  hazardStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: [0, 0, 255, 1.0],
      width: 1
    }),
    fill: new ol.style.Fill({
      color: [200, 100, 1, .7]
    })
  });
 popStyle = new ol.style.Style({ //population points
   image: new ol.style.Circle({
     radius: 5,
     stroke: new ol.style.Stroke({
       color: 'red',
       width: 2
     }),
     fill: new ol.style.Fill({
       color: 'yellow'
     })
   })
 });
 nucStyle = new ol.style.Style({
   image: new ol.style.Icon({
     src: 'project/NucSymbol.jpg',
     size:[32,32],
     scale: 0.5
   })
 });
 selPopStyle =  new ol.style.Style({
   image: new ol.style.Circle({
     radius: 7,
     stroke: new ol.style.Stroke({
       color: 'green',
       width: 2
     }),
     fill: new ol.style.Fill({
       color: 'yellow'
     })
   })
 });
 selStyle = new ol.style.Style({
   stroke: new ol.style.Stroke({
     color: [0, 0, 255, 1.0],
     width: 2
   })
 });
 stateStyle = new ol.style.Style({
   stroke: new ol.style.Stroke({
     color: 'black',
     width: 1,
     opacity: 0.2
   }),
   fill: new ol.style.Fill({
     color: 'white'
   })
 });
}
function createVectors(){
  vsHazard = new ol.source.Vector();
  vHazard = new ol.layer.Vector({
   source: vsHazard,
    style: hazardStyle
  });
  vsPopulation = new ol.source.Vector();
  vPopulation = new ol.layer.Vector({
   source: vsPopulation,
    style: popStyle
  });
  vsStates = new ol.source.Vector();
  vStates = new ol.layer.Vector({
    source: vsStates,
    style: stateStyle
  });
  vsNuclear = new ol.source.Vector();
  vNuclear = new ol.layer.Vector({
    source: vsNuclear,
    style: nucStyle
  });

}
function createFeatureRequests(){
  var hazardRequest = new ol.format.WFS().writeGetFeature({ //Seismic hazard layer
    srsName: 'EPSG:3857',
    featureNS: 'project',
    featurePrefix: 'project',
    featureTypes: ['seismic-hazard'],
    outputFormat: 'application/json',
    // filter: ol.format.filter.greaterThan('ACC_VAL','20')
    });
  fetch('http://localhost:8086/geoserver/wfs', {
    method: 'POST',
    body: new XMLSerializer().serializeToString(hazardRequest)
  }).then(function(response1) {
    return response1.json();
  }).then(function(json1) {
    var features1 = new ol.format.GeoJSON().readFeatures(json1);
    vsHazard.addFeatures(features1);
    extent_swe=vsHazard.getExtent();
  });

  var populationRequest = new ol.format.WFS().writeGetFeature({
    srsName: 'EPSG:3857',
    featureNS: 'project',
    featurePrefix: 'project',
    featureTypes: ['updatedPop'],
    outputFormat: 'application/json',
    filter: ol.format.filter.or(
            ol.format.filter.greaterThan('POP_MAX', '90000'),
            ol.format.filter.greaterThan('POP_MIN', '90000')
          )
  });
  fetch('http://localhost:8086/geoserver/wfs', {
    method: 'POST',
    body: new XMLSerializer().serializeToString(populationRequest)
  }).then(function(response2) {
    return response2.json();
  }).then(function(json2) {
    var features2 = new ol.format.GeoJSON().readFeatures(json2);
    vsPopulation.addFeatures(features2);
    extent_swe=vsPopulation.getExtent();
  });

  var nuclearRequest = new ol.format.WFS().writeGetFeature({
    srsName:'EPSG:3857',
    featureNS:'project',
    featurePrefix:'project',
    featureTypes: ['updatedNuc'],
    outputFormat:'application/json'
  });
  fetch('http://localhost:8086/geoserver/wfs', {
    method: 'POST',
    body: new XMLSerializer().serializeToString(nuclearRequest)
  }).then(function(response3) {
    //console.log(response); //prints out information in console
    return response3.json();
  }).then(function(json3) {
    var features3 = new ol.format.GeoJSON().readFeatures(json3);
    vsNuclear.addFeatures(features3);
    extent_swe=vsNuclear.getExtent();
  });

  var stateRequest = new ol.format.WFS().writeGetFeature({
    srsName:'EPSG:3857',
    featureNS:'project',
    featurePrefix:'project',
    featureTypes: ['states'],
    outputFormat:'application/json',
  });
  fetch('http://localhost:8086/geoserver/wfs', {
    method: 'POST',
    body: new XMLSerializer().serializeToString(stateRequest)
  }).then(function(response4) {
    //console.log(response); //prints out information in console
    return response4.json();
  }).then(function(json4) {
    var features4 = new ol.format.GeoJSON().readFeatures(json4);
    vsStates.addFeatures(features4);
    extent_swe=vsStates.getExtent();
  });

}
function createFeatstores(){
  // create feature store by passing a vector layer
  featStore1 = Ext.create('GeoExt.data.store.Features', {
      layer: vHazard,
      map: olMap
  });
  // create feature store by passing a vector layer
  featStore2 = Ext.create('GeoExt.data.store.Features', {
      layer: vStates,
      map: olMap
  });
  featStore3 = Ext.create('GeoExt.data.store.Features', {
      layer: vPopulation,
      map: olMap
  });
  featStore4 = Ext.create('GeoExt.data.store.Features', {
      layer: vNuclear,
      map: olMap,
      passThroughFilter: true
  });
}
function createComponents(){
  var mapComponent = Ext.create('GeoExt.component.Map', {
      map: olMap
  });
  var mapPanel = Ext.create('Ext.panel.Panel', {
      region: 'center',
      height: 400,
      layout: 'fit',
      items: [mapComponent]
  });

  slider = Ext.create('Ext.slider.Single', {
      fieldLabel: 'Danger Zone',
      width: 500,
      value: 0,
      increment: 1,
      minValue: 0,
      maxValue: 100,
      tipText: function(thumb) {
          return 'ACC Value >' + String(thumb.value);
      },
      listeners: {
          change: function(sliderRef, newValue, thumb) {
              sliderHaz(newValue);
          }
      }
  });

  var description = Ext.create('Ext.panel.Panel', {
      contentEl: 'description',
      region: 'south',
      title: 'Description',
      tbar:[slider],
      height: 250,
      border: false,
      bodyPadding: 5,
      autoScroll: true,
      buttons:[{text:"Toogle hazardLayer", handler:function(){
        if (vHazard.getVisible()) {
          vHazard.setVisible(false);
        } else {
          vHazard.setVisible(true);
        }
      }},{text:"Toogle States Layer", handler:function(){
        if (vStates.getVisible()) {
          vStates.setVisible(false);
        } else {
          vStates.setVisible(true);
        }
      }},{text:"Toogle Population Layer", handler:function(){
        if (vPopulation.getVisible()) {
          vPopulation.setVisible(false);
        } else {
          vPopulation.setVisible(true);
        }
      }},{text:"Toogle Nuclear Buildings", handler:function(){
        if (vNuclear.getVisible()) {
          vNuclear.setVisible(false);
        } else {
          vNuclear.setVisible(true);
        }
      }},{
        text:"Hide",
        style:'background-color: red',
        handler:function(){
          description.setCollapsed(true);
        }
      }]
  });

  Ext.create('Ext.Viewport', {
      layout: 'border',
      // items: [mapPanel, gridWest, gridEast, description]
      items: [mapPanel,description]
  });
}
