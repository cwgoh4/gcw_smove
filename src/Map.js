import React, { Component } from 'react';
import L from 'leaflet';
// postCSS import of Leaflet's CSS
import 'leaflet/dist/leaflet.css';
// import geojson so that we can parse the json data recevied from endpoint
import GeoJSON from 'geojson';
// import local components Filter
import Filter from './Filter';
// import the 1 week worth of booking data directly using json-loader
import BookingData from './bookingdata';

// store the map configuration properties in an object,
// we could also move this to a separate file & import it if desired.
// using openstreetmap uri here
let config = {};
config.params = {
  center: [40.655769,-73.938503],
  zoomControl: false,
  zoom: 13,
  maxZoom: 19,
  minZoom: 11,
  scrollwheel: false,
  legends: true,
  infoControl: false,
  attributionControl: true
};
config.tileLayer = {
  uri: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  params: {
    minZoom: 11,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    id: '',
    accessToken: ''
  }
};

// array to store trip status[All status],true and false added later when traversing each feature
// this eventually gets passed down to the Filter component
let carTripStatus = ["All status"];

class Map extends Component {
  constructor(props) {
    super(props);
    this.state = {
      map: null,
      tileLayer: null,
      geojsonLayer: null,
      geojson: null,
      carTripsFilter: '*'
    };
    this._mapNode = null;
    this.updateMap = this.updateMap.bind(this);
    this.onEachFeature = this.onEachFeature.bind(this);
    this.pointToLayer = this.pointToLayer.bind(this);
    this.filterFeatures = this.filterFeatures.bind(this);
    this.filterGeoJSONLayer = this.filterGeoJSONLayer.bind(this);
  }

  componentDidMount() {
    // code to run just after the component "mounts" / DOM elements are created
    // we could make an AJAX request for the GeoJSON data here if it wasn't stored locally
    this.getData();
    // create the Leaflet map object
    if (!this.state.map) this.init(this._mapNode);
  }

  componentDidUpdate(prevProps, prevState) {
    // code to run when the component receives new props or state
    // check to see if geojson is stored, map is created, and geojson overlay needs to be added
    if (this.state.geojson && this.state.map && !this.state.geojsonLayer) {
      // add the geojson overlay
      this.addGeoJSONLayer(this.state.geojson);
    }

    // check to see if the trip status filter has changed
    if (this.state.carTripsFilter !== prevState.carTripsFilter) {
      // filter / re-render the geojson overlay
      this.filterGeoJSONLayer();
    }
  }

  componentWillUnmount() {
    // code to run just before unmounting the component
    // this destroys the Leaflet map object & related event listeners
    this.state.map.remove();
  }

  getData() {
    // could also be an AJAX request that results in setting state with the geojson data
    this.getDataFromApiAsync().then(result => this.setState({
      geojson: result
    }));
  }

  updateMap(e) {
    let trip = e.target.value;
    // change the subway line filter
    if (trip === "All status") {
      trip = "*";
    }
    // update our state with the new filter value from UI selection
    this.setState({
      carTripsFilter: trip
    });
  }

  addGeoJSONLayer(geojson) {

    // create a native Leaflet GeoJSON SVG Layer to add as an interactive overlay to the map
    // an options object is passed to define functions for customizing the layer
    const geojsonLayer = L.geoJson(geojson, {
      onEachFeature: this.onEachFeature,
      pointToLayer: this.pointToLayer,
      filter: this.filterFeatures
    });
    // add our GeoJSON layer to the Leaflet map object
    geojsonLayer.addTo(this.state.map);
    // store the Leaflet GeoJSON layer in our component state for use later
    this.setState({ geojsonLayer });
    // fit the geographic extent of the GeoJSON layer within the map's bounds / viewport
    this.zoomToFeature(geojsonLayer);
  }

  filterGeoJSONLayer() {
    // clear the geojson layer of its data
    this.state.geojsonLayer.clearLayers();
    // re-add the geojson so that it filters out subway lines which do not match state.filter
    this.state.geojsonLayer.addData(this.state.geojson);
    // fit the map to the new geojson layer's geographic extent
    this.zoomToFeature(this.state.geojsonLayer);
  }

