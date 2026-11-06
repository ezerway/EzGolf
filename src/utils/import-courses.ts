import type { NewCourse, NewHole, NewLayout } from "@/stores/courses";
import { isLatLng, type LatLng } from "@/utils/coordinates";
import { asFeatureKind } from "@/utils/feature-kinds";

export function parseCoursesFile(text: string): NewCourse[] {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("That file is empty.");
  }
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return parseJson(trimmed);
  }
  return parseCsv(trimmed);
}

function parseJson(text: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const records = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { courses?: unknown }).courses)
      ? (parsed as { courses: unknown[] }).courses
      : [parsed];
  const courses = records.flatMap((record) => {
    const course = courseFromRecord(record);
    return course ? [course] : [];
  });
  if (courses.length === 0) {
    throw new Error("No courses found. Each item needs a name and an address.");
  }
  return courses;
}

function courseFromRecord(value: unknown): NewCourse | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const name = textField(record, ["name", "course", "ten"]);
  const address = textField(record, ["address", "diaChi", "diachi", "location"]);
  const photo = textField(record, ["photoUri", "photo", "image", "imageUrl"]);
  if (!name || !address) {
    return null;
  }
  const phone = textField(record, ["phone", "telephone", "tel", "sdt"]);
  const website = textField(record, ["website", "url", "web"]);
  const description = textField(record, ["description", "about", "intro", "gioiThieu"]);
  const dataPhoto = photo?.startsWith("data:") ? photo : null;
  return {
    name,
    address,
    photoUri: dataPhoto ? null : photo,
    phone,
    website,
    description,
    corners: cornersFrom(record),
    layouts: layoutsFrom(record).map((layout) => ({
      name: layout.name,
      address: layout.address ?? address,
      phone: layout.phone ?? phone,
      website: layout.website ?? website,
      description: layout.description ?? description,
      corners: layout.corners,
      holes: layout.holes,
    })),
    features: [],
    photoBase64: dataPhoto ?? textField(record, ["photoBase64", "photoData"]),
    photoType: textField(record, ["photoType", "photoMime"]),
  };
}

function textField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const match = Object.entries(record).find(([candidate]) => candidate.toLowerCase() === key.toLowerCase());
    const value = match?.[1];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function cornersFrom(record: Record<string, unknown>) {
  const value = namedValue(record, ["corners", "bounds", "points"]);
  if (!Array.isArray(value) || value.length < 3) {
    return null;
  }
  const points = value.flatMap((item) => {
    const point = asPoint(item);
    return point ? [point] : [];
  });
  return points.length >= 3 ? points : null;
}

function asPoint(value: unknown): LatLng | null {
  if (Array.isArray(value) && value.length >= 2) {
    const point = {
      latitude: typeof value[0] === "number" ? value[0] : null,
      longitude: typeof value[1] === "number" ? value[1] : null,
    };
    return isLatLng(point) ? point : null;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const point = {
    latitude: numericField(record, ["latitude", "lat"]),
    longitude: numericField(record, ["longitude", "lng", "lon"]),
  };
  return isLatLng(point) ? point : null;
}

function wholeNumber(record: Record<string, unknown>, keys: string[]) {
  const number = numericField(record, keys);
  return number != null && Number.isInteger(number) && number >= 1 ? number : null;
}

function numericField(record: Record<string, unknown>, keys: string[]) {
  const text = textField(record, keys);
  if (!text) {
    return null;
  }
  const number = Number(text.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function layoutsFrom(record: Record<string, unknown>) {
  const value = namedValue(record, ["layouts", "subcourses", "nines"]);
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string" && item.trim()) {
        return [emptyLayout(item.trim())];
      }
      if (item && typeof item === "object") {
        const layout = item as Record<string, unknown>;
        const name = textField(layout, ["name", "ten"]);
        return name
          ? [
              {
                name,
                address: textField(layout, ["address", "diaChi", "diachi"]),
                phone: textField(layout, ["phone", "telephone", "tel", "sdt"]),
                website: textField(layout, ["website", "url", "web"]),
                description: textField(layout, ["description", "about", "intro", "gioiThieu"]),
                corners: cornersFrom(layout),
                holes: holesFrom(layout),
              },
            ]
          : [];
      }
      return [];
    });
  }
  const text = textField(record, ["layouts", "subcourses", "nines"]);
  return text
    ? text
        .split("|")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => emptyLayout(name))
    : [];
}

