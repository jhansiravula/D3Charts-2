const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-shape"),
  require("d3-scale"),
  require("d3-random"),
  require("d3-array"),
  require("d3-timer"),
  require("d3-scale-chromatic"));

import { Vec } from "../tools/Vector";

import React from "react";
import { Form, Row, Col } from "react-bootstrap";

export const id = "boids";
export const name = "Boids";
export const readme = "The Boids model can be used to simulate the flocking behavior of birds.";
export const sources = [
  { url: "https://en.wikipedia.org/wiki/Boids", description: ["Boids", "(Wikipedia)"] }
];

var timer;

export function controls() {
  return (
    <Form style={{marginTop: 20}}>
      <Form.Group as={Row}>
        <Form.Label column md={2}>
          Cohesion Force
        </Form.Label>
        <Col md={2} style={{paddingTop: 5}}>     
          <input id="control-boids-cohesion" type="range" min="0" max="0.1" defaultValue="0.05" step="0.01"/>
        </Col>
      </Form.Group>
      <Form.Group as={Row}>
        <Form.Label column md={2}>
          Alignment Force
        </Form.Label>
        <Col md={2} style={{paddingTop: 5}}>   
          <input id="control-boids-alignment" type="range" min="0" max="0.1" defaultValue="0.05" step="0.01"/>
        </Col>
      </Form.Group>
      <Form.Group as={Row}>
        <Form.Label column md={2}>
          Separation Force
        </Form.Label>
        <Col md={2} style={{paddingTop: 5}}>    
          <input id="control-boids-separation" type="range" min="0" max="0.1" defaultValue="0.05" step="0.01"/>
        </Col>
      </Form.Group>            
    </Form>
  );
}

export function create(el, props) {
  var width = 960,
      height = 500;

  var svg = d3.select(el).append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  var n = 500;

  var cohesionCoeff = +d3.select("#control-boids-cohesion").property("value"),
      alignmentCoeff = +d3.select("#control-boids-alignment").property("value"),
      separationCoeff = +d3.select("#control-boids-separation").property("value"),
      separationDistance = 30,
      neighborDistance = 60,
      maxVelocity = 2,
      maxAcceleration = 0.02;

  var line = d3.line(),
      color = d3.scaleSequential(d3.interpolateYlGnBu).domain([0, maxVelocity]);

  var randomX = d3.randomUniform(0, width),
      randomY = d3.randomUniform(0, height),
      randomVx = d3.randomUniform(0, maxVelocity),
      randomVy = d3.randomNormal(0, maxVelocity / 4);

  var boids = d3.range(n).map(() => ({
    pos: new Vec(randomX(), randomY()),
    vel: new Vec(randomVx(), randomVy()),
    acc: new Vec()
  }));

  function tick(t) {
    boids = boids.filter(b =>
      (b.pos.x > 0) & (b.pos.x < width) &
      (b.pos.y > 0) & (b.pos.y < height));

    boids.push({
      pos: new Vec(0, randomY()),
      vel: new Vec(randomVx(), randomVy()),
      acc: new Vec()
    });

    boids.forEach(b1 => {
      var cohesionForce = new Vec(),
          alignmentForce = new Vec(),
          separationForce = new Vec();

      boids.forEach(b2 => {
        if (b1 === b2) return;

        var separation = b2.pos.clone().minus(b1.pos),
          distance = separation.length();

        if (distance < separationDistance) {
          separationForce.minus(separation);
        } else if (distance < neighborDistance) {
          cohesionForce.plus(separation);
          alignmentForce.plus(b2.vel.clone().minus(b1.vel));
        }
      });

      cohesionForce.normalize(cohesionCoeff);
      alignmentForce.normalize(alignmentCoeff);
      separationForce.normalize(separationCoeff);

      b1.acc = new Vec();
      b1.acc.plus(cohesionForce).plus(alignmentForce).plus(separationForce).truncate(maxAcceleration);
      b1.vel.plus(b1.acc).truncate(maxVelocity);
      b1.pos.plus(b1.vel);
    });

    svg.selectAll(".boid")
      .data(boids)
      .join("path")
        .attr("class", "boid")
        .style("stroke", color(0))
        .style("stroke-width", 2)
        .style("stroke", b => color(b.vel.length()))
        .attr("d", b => {
          var v = b.vel.clone().normalize(20);
          return line([
            [b.pos.x - v.x / 2, b.pos.y - v.y / 2],
            [b.pos.x + v.x / 2, b.pos.y + v.y / 2]
          ]);
        });
  }

  timer = d3.interval(tick, 20);

  d3.select("#control-boids-cohesion")
    .on("change", function() { cohesionCoeff = +this.value; });

  d3.select("#control-boids-alignment")
    .on("change", function() { alignmentCoeff = +this.value; });

  d3.select("#control-boids-separation")
    .on("change", function() { separationCoeff = +this.value; });
}

export function destroy() {
  if (typeof timer !== "undefined") timer.stop();
}
