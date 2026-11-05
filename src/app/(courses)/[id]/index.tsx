import { useLocalSearchParams } from "expo-router";

import { CourseDetailScreen } from "@/screens/course-detail";

export default function CourseDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CourseDetailScreen id={Number(Array.isArray(id) ? id[0] : id)} />;
}
