import { useLocalSearchParams } from "expo-router";

import { CoursePlayScreen } from "@/screens/course-play";

export default function CoursePlayRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CoursePlayScreen id={Number(Array.isArray(id) ? id[0] : id)} />;
}
