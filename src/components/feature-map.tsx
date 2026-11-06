import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Camera, GeoJSONSource, Layer, Map, type CameraRef, type MapRef } from "@maplibre/maplibre-react-native";

import { buttonFace } from "@/components/button-face";
import { DraggablePin } from "@/components/draggable-pin";
import { MapZoomControls } from "@/components/map-zoom";
import { streetMapStyle, type AppMapStyle } from "@/components/map-style";
import { useT } from "@/i18n";
import { boundsFor, closedRing, type LatLng } from "@/utils/coordinates";
import { themeVars, usePalette, useScheme } from "@/theme";
import { featureCatalog, featureKinds, featureLabelKey, isTeeKind, type FeatureKind } from "@/utils/feature-kinds";

export type DraftFeature = {
  key: string;
  kind: FeatureKind;
  latitude: number;
  longitude: number;
};

export type MapTool = "corner" | FeatureKind;

export function FeatureMap({
  corners,
  features,
  tool,
  onTool,
  onAddCorner,
  onRemoveCorner,
  onMoveCorner,
  onAdd,
  onRemove,
  onMove,
  onInteractionChange,
  focusPoints,
}: {
  corners: LatLng[];
  features: DraftFeature[];
  tool: MapTool;
  onTool: (tool: MapTool) => void;
  onAddCorner: (point: LatLng) => void;
  onRemoveCorner: (index: number) => void;
  onMoveCorner: (index: number, point: LatLng) => void;
  onAdd: (point: LatLng) => void;
  onRemove: (key: string) => void;
  onMove: (key: string, point: LatLng) => void;
  onInteractionChange: (active: boolean) => void;
  focusPoints?: LatLng[];
}) {
  const t = useT();
  const palette = usePalette();
  const scheme = useScheme();
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const ignoreMapPress = useRef(false);
  const pinDragRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<AppMapStyle>(streetMapStyle);
  const [pinDrag, setPinDrag] = useState(false);
  const bounds = boundsFor(corners.length > 0 ? corners : (focusPoints ?? []));
  const openingBounds = useRef(bounds);
  const framed = useRef<"none" | "fallback" | "corners">("none");
  const polygon = corners.length >= 3 ? closedRing(corners) : null;

  useEffect(() => {
    if (!mapReady) {
      return;
    }
    const own = corners.length >= 3 ? corners : null;
    if (own) {
      if (framed.current === "corners") {
        return;
      }
      framed.current = "corners";
      fitFrame(cameraRef.current, own);
      return;
    }
    if (framed.current !== "none") {
      return;
    }
    if (!focusPoints || focusPoints.length === 0) {
      return;
    }
    framed.current = "fallback";
    fitFrame(cameraRef.current, focusPoints);
  }, [mapReady, corners, focusPoints]);

  function pinGesture(active: boolean) {
    pinDragRef.current = active;
    setPinDrag(active);
    onInteractionChange(active);
    if (active) {
      ignoreMapPress.current = true;
      return;
    }
    releaseMapPress(ignoreMapPress);
  }

  return (
    <View className="gap-3" style={themeVars[scheme]}>
      <View
        style={{ height: 360 }}
        onTouchStart={() => onInteractionChange(true)}
        onTouchEnd={() => {
          if (!pinDragRef.current) {
            onInteractionChange(false);
          }
        }}
        onTouchCancel={() => {
          if (!pinDragRef.current) {
            onInteractionChange(false);
          }
        }}
      >
        <Map
          ref={mapRef}
          style={{ height: 360 }}
          mapStyle={mapStyle}
          tintColor="#ffd33d"
          attributionPosition={{ top: 8, right: 8 }}
          logoPosition={{ top: 8, left: 8 }}
          dragPan={!pinDrag}
          touchRotate={!pinDrag}
          touchPitch={!pinDrag}
          onDidFinishLoadingMap={() => {
            setMapReady(true);
            const frame = openingBounds.current;
            if (!frame) {
              return;
            }
            try {
              cameraRef.current?.fitBounds(frame, {
                padding: { top: 24, right: 24, bottom: 72, left: 24 },
                duration: 0,
              });
            } catch {
              // The camera is still attaching to the map.
            }
          }}
          onPress={(event) => {
            if (ignoreMapPress.current) {
              return;
            }
            const [longitude, latitude] = event.nativeEvent.lngLat;
            const point = { latitude, longitude };
            if (tool === "corner") {
              onAddCorner(point);
              return;
            }
            onAdd(point);
          }}
        >
          <Camera
            ref={cameraRef}
            maxZoom={20}
            minZoom={2}
            initialViewState={
              openingBounds.current
                ? { bounds: openingBounds.current, padding: { top: 24, right: 24, bottom: 72, left: 24 } }
                : { center: [0, 20], zoom: 2 }
            }
          />
          {polygon ? (
            <GeoJSONSource
              id="editor-corners"
              data={{
                type: "Feature",
                properties: {},
                geometry: { type: "Polygon", coordinates: [polygon] },
              }}
            >
              <Layer
                id="editor-corners-fill"
                type="fill"
                source="editor-corners"
                paint={{ "fill-color": "#ffd33d", "fill-opacity": 0.18 }}
              />
              <Layer
                id="editor-corners-line"
                type="line"
                source="editor-corners"
                paint={{ "line-color": "#ffd33d", "line-width": 2 }}
              />
            </GeoJSONSource>
          ) : null}
          {mapReady
            ? corners.map((corner, index) => (
                <DraggablePin
                  key={`corner-${index}`}
                  id={`corner-${index}`}
                  point={corner}
                  mapRef={mapRef}
                  onDragChange={pinGesture}
                  onMove={(next) => onMoveCorner(index, next)}
                  onPress={() => onRemoveCorner(index)}
                >
                  <View
                    collapsable={false}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: "#ffd33d",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: "#25292e",
                    }}
                  >
                    <Text style={{ color: "#25292e", fontSize: 13, fontWeight: "700" }}>{index + 1}</Text>
                  </View>
                </DraggablePin>
              ))
            : null}
          {mapReady
            ? features.map((feature) => {
                const catalog = featureCatalog[feature.kind];
                return (
                  <DraggablePin
                    key={feature.key}
                    id={feature.key}
                    point={{ latitude: feature.latitude, longitude: feature.longitude }}
                    mapRef={mapRef}
                    onDragChange={pinGesture}
                    onMove={(next) => onMove(feature.key, next)}
                    onPress={() => onRemove(feature.key)}
                  >
                    <View
                      collapsable={false}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: catalog.color,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 2,
                        borderColor: "#25292e",
                      }}
                    >
                      <Text style={{ color: catalog.ink, fontSize: 13, fontWeight: "700" }}>{catalog.mark}</Text>
                    </View>
                  </DraggablePin>
                );
              })
            : null}
        </Map>
        <MapZoomControls mapRef={mapRef} cameraRef={cameraRef} className="absolute bottom-3 right-3" onStyleChange={setMapStyle} />
      </View>
      <View className="flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => onTool("corner")}
          className="px-4 py-2"
          style={buttonFace(palette, tool === "corner" ? "tint" : "card")}
        >
          <Text className="text-sm font-semibold" style={{ color: tool === "corner" ? palette.onTint : palette.text }}>
            {t("feature.corner")}
          </Text>
        </Pressable>
        {featureKinds.map((item) => {
          const selected = item === tool;
          const catalog = featureCatalog[item];
          if (isTeeKind(item)) {
            return (
              <Pressable
                key={item}
                onPress={() => onTool(item)}
                className="px-4 py-2"
                style={{
                  backgroundColor: catalog.color,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? "#ffd33d" : "#25292e",
                  borderRadius: 24,
                  overflow: "hidden",
                }}
              >
                <Text className="text-sm font-semibold" style={{ color: catalog.ink }}>
                  {t(featureLabelKey[item])}
                </Text>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={item}
              onPress={() => onTool(item)}
              className="px-4 py-2"
              style={buttonFace(palette, selected ? "tint" : "card")}
            >
              <Text className="text-sm font-semibold" style={{ color: selected ? palette.onTint : palette.text }}>
                {t(featureLabelKey[item])}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="text-sm" style={{ color: palette.muted }}>
        {tool === "corner"
          ? t("feature.cornerHint")
          : t("feature.placeHint", { label: t(featureLabelKey[tool]) })}
      </Text>
    </View>
  );
}

function fitFrame(camera: CameraRef | null, points: LatLng[]) {
  const frame = boundsFor(points);
  if (!camera || !frame) {
    return;
  }
  try {
    camera.fitBounds(frame, {
      padding: { top: 24, right: 24, bottom: 72, left: 24 },
      duration: 0,
    });
  } catch {
    // The camera is still attaching to the map.
  }
}

function releaseMapPress(ignoreMapPress: { current: boolean }) {
  setTimeout(() => {
    ignoreMapPress.current = false;
  }, 300);
}
