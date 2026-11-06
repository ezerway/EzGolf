import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type CameraRef,
  type MapRef,
} from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { Stack } from "expo-router/stack";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { buttonFace } from "@/components/button-face";
import { MapZoomControls } from "@/components/map-zoom";
import { streetMapStyle, type AppMapStyle } from "@/components/map-style";
import { ShotLine } from "@/components/shot-line";
import { useT } from "@/i18n";
import { useCoursesStore, type Course } from "@/stores/courses";
import { useRoundsStore } from "@/stores/rounds";
import { themeVars, usePalette, useScheme } from "@/theme";
import { boundsFor, closedRing, containsPoint, headingDegrees, type LatLng } from "@/utils/coordinates";
import { featureCatalog, isTeeKind } from "@/utils/feature-kinds";
import { holeFacts } from "@/utils/hole-facts";

const mapPadding = { top: 72, right: 96, bottom: 160, left: 96 };

export function CourseRoundScreen({ id, layoutId }: { id: number; layoutId: number | null }) {
  const course = useCoursesStore((state) => state.courses.find((item) => item.id === id));
  const status = useCoursesStore((state) => state.status);
  const load = useCoursesStore((state) => state.load);
  const t = useT();
  const palette = usePalette();
  const scheme = useScheme();

  useEffect(() => {
    if (status === "loading") {
      void load();
    }
  }, [load, status]);

  if (!course) {
    return (
      <View className="flex-1 items-center justify-center px-8" style={themeVars[scheme]}>
        <Stack.Screen options={{ title: t("nav.round") }} />
        <Text className="text-center text-base" style={{ color: palette.text }}>
          {status === "loading" ? t("round.opening") : t("course.unavailable")}
        </Text>
      </View>
    );
  }

  const selectedLayout = course.layouts.some((layout) => layout.id === layoutId)
    ? layoutId
    : (course.layouts[0]?.id ?? null);
  return <CourseMap course={course} layoutId={selectedLayout} />;
}

