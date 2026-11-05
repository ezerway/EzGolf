import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";

import { FormField } from "@/components/form-field";
import { useT } from "@/i18n";
import { useCoursesStore } from "@/stores/courses";
import { holeFacts } from "@/utils/hole-facts";

export function LayoutFormScreen({
  courseId,
  layoutId,
  openHole,
}: {
  courseId: number;
  layoutId: number | null;
  openHole?: string;
}) {
  const course = useCoursesStore((state) => state.courses.find((item) => item.id === courseId));
  const status = useCoursesStore((state) => state.status);
  const t = useT();
  const load = useCoursesStore((state) => state.load);
  const saveLayout = useCoursesStore((state) => state.saveLayout);
  const removeLayout = useCoursesStore((state) => state.removeLayout);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hydrated = useRef(false);
  const openedHole = useRef(false);

  useEffect(() => {
    if (status === "loading") {
      void load();
    }
  }, [load, status]);

  useEffect(() => {
    if (!course || hydrated.current) {
      return;
    }
    if (layoutId == null) {
      hydrated.current = true;
      setAddress(course.address);
      setPhone(course.phone ?? "");
      setWebsite(course.website ?? "");
      setDescription(course.description ?? "");
      return;
    }
    const layout = course.layouts.find((item) => item.id === layoutId);
    if (!layout) {
      return;
    }
    hydrated.current = true;
    setName(layout.name);
    setAddress(layout.address ?? "");
    setPhone(layout.phone ?? "");
    setWebsite(layout.website ?? "");
    setDescription(layout.description ?? "");
  }, [course, layoutId]);

  useEffect(() => {
    if (!layoutId || !openHole || openedHole.current) {
      return;
    }
    openedHole.current = true;
    router.setParams({ openHole: "" });
    router.push({
      pathname: "/[id]/layout/[layoutId]/hole/[holeId]",
      params: { id: String(courseId), layoutId: String(layoutId), holeId: openHole },
    });
  }, [courseId, layoutId, openHole]);

  function layoutInput() {
    return {
      name: name.trim(),
      address: blank(address),
      phone: blank(phone),
      website: blank(website),
      description: blank(description),
    };
  }

  async function save() {
    const input = layoutInput();
    if (!input.name) {
      setError(t("layout.needName"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveLayout(courseId, layoutId, input);
      router.back();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("club.saveFailed"));
      setSaving(false);
    }
  }

  async function openHoleEditor(holeId: string) {
    const input = layoutInput();
    if (!input.name) {
      setError(t("layout.needNameFirst"));
      return;
    }
    setError(null);
    if (layoutId == null) {
      setSaving(true);
      try {
        const savedId = await saveLayout(courseId, null, input);
        router.replace({
          pathname: "/[id]/layout/[layoutId]",
          params: { id: String(courseId), layoutId: String(savedId), openHole: holeId },
        });
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : t("club.saveFailed"));
        setSaving(false);
      }
      return;
    }
    router.push({
      pathname: "/[id]/layout/[layoutId]/hole/[holeId]",
      params: { id: String(courseId), layoutId: String(layoutId), holeId },
    });
  }

  function confirmRemove() {
    if (layoutId == null) {
      return;
    }
    Alert.alert(t("layout.removeTitle"), t("layout.removeBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: () => {
          void removeLayout(layoutId).then(() => router.back());
        },
      },
    ]);
  }

  const layout = layoutId == null ? null : course?.layouts.find((item) => item.id === layoutId);
  if (!course || (layoutId != null && !layout && !hydrated.current)) {
    const missing = status === "ready" && (!course || layoutId != null);
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base text-ink">
          {missing ? t("course.unavailable") : t("course.opening")}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: layoutId == null ? t("nav.addCourse") : t("nav.editCourse") }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-4 px-4 py-6"
      >
        <FormField label={t("common.name")} value={name} onChangeText={setName} placeholder={t("layout.placeholderName")} autoCapitalize="words" />
        <FormField label={t("common.address")} value={address} onChangeText={setAddress} placeholder={t("common.address")} autoCapitalize="words" />
        <FormField label={t("common.phone")} value={phone} onChangeText={setPhone} placeholder={t("common.optional")} keyboardType="phone-pad" />
        <FormField
          label={t("common.website")}
          value={website}
          onChangeText={setWebsite}
          placeholder={t("common.optional")}
          autoCapitalize="none"
          keyboardType="url"
        />
        <FormField
          label={t("common.about")}
          value={description}
          onChangeText={setDescription}
          placeholder={t("club.placeholderAbout")}
          multiline
        />
        <View className="gap-3">
          <Text className="text-sm text-muted">{t("layout.holes")}</Text>
          <Text className="text-sm text-muted">{t("layout.holesHint")}</Text>
          {layout?.holes.map((hole) => (
            <Pressable
              key={hole.id}
              onPress={() =>
                router.push({
                  pathname: "/[id]/layout/[layoutId]/hole/[holeId]",
                  params: { id: String(courseId), layoutId: String(layout.id), holeId: String(hole.id) },
                })
              }
              className="rounded-2xl bg-card px-4 py-4"
            >
              <Text className="text-base font-semibold text-ink">{hole.name}</Text>
              <Text className="mt-1 text-sm text-muted">
                {[holeFacts(hole, t), hole.corners ? t("layout.cornersSet") : t("layout.cornersMissing")].filter(Boolean).join(" · ")}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={() => void openHoleEditor("new")} className="self-start">
            <Text className="text-base font-semibold text-tint">{t("layout.addHole")}</Text>
          </Pressable>
        </View>
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
          <Text className="text-base font-semibold text-on-tint">{saving ? t("common.saving") : t("layout.save")}</Text>
        </Pressable>
        {layoutId != null && course.layouts.length > 1 ? (
          <Pressable onPress={confirmRemove} className="items-center py-2">
            <Text className="text-base font-semibold text-tint">{t("layout.remove")}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </>
  );
}

function blank(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

