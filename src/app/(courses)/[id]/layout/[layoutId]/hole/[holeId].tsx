import { useGlobalSearchParams } from "expo-router";

import { HoleFormScreen } from "@/screens/hole-form";

export default function HoleRoute() {
  const params = useGlobalSearchParams<{ id?: string; layoutId?: string; holeId?: string }>();
  const id = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const layoutId = Number(Array.isArray(params.layoutId) ? params.layoutId[0] : params.layoutId);
  const holeParam = Array.isArray(params.holeId) ? params.holeId[0] : params.holeId;
  const holeId = holeParam === "new" ? null : Number(holeParam);
  return (
    <HoleFormScreen
      courseId={Number.isFinite(id) ? id : 0}
      layoutId={Number.isFinite(layoutId) ? layoutId : 0}
      holeId={holeId != null && Number.isFinite(holeId) ? holeId : null}
    />
  );
}
