// nested sampling routines based on nestle (https://github.com/kbarbary/nestle/)

import numeric from "numeric";
import { randomNormal } from "d3-random";
import { interval } from "d3-timer";
import { mod } from "./Math";

var Nest = {};

Nest.delay = 0; // slow down iteration (for visualization)

var SQRTEPS = Math.sqrt(Number.EPSILON),
    SAMPLERS = { single: SingleEllipsoidSampler };

Nest.sample = function(logLikelihood, priorTransform, nDim, nPoints, method, updateInterval, npDim, maxIter, maxCall, dLogZ, declineFactor) {
  // logLikelihood: function returning log(likelihood)
  // priorTransform: function translating a unit cube to the parameter space according to the prior
  // nDim: numer of parameters accepted by the likelihood function
  // nPoints: number of active points
  // method: method from SAMPLERS used to select new points
  // updateInterval: only update the new point selector after this number of likelihood calls
  // npDim: numer of parameters accepted by the priorTransform function
  // maxIter: maximum number of iterations
  // maxCall: maximum number of likelihood evaluations
  // dLogZ: iteration will stop when the estimated contribution of the remaining prior volume to the total evidence is small
  // declineFactor: iteration will stop when the weight of newly saved samples has been has been declining for a while

  if (typeof npDim === "undefined")
    npDim = nDim;

  if (typeof maxIter === "undefined")
    maxIter = 1e6;

  if (typeof maxCall === "undefined")
    maxCall = 1e9;

  if (typeof method === "undefined")
    method = "single";

  if (!(method in SAMPLERS))
    console.error("unknown method");

  if (nPoints < 2 * nDim)
    console.warn("nPoints < 2 * nDim");

  if ((typeof dLogZ !== "undefined") && (typeof declineFactor !== "undefined"))
    console.error("cannot specify two separate stopping criteria: declineFactor and dLogZ");

  else if ((typeof dLogZ === "undefined") && (typeof declineFactor === "undefined"))
    dLogZ = 0.5;

  if (typeof updateInterval === "undefined") {
    updateInterval = Math.max(1, Math.round(0.6 * nPoints));
  } else {
    updateInterval = Math.round(updateInterval);
    if (updateInterval < 1)
      console.error("updateInterval must be >= 1")
  }

  // initialize active points and calculate likelihoods
  var activeU = numeric.random([nPoints, npDim]), // position in unit cube
      activeV = numeric.empty([nPoints, nDim]), // real parameters
      activeLogL = numeric.empty([nPoints]); // log(likelihood)

  for (var i = 0; i < nPoints; i++) {
    activeV[i] = priorTransform(activeU[i])
    activeLogL[i] = logLikelihood(activeV[i])
  }

  var sampler = new SAMPLERS[method](logLikelihood, priorTransform, activeU);

  // initialize values for nested sampling loop
  var savedV = [],
      savedLogL = [],
      savedLogVol = [],
      savedLogWeight = [];

  var h = 0, // information
      logZ = -1e300, // log(evidence)
      logVol = Math.log(1 - Math.exp(-1 / nPoints)); // first point removed will have volume 1-e^(1/n)

  var nCall = nPoints; // number of calls we already made

  // initialize sampler
  sampler.update(1 / nPoints);

  var result = {};

  // nested sampling loop
  var nDecl = 0;
  var logWeightOld = -Infinity;
  var iter = 0;
  var sinceUpdate = 0;

  var iteration = $.Deferred();

  var timer = interval(function() {

    // worst object in collection and its weight
    var worst = numeric.arginf(activeLogL),
        logWeight = logVol + activeLogL[worst];

    // update evidence Z and information h
    var logZNew = logaddexp(logZ, logWeight);
    h = (Math.exp(logWeight - logZNew) * activeLogL[worst] + Math.exp(logZ - logZNew) * (h + logZ) - logZNew);
    logZ = logZNew;

    // add worst object to samples
    savedV.push(activeV[worst]);
    savedLogWeight.push(logWeight);
    savedLogVol.push(logVol);
    savedLogL.push(activeLogL[worst]);

    // the new likelihood constraint is that of the worst object
    var logLStar = activeLogL[worst];

    var expectedVol = Math.exp(-iter / nPoints),
        pointVol = expectedVol / nPoints;

    // update the sampler based on the current active points
    if (sinceUpdate >= updateInterval) {
      sampler.update(pointVol);
      sinceUpdate = 0;
    }

    // choose a new point from within the likelihood constraint
    var newPoint = sampler.newPoint(logLStar);

    // replace worst point with new point
    activeU[worst] = newPoint.u;
    activeV[worst] = newPoint.v;
    activeLogL[worst] = newPoint.logL;
    nCall += newPoint.nCall;
    sinceUpdate += newPoint.nCall;

    // shrink interval
    logVol -= 1 / nPoints;

    result = {
      nIter: iter,
      logZ: logZ,
      logZerr: Math.sqrt(h / nPoints),
      activePoints: activeV,
      samples: savedV,
      weights: numeric.exp(numeric.sub(savedLogWeight, logZ))
    };

    iteration.notify(result);

    // stopping criterion 1: estimated fractional remaining evidence below some threshold
    if (typeof dLogZ !== "undefined") {
      var logZRemain = Math.max.apply(null, activeLogL) - iter / nPoints;
      if (logaddexp(logZ, logZRemain) - logZ < dLogZ)
        iteration.resolve(result);
    }

    // stopping criterion 2: logWeight has been declining for a while
    if (typeof declineFactor !== "undefined") {
      nDecl = logWeight < logWeightOld ? nDecl + 1 : 0;
      logWeightOld = logWeight;
      if (nDecl < declineFactor * nPoints)
        iteration.resolve(result);
    }

    // stopping criterion 3: exceeded maximum number of calls or iterations
    if (nCall >= maxCall) iteration.resolve(result);
    if (iter >= maxIter) iteration.resolve(result);

    iter += 1;
  }, Nest.delay);

  iteration
    .done(function(result) {
      timer.stop();

      // add remaining active points
      var logVol = -savedV.length / nPoints - Math.log(nPoints);
      for (var i = 0; i < nPoints; i++) {
        var logWeight = logVol + activeLogL[i];
        var logZNew = logaddexp(logZ, logWeight);
        h = (Math.exp(logWeight - logZNew) * activeLogL[i] + Math.exp(logZ - logZNew) * (h + logZ) - logZNew);
        logZ = logZNew;
        savedV.push(activeV[i]);
        savedLogWeight.push(logWeight);
        savedLogL.push(activeLogL[i]);
        savedLogVol.push(logVol);
      }

      // h should always be nonnegative
      if (h < 0) {
        if (h > -SQRTEPS)
          h = 0;
        else
          console.error("negative h encountered");
      }

      result.nIter = iter;
      result.nCall = nCall;
      result.logZ = logZ;
      result.logZerr = Math.sqrt(h / nPoints);
      result.h = h;
      result.activePoints = activeV;
      result.samples = savedV;
      result.weights = numeric.exp(numeric.sub(savedLogWeight, logZ));
      result.logVol = savedLogVol;
      result.logL = savedLogL;

    })
    .fail(function() {
      timer.stop();
    });

  return iteration;
};

