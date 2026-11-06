import type { RefObject } from "react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { type CameraRef, type MapRef } from "@maplibre/maplibre-react-native";
import { SymbolView } from "expo-symbols";

import { buttonFace } from "@/components/button-face";
import { satelliteMapStyle, streetMapStyle, type AppMapStyle } from "@/components/map-style";
import { useT } from "@/i18n";
import { usePalette } from "@/theme";

export function MapZoomControls({
  mapRef,
  cameraRef,
  className,
  onStyleChange,
}: {
  mapRef: RefObject<MapRef | null>;
  cameraRef: RefObject<CameraRef | null>;
  className?: string;
  onStyleChange: (style: AppMapStyle) => void;
}) {
  const palette = usePalette();
  const t = useT();
  const [satellite, setSatellite] = useState(false);
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

  function toggleStyle() {
    const next = !satellite;
    setSatellite(next);
    onStyleChange(next ? satelliteMapStyle : streetMapStyle);
  }

  return (
    <View className={`gap-2 ${className ?? ""}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={satellite ? t("map.street") : t("map.satellite")}
        onPress={toggleStyle}
        className="h-11 w-11 items-center justify-center"
        style={buttonFace(palette, satellite ? "tint" : "card")}
      >
        <SymbolView
          name={{ ios: "square.3.layers.3d", android: "layers", web: "layers" }}
          tintColor={satellite ? palette.onTint : palette.text}
          size={22}
        />
      </Pressable>
      <Pressable
        onPress={() => void zoomBy(1)}
        className="h-11 w-11 items-center justify-center"
        style={buttonFace(palette, "card")}
      >
        <Text className="text-xl font-semibold" style={{ color: palette.text }}>+</Text>
      </Pressable>
      <Pressable
        onPress={() => void zoomBy(-1)}
        className="h-11 w-11 items-center justify-center"
        style={buttonFace(palette, "card")}
      >
        <Text className="text-xl font-semibold" style={{ color: palette.text }}>−</Text>
      </Pressable>
    </View>
  );
}
