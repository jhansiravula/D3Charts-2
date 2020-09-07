function MovingAverage(context, N) {
  this._context = context;
  this._points = { x: [], y: [] };
  this._N = N;
}

MovingAverage.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;

    this._points.x.push(x);
    this._points.y.push(y);

    if (this._points.x.length < this._N)
      return;

    var u = this._points.x.reduce(function(a, b) { return a + b; }, 0) / this._N,
        v = this._points.y.reduce(function(a, b) { return a + b; }, 0) / this._N;

    this._points.x.shift();
    this._points.y.shift();

    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(u, v) : this._context.moveTo(u, v); break;
      case 1: this._point = 2; // proceed
      default: this._context.lineTo(u, v); break;
    }
  }
};

export var curveMovingAverage = (function custom(N) {

  function movingAverage(context) {
    return new MovingAverage(context, N);
  }

  movingAverage.N = function(N) {
    return custom(+N);
  };

  return movingAverage;
})(0);
