var d3 = Object.assign({},
  require("d3-selection"),
  require("d3-scale"),
  require("d3-array"),
  require("d3-shape"),
  require("d3-timer"),
  require("d3-ease"));

import React from "react";
import {Form, Row, Col} from "react-bootstrap";

export const id = "chart-pulse";
export const name = "Wave Packets";
export const readme = "This pulse is described by the following equation: \\[E(x,t)=\\frac{E_0}{\\sqrt{\\pi}\\tau}e^{-\\frac{(t-k'x)^2}{2\\tau^2}}e^{i\\omega_0t-ik_0x}\\] The phase propagates at velocity \\(v_{ph}=\\frac{\\omega_0}{k_0}\\) and the envelope at \\(v_{gr}=\\frac{1}{k'}\\).";
export const sources = [{url: "https://en.wikipedia.org/wiki/Group_velocity", description: "Group Velocity (Wikipedia)"}];

var timer;

export function controls() {
  return (
    <Row>
      <Col md={6}>
        <Form>
          <Form.Group as={Row}>
            <Form.Label column xs={6}>
              Pulse Width \((\tau)\)
            </Form.Label>
            <Form.Label column xs={6}>
              <input id="control-pulse-tau" type="range" min="1" max="5" defaultValue="1" step="1"/>
            </Form.Label>
          </Form.Group>
          <Form.Group as={Row}>
            <Form.Label column xs={6}>
              Frequency \((\omega_0)\)
            </Form.Label>
            <Form.Label column xs={6}>        
              <input id="control-pulse-w0" type="range" min="1" max="5" defaultValue="1" step="1"/>
            </Form.Label>
          </Form.Group>
        </Form>
      </Col>
      <Col md={6}>
        <Form>
          <Form.Group as={Row}>
            <Form.Label column xs={6}>
              1. Wavenumber \((k_0)\)
            </Form.Label>
            <Form.Label column xs={6}>
              <input id="control-pulse-k0" type="range" min="1" max="5" defaultValue="5" step="1"/>
            </Form.Label>
          </Form.Group>
          <Form.Group as={Row}>
            <Form.Label column xs={6}>
              2. Wavenumber \((k′)\)
            </Form.Label>
            <Form.Label column xs={6}>        
              <input id="control-pulse-k1" type="range" min="1" max="5" defaultValue="1" step="1"/>
            </Form.Label>
          </Form.Group>
        </Form>
      </Col>
    </Row>
  );
}

export function create(el, props) {
  var margin = {top: 20, right: 10, bottom: 20, left: 10};
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

  var envelope = svg.append("path")
    .attr("class", "envelope")
    .attr("opacity", 0.2)
    .style("fill", "#1f77b4");

  var signal = svg.append("path")
    .attr("class", "signal")
    .style("fill", "none")
    .style("stroke", "#d62728")
    .style("stroke-width", 3);

  var range = d3.range(-10, 10.1, 0.05);

  var x = d3.scaleLinear().domain(d3.extent(range)).range([0, width]),
      y = d3.scaleLinear().domain([-1, 1]).range([height, 0]);

  var re = d3.line()
    .x(d => x(d.x))
    .y(d => y(d.re))
    .curve(d3.curveBasis);

  var abs = d3.area()
    .x(d => x(d.x))
    .y0(d => y(-d.abs))
    .y1(d => y(d.abs))
    .curve(d3.curveBasis);

  function f(x) {
    var f0 = tau;
    return {r: (f0/Math.sqrt(Math.PI)/tau)*Math.exp(-(t-k1*x)*(t-k1*x)/(2*tau*tau)), phi: (w0*t-k0*x)}
  }

  var t = 0, // animation time
      dt = 0.05; // time step

  var tau = 1, // pulse width
      w0 = 1, // frequency
      k0 = 5, // 1. wavenumber
      k1 = 1; // 2. wavenumber

  d3.select("#control-pulse-tau")
    .on("change", function() {
      tau = +this.value;
    });

  d3.select("#control-pulse-w0")
    .on("change", function() {
      w0 = +this.value;
    });

  d3.select("#control-pulse-k0")
    .on("change", function() {
      k0 = +this.value;
    });

  d3.select("#control-pulse-k1")
    .on("change", function() {
      t *= +this.value/k1;
      k1 = +this.value;
    });

  timer = d3.interval(function() {
      t += dt;

      if (t > k1 * 10 || t < - k1 * 10) dt *= -1; // reverse direction of motion

      var data = range.map(x => {
        var y = f(x);
        return { x: x, re: y.r * Math.cos(y.phi), abs: y.r };
      });

      envelope
        .datum(data)
        .attr("d", abs);

      signal
        .datum(data)
        .attr("d", re);
    }, 20);
}

export function destroy() {
  if (typeof timer !== "undefined") timer.stop();
}
