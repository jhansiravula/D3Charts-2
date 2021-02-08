// MCMC sampling routines based on emcee.js (https://github.com/dfm/emcee.js)

import { interval } from "d3-timer";

var MCMC = {};

MCMC.delay = 0; // slow down iteration (for visualization)

var SAMPLERS = { ensemble: EnsembleSampler };

MCMC.sample = function(logLikelihood, initialPosition, nIter, method) {
  if (typeof method === "undefined")
    method = "ensemble";

  if (!(method in SAMPLERS))
    console.error("unknown method");

  var sampler = new SAMPLERS[method](logLikelihood, initialPosition);

  var iteration = $.Deferred();

  var i = 0;
  var timer = interval(function() {
    sampler.chain[i] = sampler.advance();
    iteration.notify({ "iteration": sampler.chain[i], "chain": sampler.getFlatChain() });

    i++;
    if (i > nIter) iteration.resolve();
  }, MCMC.delay);

  iteration.done(function() {
    timer.stop();
    sampler.acceptanceFraction = sampler.nAccepted / nIter / sampler.nWalkers;
  })
  .fail(function() {
    timer.stop();
  });

  return iteration;
};

var Walker = function(p0, logLikelihood) {
  this.dim = p0.length;
  this.position = p0;
  this.logLikelihood = logLikelihood;
  this.logProb = logLikelihood(p0);
};

Walker.prototype.update = function(z, pos) {
  var proposal = new Array();

  for (var i = 0; i < this.dim; i++)
    proposal[i] = pos[i] - z * (pos[i] - this.position[i]);

  var newLnProb = this.logLikelihood(proposal);
  var deltaLnProb = (this.dim - 1) * Math.log(z) + newLnProb - this.logProb;

  if (deltaLnProb > Math.log(Math.random())) {
    this.position = proposal;
    this.logProb = newLnProb;
    return 1;
  }

  return 0;
};

function EnsembleSampler(logLikelihood, initialPosition) {
  this.logLikelihood = logLikelihood;
  this.a = 2;

  this.walkers = new Array();
  this.nWalkers = initialPosition.length;
  for (var k = 0; k < this.nWalkers; k++)
    this.walkers[k] = new Walker(initialPosition[k], this.logLikelihood);

  this.chain = new Array();
  this.nAccepted = 0;
};

EnsembleSampler.prototype.advance = function() {
  var link = new Array();

  for (var k = 0; k < this.nWalkers; k++) {
    var z = Math.pow((this.a - 1) * Math.random() + 1, 2) / this.a;

    var kp = Math.round((this.nWalkers - 1) * Math.random() - 0.5);
    if (kp >= k) kp++;

    this.nAccepted += this.walkers[k].update(z, this.walkers[kp].position);
    link[k] = this.walkers[k].position;
  }

  return link;
};

EnsembleSampler.prototype.getFlatChain = function() {
  var i, k, result = new Array();

  for (i = 0; i < this.chain.length; i++)
    for (k = 0; k < this.nWalkers; k++)
      result[i * this.nWalkers + k] = this.chain[i][k];

  return result;
};

export default MCMC;
