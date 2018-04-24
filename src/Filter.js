import React from 'react';

// the UI component for filtering the cars by trip status
export default (props) => {
  const { lines, filterStatus } = props;
  // this is the JSX that will become the Filter UI in the DOM,
  // when a user selects a trip status, the component passes the new filter value
  // to the parent component, Map, which reloads the GeoJSON data with the current filter value
  return (
    <div className="filterSubwayLines">
      <hr/>
      <h3>Smove Cars Filter</h3>
      <p>A <a href="http://leafletjs.com/">Leaflet</a> &amp; <a href="https://facebook.github.io/react/">React</a> demo</p>
      <p>Filter cars by trip status</p>
      <select defaultValue="*"
        type="select"
        name="filterStatus"
        onChange={(e) => filterStatus(e)}>
          { /* We render the select's option elements by maping each of the values of subwayLines array to option elements */ }
          {
            lines.map((line, i) => {
              return (
                  <option value={line} key={i}>{line}</option>
                );
            }, this)
          }
      </select>
    </div>
  );
};
