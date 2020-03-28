var d3 = Object.assign({},
  require("d3-selection"),
  require("d3-array"),
  require("d3-scale"),
  require("d3-shape"),
  require("d3-fetch"),
  require("d3-transition"),
  require("d3-ease"));

import numeric from "numeric";

import React from "react";
import {Form, Row, Col} from "react-bootstrap";

import dataSrc from "./data.json";

export const id = "chart-sentence";
export const name = "Sentence Diagrams";
export const readme = "In these diagrams, each line segment represents one sentence in the source text, and the length of each segment is proportional to the number of words in the corresponding sentence.";
export const sources = [
  {url: "http://www.stefanieposavec.com/writing-without-words", description: ["Writing Without Words", "(S. Posavec)"]},
  {url: "https://github.com/vlandham/sentence_drawings", description: ["Sentence Drawings in D3", "(J. Vallandingham)"]},
  {url: "https://www.gutenberg.org/", description: "Project Gutenberg"}];

const defaultText = "pg174.txt";

export function controls() {
  return (
    <Form>
      <Form.Group as={Row}>
        <Form.Label column md={2}>
          Source Text
        </Form.Label>
        <Col md={5}>
         <Form.Control id="control-sentence-text" as="select" defaultValue={defaultText}>
            <option value="pg174.txt">The Picture of Dorian Gray</option>
            <option value="pg1260.txt">Jane Eyre</option>
            <option value="pg1400.txt">Great Expectations</option>
         </Form.Control>
        </Col>
      </Form.Group>
    </Form>
  );
}

export function create(el, props) {
  var margin = {top: 20, right: 20, bottom: 20, left: 20};
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

  svg.append("path")
    .attr("fill", "none")
    .attr("stroke", "black");

  var turn = 0.5 * Math.PI;

  var xScale = d3.scaleLinear().range([0, width]),
      yScale = d3.scaleLinear().range([height, 0]),
      aspect = width / height;

  var line = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y))
    .curve(d3.curveLinear);

  function render(counts) {
    svg.select("path").interrupt();

    if (typeof counts === "undefined")
      return;

    var x0 = 0, x1 = 0,
        y0 = 0, y1 = 0;

    var angle = 0, pos = new numeric.T(0, 0),
        data = [{x: pos.x, y: pos.y}];

    counts.sentences.forEach((d, i) => {
      angle += turn;

      var step = new numeric.T(0, 1);
      step = step.mul(angle).exp().mul(d);

      pos = pos.add(step);

      if (pos.x < x0)
        x0 = pos.x;
      
      if (pos.x > x1)
        x1 = pos.x;
      
      if (pos.y < y0)
        y0 = pos.y;
      
      if (pos.y > y1)
        y1 = pos.y;

      data.push({x: pos.x, y: pos.y});
    });

    if (y1 - y0 > (x1 - x0) / aspect) {
      xScale.domain([(x1 + x0)/2 - (y1 - y0)/2 * aspect, (x1 + x0)/2 + (y1 - y0)/2 * aspect]); 
      yScale.domain([y0, y1]);
    }
    else {
      xScale.domain([x0, x1]);
      yScale.domain([(y1 + y0)/2 - (x1 - x0)/2 / aspect, (y1 + y0)/2 + (x1 - x0)/2 / aspect]); 
    }

    var path = svg.select("path")
      .datum(data)
      .attr("d", line);

    var totalLength = path.node().getTotalLength();

    path
      .attr("stroke-dasharray", totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
        .duration(5000)
        .ease(d3.easeCubic)
        .attr("stroke-dashoffset", 0);
  }

  d3.json(dataSrc).then(function(counts) {
    render(counts.find(d => d.fileName == defaultText));

    d3.select("#control-sentence-text")
      .on("change", function() { render(counts.find(d => d.fileName == this.value)); })
  }); 
}

export function destroy() {}
