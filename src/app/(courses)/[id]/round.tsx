import { useGlobalSearchParams } from "expo-router";

import { CourseRoundScreen } from "@/screens/course-round";

export default function CourseRoundRoute() {
  const { id, layoutId } = useGlobalSearchParams<{ id: string; layoutId?: string }>();
  const courseId = Number(Array.isArray(id) ? id[0] : id);
  const selectedLayout = Number(Array.isArray(layoutId) ? layoutId[0] : layoutId);
  return <CourseRoundScreen id={courseId} layoutId={Number.isFinite(selectedLayout) ? selectedLayout : null} />;
}