  zoomToFeature(target) {
    // pad fitBounds() so features aren't hidden under the Filter UI element
    var fitBoundsParams = {
      paddingTopLeft: [200,10],
      paddingBottomRight: [10,10]
    };
    // set the map's center & zoom so that it fits the geographic extent of the layer
    this.state.map.fitBounds(target.getBounds(), fitBoundsParams);
  }

  filterFeatures(feature) {
    // filter the subway entrances based on the map's current search filter
    // returns true only if the filter value matches the value of feature.properties.LINE
    if (this.state.carTripsFilter === '*' || JSON.stringify(feature.properties.is_on_trip) === this.state.carTripsFilter) {
      return true;
    }
  }

  pointToLayer(feature, latlng) {
    // renders our GeoJSON points as circle markers, rather than Leaflet's default image markers
    // parameters to style the GeoJSON markers, use different colors to identify if car is on trip(black) or not(green)
    var mycolor = null;
    if(feature.properties.is_on_trip)mycolor='black';else mycolor='green';
    var markerParams = {
      radius: 8,
      fillColor: mycolor,
      color: '#fff',
      weight: 1,
      opacity: 0.5,
      fillOpacity: 0.8
    };

    return L.circleMarker(latlng, markerParams);
  }

  onEachFeature(feature, layer) {
    const totalBookings = this.filterDataFromBookingData(feature.properties.id);
    // assemble the HTML for the markers' popups (Leaflet's bindPopup method doesn't accept React JSX)
    const popupContent = `<h3>Car ID: ${feature.properties.id}</h3>
      <strong>Car currently on a trip? </strong>${feature.properties.is_on_trip}
      </br>
      <strong>Past 1 week bookings on this car: </strong>${totalBookings.length}`;

    // add our popups
    layer.bindPopup(popupContent);
    var tripStatus = JSON.stringify(feature.properties.is_on_trip);
    // add our status into array if it doesnt already exist
    if (carTripStatus.indexOf(tripStatus) === -1) carTripStatus.push(tripStatus);
  }

  init(id) {
    if (this.state.map) return;
    // this function creates the Leaflet map object and is called after the Map component mounts
    let map = L.map(id, config.params);
    L.control.zoom({ position: "bottomleft"}).addTo(map);
    L.control.scale({ position: "bottomleft"}).addTo(map);

    // a TileLayer is used as the "basemap"
    const tileLayer = L.tileLayer(config.tileLayer.uri, config.tileLayer.params).addTo(map);

    // set our state to include the tile layer
    this.setState({ map, tileLayer });
  }

  render() {
    const { carTripsFilter } = this.state;
    return (
      <div id="mapUI">
        {
          /* render the Filter component only after the carTripStatus array has been created */
          carTripStatus.length &&
            <Filter lines={carTripStatus}
              curFilter={carTripsFilter}
              filterStatus={this.updateMap} />
        }
        <div ref={(node) => this._mapNode = node} id="map" />
      </div>
    );
  }

  // get the json data from the endpoint. Parse it into a GeoJson
  getDataFromApiAsync() {

   return fetch('https://challenge.smove.sg/locations')
   .then((response) => response.json())
   .then((responseJson) => {
     return GeoJSON.parse(responseJson.data, {Point: ['latitude', 'longitude']});
   })
   .catch((error) => {
     console.error(error);
   });
  }

  // function to filter appropriate content to show in popup for each car on mapUI
  filterDataFromBookingData(carid) {

    // A function which returns a function to be used for filtering.
    const includeCar = (includedCar) =>
      ({car}) => car === includedCar;

    // This function takes any number of functions, and returns a function.
    // It returns a function that will "AND" together their return values of all the original functions
    const and = (...funcs) => (...innerArgs) => funcs.every(func => func(...innerArgs));

    // Create a filter which includes the carid
    const carFilter = includeCar(carid);

    // Now do that actual filtering of the array.
    return BookingData.filter(and(carFilter));
  }
}

export default Map;
