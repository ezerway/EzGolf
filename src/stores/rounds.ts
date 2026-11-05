import { create } from "zustand";

import { getDatabase } from "@/stores/courses";

export type RoundSummary = {
  id: number;
  courseId: number;
  layoutId: number;
  courseName: string;
  layoutName: string;
  startedAt: number;
  strokes: number;
  putts: number;
  fir: number;
  gir: number;
  tee: string | null;
  holesPlayed: number;
  holeCount: number;
};

export type ScoreField = "strokes" | "putts" | "penalty";
export type MarkField = "fir" | "gir";

export type HoleScore = {
  holeId: number;
  name: string;
  par: number | null;
  strokeIndex: number | null;
  strokes: number | null;
  putts: number | null;
  penalty: number | null;
  fir: boolean | null;
  gir: boolean | null;
};

type RoundsState = {
  rounds: RoundSummary[];
  status: "loading" | "ready";
  activeRoundId: number | null;
  holes: HoleScore[];
  load: () => Promise<void>;
  beginRound: (courseId: number, layoutId: number) => Promise<number>;
  loadScores: (roundId: number) => Promise<void>;
  setScore: (roundId: number, holeId: number, field: ScoreField, value: number | null) => Promise<void>;
  setMark: (roundId: number, holeId: number, field: MarkField, value: boolean | null) => Promise<void>;
  setRoundTee: (roundId: number, tee: string) => Promise<void>;
  clearScores: (roundId: number) => Promise<void>;
};

export const useRoundsStore = create<RoundsState>((set, get) => ({
  rounds: [],
  status: "loading",
  activeRoundId: null,
  holes: [],
  load: async () => {
    const db = await getDatabase();
    set({ rounds: await readRounds(db), status: "ready" });
  },
  beginRound: async (courseId, layoutId) => {
    const db = await getDatabase();
    const now = Date.now();
    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM rounds WHERE layout_id = ? ORDER BY started_at DESC LIMIT 1",
      layoutId,
    );
    let roundId = existing?.id ?? 0;
    if (existing) {
      await db.runAsync("UPDATE rounds SET started_at = ? WHERE id = ?", now, existing.id);
      roundId = existing.id;
    } else {
      const inserted = await db.runAsync(
        "INSERT INTO rounds (course_id, layout_id, started_at) VALUES (?, ?, ?)",
        courseId,
        layoutId,
        now,
      );
      roundId = inserted.lastInsertRowId;
    }
    const holes = await readScores(db, roundId, layoutId);
    set({
      rounds: await readRounds(db),
      status: "ready",
      activeRoundId: roundId,
      holes,
    });
    return roundId;
  },
  loadScores: async (roundId) => {
    const db = await getDatabase();
    const round = await db.getFirstAsync<{ layout_id: number }>(
      "SELECT layout_id FROM rounds WHERE id = ?",
      roundId,
    );
    if (!round) {
      set({ activeRoundId: null, holes: [] });
      return;
    }
    set({
      activeRoundId: roundId,
      holes: await readScores(db, roundId, round.layout_id),
      rounds: await readRounds(db),
    });
  },
  setScore: async (roundId, holeId, field, value) => {
    const db = await getDatabase();
    const next = await readHoleScore(db, roundId, holeId);
    next[field] = recorded(value);
    await writeHoleScore(db, roundId, holeId, next);
    await refreshRound(db, get, set, roundId);
  },
  setMark: async (roundId, holeId, field, value) => {
    const db = await getDatabase();
    const next = await readHoleScore(db, roundId, holeId);
    next[field] = value;
    await writeHoleScore(db, roundId, holeId, next);
    await refreshRound(db, get, set, roundId);
  },
  setRoundTee: async (roundId, tee) => {
    const db = await getDatabase();
    await db.runAsync("UPDATE rounds SET tee = ? WHERE id = ?", tee, roundId);
    set({
      rounds: get().rounds.map((round) => (round.id === roundId ? { ...round, tee } : round)),
    });
  },
  clearScores: async (roundId) => {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM hole_scores WHERE round_id = ?", roundId);
    await db.runAsync("UPDATE rounds SET started_at = ? WHERE id = ?", Date.now(), roundId);
    const layoutId = get().rounds.find((round) => round.id === roundId)?.layoutId;
    const holes =
      get().activeRoundId === roundId && layoutId != null
        ? await readScores(db, roundId, layoutId)
        : get().holes.map((hole) => ({ ...hole, strokes: null, putts: null, penalty: null, fir: null, gir: null }));
    set({ holes, rounds: await readRounds(db) });
  },
}));

