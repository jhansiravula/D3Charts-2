const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-array"),
  require("d3-scale"),
  require("d3-scale-chromatic"),
  require("d3-contour"),
  require("d3-geo"),
  require("d3-axis"),
  require("d3-hexbin"));

import MCMC from "../tools/MCMC";

import React from "react";
import { Form, ToggleButton, ToggleButtonGroup } from "react-bootstrap";

export const id = "mcmc";
export const name = "Affine Invariant MCMC Sampling";
export const readme = "Affine invariant MCMC sampling is a popular algorithm for sampling hard-to-sample probability density functions, since it works well in many cases without much fine-tuning, using an ensemble of 'walkers' (shown as black points).";
export const sources = [
  { url: "https://github.com/dfm/emcee.js", description: "emcee.js (D. Foreman-Mackey)" }
];

var sampling;

export function controls() {
  return (
    <Form style={{marginTop: 20}}>
      <Form.Group style={{textAlign: "center"}}>
       <ToggleButtonGroup id="control-mcmc-fn" type="radio" name="fn" defaultValue="rosenbrock" size="sm">
         <ToggleButton variant="light" value="rosenbrock">Rosenbrock Function</ToggleButton>
         <ToggleButton variant="light" value="booth">Booth Function</ToggleButton>
       </ToggleButtonGroup>
      </Form.Group>
    </Form>
  );
}

export function create(el, props) {
  MCMC.delay = 100;

  var margin = { top: 20, right: 10, bottom: 20, left: 10 };
  var width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var svg = d3.select(el).append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  svg.append("defs")
    .append("clipPath")
    .attr("id", "def-mcmc-clipPath")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height);

  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "white")
    .style("stroke", "none");

  svg.append("g").attr("clip-path", "url(#def-mcmc-clipPath)")
    .attr("class", "hexbins");

  svg.append("g").attr("clip-path", "url(#def-mcmc-clipPath)")
    .attr("class", "contours");

  svg.append("g").attr("clip-path", "url(#def-mcmc-clipPath)")
    .attr("class", "walkers")

  sampling = $.Deferred();

  var xc, yc, logLikelihood;
  var projection = d3.geoIdentity();

  var ngrid = 100;
  var x2grid = d3.scaleLinear().range([0, ngrid - 1]),
      y2grid = d3.scaleLinear().range([0, ngrid - 1]);

  var hexbin = d3.hexbin()
    .x(d => projection([x2grid(d[0]), y2grid(d[1])])[0])
    .y(d => projection([x2grid(d[0]), y2grid(d[1])])[1])
    .radius(5)
    .extent([[0, 0], [width, height]])

  var color = d3.scaleSequential(d3.interpolateYlGn);

  var data = {
    rosenbrock: { x0: -2, x1: 2, y0: -2, y1: 3, z: [-60, -30, -20, -10],
      logLikelihood: d => -(100 * Math.pow(d[1] - d[0]*d[0], 2) + Math.pow(d[0] - 1, 2)) },
    booth: { x0: 1-4, x1: 1+4, y0: 3-4, y1: 3+4, z: [-20, -15, -10, -5],
      logLikelihood: d => -(Math.pow(d[0] + 2 * d[1] - 7, 2) + Math.pow(2 * d[0] + d[1] - 5, 2)) }
  };

  function linspace(domain, n){
    var dx = (domain[1] - domain[0]) / (n - 1)
    return d3.range(n).map(i => domain[0] + i * dx);
  }

  function change(value) {
    sampling.reject();

    var d = data[value];

    xc = 0; yc = 1;
    logLikelihood = d.logLikelihood;

    // redraw contours

    svg.selectAll(".contour")
      .remove();

    x2grid.domain([d.x0, d.x1]);
    y2grid.domain([d.y0, d.y1]);

    var values = new Array(ngrid * ngrid);
    var x = linspace(x2grid.domain(), ngrid);
    var y = linspace(y2grid.domain(), ngrid);
    for (var j = 0, k = 0; j < ngrid; ++j) {
      for (var i = 0; i < ngrid; ++i, ++k) {
        values[k] = logLikelihood([x[i], y[j]]);
      }
    }

    var contours = d3.contours()
      .size([ngrid, ngrid])
      .thresholds(d.z)
      (values);

    projection.fitSize([width, height], contours[0]);

    svg.select(".contours").selectAll(".contour")
      .data(contours.slice(1))
      .join("path")
        .attr("class", "contour")
        .attr("fill", "none")
        .attr("stroke", "#C0C0C0")
        .attr("d", d3.geoPath(projection));

    start();
  }

  function start() {
    svg.selectAll(".walker")
      .remove();

    svg.selectAll(".hexbin")
      .remove();

    var nwalkers = 100,
        niter = 100000;

    var initialPosition = d3.range(nwalkers).map(() => [xc + (Math.random() - 0.5), yc + (Math.random() - 0.5)]);

    sampling = MCMC.sample(logLikelihood, initialPosition, niter)
      .progress(result => render(result));
  }

  function render(result) {

    // redraw walkers

    svg.select(".walkers").selectAll(".walker")
      .data(result.iteration)
      .join("circle")
        .attr("class", "walker")
        .attr("r", 1.5)
        .attr("fill", "black")
        .attr("stroke", "none")
        .attr("cx", d => projection([x2grid(d[0]), y2grid(d[1])])[0])
        .attr("cy", d => projection([x2grid(d[0]), y2grid(d[1])])[1])

    // rewdraw hexbins

    var bins = hexbin(result.chain);
    color.domain([0, d3.max(bins, d => d.length)]);

    svg.select(".hexbins").selectAll(".hexbin")
      .data(bins)
      .join("path")
        .attr("class", "hexbin")
        .attr("d", hexbin.hexagon())
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .attr("fill", d => color(d.length));
  }

  // initial rendering

  var defaultFunction = d3.select("#control-mcmc-fn")
    .select("input:checked").property("value");

  change(defaultFunction);

  // controls

  d3.select("#control-mcmc-fn").selectAll("input")
    .on("change", function() { change(this.value); });

  svg.on("click", function(event) {
    sampling.reject();

    var pointer = projection.invert(d3.pointer(event, this));
    xc = x2grid.invert(pointer[0]);
    yc = y2grid.invert(pointer[1]);

    start();
  });

};

export function destroy() {
  if (typeof sampling !== "undefined") sampling.reject();
}
