import type { ImageProvider, ProviderResult } from "@/adapters/huggingface/provider";

/**
 * Labeled local preview — not a foundation model.
 * Safe in Node (no OffscreenCanvas). Used when HF_TOKEN is absent so the
 * Point → Create loop still completes for judges.
 */
export function createLocalPreviewProvider(): ImageProvider {
  return {
    id: "local-preview",
    capabilities: ["instruct_edit", "inpaint"],
    async edit(input) {
      const source = new TextDecoder().decode(input.sourceBytes);
      if (source.includes("<svg")) {
        const next = overlaySvg(source, input.instruction);
        return {
          bytes: new TextEncoder().encode(next),
          mimeType: "image/svg+xml",
          provider: "local-preview",
          labeledDemoFallback: true,
        };
      }
      return {
        bytes: input.sourceBytes,
        mimeType: input.sourceMime,
        provider: "local-preview",
        labeledDemoFallback: true,
      };
    },
  };
}

export function overlaySvg(svg: string, instruction: string): string {
  const text = instruction.toLowerCase();
  let overlay: string;
  if (text.includes("remove") || text.includes("inpaint") || text.includes("cooler")) {
    overlay = `<g data-preview="local">
      <rect x="62%" y="58%" width="22%" height="22%" fill="#c5d9cc" opacity="0.92"/>
      <text x="63%" y="54%" fill="#1c1914" font-size="28" font-family="Georgia, serif">removed · local preview</text>
    </g>`;
  } else if (text.includes("warm") || text.includes("postcard")) {
    overlay = `<rect data-preview="local" width="100%" height="100%" fill="#d48c30" opacity="0.18"/>`;
  } else {
    overlay = `<rect data-preview="local" width="100%" height="100%" fill="#fff" opacity="0.12"/>`;
  }
  return svg.replace("</svg>", `${overlay}</svg>`);
}
