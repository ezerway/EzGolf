import { Directory, File, Paths } from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { create } from "zustand";

import type { LatLng } from "@/utils/coordinates";
import { asFeatureKind, type FeatureKind } from "@/utils/feature-kinds";

export type { LatLng } from "@/utils/coordinates";

export type CourseHole = {
  id: number;
  layoutId: number;
  name: string;
  par: number | null;
  strokeIndex: number | null;
  corners: LatLng[] | null;
};

export type CourseLayout = {
  id: number;
  courseId: number;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  corners: LatLng[] | null;
  holes: CourseHole[];
};

export type NewHole = {
  name: string;
  par: number | null;
  strokeIndex: number | null;
  corners: LatLng[] | null;
  features: { kind: FeatureKind; latitude: number; longitude: number }[];
};

export type NewLayout = {
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  corners: LatLng[] | null;
  holes: NewHole[];
};

export type LayoutInput = {
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
};

export type HoleInput = {
  name: string;
  par: number | null;
  strokeIndex: number | null;
  corners: LatLng[] | null;
  features: { kind: FeatureKind; latitude: number; longitude: number }[];
};

export type NewCourseFeature = {
  layoutIndex: number;
  kind: FeatureKind;
  latitude: number;
  longitude: number;
};

export type Course = {
  id: number;
  name: string;
  address: string;
  photoUri: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  corners: LatLng[] | null;
  layouts: CourseLayout[];
};

export type NewCourse = {
  name: string;
  address: string;
  photoUri: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  corners: LatLng[] | null;
  layouts: NewLayout[];
  features: NewCourseFeature[];
  photoBase64?: string | null;
};

export type CourseFeature = {
  id: number;
  layoutId: number;
  holeId: number | null;
  kind: FeatureKind;
  latitude: number;
  longitude: number;
};

type CourseRow = {
  id: number;
  name: string;
  address: string;
  photo_uri: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  corners: string | null;
};

type LayoutRow = {
  id: number;
  course_id: number;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  corners: string | null;
};

type HoleRow = {
  id: number;
  layout_id: number;
  name: string;
  par: number | null;
  stroke_index: number | null;
  corners: string | null;
};

type FeatureRow = {
  id: number;
  layout_id: number;
  hole_id: number | null;
  kind: string;
  latitude: number;
  longitude: number;
};

