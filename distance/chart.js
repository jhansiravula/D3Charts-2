const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-array"),
  require("d3-scale"),
  require("d3-axis"),
  require("d3-fetch"));

import { Delaunay } from "d3-delaunay";

import React from "react";
import { Form, Row, Col } from "react-bootstrap";

import "./styles.css";
import dataSrc from "./data.json";

export const id = "distance";
export const name = "The Distance to the Galactic Center";
export const readme = "This chart shows a compilation of recent measurements of the distance to the Galactic Center, based on different methods.";
export const sources = [
  { url: "https://doi.org/10.1146/annurev-astro-081915-023441", description: "Bland-Hawthorn & Gerhard 2016" },
  { url: "https://doi.org/10.3847/0004-637X/830/1/17", description: "Boehle+ 2016" },
  { url: "https://doi.org/10.3847/1538-4357/aa5c41", description: "Gillessen+ 2017" },
  { url: "https://doi.org/10.1051/0004-6361/201833718", description: "GRAVITY Collab. 2018" }
];

export function controls() {
  return (
    <Form>
      <Form.Group as={Row}>
        <Form.Label column md={2}>
          Location
        </Form.Label>
        <Col md={5}>
         <Form.Control id="control-distance-location" as="select" defaultValue="Any">
           <option value="Any">Any</option>
           <option value="GC">Galactic Center</option>
           <option value="B">Bulge</option>
           <option value="DSN">Disk & Solar Neighborhood</option>
           <option value="IH">Halo</option>
         </Form.Control>
        </Col>
      </Form.Group>
    </Form>
  );
}

export function create(el, props) {
  var margin = { top: 20, right: 20, bottom: 30, left: 40 };
  var width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var svg = d3.select(el).append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  var x = d3.scaleTime().domain([new Date(2004, 8), new Date(2019, 1)]).range([0, width]),
      y = d3.scaleLinear().domain([6, 10]).range([height, 0]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .call(d3.axisLeft(y));

  svg.append("line")
    .attr("class", "average")
    .attr("x1", 0)
    .attr("x2", width);

  svg.append("text")
    .attr("x", 10)
    .attr("y", 10)
    .text("Estimated distance to the Galactic Center (kpc)");

  svg.append("text")
    .attr("class", "reference")
    .attr("x", 10)
    .attr("y", height - 10);

  function average(data) {
    var weights = data.map(d => 1 / (d.error * d.error));
    return d3.sum(data.map((d, i) => d.value * weights[i])) / d3.sum(weights);
  }

  d3.json(dataSrc).then(function(data) {
    data.forEach(d => d.date = new Date(d.date));

    d3.select("#control-distance-location")
      .on("change", function() { change(this.value); })

    var voronoi = Delaunay.from(data, d => x(d.date), d => y(d.value))
      .voronoi([0, 0, width, height]);

    var points = svg.selectAll(".point").data(data)
      .enter().append("g")
        .attr("class", "point selected");

    points.append("path")
      .attr("d", (_, i) => voronoi.renderCell(i));

    points.append("circle")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.value))
      .attr("r", 4);

    points.append("line")
      .attr("x1", d => x(d.date))
      .attr("x2", d => x(d.date))
      .attr("y1", d => y(d.value - d.error))
      .attr("y2", d => y(d.value + d.error));

    points.on("mouseover", function(d) {
      if (d3.select(this).classed("selected")) {
        d3.selectAll(".point").classed("hover", false);
        d3.select(this).classed("hover", true);
        svg.select(".reference").text(`${d.reference} using ${d.method}`);
      }
    });

    function change(location) {
      function isSelected(d) {
        return (typeof location === "undefined") ||
          (location === "Any") ||
          (d.location.indexOf(location) !== -1);
      }

      points.each(function(d) {
        d3.select(this).classed("selected", isSelected(d))
      });

      var R0 = average(data.filter(d => isSelected(d)));

      svg.select(".average")
        .transition()
        .attr("y1", y(R0))
        .attr("y2", y(R0));
    }

    change();
  });
}

export function destroy() {}
