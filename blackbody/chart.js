const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-scale"),
  require("d3-transition"),
  require("d3-ease"),
  require("d3-shape"),
  require("d3-array"),
  require("d3-axis"));

import React from "react";
import { Form, Row, Col, ToggleButton, ToggleButtonGroup } from "react-bootstrap";

import "./styles.css";

export const id = "blackbody";
export const name = "Black-Body Radiation";
export const readme = "The spectrum of electromagnetic radiation emitted by a black body in thermal equilibrium at a definite temperature is described by Planck's law: \\[B_{\\nu}(T)=\\frac{2h\\nu^3}{c^2}\\frac{1}{\\exp\\left(\\frac{h\\nu}{k_BT}\\right)-1}\\] The 'most perfect black body ever measured in nature' is the cosmic microwave background. Stars and planets are often modeled as a black bodies too.";
export const sources = [
  { url: "https://en.wikipedia.org/wiki/Black_body", description: ["Black Body", "(Wikipedia)"] }
];

export function controls() {
  return (
    <Form style={{marginTop: 20}}>
      <Form.Group as={Row}>
        <Form.Label column md={3}>
          Temperature
        </Form.Label>
        <Col md={6} style={{paddingTop: 5}}>
          <input className="control" id="control-blackbody-T" type="range" min="0.5" max="1" defaultValue="1" step="0.01"/>
        </Col>
      </Form.Group>
      <Form.Group as={Row}>
        <Form.Label column md={3}>
          Scale
        </Form.Label>
        <Col md={6}>
          <ToggleButtonGroup id="control-blackbody-scale" type="radio" name="scale" defaultValue="lin" size="sm">
            <ToggleButton variant="light" value="lin">Linear</ToggleButton>
            <ToggleButton variant="light" value="log">Logarithmic</ToggleButton>
          </ToggleButtonGroup>
        </Col>
      </Form.Group>
    </Form>
  );
}

export function create(el, props) {
  var margin = { top: 10, right: 10, bottom: 60, left: 80 };
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
    .attr("id", "def-blackbody-clipPath")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height);

  svg.append("g")
    .attr("class", "axis x")
    .attr("transform", `translate(0,${height})`)
    .append("text")
      .attr("x", width/2)
      .attr("y", 40)
      .style("text-anchor", "middle")
      .text("Frequency (simplified units)");

  svg.append("g")
    .attr("class", "axis y")
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height/2)
      .attr("y", -50)
      .style("text-anchor", "middle")
      .text("Spectral Radiance (simplified units)");

  var line = d3.line()
    .x(d => xscale(d[0]))
    .y(d => yscale(d[1]))
    .defined(d => !isNaN(d[1]))
    .curve(d3.curveBasis);

  var area = d3.area()
    .x(d => xscale(d[0]))
    .y0(height)
    .y1(d => yscale(d[1]))
    .defined(d => !isNaN(d[1]))
    .curve(d3.curveBasis);

  function defaultTransition(transition) { return transition.duration(1000).ease(d3.easeSin); }

  var canvas = svg.append("g").attr("clip-path", "url(#def-blackbody-clipPath)");
  canvas.append("path").attr("class", "filling"),
  canvas.append("path").attr("class", "peak curve");
  var curves = canvas.append("g");

  // initial parameters

  var h = 1, c = 1, k = 1;
  var T = 1;

  function BB(nu, T) { return 2 * h / (c*c) * Math.pow(nu, 3) / (Math.exp(h * nu / (k * T)) - 1); }
  function B0(nu) { return 0.126574 * h / (c*c) * Math.pow(nu, 3); }

  var Bnu = [
    { id: "jeans", f: function(nu, T) { return 2 * k * T / (c*c) * Math.pow(nu, 2); } },
    { id: "wien", f: function(nu, T) { return 2 * h / (c*c) * Math.pow(nu, 3) * Math.exp(- h * nu / (k * T)); } },
    { id: "planck", f: BB }];

  // update axes

  var range, xscale, yscale;

  function setScale(value) {
    if (value == "lin")
    {
      range = d3.range(0, 10.1, 0.1);

      xscale = d3.scaleLinear()
        .domain(d3.extent(range))
        .range([0, width]);

      yscale = d3.scaleLinear()
        .domain([0, 3])
        .range([height, 0]);
    }
    else if (value == "log") {
      range = d3.range(0.1, 10.1, 0.1);

      xscale = d3.scaleLog()
        .domain(d3.extent(range))
        .range([0, width]);

      yscale = d3.scaleLog()
        .domain([0.1, 3])
        .range([height, 0]);
    }

    svg.select(".axis.x")
      .transition().call(defaultTransition)
        .call(d3.axisBottom().scale(xscale));

    svg.select(".axis.y")
      .transition().call(defaultTransition)
        .call(d3.axisLeft().scale(yscale));
  }

  // update chart

  function render() {
    Bnu.forEach(d => { d.data = range.map(function(nu) { return [nu, d.f(nu, T)]; }); });

    var curve = curves.selectAll(".curve")
      .data(Bnu, d => d.id)
      .join("path")
        .attr("class", d => `curve ${d.id}`)
      .transition().call(defaultTransition)
        .attr("d", d => line(d.data));

    canvas.select(".peak").datum(range.map(nu => [nu, B0(nu)]))
      .transition().call(defaultTransition)
        .attr("d", line);

    canvas.select(".filling").datum(range.map(nu => [nu, BB(nu, T)]))
      .transition().call(defaultTransition)
        .attr("d", area);
  }

  // initial rendering

  setScale(d3.select("#control-blackbody-scale").select("input:checked").property("value"));
  render();

  // controls

  d3.select("#control-blackbody-T")
    .on("change", function() {
      T = +this.value;
      render();
    });

  d3.selectAll("#control-blackbody-scale").selectAll("input")
    .on("change", function() {
      setScale(this.value);
      render();
    });
}

export function destroy() {}
