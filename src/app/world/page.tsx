import type { Metadata } from "next";
import { WorldPage } from "@/components/world-page";
import { PRODUCT_NAME, PRODUCT_PROMISE } from "@/domain/product";

export const metadata: Metadata = {
  title: `${PRODUCT_NAME}: what is on the map`,
  description: PRODUCT_PROMISE,
};

export default function World() {
  return <WorldPage />;
}
