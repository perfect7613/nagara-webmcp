"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const CreateMap = dynamic(() => import("@/components/create-map").then((mod) => mod.CreateMap), {
  ssr: false,
  loading: () => <div className="map-app" />,
});

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="map-app" />}>
      <CreateMap />
    </Suspense>
  );
}