type CoursesState = {
  courses: Course[];
  status: "loading" | "ready" | "error";
  error: string | null;
  features: CourseFeature[];
  loadedLayoutId: number | null;
  load: () => Promise<void>;
  addCourse: (input: NewCourse) => Promise<number>;
  updateCourse: (id: number, input: NewCourse) => Promise<void>;
  importCourses: (input: NewCourse[]) => Promise<number>;
  exportData: () => Promise<string>;
  removeCourse: (id: number) => Promise<void>;
  saveLayout: (courseId: number, layoutId: number | null, input: LayoutInput) => Promise<number>;
  removeLayout: (layoutId: number) => Promise<void>;
  saveHole: (layoutId: number, holeId: number | null, input: HoleInput) => Promise<number>;
  removeHole: (holeId: number) => Promise<void>;
  loadFeatures: (layoutId: number) => Promise<void>;
  addFeature: (layoutId: number, kind: FeatureKind, point: LatLng) => Promise<void>;
  removeFeature: (id: number) => Promise<void>;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let featureRequest = 0;

export function getDatabase() {
  return database();
}

function database() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("ezgolf.db")
      .then(async (db) => {
        await migrate(db);
        return db;
      })
      .catch((error: unknown) => {
        databasePromise = null;
        throw error;
      });
  }
  return databasePromise;
}

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      photo_uri TEXT,
      phone TEXT,
      website TEXT,
      description TEXT,
      corners TEXT
    );
    CREATE TABLE IF NOT EXISTS layouts (
      id INTEGER PRIMARY KEY NOT NULL,
      course_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS features (
      id INTEGER PRIMARY KEY NOT NULL,
      layout_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  const columns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(courses)");
  const names = new Set(columns.map((column) => column.name));
  const additions = [
    ["phone", "ALTER TABLE courses ADD COLUMN phone TEXT"],
    ["website", "ALTER TABLE courses ADD COLUMN website TEXT"],
    ["description", "ALTER TABLE courses ADD COLUMN description TEXT"],
    ["corners", "ALTER TABLE courses ADD COLUMN corners TEXT"],
  ] as const;
  for (const [name, statement] of additions) {
    if (!names.has(name)) {
      await db.execAsync(statement);
    }
  }
  const layoutColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(layouts)");
  const layoutNames = new Set(layoutColumns.map((column) => column.name));
  const layoutAdditions = [
    ["address", "ALTER TABLE layouts ADD COLUMN address TEXT"],
    ["phone", "ALTER TABLE layouts ADD COLUMN phone TEXT"],
    ["website", "ALTER TABLE layouts ADD COLUMN website TEXT"],
    ["description", "ALTER TABLE layouts ADD COLUMN description TEXT"],
    ["corners", "ALTER TABLE layouts ADD COLUMN corners TEXT"],
  ] as const;
  for (const [name, statement] of layoutAdditions) {
    if (!layoutNames.has(name)) {
      await db.execAsync(statement);
    }
  }
  await db.execAsync(`
    INSERT INTO layouts (course_id, name, sort_order)
    SELECT courses.id, courses.name, 0
    FROM courses
    WHERE courses.id NOT IN (SELECT course_id FROM layouts);
    UPDATE layouts
    SET
      address = COALESCE(address, (SELECT address FROM courses WHERE courses.id = layouts.course_id)),
      phone = COALESCE(phone, (SELECT phone FROM courses WHERE courses.id = layouts.course_id)),
      website = COALESCE(website, (SELECT website FROM courses WHERE courses.id = layouts.course_id)),
      description = COALESCE(description, (SELECT description FROM courses WHERE courses.id = layouts.course_id)),
      corners = COALESCE(corners, (SELECT corners FROM courses WHERE courses.id = layouts.course_id));
  `);
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS holes (
      id INTEGER PRIMARY KEY NOT NULL,
      layout_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      corners TEXT,
      par INTEGER,
      stroke_index INTEGER
    );
  `);
  const featureColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(features)");
  if (!featureColumns.some((column) => column.name === "hole_id")) {
    await db.execAsync("ALTER TABLE features ADD COLUMN hole_id INTEGER");
  }
  await db.execAsync(`
    INSERT INTO holes (layout_id, name, sort_order, corners)
    SELECT layouts.id, 'Hole 1', 0, layouts.corners
    FROM layouts
    WHERE layouts.id NOT IN (SELECT layout_id FROM holes)
      AND (
        layouts.corners IS NOT NULL
        OR layouts.id IN (SELECT layout_id FROM features)
      );
    UPDATE features
    SET hole_id = (
      SELECT holes.id FROM holes
      WHERE holes.layout_id = features.layout_id
      ORDER BY holes.sort_order, holes.id
      LIMIT 1
    )
    WHERE hole_id IS NULL;
  `);
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS rounds (
      id INTEGER PRIMARY KEY NOT NULL,
      course_id INTEGER NOT NULL,
      layout_id INTEGER NOT NULL,
      started_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hole_scores (
      round_id INTEGER NOT NULL,
      hole_id INTEGER NOT NULL,
      strokes INTEGER NOT NULL,
      putts INTEGER,
      penalty INTEGER,
      fir INTEGER,
      gir INTEGER,
      PRIMARY KEY (round_id, hole_id)
    );
  `);
  await ensureColumn(db, "holes", "par", "INTEGER");
  await ensureColumn(db, "holes", "stroke_index", "INTEGER");
  await ensureColumn(db, "hole_scores", "putts", "INTEGER");
  await ensureColumn(db, "hole_scores", "penalty", "INTEGER");
  await ensureColumn(db, "hole_scores", "fir", "INTEGER");
  await ensureColumn(db, "hole_scores", "gir", "INTEGER");
  await ensureColumn(db, "rounds", "tee", "TEXT");
}

