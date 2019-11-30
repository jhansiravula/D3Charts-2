export function fix(x) {
  return (x >= 0) ? Math.floor(x) : Math.ceil(x);
}

export function mod(x, y) {
  return ((x % y) + y) % y;
}

export function clamp(x, x0, x1) {
  return Math.min(Math.max(x, x0), x1);
}
