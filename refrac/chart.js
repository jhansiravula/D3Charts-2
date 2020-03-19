var d3 = Object.assign({},
  require("d3-selection"),
  require("d3-shape"),
  require("d3-drag"),
  require("d3-transition"),
  require("d3-ease"),
  require("d3-interpolate"));

import {clamp} from "../tools/Math";

import React from "react";
import {Form, Row, Col, Button} from "react-bootstrap";

import "./styles.css";

export const id = "chart-refrac";
export const name = "Refraction of Light";
export const readme = "This interactive visualization demonstrates the reflection and refraction of a light beam at the interface of a medium, as described by Snell's law and Fresnel's equations. Depending on the value of the refractive index and the polarization, the incoming beam can be fully reflected or fully refracted.";
export const sources = [{url: "https://en.wikipedia.org/wiki/Refraction", description: "Refraction (Wikipedia)"}];

export function controls() {
  return (
    <Form style={{marginTop: 20}}>
      <Form.Group as={Row}>
        <Col md={3}>
        </Col>
        <Col md={9}>
          <Button className="control" id="control-refrac-total" variant="dark">Total Reflection</Button>{" "}
          <Button className="control" id="control-refrac-zero" variant="dark">No Reflection</Button>
        </Col>
      </Form.Group>
      <Form.Group as={Row}>
        <Form.Label column md={3}>
          Refractive Index
        </Form.Label>
        <Col md={6} style={{paddingTop: 10}}>        
          <input className="control" id="control-refrac-n" type="range" min="0.01" max="3" defaultValue="1.5" step="0.01"/>
        </Col>
      </Form.Group>
      <Form.Group as={Row}>
        <Form.Label column md={3}>
          Polarization
        </Form.Label>
        <Col md={6} style={{paddingTop: 5}}>
          <Form.Check inline label="Perpendicular" className="control control-refrac-pol" type="radio" name="pol" defaultValue="s" defaultChecked/>
          <Form.Check inline label="Parallel" className="control control-refrac-pol" type="radio" name="pol" defaultValue="p"/>
        </Col>
      </Form.Group>
    </Form>
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

  var line = d3.line();

  var state = {
    _n: 1.5, // refractive index
    _a: Math.PI/8, // angle of incidence
    _pol: "s", // polarization (s: perpendicular, p: parallel)
    get n() {
      return this._n;
    },
    set n(x) {
      this._n = x;
      this.update();
    },
    get a() {
      return this._a;
    },
    set a(x) {
      this._a = x;
      this.update();
    },
    get pol() {
      return this._pol;
    },
    set pol(x) {
      this._pol = x;
      this.update();
    },
    get aT() {
      return Math.asin(this.n);
    },
    get aB() {
      return Math.atan(this.n);
    },
    update: function() {
      this.b = Math.asin(Math.sin(this.a)/this.n);

      // Snell's Law
      this.deflection = {
        t: this.a - this.b,
        r: Math.PI + 2*this.a
      };

      // Fresnel's Equations
      this.intensity =  {
        s: {
          t: Math.pow((2*Math.cos(this.a))/(Math.cos(this.a) + this.n*Math.cos(this.b)), 2),
          r: Math.pow((Math.cos(this.a)-this.n*Math.cos(this.b))/(Math.cos(this.a) + this.n*Math.cos(this.b)), 2)},
        p: {
          t: Math.pow((2*Math.cos(this.a))/(Math.cos(this.b) + this.n*Math.cos(this.a)), 2),
          r: Math.pow((this.n*Math.cos(this.a)-Math.cos(this.b))/(Math.cos(this.b) + this.n*Math.cos(this.a)), 2)}
      };
    }
  };

  state.update(); // set up defaults

  var radius = width/2,
      origin = [0, height/2],
      pivot = [origin[0] + radius, origin[1]];

  svg.selectAll(".ray")
    .data([[origin], [pivot], [pivot]])
    .enter().append("path")
      .attr("class", (d, i) => `ray ray${i}`);

  svg.append("path")
    .attr("class", "surface");

  svg.append("text")
    .attr("class", "label")
    .attr("y", height)
    .text(`n = ${state.n}`);

  function updateData() {
    // input ray
    svg.select(".ray0").datum([origin, pivot]);

    // transmitted ray
    if (state.n < 1 && Math.abs(state.a) >= state.aT) {
      state.intensity[state.pol].r = 1; // could be Nan
      svg.select(".ray1").datum([pivot]);
    }
    else {
      svg.select(".ray1").datum([pivot, [
        pivot[0] + radius * Math.cos(state.deflection.t),
        pivot[1] + radius * Math.sin(state.deflection.t)]]);
    }

    // reflected ray
    svg.select(".ray2").datum([pivot, [
      pivot[0] + radius * Math.cos(state.deflection.r),
      pivot[1] + radius * Math.sin(state.deflection.r)]]);
  }

  function updateChart() {
    svg.select(".surface")
      .attr("d", line([
        [radius * Math.sin(state.a) + pivot[0], -radius * Math.cos(state.a) + pivot[1]],
        [-radius * Math.sin(state.a) + pivot[0], radius * Math.cos(state.a) + pivot[1]]]));

    // input ray
    svg.select(".ray0")
      .attr("d", line)
      .attr("opacity", 1);

    // transmitted ray
    svg.select(".ray1")
      .attr("d", line)
      .attr("opacity", state.intensity[state.pol].t);

    // reflected ray
    svg.select(".ray2")
      .attr("d", line)
      .attr("opacity", state.intensity[state.pol].r);

    d3.select("#control-refrac-total")
      .attr("disabled", state.n >= 1 ? "" : null);

    d3.select("#control-refrac-zero")
      .attr("disabled", state.pol == "s" ? "" : null);
  }

  function updateAll() {
    updateData();
    updateChart();
  }

  d3.select("#control-refrac-total")
    .on("click", function() {
      svg.transition()
        .duration(dt/8)
        .tween("rotate", rotateTween(state.aT));
    });

  d3.select("#control-refrac-zero")
    .on("click", function() {
      svg.transition()
        .duration(dt/8)
        .tween("rotate", rotateTween(state.aB));
    });

  d3.select("#control-refrac-n")
    .on("input", function() {
      state.n = +this.value;
      svg.select(".label")
        .text(`n = ${state.n}`);
      updateAll();
    });

  d3.selectAll(".control-refrac-pol")
    .select("input")
    .on("change", function() {
      if (this.value == "s") state.pol = "s";
      if (this.value == "p") state.pol = "p";
      updateAll();
    });

  // initial animation
  var dt = 3000;

  svg.select(".ray0")
    .transition().duration(dt/4).ease(d3.easeLinear)
      .attrTween("d", pathTween(line, radius))
      .on("start", function() {
        updateChart();
        updateData();
        d3.selectAll(".control")
          .attr("disabled", true);
      })
      .on("end", function() {
        var t = d3.transition().duration(dt/4).ease(d3.easeLinear);
        svg.select(".ray1")
          .transition(t)
          .attrTween("d", pathTween(line, radius));
        svg.select(".ray2")
          .transition(t)
          .attrTween("d", pathTween(line, radius));
      });

  svg.transition()
    .delay(dt/2)
    .duration(dt/2)
    .tween("rotate", rotateTween(Math.PI/4))
    .on("end", function() {
      d3.selectAll(".control")
        .attr("disabled", null);
      updateChart();

      svg.select(".surface")
        .call(d3.drag().on("drag", function() {
          var mouse = d3.mouse(this);
          state.a = clamp(Math.atan(-(mouse[0]-pivot[0])/(mouse[1]-pivot[1])), -0.9*Math.PI/2, 0.9*Math.PI/2);
          updateAll();
        }));
    });

  function pathTween(line, precision) {
    return function() {
      var path0 = this,
          path1 = path0.cloneNode(),
          d1 = line(d3.select(this).datum()),
          n0 = path0.getTotalLength(),
          n1 = (path1.setAttribute("d", d1), path1).getTotalLength();

      var distances = [0], i = 0, dt = precision/Math.max(n0, n1);
      while ((i += dt) < 1) distances.push(i);
      distances.push(1);

      var points = distances.map(t => {
        var p0 = path0.getPointAtLength(t * n0),
            p1 = path1.getPointAtLength(t * n1);
        return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
      });

      return t => t < 1 ? `M${points.map(p => p(t)).join("L")}` : d1
    };
  }

  function rotateTween(a) {
    return function() {
      var interpolate = d3.interpolateNumber(state.a, a);
      return function(t) {
        state.a = interpolate(t);
        updateAll();
      };
    }
  }
}

export function destroy() {}