async function ensureColumn(db: SQLite.SQLiteDatabase, table: string, column: string, definition: string) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Could not update courses.";
}

function parseCorners(value: string | null) {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    const points = parsed.flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }
      const latitude = (item as { latitude?: unknown }).latitude;
      const longitude = (item as { longitude?: unknown }).longitude;
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return [];
      }
      return [{ latitude, longitude }];
    });
    return points.length >= 3 ? points : null;
  } catch {
    return null;
  }
}

async function readCourses(db: SQLite.SQLiteDatabase) {
  const courses = await db.getAllAsync<CourseRow>(
    "SELECT id, name, address, photo_uri, phone, website, description, corners FROM courses ORDER BY name COLLATE NOCASE",
  );
  const layouts = await db.getAllAsync<LayoutRow>(
    "SELECT id, course_id, name, address, phone, website, description, corners FROM layouts ORDER BY sort_order, id",
  );
  const holes = await db.getAllAsync<HoleRow>(
    "SELECT id, layout_id, name, par, stroke_index, corners FROM holes ORDER BY sort_order, id",
  );
  const holesByLayout = new Map<number, CourseHole[]>();
  for (const hole of holes) {
    const list = holesByLayout.get(hole.layout_id) ?? [];
    list.push({
      id: hole.id,
      layoutId: hole.layout_id,
      name: hole.name,
      par: hole.par,
      strokeIndex: hole.stroke_index,
      corners: parseCorners(hole.corners),
    });
    holesByLayout.set(hole.layout_id, list);
  }
  const layoutsByCourse = new Map<number, CourseLayout[]>();
  for (const layout of layouts) {
    const list = layoutsByCourse.get(layout.course_id) ?? [];
    list.push({
      id: layout.id,
      courseId: layout.course_id,
      name: layout.name,
      address: layout.address,
      phone: layout.phone,
      website: layout.website,
      description: layout.description,
      corners: parseCorners(layout.corners),
      holes: holesByLayout.get(layout.id) ?? [],
    });
    layoutsByCourse.set(layout.course_id, list);
  }
  return courses.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    photoUri: row.photo_uri,
    phone: row.phone,
    website: row.website,
    description: row.description,
    corners: parseCorners(row.corners),
    layouts: layoutsByCourse.get(row.id) ?? [],
  }));
}

function normalizedLayouts(
  layouts: NewLayout[],
  fallbackName: string,
  parent: Pick<NewLayout, "address" | "phone" | "website" | "description">,
) {
  const prepared = layouts.flatMap((layout) => {
    const name = layout.name.trim();
    if (!name) {
      return [];
    }
    return [
      {
        name,
        address: blank(layout.address) ?? parent.address,
        phone: blank(layout.phone) ?? parent.phone,
        website: blank(layout.website) ?? parent.website,
        description: blank(layout.description) ?? parent.description,
        corners: layout.corners,
        holes: layout.holes ?? [],
      },
    ];
  });
  if (prepared.length > 0) {
    return prepared;
  }
  return [
    {
      name: fallbackName,
      address: parent.address,
      phone: parent.phone,
      website: parent.website,
      description: parent.description,
      corners: null,
      holes: [],
    },
  ];
}

