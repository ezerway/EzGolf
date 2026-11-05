export type LatLng = {
  latitude: number;
  longitude: number;
};

export function parseCoordinate(value: string) {
  const number = Number(value.trim().replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export function isLatLng(point: {
  latitude: number | null;
  longitude: number | null;
}): point is LatLng {
  return (
    point.latitude != null &&
    point.longitude != null &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

export function closedRing(points: LatLng[]) {
  const ring = points.map((point) => [point.longitude, point.latitude] as [number, number]);
  const first = ring[0];
  if (first) {
    ring.push(first);
  }
  return ring;
}

export function boundsFor(points: LatLng[]) {
  if (points.length === 0) {
    return null;
  }
  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    west = Math.min(west, point.longitude);
    east = Math.max(east, point.longitude);
    south = Math.min(south, point.latitude);
    north = Math.max(north, point.latitude);
  }
  if (west === east) {
    west -= 0.002;
    east += 0.002;
  }
  if (south === north) {
    south -= 0.002;
    north += 0.002;
  }
  return [west, south, east, north] as [number, number, number, number];
}

export function headingDegrees(from: LatLng, to: LatLng) {
  const latitude = (from.latitude * Math.PI) / 180;
  const otherLatitude = (to.latitude * Math.PI) / 180;
  const deltaLongitude = ((to.longitude - from.longitude) * Math.PI) / 180;
  const y = Math.sin(deltaLongitude) * Math.cos(otherLatitude);
  const x =
    Math.cos(latitude) * Math.sin(otherLatitude) -
    Math.sin(latitude) * Math.cos(otherLatitude) * Math.cos(deltaLongitude);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

export function midpoint(from: LatLng, to: LatLng): LatLng {
  return {
    latitude: (from.latitude + to.latitude) / 2,
    longitude: (from.longitude + to.longitude) / 2,
  };
}

export function yardsBetween(from: LatLng, to: LatLng) {
  return Math.round(metersBetween(from, to) * 1.0936133);
}

export function kilometersAway(from: LatLng, area: LatLng[] | null) {
  if (!area || area.length === 0) {
    return null;
  }
  if (area.length >= 3 && containsPoint(from, area)) {
    return 0;
  }
  const target = area.length >= 3 ? closestPointOnRing(from, area) : centroid(area);
  return metersBetween(from, target) / 1000;
}

export function formatKilometers(kilometers: number) {
  if (kilometers < 10) {
    return `${kilometers.toFixed(1)} km`;
  }
  return `${Math.round(kilometers)} km`;
}

export function clampToArea(point: LatLng, area: LatLng[] | null) {
  if (!area || area.length < 3 || containsPoint(point, area)) {
    return point;
  }
  return closestPointOnRing(point, area);
}

export function metersBetween(from: LatLng, to: LatLng) {
  const latitude = (from.latitude * Math.PI) / 180;
  const otherLatitude = (to.latitude * Math.PI) / 180;
  const deltaLatitude = otherLatitude - latitude;
  const deltaLongitude = ((to.longitude - from.longitude) * Math.PI) / 180;
  const chord =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude) * Math.cos(otherLatitude) * Math.sin(deltaLongitude / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
}

function centroid(points: LatLng[]): LatLng {
  return {
    latitude: points.reduce((sum, point) => sum + point.latitude, 0) / points.length,
    longitude: points.reduce((sum, point) => sum + point.longitude, 0) / points.length,
  };
}

function closestPointOnRing(point: LatLng, corners: LatLng[]) {
  let best = corners[0] ?? point;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < corners.length; index += 1) {
    const start = corners[index];
    const end = corners[(index + 1) % corners.length];
    if (!start || !end) {
      continue;
    }
    const candidate = closestPointOnSegment(point, start, end);
    const distance = metersBetween(point, candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function closestPointOnSegment(point: LatLng, start: LatLng, end: LatLng): LatLng {
  const metersPerDegreeLatitude = 111320;
  const metersPerDegreeLongitude = 111320 * Math.cos((point.latitude * Math.PI) / 180);
  const startEast = (start.longitude - point.longitude) * metersPerDegreeLongitude;
  const startNorth = (start.latitude - point.latitude) * metersPerDegreeLatitude;
  const endEast = (end.longitude - point.longitude) * metersPerDegreeLongitude;
  const endNorth = (end.latitude - point.latitude) * metersPerDegreeLatitude;
  const east = endEast - startEast;
  const north = endNorth - startNorth;
  const lengthSquared = east * east + north * north;
  const progress =
    lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, -(startEast * east + startNorth * north) / lengthSquared));
  return {
    latitude: point.latitude + (startNorth + progress * north) / metersPerDegreeLatitude,
    longitude: point.longitude + (startEast + progress * east) / metersPerDegreeLongitude,
  };
}

export function containsPoint(point: LatLng, corners: LatLng[]) {
  const polygon = closedRing(corners).slice(0, -1);
  if (polygon.length < 3) {
    return false;
  }
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const current = polygon[index];
    const earlier = polygon[previous];
    if (!current || !earlier) {
      continue;
    }
    const crossesLatitude = current[1] > point.latitude !== earlier[1] > point.latitude;
    const intersection =
      ((earlier[0] - current[0]) * (point.latitude - current[1])) / (earlier[1] - current[1]) + current[0];
    if (crossesLatitude && point.longitude < intersection) {
      inside = !inside;
    }
  }
  return inside;
}