function SingleEllipsoidSampler(logLikelihood, priorTransform, points) {
  // bound active points in a single ellipsoid and sample randomly from within this ellipsoid

  this.logLikelihood = logLikelihood;
  this.priorTransform = priorTransform;
  this.points = points;

  this.enlarge = 1.2;
}

SingleEllipsoidSampler.prototype.update = function(pointVol) {
  // calculate the bounding ellipsoid

  this.ell = boundingEllipsoid(this.points, pointVol);
  this.ell.scaleToVol(this.ell.vol * this.enlarge);
};

SingleEllipsoidSampler.prototype.newPoint = function(logLStar) {
  // draw a new point from within the likelihood constraint

  var nCall = 0;
  var logL = -Infinity
  while (logL < logLStar) {
    while (true) {
      var u = this.ell.sample();
      if (u.every(ui => ui > 0 && ui < 1))
        break;
    }
    var v = this.priorTransform(u);
    logL = this.logLikelihood(v);
    nCall += 1;
  }

  return { u: u, v: v, logL: logL, nCall: nCall };
};

function Ellipsoid(p, a) {
  // n-dimensional ellipsoid

  this.n = p.length;
  this.p = p; // center coordinates
  this.a = a; // inverse covariance matrix of points contained

  this.vol = volPrefactor(this.n) / Math.sqrt(numeric.det(a));

  // calculate the principle axes
  var eig = numeric.eig(a);
  this.l = numeric.div(1, numeric.sqrt(eig.lambda.x));
  this.ax = numeric.dot(eig.E.x, numeric.diag(this.l));
}

Ellipsoid.prototype.scaleToVol = function(vol) {
  // rescale the ellipsoid to satisfy a target volume

  var f = Math.pow(vol / this.vol, 1. / this.n);
  this.a = numeric.mul(Math.pow(f, -2), this.a);
  this.l = numeric.mul(f, this.l);
  this.ax = numeric.mul(f, this.ax);
  this.vol = vol;
};