async function persistCourse(
  db: SQLite.SQLiteDatabase,
  course: NewCourse,
  photoUri: string | null,
  courseId?: number,
) {
  const phone = blank(course.phone);
  const website = blank(course.website);
  const description = blank(course.description);
  const corners = course.corners ? JSON.stringify(course.corners) : null;
  let id = courseId;
  if (id) {
    await db.runAsync(
      `UPDATE courses
       SET name = ?, address = ?, photo_uri = ?, phone = ?, website = ?, description = ?, corners = ?
       WHERE id = ?`,
      course.name.trim(),
      course.address.trim(),
      photoUri,
      phone,
      website,
      description,
      corners,
      id,
    );
    await db.runAsync(
      "DELETE FROM features WHERE layout_id IN (SELECT id FROM layouts WHERE course_id = ?)",
      id,
    );
    await db.runAsync("DELETE FROM layouts WHERE course_id = ?", id);
  } else {
    const result = await db.runAsync(
      `INSERT INTO courses (name, address, photo_uri, phone, website, description, corners)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      course.name.trim(),
      course.address.trim(),
      photoUri,
      phone,
      website,
      description,
      corners,
    );
    id = result.lastInsertRowId;
  }
  const layouts = normalizedLayouts(course.layouts, course.name.trim(), {
    address: course.address.trim(),
    phone,
    website,
    description,
  });
  const layoutIds: number[] = [];
  const holeIds: number[] = [];
  for (const [index, layout] of layouts.entries()) {
    const layoutCorners = layout.corners ?? course.corners;
    const result = await db.runAsync(
      `INSERT INTO layouts (course_id, name, address, phone, website, description, corners, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      layout.name,
      layout.address,
      layout.phone,
      layout.website,
      layout.description,
      layoutCorners ? JSON.stringify(layoutCorners) : null,
      index,
    );
    const layoutId = result.lastInsertRowId;
    layoutIds.push(layoutId);
    const holes =
      layout.holes.length > 0
        ? layout.holes
        : [{ name: "Hole 1", par: null, strokeIndex: null, corners: layoutCorners, features: [] }];
    let firstHoleId: number | null = null;
    for (const [holeIndex, hole] of holes.entries()) {
      const holeCorners = hole.corners ?? layoutCorners;
      const inserted = await db.runAsync(
        "INSERT INTO holes (layout_id, name, sort_order, corners, par, stroke_index) VALUES (?, ?, ?, ?, ?, ?)",
        layoutId,
        hole.name.trim() || `Hole ${holeIndex + 1}`,
        holeIndex,
        holeCorners ? JSON.stringify(holeCorners) : null,
        hole.par,
        hole.strokeIndex,
      );
      const holeId = inserted.lastInsertRowId;
      if (firstHoleId == null) {
        firstHoleId = holeId;
      }
      for (const feature of hole.features) {
        await db.runAsync(
          "INSERT INTO features (layout_id, hole_id, kind, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
          layoutId,
          holeId,
          feature.kind,
          feature.latitude,
          feature.longitude,
        );
      }
    }
    holeIds.push(firstHoleId ?? 0);
  }
  for (const feature of course.features) {
    const layoutId = layoutIds[feature.layoutIndex];
    const holeId = holeIds[feature.layoutIndex];
    if (layoutId == null || holeId == null) {
      continue;
    }
    await db.runAsync(
      "INSERT INTO features (layout_id, hole_id, kind, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
      layoutId,
      holeId,
      feature.kind,
      feature.latitude,
      feature.longitude,
    );
  }
  if (id == null) {
    throw new Error("Could not save this course.");
  }
  return id;
}

export async function fetchFeatures(layoutIds: number[]) {
  if (layoutIds.length === 0) {
    return [];
  }
  const db = await database();
  const placeholders = layoutIds.map(() => "?").join(", ");
  const rows = await db.getAllAsync<FeatureRow>(
    `SELECT id, layout_id, hole_id, kind, latitude, longitude FROM features WHERE layout_id IN (${placeholders}) ORDER BY id`,
    layoutIds,
  );
  return rows.flatMap((row) => {
    const kind = asFeatureKind(row.kind);
    return kind
      ? [{ id: row.id, layoutId: row.layout_id, holeId: row.hole_id, kind, latitude: row.latitude, longitude: row.longitude }]
      : [];
  });
}

function photoDirectory() {
  const directory = new Directory(Paths.document, "course-photos");
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return directory;
}

async function storedPhoto(uri: string | null) {
  if (!uri) {
    return null;
  }
  if (uri.startsWith("http://") || uri.startsWith("https://") || uri.includes("/course-photos/")) {
    return uri;
  }
  const source = new File(uri);
  if (!source.exists) {
    return null;
  }
  const extension = uri.split(".").pop()?.toLowerCase();
  const safeExtension =
    extension && ["jpg", "jpeg", "png", "webp", "heic"].includes(extension) ? extension : "jpg";
  const destination = new File(
    photoDirectory(),
    `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExtension}`,
  );
  await source.copy(destination);
  return destination.uri;
}

function deleteStoredPhoto(uri: string | null) {
  if (!uri || uri.startsWith("http://") || uri.startsWith("https://")) {
    return;
  }
  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
}

function remotePhoto(uri: string | null) {
  if (uri && (uri.startsWith("http://") || uri.startsWith("https://"))) {
    return uri;
  }
  return null;
}

async function localPhotoBase64(uri: string | null) {
  if (!uri || uri.startsWith("http://") || uri.startsWith("https://")) {
    return null;
  }
  const file = new File(uri);
  if (!file.exists) {
    return null;
  }
  return file.base64();
}

async function photoFileFromBase64(value: string | null) {
  if (!value) {
    return null;
  }
  const file = new File(Paths.cache, `ezgolf-import-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  file.create({ intermediates: true, overwrite: true });
  await file.write(value, { encoding: "base64" });
  return file.uri;
}

function blank(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const useCoursesStore = create<CoursesState>((set, get) => ({
  courses: [],
  status: "loading",
  error: null,
  features: [],
  loadedLayoutId: null,
  load: async () => {
    try {
      const db = await database();
      set({ courses: await readCourses(db), status: "ready", error: null });
    } catch (error) {
      set({ status: "error", error: message(error) });
    }
  },
  addCourse: async (input) => {
    const db = await database();
    const photoUri = await storedPhoto(input.photoUri);
    let createdId = 0;
    await db.withTransactionAsync(async () => {
      createdId = await persistCourse(db, input, photoUri);
    });
    set({ courses: await readCourses(db), status: "ready", error: null });
    return createdId;
  },
  updateCourse: async (id, input) => {
    const db = await database();
    const existing = await db.getFirstAsync<{ photo_uri: string | null }>(
      "SELECT photo_uri FROM courses WHERE id = ?",
      id,
    );
    const photoUri = await storedPhoto(input.photoUri);
    await db.runAsync(
      `UPDATE courses
       SET name = ?, address = ?, photo_uri = ?, phone = ?, website = ?, description = ?
       WHERE id = ?`,
      input.name.trim(),
      input.address.trim(),
      photoUri,
      blank(input.phone),
      blank(input.website),
      blank(input.description),
      id,
    );
    if (existing?.photo_uri && existing.photo_uri !== photoUri) {
      deleteStoredPhoto(existing.photo_uri);
    }
    set({ courses: await readCourses(db), status: "ready", error: null });
  },
  saveLayout: async (courseId, layoutId, input) => {
    const db = await database();
    let savedId = layoutId ?? 0;
    if (layoutId) {
      await db.runAsync(
        `UPDATE layouts
         SET name = ?, address = ?, phone = ?, website = ?, description = ?
         WHERE id = ? AND course_id = ?`,
        input.name.trim(),
        input.address,
        input.phone,
        input.website,
        input.description,
        layoutId,
        courseId,
      );
      savedId = layoutId;
    } else {
      const count = await db.getFirstAsync<{ total: number }>(
        "SELECT COUNT(*) AS total FROM layouts WHERE course_id = ?",
        courseId,
      );
      const result = await db.runAsync(
        `INSERT INTO layouts (course_id, name, address, phone, website, description, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        courseId,
        input.name.trim(),
        input.address,
        input.phone,
        input.website,
        input.description,
        count?.total ?? 0,
      );
      savedId = result.lastInsertRowId;
    }
    set({ courses: await readCourses(db), status: "ready", error: null });
    return savedId;
  },
  saveHole: async (layoutId, holeId, input) => {
    const db = await database();
    const corners = input.corners ? JSON.stringify(input.corners) : null;
    let savedId = holeId ?? 0;
    await db.withTransactionAsync(async () => {
      if (holeId) {
        await db.runAsync(
          "UPDATE holes SET name = ?, corners = ?, par = ?, stroke_index = ? WHERE id = ? AND layout_id = ?",
          input.name.trim(),
          corners,
          input.par,
          input.strokeIndex,
          holeId,
          layoutId,
        );
        await db.runAsync("DELETE FROM features WHERE hole_id = ?", holeId);
        savedId = holeId;
      } else {
        const count = await db.getFirstAsync<{ total: number }>(
          "SELECT COUNT(*) AS total FROM holes WHERE layout_id = ?",
          layoutId,
        );
        const result = await db.runAsync(
          "INSERT INTO holes (layout_id, name, sort_order, corners, par, stroke_index) VALUES (?, ?, ?, ?, ?, ?)",
          layoutId,
          input.name.trim(),
          count?.total ?? 0,
          corners,
          input.par,
          input.strokeIndex,
        );
        savedId = result.lastInsertRowId;
      }
      for (const feature of input.features) {
        await db.runAsync(
          "INSERT INTO features (layout_id, hole_id, kind, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
          layoutId,
          savedId,
          feature.kind,
          feature.latitude,
          feature.longitude,
        );
      }
    });
    set({ courses: await readCourses(db), status: "ready", error: null });
    return savedId;
  },
  removeHole: async (holeId) => {
    const db = await database();
    await db.withTransactionAsync(async () => {
      await db.runAsync("DELETE FROM hole_scores WHERE hole_id = ?", holeId);
      await db.runAsync("DELETE FROM features WHERE hole_id = ?", holeId);
      await db.runAsync("DELETE FROM holes WHERE id = ?", holeId);
    });
    set({
      courses: await readCourses(db),
      status: "ready",
      error: null,
      features: get().features.filter((feature) => feature.holeId !== holeId),
    });
  },
  removeLayout: async (layoutId) => {
    const db = await database();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "DELETE FROM hole_scores WHERE round_id IN (SELECT id FROM rounds WHERE layout_id = ?)",
        layoutId,
      );
      await db.runAsync("DELETE FROM rounds WHERE layout_id = ?", layoutId);
      await db.runAsync("DELETE FROM features WHERE layout_id = ?", layoutId);
      await db.runAsync("DELETE FROM holes WHERE layout_id = ?", layoutId);
      await db.runAsync("DELETE FROM layouts WHERE id = ?", layoutId);
    });
    const loadedLayoutId = get().loadedLayoutId;
    set({
      courses: await readCourses(db),
      status: "ready",
      error: null,
      features: get().features.filter((feature) => feature.layoutId !== layoutId),
      loadedLayoutId: loadedLayoutId === layoutId ? null : loadedLayoutId,
    });
  },
  importCourses: async (input) => {
    const db = await database();
    const prepared: { course: NewCourse; photoUri: string | null }[] = [];
    for (const course of input) {
      const photoSource = course.photoUri ?? (await photoFileFromBase64(course.photoBase64 ?? null));
      prepared.push({
        course,
        photoUri: await storedPhoto(photoSource),
      });
    }
    await db.withTransactionAsync(async () => {
      for (const item of prepared) {
        await persistCourse(db, item.course, item.photoUri);
      }
    });
    set({ courses: await readCourses(db), status: "ready", error: null });
    return prepared.length;
  },
  exportData: async () => {
    const db = await database();
    const courses = await readCourses(db);
    const featureRows = await db.getAllAsync<{
      hole_id: number | null;
      kind: string;
      latitude: number;
      longitude: number;
    }>("SELECT hole_id, kind, latitude, longitude FROM features ORDER BY id");
    const featuresByHole = new Map<number, NewHole["features"]>();
    for (const row of featureRows) {
      if (row.hole_id == null) {
        continue;
      }
      const kind = asFeatureKind(row.kind);
      if (!kind) {
        continue;
      }
      const list = featuresByHole.get(row.hole_id) ?? [];
      list.push({ kind, latitude: row.latitude, longitude: row.longitude });
      featuresByHole.set(row.hole_id, list);
    }
    const payload = {
      version: 1,
      courses: await Promise.all(
        courses.map(async (course) => ({
          name: course.name,
          address: course.address,
          phone: course.phone,
          website: course.website,
          description: course.description,
          corners: course.corners,
          photoUri: remotePhoto(course.photoUri),
          photoBase64: await localPhotoBase64(course.photoUri),
          layouts: course.layouts.map((layout) => ({
            name: layout.name,
            address: layout.address,
            phone: layout.phone,
            website: layout.website,
            description: layout.description,
            holes: layout.holes.map((hole) => ({
              name: hole.name,
              par: hole.par,
              strokeIndex: hole.strokeIndex,
              corners: hole.corners,
              features: featuresByHole.get(hole.id) ?? [],
            })),
          })),
        })),
      ),
    };
    return JSON.stringify(payload);
  },
  removeCourse: async (id) => {
    const db = await database();
    const existing = await db.getFirstAsync<{ photo_uri: string | null }>(
      "SELECT photo_uri FROM courses WHERE id = ?",
      id,
    );
    const removedLayouts = new Set(
      get().courses.find((course) => course.id === id)?.layouts.map((layout) => layout.id) ?? [],
    );
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "DELETE FROM hole_scores WHERE round_id IN (SELECT id FROM rounds WHERE course_id = ?)",
        id,
      );
      await db.runAsync("DELETE FROM rounds WHERE course_id = ?", id);
      await db.runAsync(
        "DELETE FROM features WHERE layout_id IN (SELECT id FROM layouts WHERE course_id = ?)",
        id,
      );
      await db.runAsync("DELETE FROM holes WHERE layout_id IN (SELECT id FROM layouts WHERE course_id = ?)", id);
      await db.runAsync("DELETE FROM layouts WHERE course_id = ?", id);
      await db.runAsync("DELETE FROM courses WHERE id = ?", id);
    });
    deleteStoredPhoto(existing?.photo_uri ?? null);
    const loadedLayoutId = get().loadedLayoutId;
    set({
      courses: await readCourses(db),
      status: "ready",
      error: null,
      features: get().features.filter((feature) => !removedLayouts.has(feature.layoutId)),
      loadedLayoutId: loadedLayoutId != null && removedLayouts.has(loadedLayoutId) ? null : loadedLayoutId,
    });
  },
  loadFeatures: async (layoutId) => {
    const request = ++featureRequest;
    const db = await database();
    const rows = await db.getAllAsync<FeatureRow>(
      "SELECT id, layout_id, hole_id, kind, latitude, longitude FROM features WHERE layout_id = ? ORDER BY id",
      layoutId,
    );
    if (request !== featureRequest) {
      return;
    }
    set({
      loadedLayoutId: layoutId,
      features: rows.flatMap((row) => {
        const kind = asFeatureKind(row.kind);
        return kind
          ? [{ id: row.id, layoutId: row.layout_id, holeId: row.hole_id, kind, latitude: row.latitude, longitude: row.longitude }]
          : [];
      }),
    });
  },
  addFeature: async (layoutId, kind, point) => {
    const db = await database();
    const result = await db.runAsync(
      "INSERT INTO features (layout_id, kind, latitude, longitude) VALUES (?, ?, ?, ?)",
      layoutId,
      kind,
      point.latitude,
      point.longitude,
    );
    const feature: CourseFeature = {
      id: result.lastInsertRowId,
      layoutId,
      holeId: null,
      kind,
      latitude: point.latitude,
      longitude: point.longitude,
    };
    set((state) =>
      state.loadedLayoutId === layoutId ? { features: [...state.features, feature] } : {},
    );
  },
  removeFeature: async (id) => {
    const db = await database();
    await db.runAsync("DELETE FROM features WHERE id = ?", id);
    set((state) => ({ features: state.features.filter((feature) => feature.id !== id) }));
  },
}));
