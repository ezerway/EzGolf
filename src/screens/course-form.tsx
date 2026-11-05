import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";

import { FormField } from "@/components/form-field";
import { useT } from "@/i18n";
import { useCoursesStore } from "@/stores/courses";
import { formatHoleCount } from "@/utils/hole-facts";

export function CourseFormScreen({ courseId, openLayout }: { courseId?: number; openLayout?: string }) {
  const courses = useCoursesStore((state) => state.courses);
  const status = useCoursesStore((state) => state.status);
  const load = useCoursesStore((state) => state.load);
  const addCourse = useCoursesStore((state) => state.addCourse);
  const updateCourse = useCoursesStore((state) => state.updateCourse);
  const removeLayout = useCoursesStore((state) => state.removeLayout);
  const t = useT();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hydrated = useRef(false);
  const openedLayout = useRef(false);
  const course = courseId ? courses.find((item) => item.id === courseId) : undefined;

  useEffect(() => {
    if (courseId && status === "loading") {
      void load();
    }
  }, [courseId, load, status]);

  useEffect(() => {
    if (!course || hydrated.current) {
      return;
    }
    hydrated.current = true;
    setName(course.name);
    setAddress(course.address);
    setPhone(course.phone ?? "");
    setWebsite(course.website ?? "");
    setDescription(course.description ?? "");
    setPhotoUri(course.photoUri);
  }, [course]);

  useEffect(() => {
    if (!courseId || !openLayout || openedLayout.current) {
      return;
    }
    openedLayout.current = true;
    router.setParams({ openLayout: "" });
    router.push({
      pathname: "/[id]/layout/[layoutId]",
      params: { id: String(courseId), layoutId: openLayout },
    });
  }, [courseId, openLayout]);

  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0]?.uri ?? null);
    }
  }

  function courseInput() {
    return {
      name: name.trim(),
      address: address.trim(),
      photoUri,
      phone,
      website,
      description,
      corners: course?.corners ?? null,
      layouts: [],
      features: [],
    };
  }

  async function save() {
    const input = courseInput();
    if (!input.name || !input.address) {
      setError(t("club.needName"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (courseId) {
        await updateCourse(courseId, input);
      } else {
        await addCourse(input);
      }
      router.back();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("club.saveFailed"));
      setSaving(false);
    }
  }

  async function openLayoutEditor(layoutId: string) {
    const input = courseInput();
    if (!input.name || !input.address) {
      setError(t("club.needNameFirst"));
      return;
    }
    setError(null);
    if (!courseId) {
      setSaving(true);
      try {
        const id = await addCourse(input);
        const created = useCoursesStore.getState().courses.find((item) => item.id === id);
        const firstLayout = created?.layouts[0]?.id;
        router.replace({
          pathname: "/[id]/edit",
          params: {
            id: String(id),
            openLayout: firstLayout != null ? String(firstLayout) : "new",
          },
        });
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : t("club.saveFailed"));
        setSaving(false);
      }
      return;
    }
    router.push({
      pathname: "/[id]/layout/[layoutId]",
      params: { id: String(courseId), layoutId },
    });
  }

  if (courseId && !hydrated.current) {
    const found = status === "ready" && courses.some((item) => item.id === courseId);
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base text-ink">
          {status === "ready" && !found ? t("course.unavailable") : t("course.opening")}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: courseId ? t("nav.editClub") : t("nav.addClub") }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-4 px-4 py-6"
      >
        <Pressable onPress={() => void choosePhoto()} className="items-center">
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              contentFit="cover"
              style={{ width: 120, height: 120, borderRadius: 20, borderCurve: "continuous" }}
            />
          ) : (
            <View className="h-28 w-28 items-center justify-center rounded-3xl bg-card">
              <Text className="text-sm font-semibold text-tint">{t("club.photo")}</Text>
            </View>
          )}
        </Pressable>
        <FormField label={t("common.name")} value={name} onChangeText={setName} placeholder={t("club.placeholderName")} autoCapitalize="words" />
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
          <Text className="text-sm text-muted">{t("club.courses")}</Text>
          <Text className="text-sm text-muted">{t("club.coursesHint")}</Text>
          {course?.layouts.map((layout) => (
            <View key={layout.id} className="flex-row items-center justify-between rounded-2xl bg-card px-4 py-4">
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/[id]/layout/[layoutId]",
                    params: { id: String(course.id), layoutId: String(layout.id) },
                  })
                }
                className="flex-1"
              >
                <Text className="text-base font-semibold text-ink">{layout.name}</Text>
                <Text className="mt-1 text-sm text-muted">{formatHoleCount(layout.holes.length, t)}</Text>
              </Pressable>
              {course.layouts.length > 1 ? (
                <Pressable
                  onPress={() => {
                    Alert.alert(t("layout.removeTitle"), t("layout.removeBody"), [
                      { text: t("common.cancel"), style: "cancel" },
                      {
                        text: t("common.remove"),
                        style: "destructive",
                        onPress: () => void removeLayout(layout.id),
                      },
                    ]);
                  }}
                  hitSlop={8}
                >
                  <Text className="text-sm text-tint">{t("common.remove")}</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          <Pressable onPress={() => void openLayoutEditor("new")} className="self-start">
            <Text className="text-base font-semibold text-tint">
              {course && course.layouts.length > 0 ? t("club.addAnother") : t("club.addCourse")}
            </Text>
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
          <Text className="text-base font-semibold text-on-tint">{saving ? t("common.saving") : t("club.save")}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

