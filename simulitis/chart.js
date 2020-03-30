const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-shape"),
  require("d3-scale"),
  require("d3-random"),
  require("d3-array"),
  require("d3-axis"),
  require("d3-timer"));

import {Vec} from "../tools/Vector";

import React from "react";
import {Form, Container, Row, Col, Button} from "react-bootstrap";

import "./styles.css";

export const id = "chart-simulitis";
export const name = "Simulitis";
export const readme = "This simulation tracks the spread of a fictional desease by contact in a population of blue circles, a fraction of which are stationary, and the rest of which are moving. The red-color desease will spread quickly as soon as the three inially infected circles start to bump into others, thus transmitting the infection. Any infected circle that turns sick after the 'incubation time' is, by default, immediately isolated (excluded from the simulation) until it recovers its blue color after the 'recovery time', or dies. Note that a recovered circle can not be infected again, and that each simulation will yield a somewhat different result because the initial configuration of the circles is random.";
export const sources = [
  {url: "https://www.washingtonpost.com/graphics/2020/world/corona-simulator/", description: ["Corona Simulator", "(Washington Post)"]}];

var simulationTimer, plotTimer;

export function controls() {
  return (
    <Container>
      <Row>
        <Col md={6}>
          <Form>
            <Form.Group>
              <Button id="control-simulitis-restart" variant="success">Restart Simulation</Button>
            </Form.Group>
          </Form>
        </Col>
        <Col md={6}>
          <Form>
            <Form.Group as={Row}>
              <Form.Label column xs={6}>
                Isolation
              </Form.Label>
              <Col xs={6} style={{paddingTop: 5}}>        
                <input id="control-simulitis-enableIsolation" type="checkbox" defaultChecked/>
              </Col>
            </Form.Group>
          </Form>
        </Col>
      </Row>
      <Row>
        <Col md={6}>
          <Form>
            <Form.Group as={Row}>
              <Form.Label column xs={6}>
                Incubation Time
              </Form.Label>
              <Col xs={6} style={{paddingTop: 10}}>
                <input id="control-simulitis-incubationTime" type="range" min="1000" max="9000" defaultValue="3000" step="100"/>
              </Col>
            </Form.Group>
            <Form.Group as={Row}>
              <Form.Label column xs={6}>
                Recovery Time
              </Form.Label>
              <Col xs={6} style={{paddingTop: 10}}>        
                <input id="control-simulitis-recoveryTime" type="range" min="1000" max="9000" defaultValue="3000" step="100"/>
              </Col>
            </Form.Group>
          </Form>
        </Col>
        <Col md={6}>
          <Form>
            <Form.Group as={Row}>
              <Form.Label column xs={6}>
                Movement
              </Form.Label>
              <Col xs={6} style={{paddingTop: 10}}>
                <input id="control-simulitis-movementRate" type="range" min="0.1" max="1" defaultValue="0.9" step="0.05"/>
              </Col>
            </Form.Group>
            <Form.Group as={Row}>
              <Form.Label column xs={6}>
                Fatality Rate
              </Form.Label>
              <Col xs={6} style={{paddingTop: 10}}>        
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
  var margin = {top: 20, right: 30, bottom: 20, left: 10};
  var width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var size = 0.96 * d3.min([width/2, height]);
    
  var svg = d3.select(el)
    .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

  // simulation parameters
  var n = 100,
      initialSpeed = 2,
      radius = 5,
      incubationTime = 3000,
      recoveryTime = 3000,
      fatalityRate = 0.01,
      enableIsolation = true,
      movementRate = 0.9,
      data = [];

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
    .attr("transform", `translate(${size},0)`);

  plotArea.append("path")
    .attr("class", "infected");

  plotArea.append("path")
    .attr("class", "sick");

  plotArea.append("path")
    .attr("class", "healthy");

  var xScale = d3.scaleLinear().range([0, size]),
      yScale = d3.scaleLinear().range([size, 0.4 * size]);

  var line = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y))
    .curve(d3.curveLinear);

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

  function handleBoundaries(d) {
    var bounds = [radius, size - radius];
    if (d.pos.x < bounds[0])
    {
      d.pos.x = bounds[0];
      d.vel.x *= -1;
    }
    if (d.pos.x > bounds[1])
    {
      d.pos.x = bounds[1];
      d.vel.x *= -1;
    }
    if (d.pos.y < bounds[0])
    {
      d.pos.y = bounds[0];
      d.vel.y *= -1;
    }
    if (d.pos.y > bounds[1])
    {
      d.pos.y = bounds[1];
      d.vel.y *= -1;
    }
  }

  function handleInteraction(d1, d2, t) {
    if (d1 === d2 || d1.hasInteracted || d2.hasInteracted)
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
      }
      else if (d1.isInfected && !d2.isInfected) {
        // circle 1 infects circle 2 at this time
        d2.isInfected = true;
        d2.infectionTime = t;
        d1.infectionCount += 1;
      }
      else if (!d1.isInfected && d2.isInfected) {
        // cicle 2 infects circle 1 at this time
        d1.isInfected = true;
        d1.infectionTime = t;
        d2.infectionCount += 1;
      }

      // update velocities
      var eps = 0.0001;
      if (d1.isMoving && d2.isMoving) {
        var dvel1 = d1d2.clone().scale(d1.vel.clone().minus(d2.vel).dot(d1d2)/(separation*separation));
        var dvel2 = d2d1.clone().scale(d2.vel.clone().minus(d1.vel).dot(d2d1)/(separation*separation));
        d1.vel.minus(dvel1);
        d2.vel.minus(dvel2);
        d1.pos = pos.clone().plus(d1d2.clone().scale((1+eps)*radius/separation)); // ensure separation after collision
        d2.pos = pos.clone().minus(d1d2.clone().scale((1+eps)*radius/separation));
      }
      else if (d1.isMoving && !d2.isMoving) {
        d1.vel.minus(d1d2.clone().scale(d1.vel.clone().minus(d2.vel).dot(d1d2)/(separation*separation)).scale(2));
        d1.pos.plus(d1d2.clone().scale((1+eps)*radius/separation));
      }
      else if (!d1.isMoving && d2.isMoving) {
        d2.vel.minus(d2d1.clone().scale(d2.vel.clone().minus(d1.vel).dot(d2d1)/(separation*separation)).scale(2));
        d2.pos.plus(d2d1.clone().scale((1+eps)*radius/separation));
      }

      d1.hasInteracted = true;
      d2.hasInteracted = true;
    }
  }

  function propagate(d, t) {
    d.hasInteracted = false; // reset interaction check

    if (d.isDead)
      return;

    if (d.isSick && (t - d.infectionTime > incubationTime + recoveryTime)) {
      // this circle either recovers or dies at this time
      d.isSick = false;
      d.isInfected = false;
      if (randomProb() < fatalityRate) {
        d.isDead = true;
        return;
      }
      else {
        d.isRecovered = true;
      }
    }
    else if (d.isInfected && (t - d.infectionTime > incubationTime)) {
      // this circle becomes sick at this time
      d.isSick = true;
    }

    if (enableIsolation && d.isSick)
      return;

    if (d.isMoving)
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

    // generate a new circle population
    data = d3.range(n).map((i) => ({
      pos: generatePosVec(),
      isMoving: randomProb() < movementRate,
      isInfected: i < 3, // start with a few infected circles
      infectionTime: 0,
      infectionCount: 0,
      isSick: false,
      isRecovered: false,
      isDead: false,
      hasInteracted: false
    }));

    data.forEach(d => {
      // initially infected circles shall move
      if (d.isInfected)
        d.isMoving = true;

      // generate velocities
      if (d.isMoving)
        d.vel =  generateVelVec();
      else
        d.vel = new Vec(0, 0);
    });

    simulationTimer = d3.interval(updateSimulation, 20);
    plotTimer = d3.interval(updatePlot, 40);
  }

  function updateSimulation(t) {
    data.forEach(handleBoundaries);
    data.forEach(d1 => data.forEach(d2 => handleInteraction(d1, d2, t)));
    data.forEach(d => propagate(d, t));

    var circles = simulationArea.selectAll("circle").data(data);

    circles.enter().append("circle")
      .attr("r", radius)
    .merge(circles)
      .attr("cx", d => d.pos.x)
      .attr("cy", d => d.pos.y)
      .attr("class", d => classify(d));

    circles.exit()
      .remove();

    var totalInfected = d3.sum(data, d => d.isInfected);

    // stop when no infected circles are left
    if (totalInfected == 0)
    {
      simulationTimer.stop();
      plotTimer.stop();

      var R0 = d3.mean(data.filter(d => d.infectionCount > 0), d => d.infectionCount);
      console.log("R0 =", R0);
    }
  }

  function updatePlot(t)
  {
    xScale = xScale.domain([0, t]);

    var totalInfected = d3.sum(data, d => d.isInfected),
        totalSick = d3.sum(data, d => d.isSick),
        totalDead = d3.sum(data, d => d.isDead);

    plotArea.select("path.healthy").datum()
      .push({x: t, y: n - totalInfected - totalDead});

    plotArea.select("path.infected").datum()
      .push({x: t, y: totalInfected});

    plotArea.select("path.sick").datum()
      .push({x: t, y: totalSick});

    plotArea.select("path.healthy")
      .attr("d", line);

    plotArea.select("path.infected")
      .attr("d", line);

    plotArea.select("path.sick")
      .attr("d", line);
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

  d3.select("#control-simulitis-enableIsolation")
    .on("change", function() { enableIsolation = this.checked; restart(); });

  restart();       
}

export function destroy() {
  if (typeof simulationTimer !== "undefined") simulationTimer.stop();
  if (typeof plotTimer !== "undefined") plotTimer.stop();
}
