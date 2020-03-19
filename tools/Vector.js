export function Vec(x, y) {
  this.x = x || 0;
  this.y = y || 0;
  return this;
}

Vec.prototype.clone = function() {
  return new Vec(this.x, this.y);
};

Vec.prototype.length = function() {
  return Math.sqrt(this.x*this.x + this.y*this.y);
};

Vec.prototype.plus = function(v) {
  this.x += v.x;
  this.y += v.y;
  return this;
};

Vec.prototype.minus = function(v) {
  this.x -= v.x;
  this.y -= v.y;
  return this;
};

Vec.prototype.scale = function(x) {
  this.x *= x;
  this.y *= x;
  return this;
};

Vec.prototype.normalize = function(x) {
  x = typeof x !== "undefined" ? x : 1;
  var length = this.length();
  if (length > 0) {
    return this.scale(x/length);
  }
  else {
    return this;
  }
};

Vec.prototype.truncate = function(x) {
  var length = this.length();
  if (length > x) {
    return this.normalize(x);
  }
  else {
    return this;
  }
};

Vec.prototype.dot = function(v) {
  return this.x * v.x + this.y * v.y;
};

