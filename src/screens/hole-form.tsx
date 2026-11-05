import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";

import { FeatureMap, type DraftFeature, type MapTool } from "@/components/feature-map";
import { FormField } from "@/components/form-field";
import { useT } from "@/i18n";
import { fetchFeatures, useCoursesStore } from "@/stores/courses";
import type { LatLng } from "@/utils/coordinates";

export function HoleFormScreen({
  courseId,
  layoutId,
  holeId,
}: {
  courseId: number;
  layoutId: number;
  holeId: number | null;
}) {
  const course = useCoursesStore((state) => state.courses.find((item) => item.id === courseId));
  const t = useT();
  const status = useCoursesStore((state) => state.status);
  const load = useCoursesStore((state) => state.load);
  const saveHole = useCoursesStore((state) => state.saveHole);
  const removeHole = useCoursesStore((state) => state.removeHole);
  const layout = course?.layouts.find((item) => item.id === layoutId);
  const [name, setName] = useState("");
  const [par, setPar] = useState("");
  const [strokeIndex, setStrokeIndex] = useState("");
  const [corners, setCorners] = useState<LatLng[]>([]);
  const [features, setFeatures] = useState<DraftFeature[]>([]);
  const [tool, setTool] = useState<MapTool>("corner");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    if (status === "loading") {
      void load();
    }
  }, [load, status]);

  useEffect(() => {
    if (!layout || hydrated.current) {
      return;
    }
    if (holeId == null) {
      hydrated.current = true;
      setName(nextHoleName(layout.name, layout.holes));
      return;
    }
    const hole = layout.holes.find((item) => item.id === holeId);
    if (!hole) {
      return;
    }
    hydrated.current = true;
    setName(hole.name);
    setPar(hole.par != null ? String(hole.par) : "");
    setStrokeIndex(hole.strokeIndex != null ? String(hole.strokeIndex) : "");
    setCorners(hole.corners ?? []);
    void fetchFeatures([layout.id]).then((rows) => {
      setFeatures(
        rows.flatMap((feature) =>
          feature.holeId === hole.id
            ? [
                {
                  key: String(feature.id),
                  kind: feature.kind,
                  latitude: feature.latitude,
                  longitude: feature.longitude,
                },
              ]
            : [],
        ),
      );
    });
  }, [holeId, layout]);

  async function save() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("hole.needName"));
      return;
    }
    if (corners.length > 0 && corners.length < 3) {
      setError(t("hole.needCorners"));
      return;
    }
    const parValue = wholeNumber(par);
    const indexValue = wholeNumber(strokeIndex);
    if (parValue === undefined || indexValue === undefined) {
      setError(t("hole.needNumbers"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveHole(layoutId, holeId, {
        name: trimmedName,
        par: parValue,
        strokeIndex: indexValue,
        corners: corners.length >= 3 ? corners : null,
        features: features.map((feature) => ({
          kind: feature.kind,
          latitude: feature.latitude,
          longitude: feature.longitude,
        })),
      });
      router.back();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("hole.saveFailed"));
      setSaving(false);
    }
  }

  function confirmRemove() {
    if (holeId == null) {
      return;
    }
    Alert.alert(t("hole.removeTitle"), t("hole.removeBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: () => {
          void removeHole(holeId).then(() => router.back());
        },
      },
    ]);
  }

  const hole = holeId == null ? null : layout?.holes.find((item) => item.id === holeId);
  if (!course || !layout || (holeId != null && !hole && !hydrated.current)) {
    const missing = status === "ready";
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base text-ink">
          {missing ? t("hole.unavailable") : t("hole.opening")}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: holeId == null ? t("nav.addHole") : t("nav.editHole") }} />
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-4 px-4 py-6"
      >
        <FormField label={t("common.name")} value={name} onChangeText={setName} placeholder="1" autoCapitalize="words" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField label={t("hole.par")} value={par} onChangeText={setPar} placeholder="4" keyboardType="number-pad" />
          </View>
          <View className="flex-1">
            <FormField label={t("hole.index")} value={strokeIndex} onChangeText={setStrokeIndex} placeholder="1" keyboardType="number-pad" />
          </View>
        </View>
        <View className="gap-2">
          <Text className="text-sm text-muted">{t("hole.map")}</Text>
          <Text className="text-sm text-muted">{t("hole.mapHint")}</Text>
        </View>
        <FeatureMap
          corners={corners}
          features={features}
          tool={tool}
          onTool={setTool}
          onInteractionChange={(active) => {
            scrollRef.current?.setNativeProps({ scrollEnabled: !active });
          }}
          onAddCorner={(point) => setCorners((current) => [...current, point])}
          onRemoveCorner={(index) => setCorners((current) => current.filter((_, item) => item !== index))}
          onMoveCorner={(index, point) =>
            setCorners((current) => current.map((corner, item) => (item === index ? point : corner)))
          }
          onAdd={(point) => {
            if (tool === "corner") {
              return;
            }
            setFeatures((current) => [
              ...current,
              { key: createKey(), kind: tool, latitude: point.latitude, longitude: point.longitude },
            ]);
          }}
          onRemove={(key) => setFeatures((current) => current.filter((feature) => feature.key !== key))}
          onMove={(key, point) =>
            setFeatures((current) =>
              current.map((feature) =>
                feature.key === key ? { ...feature, latitude: point.latitude, longitude: point.longitude } : feature,
              ),
            )
          }
          focusPoints={
            (holeId == null ? null : layout.holes.find((item) => item.id === holeId)?.corners) ??
            (holeId == null ? layout.holes[layout.holes.length - 1]?.corners : null) ??
            layout.corners ??
            course.corners ??
            undefined
          }
        />
        {error ? (
          <Text className="text-sm text-tint" selectable>
            {error}
          </Text>
        ) : null}
        <Pressable
          onPress={() => void save()}
          disabled={saving}
          className="items-center rounded-full bg-tint px-5 py-4"
        >
          <Text className="text-base font-semibold text-on-tint">{saving ? t("common.saving") : t("hole.save")}</Text>
        </Pressable>
        {holeId != null ? (
          <Pressable onPress={confirmRemove} className="items-center py-2">
            <Text className="text-base font-semibold text-tint">{t("hole.remove")}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </>
  );
}

function nextHoleName(layoutName: string, holes: { name: string }[]) {
  const used = holes.map((hole) => {
    const match = /^(\d+)/.exec(hole.name.trim());
    return match ? Number(match[1]) : 0;
  });
  const next = Math.max(holes.length, ...used, 0) + 1;
  const courseName = layoutName.trim();
  return courseName ? `${next} ${courseName}` : String(next);
}

function createKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function wholeNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d+$/.test(trimmed) || Number(trimmed) < 1) {
    return undefined;
  }
  return Number(trimmed);
}

