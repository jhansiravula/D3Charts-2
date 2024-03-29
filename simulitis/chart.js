const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-shape"),
  require("d3-scale"),
  require("d3-random"),
  require("d3-array"),
  require("d3-axis"),
  require("d3-timer"),
  require("d3-quadtree"));

import { curveMovingAverage } from "../tools/CurveFactories";
import { Vec } from "../tools/Vector";

import React from "react";
import { Form, Container, Row, Col, Button } from "react-bootstrap";

import "./styles.css";

export const id = "simulitis";
export const name = "Simulitis";
export const readme = "This simulation tracks the spread of a fictitious desease by contact in a population of moving blue circles. The red-color desease will spread quickly as soon as the three inially infected circles start to bump into others, thus transmitting the infection. An infected circle that turns sick after the 'incubation time' has the change to recover its blue color after the 'recovery time', or dies. Note that a recovered circle can not be infected again, and that each simulation will yield a somewhat different result because the initial configuration of the circles is random.";
export const sources = [
  { url: "https://www.washingtonpost.com/graphics/2020/world/corona-simulator/", description: ["Corona Simulator", "(Washington Post)"] },
  { url: "https://bl.ocks.org/mbostock/3231298", description: "block #3231298" }
];

var simulationTimer, plotTimer;

export function controls() {
  return (
    <Container style={{marginTop: 20}}>
      <Row>
        <Col md={12}>
          <Form>
            <Form.Group>
              <Button id="control-simulitis-restart" variant="success">Restart Simulation</Button>
            </Form.Group>
          </Form>
        </Col>
      </Row>
      <Row>
        <Col md={6}>
          <Form>
            <Form.Group as={Row}>
              <Form.Label column xs={4}>
                Incubation Time
              </Form.Label>
              <Col xs={6} style={{paddingTop: 5}}>
                <input id="control-simulitis-incubationTime" type="range" min="1000" max="9000" defaultValue="3000" step="100"/>
              </Col>
            </Form.Group>
            <Form.Group as={Row}>
              <Form.Label column xs={4}>
                Recovery Time
              </Form.Label>
              <Col xs={6} style={{paddingTop: 5}}>
                <input id="control-simulitis-recoveryTime" type="range" min="1000" max="9000" defaultValue="3000" step="100"/>
              </Col>
            </Form.Group>
          </Form>
        </Col>
        <Col md={6}>
          <Form>
            <Form.Group as={Row}>
              <Form.Label column xs={4}>
                Movement
              </Form.Label>
              <Col xs={6} style={{paddingTop: 5}}>
                <input id="control-simulitis-movementRate" type="range" min="0.1" max="1" defaultValue="0.9" step="0.05"/>
              </Col>
            </Form.Group>
            <Form.Group as={Row}>
              <Form.Label column xs={4}>
                Fatality Rate
              </Form.Label>
              <Col xs={6} style={{paddingTop: 5}}>
                <input id="control-simulitis-fatalityRate" type="range" min="0" max="1" defaultValue="0.01" step="0.01"/>
              </Col>
            </Form.Group>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}

export function create(el, props) {
  var margin = { top: 20, right: 30, bottom: 10, left: 10 };
  var width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var size = 0.96 * d3.min([width / 2, height]);

  // simulation parameters
  var n = 100,
      initialSpeed = 2,
      radius = 5,
      incubationTime = +d3.select("#control-simulitis-incubationTime").property("value"),
      recoveryTime = +d3.select("#control-simulitis-recoveryTime").property("value"),
      fatalityRate = +d3.select("#control-simulitis-fatalityRate").property("value"),
      movementRate = +d3.select("#control-simulitis-movementRate").property("value"),
      enableIsolation = false;

  var data = [];

  var xScale = d3.scaleLinear().range([0, size]),
      yScale = d3.scaleLinear().range([size, 0.4 * size]);

  var line = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y))
    .curve(d3.curveLinear);

  var smoothWindow = 20;
  var rawLine = d => d.length > smoothWindow ? line(d.slice(smoothWindow/2)) : null;

  var smoothLine = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y))
    .curve(curveMovingAverage.N(smoothWindow));

  var svg = d3.select(el).append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  var simulationArea = svg.append("g");

  simulationArea.append("rect")
    .attr("width", size)
    .attr("height", size)
    .style("fill", "none")
    .style("stroke", "black");

  var plotArea = svg.append("g")
    .attr("transform", `translate(${width - size},0)`);

  plotArea.append("g")
    .attr("class", "axis axis-y")
    .attr("transform", `translate(${size},0)`)
  .append("text")
    .attr("transform", `translate(0,${yScale.range()[1]})`)
    .attr("alignment-baseline", "baseline")
    .attr("dy", -10)
    .text("N");

  plotArea.append("path")
    .attr("class", "sick raw");

  plotArea.append("path")
    .attr("class", "sick smooth");

  plotArea.append("path")
    .attr("class", "healthy raw");

  plotArea.append("path")
    .attr("class", "healthy smooth");

  var randomProb = d3.randomUniform(0, 1),
      randomCoord = d3.randomUniform(0, size),
      randomAngle = d3.randomUniform(0, 2 * Math.PI);

  function generatePosVec() {
    return new Vec(randomCoord(), randomCoord());
  }

  function generateVelVec() {
    var angle = randomAngle();
    return new Vec(initialSpeed * Math.cos(angle), initialSpeed * Math.sin(angle));
  }

  function generateCircle(isInfected) {
    var d = {};

    d.isInfected = isInfected;

    // generate circle position and velocity
    d.pos = generatePosVec();
    d.vel = generateVelVec().scale(movementRate);

    d.infectionTime = 0;
    d.infectionCount = 0;
    d.isSick = false;
    d.isRecovered = false;
    d.isDead = false;

    return d;
  }

  function handleBoundaries(d) {
    var bounds = [radius, size - radius];
    if (d.pos.x < bounds[0]) {
      d.pos.x = bounds[0];
      d.vel.x *= -1;
    }
    if (d.pos.x > bounds[1]) {
      d.pos.x = bounds[1];
      d.vel.x *= -1;
    }
    if (d.pos.y < bounds[0]) {
      d.pos.y = bounds[0];
      d.vel.y *= -1;
    }
    if (d.pos.y > bounds[1]) {
      d.pos.y = bounds[1];
      d.vel.y *= -1;
    }
  }

  function handleInteraction(d1, t) {
    var bbox = {
      x0: d1.pos.x - radius,
      x1: d1.pos.x + radius,
      y0: d1.pos.y - radius,
      y2: d1.pos.y + radius
    };

    return function(node, x0, y0, x1, y1) {
      if (node.data) {
        // this is leaf node
        var d2 = node.data;

        if (d1 === d2)
          return;

        if (d1.isDead || d2.isDead)
          return; // exclude dead circles from interactions

        if (enableIsolation && (d1.isSick || d2.isSick))
          return;

        var pos = d1.pos.clone().plus(d2.pos).scale(0.5), // midpoint
            d1d2 = d1.pos.clone().minus(d2.pos),
            d2d1 = d1d2.clone().scale(-1),
            separation = d1d2.length();

        if (separation < 2 * radius) {
          if ((d1.isSick && d2.isSick) || d1.isRecovered || d2.isRecovered) {
            // sick or recovered circles can not be infected again
          } else if (d1.isInfected && !d2.isInfected) {
            // circle 1 infects circle 2 at this time
            d2.isInfected = true;
            d2.infectionTime = t;
            d1.infectionCount += 1;
          } else if (!d1.isInfected && d2.isInfected) {
            // cicle 2 infects circle 1 at this time
            d1.isInfected = true;
            d1.infectionTime = t;
            d2.infectionCount += 1;
          }

          // update velocities
          var dvel1 = d1d2.clone().scale(d1.vel.clone().minus(d2.vel).dot(d1d2) / (4 * radius * radius));
          var dvel2 = d2d1.clone().scale(d2.vel.clone().minus(d1.vel).dot(d2d1) / (4 * radius * radius));
          d1.vel.minus(dvel1);
          d2.vel.minus(dvel2);
          var eps = 0.0001; // ensure separation after collision
          d1.pos = pos.clone().plus(d1d2.clone().scale((1 + eps) * radius / separation));
          d2.pos = pos.clone().minus(d1d2.clone().scale((1 + eps) * radius / separation));
        }
      }

      return x0 > bbox.x1 || x1 < bbox.x0 || y0 > bbox.y1 || y1 < bbox.y0;
    };
  }

  function propagate(d, t) {
    if (d.isDead)
      return;

    if (d.isSick && (t - d.infectionTime > incubationTime + recoveryTime)) {
      // this circle either recovers or dies at this time
      d.isSick = false;
      d.isInfected = false;
      if (randomProb() < fatalityRate) {
        d.isDead = true;
        return;
      } else {
        d.isRecovered = true;
      }
    } else if (d.isInfected && (t - d.infectionTime > incubationTime)) {
      // this circle becomes sick at this time
      d.isSick = true;
    }

    if (enableIsolation && d.isSick)
      return;

    d.pos.plus(d.vel);
  }

  function restart() {
    if (typeof simulationTimer !== "undefined") simulationTimer.stop();
    if (typeof plotTimer !== "undefined") plotTimer.stop();

    simulationArea.selectAll("circle").remove();
    plotArea.selectAll("path").datum(d => []);

    // update and redraw plot axis (allows n to be variable)
    yScale = yScale.domain([0, n]);
    plotArea.select(".axis-y").transition().call(d3.axisRight(yScale));

    // generate a new circle population (starting with a few infected circles)
    data = d3.range(n).map(i => generateCircle(i < 3));

    simulationTimer = d3.interval(updateSimulation, 20);
    plotTimer = d3.interval(updatePlot, 40);
  }

  function updateSimulation(t) {
    data.forEach(handleBoundaries);

    var tree = d3.quadtree()
      .x(d => d.pos.x)
      .y(d => d.pos.y)
      .addAll(data);

    data.forEach(d1 => tree.visit(handleInteraction(d1, t)));

    data.forEach(d => propagate(d, t));

    simulationArea.selectAll("circle")
      .data(data)
      .join("circle")
        .attr("r", radius)
        .attr("cx", d => d.pos.x)
        .attr("cy", d => d.pos.y)
        .attr("class", d => classify(d));

    var totalInfected = d3.sum(data, d => d.isInfected);

    // stop when no infected circles are left
    if (totalInfected == 0) {
      simulationTimer.stop();
      plotTimer.stop();

      var R0 = d3.mean(data.filter(d => d.infectionCount > 0), d => d.infectionCount);
      console.log("R0 =", R0);
    }
  }

  function updatePlot(t) {
    xScale = xScale.domain([0, t]);

    var totalInfected = d3.sum(data, d => d.isInfected),
        totalSick = d3.sum(data, d => d.isSick),
        totalDead = d3.sum(data, d => d.isDead);

    plotArea.selectAll("path.healthy")
      .datum(d => { d.push({ x: t, y: n - totalInfected - totalDead }); return d; });

    plotArea.selectAll("path.sick")
      .datum(d => { d.push({ x: t, y: totalSick }); return d; });

    plotArea.select("path.healthy.raw")
      .attr("d", rawLine);

    plotArea.select("path.healthy.smooth")
      .attr("d", smoothLine);

    plotArea.select("path.sick.raw")
      .attr("d", rawLine);

    plotArea.select("path.sick.smooth")
      .attr("d", smoothLine);
  }

  function classify(d) {
    if (d.isDead)
      return "dead";
    else if (d.isSick)
      return enableIsolation ? "isolated" : "sick";
    else if (d.isInfected)
      return "infected";
    else if (d.isRecovered)
      return "recovered";
    return "healthy";
  }

  d3.select("#control-simulitis-restart")
    .on("click", restart);

  d3.select("#control-simulitis-incubationTime")
    .on("change", function() { incubationTime = +this.value; restart(); });

  d3.select("#control-simulitis-recoveryTime")
    .on("change", function() { recoveryTime = +this.value; restart(); });

  d3.select("#control-simulitis-movementRate")
    .on("change", function() { movementRate = +this.value; restart(); });

  d3.select("#control-simulitis-fatalityRate")
    .on("change", function() { fatalityRate = +this.value; restart(); });

  restart();
}

export function destroy() {
  if (typeof simulationTimer !== "undefined") simulationTimer.stop();
  if (typeof plotTimer !== "undefined") plotTimer.stop();
}
