const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-scale"),
  require("d3-array"),
  require("d3-shape"),
  require("d3-transition"),
  require("d3-ease"),
  require("d3-timer"),
  require("d3-format"));

import React from "react";
import { Form, Row, Col } from "react-bootstrap";

import "./styles.css";

export const id = "clt";
export const name = "The Central Limit Theorem";
export const readme = "Let \\(x_1 \\dots x_n\\) be a set of independent, identically distributed random variables following a distribution \\(f\\) with mean \\(\\mu\\) and finite variance \\(\\sigma^2\\). In the limit of large \\(n\\), the arithmetic mean \\[\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n}x_i\\] follows a normal distribution with mean \\(\\mu\\) and variance \\(\\frac{\\sigma^2}{n}\\). This holds regardless of the specific form of \\(f\\). In this example, \\(f\\) is a uniform distribution (set \\(n = 1\\) to see this) and \\(n = 4\\) by default.";
export const sources = [
  { url: "https://en.wikipedia.org/wiki/Central_limit_theorem", description: ["Central Limit Theorem", "(Wikipedia)"] }
];

var timer;

export function controls() {
  return (
    <Form style={{marginTop: 20}}>
      <Form.Group as={Row}>
        <Form.Label column md={2}>
          Sample Size
        </Form.Label>
        <Col md={3} style={{paddingTop: 5}}>
         <input id="control-clt-number" type="range" min="1" max="16" defaultValue="4" step="1"/>
        </Col>
      </Form.Group>
      <Form.Group as={Row}>
        <Form.Label column md={2}>
          Speed
        </Form.Label>
        <Col md={3} style={{paddingTop: 5}}>        
          <input id="control-clt-speed" type="range" min="0" max="1" defaultValue="0" step="0.01"/>
        </Col>
      </Form.Group>
    </Form>
  );
}

export function create(el, props) {
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

  var speed = d3.scaleLinear()
    .domain([0, 1])
    .range([1000, 100]);

  var dt = speed(+d3.select("#control-clt-speed").property("value")), // time step
      n = +d3.select("#control-clt-number").property("value"); // sample size

  var f = {
    sample: Math.random,
    mu: 1 / 2,
    sigma: 1 / (2 * Math.sqrt(3))
  };

  var pdf = x => Math.sqrt(n) * Math.exp(-n * (x - f.mu) * (x - f.mu) / (2 * f.sigma * f.sigma)) / Math.sqrt(2 * Math.PI) / f.sigma;

  var x = d3.scaleLinear()
    .domain([0, 1])
    .rangeRound([0, width]);

  var y1 = height / 3,
      y2 = height / 2;

  var y = d3.scaleLinear()
    .domain([0, pdf(f.mu)])
    .range([0, height - y2]);

  var histogram = d3.histogram()
    .domain(x.domain())
    .thresholds(x.ticks(20));

  var area = d3.area()
    .x(d => x(d[0]))
    .y0(y2)
    .y1(d => y2 + y(d[1]))
    .curve(d3.curveBasis);

  svg.append("path")
    .attr("class", "line");

  svg.append("g")
    .attr("class", "bars");

  var counts = [];

  var axis = svg.selectAll(".axis")
    .data([{ y: 0, label: "draw" }, { y: y1, label: "average" }, { y: y2, label: "count" }])
    .enter().append("g")
      .attr("class", "axis")
      .attr("transform", d => `translate(0,${d.y})`);

  axis.append("path")
    .attr("d", `M0,0H${width}`)

  axis.append("text")
    .attr("dominant-baseline", "hanging")
    .attr("dy", 5)
    .text(d => d.label);

  function renderBars() {
    if (counts.length < 1)
      return;

    var data = histogram(counts)
      .map(d => { d.y = d.length / counts.length; return d; })
      .filter(d => d.x1 > d.x0);

    var ymax = d3.max(data, d => d.y);
    y.domain([0, ymax / (1 / 20)]);

    var bar = svg.select(".bars").selectAll(".bar").data(data);

    var g = bar.enter().append("g")
      .attr("class", "bar")
      .attr("transform", d => `translate(${x(d.x0)},${y2})`);

    g.append("rect")
      .attr("width", d => (x(d.x1) - x(d.x0)) - 2);

    g.append("text")
      .attr("x", x(1 / 40))
      .attr("dy", 10)
      .attr("dominant-baseline", "hanging")
      .attr("text-anchor", "middle");

    bar = g.merge(bar);

    var t = d3.transition().duration(dt / 4);

    bar.select("rect")
      .transition(t)
      .attr("height", d => y(d.y / (1 / 20)));

    bar.select("text")
      .text(d => d.y > 0 ? d3.format(".0%")(d.y) : "");

    svg.select(".line")
      .datum(d3.range(0, 1.05, 0.05).map(x => [x, pdf(x)]))
      .transition(t)
      .attr("d", area);
  }

  function renderBalls() {
    var data = d3.range(n).map(f.sample);
    var mean = d3.mean(data);

    var ball = svg.append("g").selectAll(".ball").data(data);

    var i = 0;
    ball.enter().append("circle")
      .attr("class", "ball")
      .attr("cx", d => x(d))
      .attr("cy", 0)
      .attr("r", 5)
      .transition().duration(dt).ease(d3.easeBounce)
      .attr("cy", y1 - 5)
      .on("end", function() {
        d3.select(this)
          .transition().duration(dt / 4)
          .attr("cy", (y2 + y1) / 2)
          .transition().duration(dt / 4)
          .attr("cx", x(mean))
          .transition().duration(dt / 4).ease(d3.easeBounce)
          .attr("cy", y2 - 3)
          .attr("r", 3)
          .each(() => ++i)
          .on("end", function() {
            if (!--i) {
              counts.push(mean);
            } else {
              d3.select(this).remove();
            }
          });
      });
  }

  function renderAll() {
    renderBars();
    renderBalls();
  }

  function start() {
    return d3.interval(renderAll, dt);
  }

  timer = start();

  d3.select("#control-clt-number")
    .on("change", function() {
      svg.selectAll(".ball").interrupt().remove();
      svg.selectAll(".bar").interrupt().remove();
      svg.select(".line").interrupt().attr("d", null);
      svg.select(".line").attr("opacity", +this.value > 1 ? 1 : 0);

      counts = [];
      n = +this.value;
    });

  d3.select("#control-clt-speed")
    .on("change", function() {
      timer.stop();
      dt = speed(this.value);
      timer = start();
    });
}

export function destroy() {
  if (typeof timer !== "undefined") timer.stop();
}
