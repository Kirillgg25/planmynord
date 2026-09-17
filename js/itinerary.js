export function distributeRouteDays(start, stops, end, days) {
  const seen = new Set([start, end]);
  const waypoints = [start, ...stops.filter((stop) => {
    if (!stop || seen.has(stop)) return false;
    seen.add(stop);
    return true;
  }), end];
  const segments = waypoints.length - 1;
  let cursor = 0;
  return Array.from({ length: days }, (_, day) => {
    const target = Math.ceil((day + 1) * segments / days);
    const from = waypoints[cursor];
    const visits = waypoints.slice(cursor + 1, target + 1);
    cursor = target;
    return { from, to: waypoints[cursor], visits };
  });
}
