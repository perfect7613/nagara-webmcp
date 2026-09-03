import type { Metadata } from "next";
import { WorldPage } from "@/components/world-page";
import { PRODUCT_NAME, PRODUCT_PROMISE } from "@/domain/product";

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} — The city, on record`,
  description: PRODUCT_PROMISE,
};

export default function World() {
  return <WorldPage />;
}
