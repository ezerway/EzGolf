import type { RefObject } from "react";
import { Pressable, Text, View } from "react-native";
import { type CameraRef, type MapRef } from "@maplibre/maplibre-react-native";

export function MapZoomControls({
  mapRef,
  cameraRef,
  className,
}: {
  mapRef: RefObject<MapRef | null>;
  cameraRef: RefObject<CameraRef | null>;
  className?: string;
}) {
  async function zoomBy(delta: number) {
    const current = await mapRef.current?.getZoom();
    if (current == null || !Number.isFinite(current)) {
      return;
    }
    const next = Math.min(20, Math.max(2, current + delta));
    try {
      cameraRef.current?.zoomTo(next, { duration: 200 });
    } catch {
      // The camera is still attaching to the map.
    }
  }

  return (
    <View className={`gap-2 ${className ?? ""}`}>
      <Pressable
        onPress={() => void zoomBy(1)}
        className="h-11 w-11 items-center justify-center rounded-full bg-card"
      >
        <Text className="text-xl font-semibold text-ink">+</Text>
      </Pressable>
      <Pressable
        onPress={() => void zoomBy(-1)}
        className="h-11 w-11 items-center justify-center rounded-full bg-card"
      >
        <Text className="text-xl font-semibold text-ink">−</Text>
      </Pressable>
    </View>
  );
}