function CourseMap({ course, layoutId }: { course: Course; layoutId: number | null }) {
  const features = useCoursesStore((state) => state.features);
  const loadedLayoutId = useCoursesStore((state) => state.loadedLayoutId);
  const loadFeatures = useCoursesStore((state) => state.loadFeatures);
  const insets = useSafeAreaInsets();
  const t = useT();
  const palette = usePalette();
  const scheme = useScheme();
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const placeBallRef = useRef<((point: LatLng) => void) | null>(null);
  const layout = course.layouts.find((item) => item.id === layoutId) ?? course.layouts[0];
  const holes = layout?.holes ?? [];
  const [holeId, setHoleId] = useState<number | null>(null);
  const activeHole = holes.find((hole) => hole.id === holeId) ?? holes[0] ?? null;
  const area = activeHole?.corners ?? null;
  const [selectedTeeId, setSelectedTeeId] = useState<number | null>(null);
  const [openMenu, setOpenMenu] = useState<"hole" | "tee" | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<AppMapStyle>(streetMapStyle);
  const [mapWidth, setMapWidth] = useState(0);
  const [mapHeight, setMapHeight] = useState(0);
  const [roundId, setRoundId] = useState<number | null>(null);
  const beginRound = useRoundsStore((state) => state.beginRound);
  const loadScores = useRoundsStore((state) => state.loadScores);
  const setScore = useRoundsStore((state) => state.setScore);
  const setRoundTee = useRoundsStore((state) => state.setRoundTee);
  const savedTee = useRoundsStore((state) => state.rounds.find((round) => round.id === roundId)?.tee ?? null);
  const holeScores = useRoundsStore((state) => state.holes);
  const activeRoundId = useRoundsStore((state) => state.activeRoundId);
  const visibleFeatures = loadedLayoutId === layoutId ? features : [];
  const holeFeatures = visibleFeatures.filter((feature) => activeHole != null && feature.holeId === activeHole.id);
  const savedPoints = [
    ...(area ?? []),
    ...holeFeatures.map((feature) => ({
      latitude: feature.latitude,
      longitude: feature.longitude,
    })),
  ];
  const bounds = boundsFor(savedPoints);
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  useEffect(() => {
    if (layoutId != null) {
      void loadFeatures(layoutId);
    }
  }, [layoutId, loadFeatures]);

  useEffect(() => {
    if (layout?.id == null) {
      return;
    }
    let cancelled = false;
    void beginRound(course.id, layout.id).then((id) => {
      if (!cancelled) {
        setRoundId(id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [beginRound, course.id, layout?.id]);

  useFocusEffect(
    useCallback(() => {
      if (roundId != null) {
        void loadScores(roundId);
      }
    }, [loadScores, roundId]),
  );

  const tees = holeFeatures.filter((feature) => isTeeKind(feature.kind));
  const teesRef = useRef(tees);
  teesRef.current = tees;
  const firstTeeId = tees[0]?.id ?? null;
  const selectedTee = tees.find((tee) => tee.id === selectedTeeId) ?? null;
  const selectedKind = selectedTee?.kind ?? null;
  const cup = holeFeatures.find((feature) => feature.kind === "hole") ?? null;

  useEffect(() => {
    const match = savedTee ? teesRef.current.find((tee) => tee.kind === savedTee) : undefined;
    setSelectedTeeId(match?.id ?? firstTeeId);
  }, [activeHole?.id, firstTeeId, savedTee]);

  useEffect(() => {
    if (roundId == null || selectedKind == null || savedTee != null) {
      return;
    }
    void setRoundTee(roundId, selectedKind);
  }, [roundId, savedTee, selectedKind, setRoundTee]);

  useEffect(() => {
    if (!mapReady || mapWidth < 64 || mapHeight < 64) {
      return;
    }
    const featuresReady = layoutId == null || loadedLayoutId === layoutId;
    const holeCorners = area && area.length >= 3 ? area : null;
    if (holeCorners) {
      const framed = frameHole(cameraRef.current, holeCorners, selectedTee, cup, mapWidth, mapHeight);
      if (!framed) {
        requestAnimationFrame(() => {
          frameHole(cameraRef.current, holeCorners, selectedTee, cup, mapWidth, mapHeight);
        });
      }
      return;
    }
    const next = featuresReady ? boundsRef.current : boundsFor(area ?? []);
    if (!next) {
      return;
    }
    try {
      cameraRef.current?.setStop({ bounds: next, padding: mapPadding, duration: 0 });
    } catch {
      requestAnimationFrame(() => {
        try {
          cameraRef.current?.setStop({ bounds: next, padding: mapPadding, duration: 0 });
        } catch {
          // The camera is still attaching to the map.
        }
      });
    }
  }, [
    mapReady,
    mapWidth,
    mapHeight,
    layoutId,
    loadedLayoutId,
    area,
    activeHole?.id,
    selectedTee?.latitude,
    selectedTee?.longitude,
    cup?.latitude,
    cup?.longitude,
  ]);

  function focusTee(teeId: number) {
    const tee = tees.find((item) => item.id === teeId);
    if (!tee) {
      return;
    }
    setSelectedTeeId(teeId);
    if (roundId != null) {
      void setRoundTee(roundId, tee.kind);
    }
  }

  async function centerOnPlayer() {
    if (!area) {
      return;
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      return;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    if (!containsPoint(point, area)) {
      return;
    }
    placeBallRef.current?.(point);
    cameraRef.current?.easeTo({
      center: [point.longitude, point.latitude],
      zoom: 17,
      bearing: selectedTee && cup ? headingDegrees(selectedTee, cup) : 0,
      duration: 350,
    });
  }

  async function rotateMap() {
    const reading = await mapRef.current?.getBearing();
    const start = typeof reading === "number" && Number.isFinite(reading) ? reading : 0;
    const bearing = (((start + 45) % 360) + 360) % 360;
    const camera = cameraRef.current;
    if (!camera) {
      return;
    }
    void camera.setStop({ bearing, duration: 220 }).catch(() => {
      // The camera is still attaching to the map.
    });
  }

  const mapFeatures = holeFeatures.filter((feature) => !isTeeKind(feature.kind) || feature.id === selectedTee?.id);

  return (
    <View
      className="flex-1"
      style={themeVars[scheme]}
      onLayout={(event) => {
        setMapWidth(event.nativeEvent.layout.width);
        setMapHeight(event.nativeEvent.layout.height);
      }}
    >
      <Stack.Screen options={{ title: course.name }} />
      <Map
        ref={mapRef}
        mapStyle={mapStyle}
        tintColor="#ffd33d"
        attributionPosition={{ top: 8, right: 8 }}
        logoPosition={{ top: 8, left: 8 }}
        onDidFinishLoadingMap={() => setMapReady(true)}
      >
        <Camera
          ref={cameraRef}
          maxZoom={20}
          minZoom={2}
          initialViewState={
            bounds ? { bounds, padding: mapPadding } : { center: [0, 20], zoom: 2 }
          }
        />
        {area ? (
          <GeoJSONSource
            id="course-corners"
            data={{
              type: "Feature",
              properties: {},
              geometry: { type: "Polygon", coordinates: [closedRing(area)] },
            }}
          >
            <Layer
              id="course-corners-fill"
              type="fill"
              source="course-corners"
              paint={{ "fill-color": "#ffd33d", "fill-opacity": 0.18 }}
            />
            <Layer
              id="course-corners-line"
              type="line"
              source="course-corners"
              paint={{ "line-color": "#ffd33d", "line-width": 2 }}
            />
          </GeoJSONSource>
        ) : null}
        {mapFeatures.map((feature) => {
          const catalog = featureCatalog[feature.kind];
          return (
            <Marker
              key={feature.id}
              id={String(feature.id)}
              lngLat={[feature.longitude, feature.latitude]}
              anchor="center"
              onPress={(event) => {
                event.stopPropagation();
                if (isTeeKind(feature.kind)) {
                  focusTee(feature.id);
                }
              }}
            >
              <View
                collapsable={false}
                style={{
                  width: feature.id === selectedTeeId ? 40 : 32,
                  height: feature.id === selectedTeeId ? 40 : 32,
                  borderRadius: 20,
                  backgroundColor: catalog.color,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: feature.id === selectedTeeId ? 3 : 2,
                  borderColor: feature.id === selectedTeeId ? "#ffd33d" : "#25292e",
                }}
              >
                <Text style={{ color: catalog.ink, fontSize: 13, fontWeight: "700" }}>{catalog.mark}</Text>
              </View>
            </Marker>
          );
        })}
        {selectedTee && cup ? (
          <ShotLine
            key={`${selectedTee.id}-${cup.id}`}
            tee={selectedTee}
            cup={cup}
            limit={area}
            mapRef={mapRef}
            placeRef={placeBallRef}
          />
        ) : null}
      </Map>
      {roundId != null && activeHole ? (
        <ScoreStepper
          strokes={activeRoundId === roundId ? holeScores.find((hole) => hole.holeId === activeHole.id)?.strokes ?? null : null}
          facts={holeFacts(activeHole, t)}
          onChange={(strokes) => void setScore(roundId, activeHole.id, "strokes", strokes)}
          onOpenCard={() => router.push({ pathname: "/scorecard", params: { roundId: String(roundId) } })}
        />
      ) : null}
      <View className="absolute bottom-4 right-4" style={{ marginBottom: process.env.EXPO_OS === "android" ? 0 : insets.bottom }}>
        <MapZoomControls mapRef={mapRef} cameraRef={cameraRef} onStyleChange={setMapStyle} />
      </View>
      <View className="absolute bottom-4 left-4 gap-3" style={{ marginBottom: process.env.EXPO_OS === "android" ? 0 : insets.bottom }}>
        {openMenu === "hole" ? (
          <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: 8 }}>
            {holes.map((hole) => {
              const selected = hole.id === activeHole?.id;
              const facts = holeFacts(hole, t);
              return (
                <Pressable
                  key={hole.id}
                  onPress={() => {
                    setHoleId(hole.id);
                    setOpenMenu(null);
                  }}
                  className="flex-row items-center gap-2 self-start px-3 py-2"
                  style={buttonFace(palette, selected ? "tint" : "card")}
                >
                  <HoleMark selected={selected} />
                  <View>
                    <Text className="text-sm font-semibold" style={{ color: selected ? palette.onTint : palette.text }}>{hole.name}</Text>
                    {facts ? (
                      <Text className="text-xs" style={{ color: selected ? palette.onTint : palette.muted }}>{facts}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        {openMenu === "tee" ? (
          <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: 8 }}>
            {tees.map((tee) => {
              const catalog = featureCatalog[tee.kind];
              const selected = tee.id === selectedTeeId;
              return (
                <Pressable
                  key={tee.id}
                  onPress={() => {
                    focusTee(tee.id);
                    setOpenMenu(null);
                  }}
                  className="h-11 w-11 items-center justify-center"
                  style={{
                    backgroundColor: catalog.color,
                    borderWidth: selected ? 3 : 1,
                    borderColor: selected ? "#ffd33d" : "#25292e",
                    borderRadius: 22,
                    overflow: "hidden",
                  }}
                >
                  <Text style={{ color: catalog.ink, fontSize: 13, fontWeight: "700" }}>{catalog.mark}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        {activeHole ? (
          <Pressable
            onPress={() => setOpenMenu((current) => (current === "hole" ? null : "hole"))}
            className="flex-row items-center gap-2 self-start px-3 py-2"
            style={buttonFace(palette, "card")}
          >
            <HoleMark />
            <View>
              <Text className="text-sm font-semibold" style={{ color: palette.text }}>{activeHole.name}</Text>
              {holeFacts(activeHole, t) ? <Text className="text-xs" style={{ color: palette.muted }}>{holeFacts(activeHole, t)}</Text> : null}
            </View>
          </Pressable>
        ) : null}
        {tees.length > 0 ? (
          <Pressable
            onPress={() => setOpenMenu((current) => (current === "tee" ? null : "tee"))}
            className="h-12 w-12 items-center justify-center"
            style={{
              backgroundColor: selectedTee ? featureCatalog[selectedTee.kind].color : palette.card,
              borderWidth: 2,
              borderColor: "#25292e",
              borderRadius: 24,
              overflow: "hidden",
            }}
          >
            <Text
              style={{
                color: selectedTee ? featureCatalog[selectedTee.kind].ink : "#ffffff",
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              T
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => void rotateMap()}
          accessibilityLabel={t("round.rotate")}
          className="h-12 w-12 items-center justify-center"
          style={buttonFace(palette, "card")}
        >
          <SymbolView
            name={{ ios: "rotate.right", android: "rotate_right", web: "rotate_right" }}
            tintColor={palette.text}
            size={24}
          />
        </Pressable>
        <Pressable
          onPress={() => void centerOnPlayer()}
          className="h-12 w-12 items-center justify-center"
          style={buttonFace(palette, "tint")}
        >
          <Text className="text-lg font-semibold text-on-tint">◎</Text>
        </Pressable>
      </View>
    </View>
  );
}

function frameHole(
  camera: CameraRef | null,
  corners: LatLng[],
  tee: LatLng | null,
  hole: LatLng | null,
  mapWidth: number,
  mapHeight: number,
) {
  const width = mapWidth - mapPadding.left - mapPadding.right;
  const height = mapHeight - mapPadding.top - mapPadding.bottom;
  if (!camera || width < 64 || height < 64) {
    return false;
  }
  const bearing = tee && hole ? headingDegrees(tee, hole) : 0;
  const bearingRadians = (bearing * Math.PI) / 180;
  const originLatitude = corners.reduce((sum, point) => sum + point.latitude, 0) / corners.length;
  const originLongitude = corners.reduce((sum, point) => sum + point.longitude, 0) / corners.length;
  const metersPerDegreeLatitude = 111320;
  const metersPerDegreeLongitude = 111320 * Math.cos((originLatitude * Math.PI) / 180);
  let minRight = Number.POSITIVE_INFINITY;
  let maxRight = Number.NEGATIVE_INFINITY;
  let minUp = Number.POSITIVE_INFINITY;
  let maxUp = Number.NEGATIVE_INFINITY;
  for (const point of corners) {
    const east = (point.longitude - originLongitude) * metersPerDegreeLongitude;
    const north = (point.latitude - originLatitude) * metersPerDegreeLatitude;
    const right = east * Math.cos(bearingRadians) - north * Math.sin(bearingRadians);
    const up = east * Math.sin(bearingRadians) + north * Math.cos(bearingRadians);
    minRight = Math.min(minRight, right);
    maxRight = Math.max(maxRight, right);
    minUp = Math.min(minUp, up);
    maxUp = Math.max(maxUp, up);
  }
  const midRight = (minRight + maxRight) / 2;
  const midUp = (minUp + maxUp) / 2;
  const east = midRight * Math.cos(bearingRadians) + midUp * Math.sin(bearingRadians);
  const north = -midRight * Math.sin(bearingRadians) + midUp * Math.cos(bearingRadians);
  const centerLatitude = originLatitude + north / metersPerDegreeLatitude;
  const latitude = (centerLatitude * Math.PI) / 180;
  const metersPerPixel = 156543.03392 * Math.cos(latitude);
  const spanRight = Math.max(maxRight - minRight, 25) * 1.35;
  const spanUp = Math.max(maxUp - minUp, 25) * 1.35;
  const zoom = Math.min(
    19,
    Math.max(
      2,
      Math.min(Math.log2((metersPerPixel * width) / spanRight), Math.log2((metersPerPixel * height) / spanUp)),
    ),
  );
  try {
    camera.setStop({
      center: [originLongitude + east / metersPerDegreeLongitude, centerLatitude],
      zoom,
      bearing,
      duration: 0,
    });
    return true;
  } catch {
    return false;
  }
}

function ScoreStepper({
  strokes,
  facts,
  onChange,
  onOpenCard,
}: {
  strokes: number | null;
  facts: string | null;
  onChange: (strokes: number | null) => void;
  onOpenCard: () => void;
}) {
  const palette = usePalette();
  return (
    <View className="absolute left-[72px] top-3 flex-row items-center gap-2">
      <View className="flex-row items-center gap-1 px-1 py-1" style={buttonFace(palette, "card")}>
        {facts ? <Text className="pl-2 text-xs font-semibold" style={{ color: palette.muted }}>{facts}</Text> : null}
        <Pressable
          onPress={() => onChange(strokes == null || strokes <= 1 ? null : strokes - 1)}
          className="h-9 w-9 items-center justify-center"
          style={buttonFace(palette, "surface")}
        >
          <Text className="text-lg font-semibold" style={{ color: palette.text }}>−</Text>
        </Pressable>
        <Text className="w-8 text-center text-base font-semibold" style={{ color: palette.text }}>{strokes ?? "–"}</Text>
        <Pressable
          onPress={() => onChange((strokes ?? 0) + 1)}
          className="h-9 w-9 items-center justify-center"
          style={buttonFace(palette, "tint")}
        >
          <Text className="text-lg font-semibold text-on-tint">+</Text>
        </Pressable>
      </View>
      <Pressable onPress={onOpenCard} className="h-11 w-11 items-center justify-center" style={buttonFace(palette, "tint")}>
        <SymbolView
          name={{ ios: "list.clipboard.fill", android: "leaderboard", web: "leaderboard" }}
          tintColor="#25292e"
          size={22}
        />
      </Pressable>
    </View>
  );
}

function HoleMark({ selected = false }: { selected?: boolean }) {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: selected ? "#25292e" : "#f4f4f5",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: selected ? "#ffd33d" : "#25292e", fontSize: 13, fontWeight: "700" }}>H</Text>
    </View>
  );
}
