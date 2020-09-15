const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-array"),
  require("d3-scale"),
  require("d3-axis"),
  require("d3-shape"),
  require("d3-collection"),
  require("d3-transition"),
  require("d3-fetch"));

import "./styles.css";
import data_north_csv from "./data_north.csv"
import data_south_csv from "./data_south.csv"

import React from "react";
import { Form, ToggleButton, ToggleButtonGroup } from "react-bootstrap";

export const id = "seaice";
export const name = "Sea Ice Index";
export const readme = "This chart shows the short- and long-term changes in the extent of Arctic and Antarctic sea ice.";
export const sources = [
  { url: "https://doi.org/10.7265/N5K072F8", description: ["NSIDC Sea Ice Index, Version 3", "(F. Fetterer, K. Knowles, W. N. Meier, M. Savoie, and A. K. Windnagel, 2017, updated daily)"] }
];

export function controls() {
  return (
    <Form style={{marginTop: 20}}>
      <Form.Group style={{textAlign: "center"}}>
        <ToggleButtonGroup id="control-seaice-region" type="radio" name="region" defaultValue="north" size="sm">      
          <ToggleButton variant="light" value="north">Arctic Sea Ice (NH)</ToggleButton>
          <ToggleButton variant="light" value="south">Antarctic Sea Ice (SH)</ToggleButton>
          <ToggleButton variant="light" value="global">Global Sea Ice</ToggleButton>
        </ToggleButtonGroup>
      </Form.Group>
    </Form>
  );
}

export function create(el, props) {
  var margin = { top: 20, right: 20, bottom: 30, left: 40 };
  var width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var years = d3.range(1978, 2021);

  var x = d3.scaleLinear().domain([0, 365]).range([0, width]),
      y = d3.scaleLinear().range([height, 0]),
      z = d3.scaleQuantize().domain([0, width]).range(years);

  var line = d3.line()
    .x(d => x(d.key))
    .y(d => y(d.value));

  var nest = d3.nest()
    .key(d => d.year)
    .key(d => d.day)
    .rollup(array => d3.sum(array, d => d.extent));

  var svg = d3.select(el).append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  svg.append("rect")
    .attr("fill", "#fff")
    .attr("width", width)
    .attr("height", height);

  svg.append("text")
    .attr("class", "message")
    .attr("alignment-baseline", "hanging")
    .attr("dx", 10)
    .text("Loading data ...");

  svg.append("text")
    .attr("class", "inset")
    .attr("y", height)
    .attr("dx", 10)
    .attr("dy", -10)
    .style("font-size", 40);

  svg.append("g")
    .attr("class", "axis axis-x")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickValues(d3.range(0, 360, 30).concat([365])));

  svg.append("text")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height)
    .attr("dy", -10)
    .text("Day of year");

  svg.append("g")
    .attr("class", "axis axis-y");

  Promise
    .all([
      d3.csv(data_north_csv, (d, i) => row(d, i, "north")),
      d3.csv(data_south_csv, (d, i) => row(d, i, "south"))
    ])
    .then(function([data_north, data_south]) {
      svg.select(".message")
        .remove();

      svg.append("text")
        .attr("alignment-baseline", "hanging")
        .attr("dx", 10)
        .text("Daily sea ice extent (million square kilometers)");

      var regions = {
        north: { data: [data_north], domain: [0, 22] },
        south: { data: [data_south], domain: [0, 22] },
        global: { data: [data_north, data_south], domain: [0, 30] },
      };

      d3.keys(regions).forEach(key => regions[key].map = nest.map(d3.merge(regions[key].data)));

      function change(key) {
        var region = regions[key];

        var t = d3.transition();

        d3.select(".axis-y")
          .transition(t)
          .call(d3.axisLeft(y.domain(region.domain)));

        svg.selectAll(".line")
          .data(years.map(year => ({ year: year, data: region.map.get(year).entries() })))
          .join("path")
            .attr("class", d => `line line-${d.year}`)
            .transition(t)
            .attr("d", d => line(d.data));
      }

      change(d3.select("#control-seaice-region").select("input:checked").property("value"));

      d3.select("#control-seaice-region").selectAll("input")
        .on("change", function() { change(this.value); });

      svg
        .on("mousemove", hover)
        .on("touchmove", hover);

      function hover(event) {
        var p = d3.pointer(event);
        var year = z(p[0]);

        svg.select(".inset")
          .text(year);

        svg.selectAll(".line")
          .classed("active", d => (d.year == year));
      }
    })
    .catch(function() {
      svg.select(".message")
        .text("Failed to load data.");
    });

  function row(d, i, region) {
    var date = new Date(+d.year, +d.month - 1, +d.day);
    d.year = date.getFullYear();
    d.day = Math.ceil((date - new Date(d.year, 0, 1)) / 86400000)
    d.extent = +d.extent;
    d.region = region;
    return d;
  }
}

export function destroy() {}