function emptyLayout(name: string): NewLayout {
  return { name, address: null, phone: null, website: null, description: null, corners: null, holes: [] };
}

function holesFrom(record: Record<string, unknown>): NewHole[] {
  const value = namedValue(record, ["holes"]);
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const hole = item as Record<string, unknown>;
    const name = textField(hole, ["name", "ten"]);
    if (!name) {
      return [];
    }
    return [
      {
        name,
        par: wholeNumber(hole, ["par"]),
        strokeIndex: wholeNumber(hole, ["index", "strokeIndex", "stroke_index", "handicap"]),
        corners: cornersFrom(hole),
        features: featuresFrom(hole),
      },
    ];
  });
}

function featuresFrom(record: Record<string, unknown>): NewHole["features"] {
  const value = namedValue(record, ["features", "objects"]);
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const feature = item as Record<string, unknown>;
    const kind = asFeatureKind(textField(feature, ["kind", "type"]) ?? "");
    const latitude = numericField(feature, ["latitude", "lat"]);
    const longitude = numericField(feature, ["longitude", "lng", "lon"]);
    if (!kind || latitude == null || longitude == null) {
      return [];
    }
    return [{ kind, latitude, longitude }];
  });
}

function namedValue(record: Record<string, unknown>, keys: string[]) {
  const match = Object.entries(record).find(([candidate]) =>
    keys.some((key) => candidate.toLowerCase() === key.toLowerCase()),
  );
  return match?.[1];
}

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new Error("That file is empty.");
  }
  const header = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const hasHeader = header.includes("name") && header.includes("address");
  const nameIndex = hasHeader ? header.indexOf("name") : 0;
  const addressIndex = hasHeader ? header.indexOf("address") : 1;
  const photoIndex = hasHeader ? columnIndex(header, ["photo", "photouri", "image", "imageurl"]) : 2;
  const phoneIndex = hasHeader ? columnIndex(header, ["phone", "telephone", "tel"]) : -1;
  const websiteIndex = hasHeader ? columnIndex(header, ["website", "url", "web"]) : -1;
  const descriptionIndex = hasHeader ? columnIndex(header, ["description", "about", "intro"]) : -1;
  const layoutsIndex = hasHeader ? columnIndex(header, ["layouts", "subcourses", "nines"]) : -1;
  const courses = lines.slice(hasHeader ? 1 : 0).flatMap((line) => {
    const cells = splitCsvLine(line);
    const name = cells[nameIndex]?.trim();
    const address = cells[addressIndex]?.trim();
    if (!name || !address) {
      return [];
    }
    const phone = cellAt(cells, phoneIndex);
    const website = cellAt(cells, websiteIndex);
    const description = cellAt(cells, descriptionIndex);
    const layoutNames = cellAt(cells, layoutsIndex)?.split("|").map((item) => item.trim()).filter(Boolean) ?? [];
    return [
      {
        name,
        address,
        photoUri: cellAt(cells, photoIndex),
        phone,
        website,
        description,
        corners: null,
        layouts: layoutNames.map((layoutName) => ({
          name: layoutName,
          address,
          phone,
          website,
          description,
          corners: null,
          holes: [],
        })),
        features: [],
      },
    ];
  });
  if (courses.length === 0) {
    throw new Error("No courses found. Use columns name and address.");
  }
  return courses;
}

function columnIndex(header: string[], names: string[]) {
  return header.findIndex((cell) => names.includes(cell));
}

function cellAt(cells: string[], index: number) {
  if (index < 0) {
    return null;
  }
  const value = cells[index]?.trim();
  return value || null;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (character === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  cells.push(current);
  return cells;
}
