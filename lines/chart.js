const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-scale"),
  require("d3-shape"),
  require("d3-array"),
  require("d3-random"),
  require("d3-format"));

import numeric from "numeric";
import Nest from "../tools/Nest";

import React from "react";
import { Button, ButtonGroup, Form, Row, Col } from "react-bootstrap";

export const id = "lines";
export const name = "Nested Sampling: Model Selection";
export const readme = "The nested sampling algorithm can be used to calculate the Bayesian evidence, which is helpful for model selection. In this example, it is tested whether data of a spectral line favors a model including a broad component \\((K>10)\\), or not.";
export const sources = [
  { url: "https://en.wikipedia.org/wiki/Nested_sampling_algorithm", description: ["Nested Sampling Algorithm", "(Wikipedia)"] },
  { url: "https://en.wikipedia.org/wiki/Bayes_factor", description: ["Bayes Factor", "(Wikipedia)"] },
  { url: "https://doi.org/10.1063/1.1835238", description: "Skilling+ 2014" },
  { url: "https://github.com/kbarbary/nestle", description: ["nestle.py", "(K. Barbary)"] }
];

var sampling;

export function controls() {
  return(
    <Form style={{marginTop: 20}}>
      <Form.Group style={{textAlign: "center"}}>
        <ButtonGroup>
          <Button id="control-lines-sample" variant="warning">New Data</Button>
          <Button id="control-lines-start" variant="success">Start Sampling</Button>
          <Button id="control-lines-abort">Abort Sampling</Button>
        </ButtonGroup>
      </Form.Group>
      <Form.Group as={Row}>
        <Form.Label column md={4}>
          Strength of broad component
        </Form.Label>
        <Col md={4} style={{paddingTop: 5}}>
          <input id="control-lines-strength" type="range" min="0" max="0.5" defaultValue="0.4" step="0.01"/>
        </Col>
      </Form.Group>
      <Form.Group as={Row}>
        <Form.Label column md={4}>
          Width of broad component
        </Form.Label>
        <Col md={4} style={{paddingTop: 5}}>
          <input id="control-lines-width" type="range" min="1" max="3" defaultValue="2.6" step="0.01"/>
        </Col>
      </Form.Group>
    </Form>
  );
}

