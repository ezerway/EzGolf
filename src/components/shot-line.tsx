import { GeoJSONSource, Layer, Marker, type MapRef } from "@maplibre/maplibre-react-native";
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { clampToArea, midpoint, yardsBetween, type LatLng } from "@/utils/coordinates";

const METERS_PER_PIXEL_AT_ZOOM_0 = 156543.03392;
const METERS_PER_DEGREE = 111320;

export function ShotLine({
  tee,
  cup,
  limit,
  mapRef,
  placeRef,
}: {
  tee: LatLng;
  cup: LatLng;
  limit: LatLng[] | null;
  mapRef: RefObject<MapRef | null>;
  placeRef: RefObject<((point: LatLng) => void) | null>;
}) {
  const [ball, setBall] = useState<LatLng>(() => clampToArea(midpoint(tee, cup), limit));
  const [anchor, setAnchor] = useState<LatLng | null>(null);
  const ballRef = useRef(ball);
  ballRef.current = ball;
  const origin = useRef<LatLng | null>(null);
  const frame = useRef<{ zoom: number; bearing: number } | null>(null);
  const pending = useRef<{ x: number; y: number } | null>(null);
  const handoff = useRef<LatLng | null>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.get() }, { translateY: dragY.get() }],
  }));
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const teeLat = tee.latitude;
  const teeLng = tee.longitude;
  const cupLat = cup.latitude;
  const cupLng = cup.longitude;

  const release = useCallback(() => {
    origin.current = null;
    frame.current = null;
    pending.current = null;
    handoff.current = null;
    dragX.set(0);
    dragY.set(0);
    setAnchor(null);
  }, [dragX, dragY]);

  const place = useCallback(
    (x: number, y: number) => {
      const start = origin.current;
      const view = frame.current;
      origin.current = null;
      frame.current = null;
      pending.current = null;
      if (!start || !view || (Math.abs(x) < 0.5 && Math.abs(y) < 0.5)) {
        release();
        return;
      }
      const next = clampToArea(shift(start, x, y, view.zoom, view.bearing), limitRef.current);
      if (samePoint(next, start)) {
        release();
        return;
      }
      handoff.current = next;
      setBall(next);
    },
    [release],
  );

  const begin = useCallback(() => {
    origin.current = ballRef.current;
    frame.current = null;
    pending.current = null;
    handoff.current = null;
    dragX.set(0);
    dragY.set(0);
    setAnchor(ballRef.current);
    const map = mapRef.current;
    if (!map) {
      return;
    }
    void Promise.all([map.getZoom(), map.getBearing()])
      .then(([zoom, bearing]) => {
        if (!Number.isFinite(zoom)) {
          release();
          return;
        }
        frame.current = { zoom, bearing: Number.isFinite(bearing) ? bearing : 0 };
        const queued = pending.current;
        if (queued) {
          pending.current = null;
          place(queued.x, queued.y);
        }
      })
      .catch(() => {
        release();
      });
  }, [dragX, dragY, mapRef, place, release]);

  const commit = useCallback(
    (x: number, y: number) => {
      if (!origin.current) {
        release();
        return;
      }
      if (!frame.current) {
        pending.current = { x, y };
        return;
      }
      place(x, y);
    },
    [place, release],
  );

  const moveBall = useCallback((point: LatLng) => {
    const next = clampToArea(point, limitRef.current);
    origin.current = null;
    frame.current = null;
    pending.current = null;
    handoff.current = null;
    dragX.set(0);
    dragY.set(0);
    setAnchor(null);
    ballRef.current = next;
    setBall(next);
  }, [dragX, dragY]);

  useLayoutEffect(() => {
    placeRef.current = moveBall;
    return () => {
      placeRef.current = null;
    };
  }, [moveBall, placeRef]);

  useLayoutEffect(() => {
    const next = clampToArea(
      midpoint({ latitude: teeLat, longitude: teeLng }, { latitude: cupLat, longitude: cupLng }),
      limitRef.current,
    );
    ballRef.current = next;
    handoff.current = null;
    dragX.set(0);
    dragY.set(0);
    setAnchor(null);
    setBall(next);
  }, [cupLat, cupLng, dragX, dragY, teeLat, teeLng]);

  useLayoutEffect(() => {
    const target = handoff.current;
    if (!target || !samePoint(ball, target)) {
      return;
    }
    dragX.set(0);
    dragY.set(0);
    origin.current = null;
    handoff.current = null;
    setAnchor(null);
  }, [ball, dragX, dragY]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(1)
        .maxPointers(1)
        .onBegin(() => {
          "worklet";
          scheduleOnRN(begin);
        })
        .onUpdate((event) => {
          "worklet";
          dragX.set(event.translationX);
          dragY.set(event.translationY);
        })
        .onFinalize((event) => {
          "worklet";
          scheduleOnRN(commit, event.translationX, event.translationY);
        }),
    [begin, commit, dragX, dragY],
  );

  const shown = anchor ?? ball;
  const teePoint = { latitude: teeLat, longitude: teeLng };
  const cupPoint = { latitude: cupLat, longitude: cupLng };
  const toTee = midpoint(teePoint, ball);
  const toCup = midpoint(ball, cupPoint);

  return (
    <>
      <GeoJSONSource
        id="shot-line"
        data={{
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [teeLng, teeLat],
              [ball.longitude, ball.latitude],
              [cupLng, cupLat],
            ],
          },
        }}
      >
        <Layer id="shot-line-layer" type="line" source="shot-line" paint={{ "line-color": "#ffffff", "line-width": 3 }} />
      </GeoJSONSource>
      <Marker id="shot-yards-tee" lngLat={[toTee.longitude, toTee.latitude]} anchor="center" offset={[0, -16]}>
        <YardLabel yards={yardsBetween(teePoint, ball)} />
      </Marker>
      <Marker id="shot-yards-cup" lngLat={[toCup.longitude, toCup.latitude]} anchor="center" offset={[0, -16]}>
        <YardLabel yards={yardsBetween(ball, cupPoint)} />
      </Marker>
      <Marker id="shot-ball" lngLat={[shown.longitude, shown.latitude]} anchor="center">
        <GestureDetector gesture={pan}>
          <Animated.View collapsable={false} style={animatedStyle}>
            <View collapsable={false} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <View
                collapsable={false}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "#ffffff",
                  borderWidth: 4,
                  borderColor: "#25292e",
                }}
              />
            </View>
          </Animated.View>
        </GestureDetector>
      </Marker>
    </>
  );
}

function YardLabel({ yards }: { yards: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        backgroundColor: "#25292e",
        borderColor: "#ffd33d",
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>{yards} yd</Text>
    </View>
  );
}

function samePoint(left: LatLng, right: LatLng) {
  return Math.abs(left.latitude - right.latitude) < 1e-7 && Math.abs(left.longitude - right.longitude) < 1e-7;
}

function shift(origin: LatLng, x: number, y: number, zoom: number, bearing: number): LatLng {
  const bearingRadians = (bearing * Math.PI) / 180;
  const latitudeRadians = (origin.latitude * Math.PI) / 180;
  const cosBearing = Math.cos(bearingRadians);
  const sinBearing = Math.sin(bearingRadians);
  const metersPerPixel = (METERS_PER_PIXEL_AT_ZOOM_0 * Math.cos(latitudeRadians)) / 2 ** zoom;
  const east = (x * cosBearing - y * sinBearing) * metersPerPixel;
  const north = (-x * sinBearing - y * cosBearing) * metersPerPixel;
  return {
    latitude: origin.latitude + north / METERS_PER_DEGREE,
    longitude: origin.longitude + east / (METERS_PER_DEGREE * Math.cos(latitudeRadians)),
  };
}
