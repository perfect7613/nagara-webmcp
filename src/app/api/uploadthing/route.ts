import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "@/adapters/uploadthing/core";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