export function create(el, props) {
  Nest.delay = 0;

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

  var color = { A: "#1f77b4", B: "#d62728" };

  svg.selectAll(".lines")
    .data([{ key: "A" }, { key: "B" }])
    .join("g")
      .attr("class", d => `lines ${d.key}`)
      .style("stroke", d => color[d.key]);

  svg.append("g")
    .attr("class", "points")
  .append("path")
    .attr("class", "truth");

  svg.append("text").selectAll("tspan")
    .data([{ key: "B", label: "Narrow plus broad component" }, { key: "A", label: "Single component" }])
    .join("tspan")
      .attr("class", d => `legend ${d.key}`)
      .text(d => d.label)
      .style("fill", d => color[d.key])
      .attr("x", 0)
      .attr("y", (d, i) => `${3 + 1.5*i}em`);

  svg.append("text")
    .attr("class", "info")
    .attr("alignment-baseline", "hanging")
    .style("font-size", "150%");

  function f(x, dx) {
    return Math.exp(-x * x / (2 * dx * dx));
  }

  var x = d3.scaleLinear()
    .domain([-5, 5])
    .range([0, width]);

  var y = d3.scaleLinear()
    .domain([-0.1, 1.6])
    .range([height, 0]);

  var line = d3.line()
    .x(d => x(d[0]))
    .y(d => y(d[1]));

  function linspace(domain, n) {
    var dx = (domain[1] - domain[0]) / (n - 1);
    return d3.range(n).map(i => domain[0] + i * dx);
  }

  function randspace(domain, n) {
    return d3.range(n).map(() => d3.randomUniform(domain[0], domain[1])()).sort(d3.ascending);
  }

  function interpolate(f) {
    return linspace(x.domain(), 200).map(x => [x, f(x)]);
  }

  var state = {
    nPoints: 30, // number of active points
    _strength: +d3.select("#control-lines-strength").property("value"), // strength of broad component
    _width: +d3.select("#control-lines-width").property("value"), // width of broad component
    nData: 25, // number of data points
    sigma: 0.075, // measurement error
    get strength() {
      return this._strength;
    },
    set strength(x) {
      this._strength = x;
      this.update();
    },
    get width() {
      return this._width;
    },
    set width(x) {
      this._width = x;
      this.update();
    },
    randomize: function() {
      this.x = randspace(x.domain(), this.nData);
      this.yerr = this.x.map(() => d3.randomNormal(0, this.sigma)());
      this.update();
    },
    update: function() {
      this.y = this.x.map((x, i) => f(x, 1) + this.strength * f(x, this.width) + this.yerr[i]);
    },
    get data() {
      return d3.transpose([this.x, this.y]);
    }
  };

  state.randomize(); // set up defaults

  function updatePoints() {
    var points = svg.select(".points").selectAll(".point")
      .data(state.data);

    var g = points.enter().append("g")
      .attr("class", "point");

    g.append("line")
      .style("stroke", "black")
      .style("stroke-width", 2);

    g.append("circle")
      .attr("r", 3)
      .style("fill", "black");

    g.merge(points)
      .attr("transform", d => `translate(${x(d[0])},${y(d[1])})`)
    .select("line")
      .attr("y1", d => y(d[0] + state.sigma) - y(d[0]))
      .attr("y2", d => y(d[0] - state.sigma) - y(d[0]));

    points.exit()
      .remove();

    svg.select(".points").select(".truth")
      .datum(interpolate(x => f(x, 1) + state.strength * f(x, state.width)))
      .attr("d", line)
      .style("fill", "none")
      .style("stroke", "black")
      .style("stroke-width", 2);
  }

  function updateLines(selection, data) {
    var lines = data.map(v => {
      return interpolate(x => {
        if (v.length === 4)
          return v[0] + v[1] * f(x - v[2], v[3]);
        else if (v.length === 6)
          return v[0] + v[1] * f(x - v[2], v[3]) + v[4] * f(x - v[2], v[5]);
      })
    });

    selection.selectAll(".line")
      .data(lines)
      .join("path")
        .attr("class", "line")
        .style("stroke-width", 1)
        .style("stroke-opacity", 0.2)
        .attr("d", line);
  }

  function priorUniform(x, a, b) {
    return a + (b - a) * x;
  }

  function priorTransform(u) {
    var v = numeric.clone(u);

    if (u.length === 4) {
      v[0] = priorUniform(v[0], -0.5, 0.5) // continuum
      v[1] = priorUniform(v[1], 0, 1); // strength
      v[2] = priorUniform(v[2], -1, 1); // mean
      v[3] = priorUniform(v[3], 0.5, 3); // sigma
    } else if (u.length === 6) {
      v[0] = priorUniform(v[0], -0.5, 0.5) // continuum
      v[1] = priorUniform(v[1], 0, 1); // strength
      v[2] = priorUniform(v[2], -1, 1); // mean
      v[3] = priorUniform(v[3], 0.5, 3); // sigma
      v[4] = priorUniform(v[4], 0, 1); // strength (broad component)
      v[5] = priorUniform(v[5], 1, 5); // sigma (broad component)
    }

    return v;
  }

  function logLikelihood(v) {
    if (v.length === 4)
      var dy = state.data.map(d => (d[1] - (v[0] + v[1] * f(d[0] - v[2], v[3]))) / state.sigma);
    else if (v.length === 6)
      var dy = state.data.map(d => (d[1] - (v[0] + v[1] * f(d[0] - v[2], v[3]) + v[4] * f(d[0] - v[2], v[5]))) / state.sigma);

    return -numeric.sum(numeric.pow(dy, 2)) / 2;
  }

  function disableControls() {
    d3.select("#control-lines-sample").attr("disabled", true);
    d3.select("#control-lines-start").attr("disabled", true);
    d3.select("#control-lines-strength").attr("disabled", true);
    d3.select("#control-lines-width").attr("disabled", true);
  }

  function enableControls() {
    d3.select("#control-lines-sample").attr("disabled", null);
    d3.select("#control-lines-start").attr("disabled", null);
    d3.select("#control-lines-strength").attr("disabled", null);
    d3.select("#control-lines-width").attr("disabled", null);
  }

  function clearChart() {
    svg.selectAll(".line").remove();
    d3.select(".info").text("");
    d3.selectAll(".legend").style("opacity", 0).style("font-weight", "normal");
  }

  function updateInfo(resultA, resultB) {
    var K = 10 * (resultB.logZ - resultA.logZ) / Math.log(10);
    var Kerr = 10 * Math.sqrt(resultB.logZerr ** 2 + resultA.logZerr ** 2) / Math.log(10);
    svg.select(".info").text(`K = ${d3.format(".1f")(K)} ± ${d3.format(".1f")(Kerr)} ban`);
    d3.select(".legend.B").style("opacity", 1).style("font-weight", () => K >= 10 ? "bold" : "normal");
    d3.select(".legend.A").style("opacity", 1).style("font-weight", () => K < 10 ? "bold" : "normal");
  }

  sampling = [$.Deferred(), $.Deferred()];

  function start() {
    clearChart();
    disableControls();

    var progress = {};

    sampling[0] = Nest.sample(logLikelihood, priorTransform, 4, state.nPoints)
      .progress(function(result) {
        progress.resultA = result;
        svg.select(".lines.A").call(updateLines, result.activePoints);
        if (progress.resultA && progress.resultB) updateInfo(progress.resultA, progress.resultB);
      });

    sampling[1] = Nest.sample(logLikelihood, priorTransform, 6, state.nPoints)
      .progress(function(result) {
        progress.resultB = result;
        svg.select(".lines.B").call(updateLines, result.activePoints);
        if (progress.resultA && progress.resultB) updateInfo(progress.resultA, progress.resultB);
      });

    $.when.apply($, sampling).done(function(resultA, resultB) {
      enableControls();
      svg.select(".lines.A").call(updateLines, Nest.resampleEqual(resultA.samples, resultA.weights));
      svg.select(".lines.B").call(updateLines, Nest.resampleEqual(resultB.samples, resultB.weights));
      updateInfo(resultA, resultB);
    });
  }

  function abort() {
    sampling[0].reject();
    sampling[1].reject();
    enableControls();
  }

  d3.select("#control-lines-sample")
    .on("click", function() {
      clearChart();
      state.randomize();
      updatePoints();
    });

  d3.select("#control-lines-start")
    .on("click", start);

  d3.select("#control-lines-abort")
    .on("click", abort);

  d3.select("#control-lines-strength")
    .on("change", function() {
      clearChart();
      state.strength = +this.value;
      state.update();
      updatePoints();
    });

  d3.select("#control-lines-width")
    .on("change", function() {
      clearChart();
      state.width = +this.value;
      state.update();
      updatePoints();
    });

  updatePoints();
  start();
}

export function destroy() {
  if (typeof sampling !== "undefined") {
    sampling[0].reject();
    sampling[1].reject();
  }
}
