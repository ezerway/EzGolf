import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactElement, type RefObject } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Marker, type MapRef } from "@maplibre/maplibre-react-native";

import type { LatLng } from "@/utils/coordinates";

const METERS_PER_PIXEL_AT_ZOOM_0 = 156543.03392;
const METERS_PER_DEGREE = 111320;
const PREVIEW_INTERVAL = 140;

export function DraggablePin({
  id,
  point,
  onMove,
  onPress,
  mapRef,
  onDragChange,
  children,
}: {
  id: string;
  point: LatLng;
  onMove: (point: LatLng) => void;
  onPress?: () => void;
  mapRef: RefObject<MapRef | null>;
  onDragChange?: (active: boolean) => void;
  children: ReactElement;
}) {
  const pointRef = useRef(point);
  pointRef.current = point;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  const onDragChangeRef = useRef(onDragChange);
  onDragChangeRef.current = onDragChange;
  const origin = useRef<LatLng | null>(null);
  const frame = useRef<{ zoom: number; bearing: number } | null>(null);
  const dragging = useRef(false);
  const dragged = useRef(false);
  const finished = useRef(false);
  const pressAt = useRef(0);
  const handoff = useRef<LatLng | null>(null);
  const pendingRelease = useRef<{ x: number; y: number } | null>(null);
  const [lock, setLock] = useState<LatLng | null>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const draggedFlag = useSharedValue(false);
  const lastPreview = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }, { translateY: dragY.value }],
  }));

  const releaseLock = useCallback(() => {
    pendingRelease.current = null;
    handoff.current = null;
    origin.current = null;
    dragX.value = 0;
    dragY.value = 0;
    setLock(null);
  }, [dragX, dragY]);

  const publish = useCallback((x: number, y: number, commit: boolean) => {
    const start = origin.current;
    const view = frame.current;
    if (!start || !view) {
      return;
    }
    const next = pointForTranslation(start, x, y, view.zoom, view.bearing);
    if (commit) {
      handoff.current = next;
    }
    onMoveRef.current(next);
  }, []);

  const begin = useCallback(() => {
    finished.current = false;
    dragged.current = false;
    dragging.current = true;
    handoff.current = null;
    origin.current = pointRef.current;
    frame.current = null;
    dragX.value = 0;
    dragY.value = 0;
    draggedFlag.value = false;
    lastPreview.value = 0;
    pendingRelease.current = null;
    setLock(pointRef.current);
    onDragChangeRef.current?.(true);
    const map = mapRef.current;
    if (!map) {
      return;
    }
    void Promise.all([map.getZoom(), map.getBearing()])
      .then(([zoom, bearing]) => {
        if (!Number.isFinite(zoom)) {
          releaseLock();
          return;
        }
        frame.current = { zoom, bearing: Number.isFinite(bearing) ? bearing : 0 };
        const release = pendingRelease.current;
        if (release) {
          pendingRelease.current = null;
          publish(release.x, release.y, true);
        }
      })
      .catch(() => {
        releaseLock();
      });
  }, [dragX, dragY, draggedFlag, lastPreview, mapRef, publish, releaseLock]);

  const preview = useCallback(
    (x: number, y: number) => {
      if (!dragging.current) {
        return;
      }
      publish(x, y, false);
    },
    [publish],
  );

  const finish = useCallback(
    (x: number, y: number) => {
      if (finished.current) {
        return;
      }
      finished.current = true;
      dragging.current = false;
      const didDrag = dragged.current;
      if (didDrag) {
        if (frame.current) {
          publish(x, y, true);
        } else {
          pendingRelease.current = { x, y };
        }
      } else {
        releaseLock();
        const now = Date.now();
        if (now - pressAt.current > 350) {
          pressAt.current = now;
          onPressRef.current?.();
        }
      }
      onDragChangeRef.current?.(false);
      setTimeout(() => {
        dragged.current = false;
      }, 350);
    },
    [publish, releaseLock],
  );

  const markDragged = useCallback(() => {
    dragged.current = true;
  }, []);

  useLayoutEffect(() => {
    const target = handoff.current;
    if (!target || !samePoint(point, target)) {
      return;
    }
    dragX.value = 0;
    dragY.value = 0;
    origin.current = null;
    handoff.current = null;
    setLock(null);
  }, [dragX, dragY, point]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(1)
        .maxPointers(1)
        .onBegin(() => {
          "worklet";
          runOnJS(begin)();
        })
        .onUpdate((event) => {
          "worklet";
          dragX.value = event.translationX;
          dragY.value = event.translationY;
          if (
            !draggedFlag.value &&
            event.translationX * event.translationX + event.translationY * event.translationY > 36
          ) {
            draggedFlag.value = true;
            runOnJS(markDragged)();
          }
          const now = Date.now();
          if (now - lastPreview.value < PREVIEW_INTERVAL) {
            return;
          }
          lastPreview.value = now;
          runOnJS(preview)(event.translationX, event.translationY);
        })
        .onFinalize((event) => {
          "worklet";
          runOnJS(finish)(event.translationX, event.translationY);
        }),
    [begin, dragX, dragY, draggedFlag, finish, lastPreview, markDragged, preview],
  );

  const shown = lock ?? point;

  return (
    <Marker
      id={id}
      lngLat={[shown.longitude, shown.latitude]}
      anchor="center"
      onPress={(event) => {
        event.stopPropagation();
        if (dragged.current || handoff.current) {
          return;
        }
        const now = Date.now();
        if (now - pressAt.current < 350) {
          return;
        }
        pressAt.current = now;
        onPress?.();
      }}
    >
      <GestureDetector gesture={pan}>
        <Animated.View
          collapsable={false}
          style={animatedStyle}
          onTouchStart={() => {
            onDragChangeRef.current?.(true);
          }}
          onTouchEnd={() => {
            if (!dragging.current) {
              onDragChangeRef.current?.(false);
            }
          }}
          onTouchCancel={() => {
            if (!dragging.current) {
              onDragChangeRef.current?.(false);
            }
          }}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </Marker>
  );
}

function samePoint(left: LatLng, right: LatLng) {
  return Math.abs(left.latitude - right.latitude) < 1e-7 && Math.abs(left.longitude - right.longitude) < 1e-7;
}

function pointForTranslation(origin: LatLng, x: number, y: number, zoom: number, bearing: number): LatLng {
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
