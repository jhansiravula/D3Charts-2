const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-scale"),
  require("d3-format"));

import numeric from "numeric";
import Nest from "../tools/Nest";

import React from "react";
import { Form, Button, ButtonGroup } from "react-bootstrap";

export const id = "nest";
export const name = "Nested Sampling: Eggbox Example";
export const readme = "The nested sampling algorithm is very efficient in exploring this highly multimodal, twodimensional likelihood function, which is shaped like an eggbox (assuming a uniform prior for \\(x\\) and \\(y\\) over the interval \\([-5\\pi,5\\pi]\\)): \\[\\mathcal{L}(x,y)=\\left[2+\\cos\\left(\\frac{x}{2}\\right)\\cdot\\cos\\left(\\frac{y}{2}\\right)\\right]^5\\] It also calculates the Bayesian evidence accurately, in this case \\(\\log(\\mathcal{Z})\\approx 235.856\\). The (unweighted) samples are shown in blue, while the currently active points are shown in red.";
export const sources = [
  { url: "https://en.wikipedia.org/wiki/Nested_sampling_algorithm", description: ["Nested Sampling Algorithm", "(Wikipedia)"] },
  { url: "https://doi.org/10.1063/1.1835238", description: "Skilling+ 2014" },
  { url: "https://github.com/kbarbary/nestle", description: ["nestle.py", "(K. Barbary)"] }
];

var sampling;

export function controls() {
  return(
    <Form style={{marginTop: 20}}>
      <Form.Group style={{textAlign: "center"}}>
        <ButtonGroup>
          <Button id="control-nest-start" variant="success">Start Sampling</Button>
          <Button id="control-nest-abort">Abort Sampling</Button>
        </ButtonGroup>
      </Form.Group>
    </Form>
  );
}

export function create(el, props) {
  Nest.delay = 50;

  var margin = { top: 20, right: 10, bottom: 20, left: 10 };
  var width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var size = height;

  var svg = d3.select(el).append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)
  .append("g")
    .attr("transform", `translate(${(width - size)/2},0)`);

  svg.append("rect")
    .attr("width", size)
    .attr("height", size)
    .style("fill", "none")
    .style("stroke", "black");

  svg.append("g")
    .attr("class", "samples");

  svg.append("g")
    .attr("class", "points");

  svg.append("text")
    .attr("class", "info")
    .attr("dy", -5);

  var scale = d3.scaleLinear()
    .domain([0, 1])
    .range([0, size]);

  var color = d3.scaleOrdinal()
    .domain(["sample", "point"])
    .range(["#1f77b4", "#d62728"]);

  function render(result) {
    svg.select(".info")
      .text(`log(Z) = ${d3.format(".1f")(result.logZ)}`);

    svg.select(".samples").selectAll(".sample")
      .data(result.samples)
      .join("circle")
        .attr("class", "sample")
        .attr("cx", d => scale(d[0]))
        .attr("cy", d => scale(d[1]))
        .attr("r", 3)
        .style("fill", color("sample"));

    svg.select(".points").selectAll(".point")
      .data(result.activePoints)
      .join("circle")
        .attr("class", "point")
        .attr("cx", d => scale(d[0]))
        .attr("cy", d => scale(d[1]))
        .attr("r", 3)
        .style("fill", color("point"));
  }

  var tmax = 5 * Math.PI;

  function priorTransform(u) {
    var v = numeric.clone(u);
    return v;
  }

  function logLikelihood(v) {
    var t = numeric.sub(numeric.mul(2 * tmax, v), tmax);
    return Math.pow(2 + Math.cos(t[0] / 2) * Math.cos(t[1] / 2), 5);
  }

  sampling = $.Deferred();

  function start() {
    d3.select("#control-nest-start").attr("disabled", true);
    svg.selectAll(".point").remove();
    svg.selectAll(".sample").remove();
    sampling = Nest.sample(logLikelihood, priorTransform, 2, 100)
      .progress((result) => render(result))
      .done(() => d3.select("#control-nest-start").attr("disabled", null));
  }

  function abort() {
    sampling.reject();
    d3.select("#control-nest-start").attr("disabled", null);
  }

  d3.select("#control-nest-start")
    .on("click", start);

  d3.select("#control-nest-abort")
    .on("click", abort);

  start();
}

export function destroy() {
  if (typeof sampling !== "undefined") sampling.reject();
}