Ellipsoid.prototype.contains = function(x) {
  // check if a point is contained in the ellipsoid

  var delta = numeric.sub(x, this.p);
  return numeric.dot(numeric.dot(delta, this.a), delta) <= 1.0;
};

Ellipsoid.prototype.randomOffset = function() {
  // randomly distributed offset from ellipsoid center

  return numeric.dot(this.ax, randsphere(this.n));
};

Ellipsoid.prototype.sample = function() {
  // draw a sample randomly distributed within the ellipsoid

  return numeric.add(this.p, this.randomOffset())
};

function boundingEllipsoid(x, pointVol) {
  // bounding ellipsoid for a set of points

  if (typeof pointVol === "undefined")
    pointVol = 0;

  var dims = numeric.dim(x),
      nPoints = dims[0],
      nDim = dims[1];

  // special case of a single point
  if (nPoints === 1) {
    var r = Math.pow(pointVol / volPrefactor(nDim), 1 / nDim);
    return new Ellipsoid(x[0], numeric.mul(1 / Math.pow(r, 2), numeric.identity(nDim)));
  }

  // calculate covariance of the points
  var p = numeric.mean(x, 0);
  var delta = numeric.sub(x, p);
  var cov = covariance(delta);

  // rescale assuming the points are uniformly distributed within the ellipsoid
  cov = numeric.mul(cov, nDim + 2);

  // (ensure that the covariane matrix is nonsingular)

  // matrix defining the ellipsoid
  var a = numeric.inv(cov);

  // calculate expansion factor necessary to bound each point
  var fMax = -Infinity;
  for (var i = 0; i < nPoints; i++) {
    var f = numeric.dot(delta[i], numeric.dot(a, delta[i]));
    fMax = Math.max(fMax, f);
  }

  // ensure that all points are definitely bounded
  if (fMax > 1 - SQRTEPS) a = numeric.mul((1 - SQRTEPS) / fMax, a);

  var ell = new Ellipsoid(p, a);

  // ensure a minimum volume
  var vol = nPoints * pointVol;
  if (ell.vol < vol) ell.scaleToVol(vol);

  return ell;
}

function volPrefactor(n) {
  // volume constant for an n-dimensional sphere

  if (mod(n, 2) == 0) {
    var f = 1;
    for (var i = 2; i <= n; i += 2)
      f *= (2 * Math.PI / i);
  } else {
    var f = 2;
    for (var i = 3; i <= n; i += 2)
      f *= (2 * Math.PI / i);
  }

  return f;
}

function randsphere(n) {
  // draw a random point within an n-dimensional unit sphere

  var z = Array.from({length: n}, randomNormal());
  return numeric.mul(z, Math.pow(Math.random(), 1. / n) / Math.sqrt(numeric.sum(numeric.pow(z, 2))))
}

function covariance(x, ddof) {
  // estimate the covariance of a set of data points

  if (typeof ddof === "undefined")
    ddof = 1;

  var dims = numeric.dim(x);
  if (dims.length === 1)
    x = numeric.reshape(x, [dims[0], 1]); // need at least a 2-d array
  x = numeric.sub(x, numeric.mean(x, 0));

  return numeric.mul(1 / (dims[0] - ddof), numeric.dot(numeric.transpose(x), x))
}

function logaddexp(x, y) {
  // logarithm of the sum of exponentiations of the inputs

  if (x === y) {
    return x + Math.log(2);
  } else {
    var d = x - y;
    if (d > 0) {
      return x + Math.log1p(Math.exp(-d));
    } else if (d <= 0) {
      return y + Math.log1p(Math.exp(d));
    } else {
      return d;
    }
  }
}

Nest.resampleEqual = function(samples, weights) {
  // resample the samples to have equal weight

  var n = weights.length;

  var positions = [],
      sum = 0,
      cumulativeSum = [];

  for (var i = 0; i < n; i++) {
    positions.push((Math.random() + i) / n);
    cumulativeSum.push(sum += weights[i]);
  }

  if (sum - 1 > SQRTEPS)
    console.error("weights do not sum to 1");

  var index = numeric.zeros([n]),
      i = 0,
      j = 0;

  while (i < n) {
    if (positions[i] < cumulativeSum[j]) {
      index[i] = j;
      i += 1;
    } else {
      j += 1;
    }
  }

  return index.map(k => samples[k])
};

export default Nest;
