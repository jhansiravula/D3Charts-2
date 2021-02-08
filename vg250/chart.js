const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-axis"),
  require("d3-scale"),
  require("d3-fetch"),
  require("d3-scale-chromatic"),
  require("d3-geo"));

const topojson = require("topojson-client");

import dataSrc from "./data.json";

export const id = "vg250";
export const name = "Population Density";
export const readme = "The population density of counties in Germany (2018).";
export const sources = [
  { url: "https://gdz.bkg.bund.de/index.php/default/verwaltungsgebiete-1-250-000-ebenen-stand-01-01-vg250-ebenen-01-01.html", description: ["Verwaltungsgebiete 1:250000,", "©GeoBasis-DE/BK (2020),", "dl-de/by-2-0"] },
  { url: "https://ec.europa.eu/eurostat/de/web/products-datasets/product?code=demo_r_d3dens", description: "eurostat" }
];

export function controls() {}

export function create(el, props) {
  var margin = { top: 20, right: 10, bottom: 10, left: 10 };
  var width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var svg = d3.select(el).append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  var color = d3.scaleThreshold()
    .domain([1, 10, 50, 100, 500, 1000, 2000, 5000])
    .range(d3.schemeYlGn[8]);

  // draw legend

  var legendScale = d3.scaleLinear()
    .domain([0, 5000])
    .range([0, 300]);

  var legendAxis = d3.axisBottom()
    .scale(legendScale)
    .tickSize(12)
    .tickValues(color.domain())
    .tickFormat(function(d) { return d >= 500 ? d : null; });

  var legend = svg.append("g");

  legend.selectAll("rect")
    .data(color.range().map((d, i) => ({
      "x0": i ? legendScale(color.domain()[i - 1]) : legendScale.range()[0],
      "x1": i < color.domain().length ? legendScale(color.domain()[i]) : legendScale.range()[1],
      "color": d
    })))
    .join("rect")
      .attr("height", 12)
      .attr("x", d => d.x0)
      .attr("width", d => d.x1 - d.x0)
      .style("fill", d => d.color);

  legend.call(legendAxis)
    .append("text")
      .attr("y", -6)
      .attr("text-anchor", "start")
      .text("Population per square kilometer")
      .style("fill", "currentColor")
      .style("font-style", "italic");

  svg.append("text")
    .attr("class", "message")
    .attr("alignment-baseline", "hanging")
    .attr("dy", 50)
    .text("Loading data ...");

  d3.json(dataSrc)
    .then(function(topo) {
      svg.select(".message")
        .remove();

      // draw info box

      var info = svg.append("text")
        .attr("transform", "translate(10, 100)")
        .selectAll("tspan")
          .data(["name", "id", "value"])
          .join("tspan")
          .attr("x", 0)
          .attr("y", (d, i) => { var dy = 1.5 * i; dy += i > 0 ? 0.2 : 0; return dy + "em"; })
          .style("font-weight", d => d == "name" ? "bold" : "normal")
          .style("font-size", "120%");

      // draw map

      var map = svg.append("g").selectAll("path")
        .data(topojson.feature(topo, topo.objects.counties).features)
        .join("path")
          .attr("d", d3.geoPath())
          .style("stroke", "black")
          .style("stroke-width", 0.5)
          .style("fill", d => color(d.properties.value))
          .on("click", focus)
          .on("mouseover", focus);

      function focus(event, d) {
        map.style("stroke-width", 0.5);
        d3.select(this).style("stroke-width", 2);

        info.each(function(label) {
          switch (label) {
            case "name":
              d3.select(this).text(d.properties.name);
              break;
            case "id":
              d3.select(this).text(d.id);
              break;
            case "value":
              d3.select(this).text(d.properties.value);
              break;
          };
        });
      }
    })
    .catch(function() {
      svg.select(".message")
        .text("Failed to load data.");
    });
}

export function destroy() {}
