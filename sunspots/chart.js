var d3 = Object.assign({},
  require("d3-selection"),
  require("d3-array"),
  require("d3-scale"),
  require("d3-format"),
  require("d3-contour"),
  require("d3-axis"),
  require("d3-scale-chromatic"),
  require("d3-geo"),
  require("d3-fetch"));

import dataSrc from "./data.csv"

export const id = "chart-sunspots";
export const name = "Sunspots";
export const readme = "This butterfly diagram shows the latitude distribution of sunspot groups over several past solar cycles.";
export const sources = [
  {url: "https://www.ngdc.noaa.gov/stp/solar/sunspotregionsdata.html", description: "NOAA Solar Region Data (Mt. Wilson Tilt)"},
  {url: "https://en.wikipedia.org/wiki/Solar_cycle#Sunspots", description: "Solar Cycle (Wikipedia)"}];

export function controls() {}

export function create(el, props) {
  var margin = {top: 20, right: 10, bottom: 20, left: 60};
  var width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var svg = d3.select(el)
    .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  var x = d3.scaleLinear()
      .domain([1917, 1986])
      .rangeRound([0, width]);

  var y = d3.scaleLinear()
      .domain([-40, 40])
      .rangeRound([height, 0]);

  var color = d3.scaleSequential(d3.interpolateYlOrBr);

  svg.append("g")
      .attr("class", "grid")
    .selectAll("path")
      .data(d3.range(-30, 40, 10))
    .enter().append("path")
      .attr("d", d => `M0,${y(d)}H${width}`)
      .style("stroke", "lightgrey")
      .style("stroke-opacity", 0.7)
      .style("shape-rendering", "crispEdges");

  svg.append("g")
    .attr("class", "contours");

  svg.append("g")
    .attr("class", "axis axis-x")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickValues(d3.range(1910, 1990, 10)).tickFormat(d3.format("d")));

  svg.append("g")
    .attr("class", "axis axis-y")
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("class", "message")
    .attr("alignment-baseline", "hanging")
    .attr("dx", 10)
    .text("Loading data ...");

  d3.csv(dataSrc, row)
    .then(function(spots) {
      svg.select(".message")
        .remove();

      svg.append("text")
        .attr("alignment-baseline", "hanging")
        .attr("dx", 10)
        .text("Latitude of sunspot group (degrees)");

      var density = d3.contourDensity()
        .x(d => x(d.year))
        .y(d => y(d.lat))
        .size([width, height])
        .cellSize(2)
        .thresholds(10)
        .bandwidth(6)
        (spots);

      color.domain(d3.extent(density, d => d.value));

      svg.select(".contours").selectAll("path")
          .data(density)
        .enter().append("path")
          .attr("fill", d => color(d.value))
          .attr("d", d3.geoPath());
    })
  .catch(function() {
    svg.select(".message")
      .text("Failed to load data.");
  });

  function row(d) {
    d.year = +d.year;
    d.lat = +d.lat;
    return d;
  }
}

export function destroy() {}
