import { useGlobalSearchParams } from "expo-router";

import { LayoutFormScreen } from "@/screens/layout-form";

export default function LayoutRoute() {
  const params = useGlobalSearchParams<{ id?: string; layoutId?: string; openHole?: string }>();
  const id = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const layoutParam = Array.isArray(params.layoutId) ? params.layoutId[0] : params.layoutId;
  const openHole = Array.isArray(params.openHole) ? params.openHole[0] : params.openHole;
  const layoutId = layoutParam === "new" ? null : Number(layoutParam);
  return (
    <LayoutFormScreen
      courseId={Number.isFinite(id) ? id : 0}
      layoutId={layoutId != null && Number.isFinite(layoutId) ? layoutId : null}
      openHole={openHole || undefined}
    />
  );
}