async function readRounds(db: Awaited<ReturnType<typeof getDatabase>>) {
  const rows = await db.getAllAsync<{
    id: number;
    course_id: number;
    layout_id: number;
    course_name: string;
    layout_name: string;
    started_at: number;
    strokes: number;
    putts: number;
    fir: number;
    gir: number;
    tee: string | null;
    holes_played: number;
    hole_count: number;
  }>(
    `SELECT
       rounds.id,
       rounds.course_id,
       rounds.layout_id,
       courses.name AS course_name,
       layouts.name AS layout_name,
       rounds.started_at,
       rounds.tee AS tee,
       COALESCE((SELECT SUM(strokes) FROM hole_scores WHERE round_id = rounds.id), 0) AS strokes,
       COALESCE((SELECT SUM(putts) FROM hole_scores WHERE round_id = rounds.id), 0) AS putts,
       (SELECT COUNT(*) FROM hole_scores WHERE round_id = rounds.id AND fir = 1) AS fir,
       (SELECT COUNT(*) FROM hole_scores WHERE round_id = rounds.id AND gir = 1) AS gir,
       (SELECT COUNT(*) FROM hole_scores WHERE round_id = rounds.id AND (strokes > 0 OR IFNULL(putts, 0) > 0 OR IFNULL(penalty, 0) > 0 OR fir IS NOT NULL OR gir IS NOT NULL)) AS holes_played,
       (SELECT COUNT(*) FROM holes WHERE layout_id = rounds.layout_id) AS hole_count
     FROM rounds
     JOIN courses ON courses.id = rounds.course_id
     JOIN layouts ON layouts.id = rounds.layout_id
     ORDER BY rounds.started_at DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    courseId: row.course_id,
    layoutId: row.layout_id,
    courseName: row.course_name,
    layoutName: row.layout_name,
    startedAt: row.started_at,
    strokes: row.strokes,
    putts: row.putts,
    fir: row.fir,
    gir: row.gir,
    tee: row.tee,
    holesPlayed: row.holes_played,
    holeCount: row.hole_count,
  }));
}

function recorded(value: number | null | undefined) {
  return value != null && value >= 1 ? Math.round(value) : null;
}

type StoredScore = {
  strokes: number | null;
  putts: number | null;
  penalty: number | null;
  fir: boolean | null;
  gir: boolean | null;
};

function flag(value: number | null | undefined) {
  if (value == null) {
    return null;
  }
  return value !== 0;
}

function bit(value: boolean | null) {
  if (value == null) {
    return null;
  }
  return value ? 1 : 0;
}

async function readHoleScore(db: Awaited<ReturnType<typeof getDatabase>>, roundId: number, holeId: number) {
  const current = await db.getFirstAsync<{
    strokes: number | null;
    putts: number | null;
    penalty: number | null;
    fir: number | null;
    gir: number | null;
  }>("SELECT strokes, putts, penalty, fir, gir FROM hole_scores WHERE round_id = ? AND hole_id = ?", roundId, holeId);
  return {
    strokes: recorded(current?.strokes),
    putts: recorded(current?.putts),
    penalty: recorded(current?.penalty),
    fir: flag(current?.fir),
    gir: flag(current?.gir),
  } satisfies StoredScore;
}

async function writeHoleScore(
  db: Awaited<ReturnType<typeof getDatabase>>,
  roundId: number,
  holeId: number,
  score: StoredScore,
) {
  if (score.strokes == null && score.putts == null && score.penalty == null && score.fir == null && score.gir == null) {
    await db.runAsync("DELETE FROM hole_scores WHERE round_id = ? AND hole_id = ?", roundId, holeId);
    return;
  }
  await db.runAsync(
    `INSERT INTO hole_scores (round_id, hole_id, strokes, putts, penalty, fir, gir) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(round_id, hole_id) DO UPDATE SET
       strokes = excluded.strokes,
       putts = excluded.putts,
       penalty = excluded.penalty,
       fir = excluded.fir,
       gir = excluded.gir`,
    roundId,
    holeId,
    score.strokes ?? 0,
    score.putts,
    score.penalty,
    bit(score.fir),
    bit(score.gir),
  );
}

async function refreshRound(
  db: Awaited<ReturnType<typeof getDatabase>>,
  get: () => { rounds: { id: number; layoutId: number }[]; activeRoundId: number | null; holes: HoleScore[] },
  set: (partial: { holes: HoleScore[]; rounds: RoundSummary[] }) => void,
  roundId: number,
) {
  const layoutId = get().rounds.find((round) => round.id === roundId)?.layoutId;
  const holes =
    get().activeRoundId === roundId && layoutId != null ? await readScores(db, roundId, layoutId) : get().holes;
  set({ holes, rounds: await readRounds(db) });
}

async function readScores(db: Awaited<ReturnType<typeof getDatabase>>, roundId: number, layoutId: number) {
  const rows = await db.getAllAsync<{
    id: number;
    name: string;
    par: number | null;
    stroke_index: number | null;
    strokes: number | null;
    putts: number | null;
    penalty: number | null;
    fir: number | null;
    gir: number | null;
  }>(
    `SELECT holes.id, holes.name, holes.par, holes.stroke_index, hole_scores.strokes, hole_scores.putts, hole_scores.penalty, hole_scores.fir, hole_scores.gir
     FROM holes
     LEFT JOIN hole_scores
       ON hole_scores.hole_id = holes.id AND hole_scores.round_id = ?
     WHERE holes.layout_id = ?
     ORDER BY holes.sort_order, holes.id`,
    roundId,
    layoutId,
  );
  return rows.map((row) => ({
    holeId: row.id,
    name: row.name,
    par: row.par,
    strokeIndex: row.stroke_index,
    strokes: recorded(row.strokes),
    putts: recorded(row.putts),
    penalty: recorded(row.penalty),
    fir: flag(row.fir),
    gir: flag(row.gir),
  }));
}
