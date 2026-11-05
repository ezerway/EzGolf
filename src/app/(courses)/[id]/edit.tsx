import { useGlobalSearchParams } from "expo-router";

import { CourseFormScreen } from "@/screens/course-form";

export default function EditCourseRoute() {
  const params = useGlobalSearchParams<{ id?: string; openLayout?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const openLayout = Array.isArray(params.openLayout) ? params.openLayout[0] : params.openLayout;
  return <CourseFormScreen courseId={Number(id)} openLayout={openLayout || undefined} />;
}