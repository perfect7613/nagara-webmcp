import { InferenceClient } from "@huggingface/inference";

export type Capability =
  | "instruct_edit"
  | "inpaint"
  | "upscale"
  | "remove_background"
  | "segment"
  | "generate";

export type ProviderErrorCode =
  | "refused"
  | "too_large"
  | "rate_limited"
  | "transient"
  | "failed";

export interface ProviderResult {
  bytes: Uint8Array;
  mimeType: string;
  width?: number;
  height?: number;
  provider: string;
  model?: string;
  labeledDemoFallback?: boolean;
}

export interface ImageProvider {
  id: string;
  capabilities: Capability[];
  edit(input: {
    sourceBytes: Uint8Array;
    sourceMime: string;
    instruction: string;
    maskPng?: Uint8Array;
    strength?: number;
  }): Promise<ProviderResult>;
}

export class ProviderFailure extends Error {
  code: ProviderErrorCode;
  constructor(code: ProviderErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function createHuggingFaceProvider(): ImageProvider {
  const token = process.env.HF_TOKEN;
  const model = process.env.HF_EDIT_MODEL ?? "Qwen/Qwen-Image-Edit-2509";
  const provider = (process.env.HF_EDIT_PROVIDER ?? "auto") as "auto" | string;

  return {
    id: "huggingface",
    capabilities: ["instruct_edit", "inpaint", "generate"],
    async edit(input) {
      if (!token) {
        throw new ProviderFailure("failed", "HF_TOKEN is not configured.");
      }
      const client = new InferenceClient(token);
      const bytes = Uint8Array.from(input.sourceBytes);
      const blob = new Blob([bytes], { type: input.sourceMime });
      try {
        const result = await client.imageToImage({
          model,
          provider: provider === "auto" ? undefined : (provider as never),
          inputs: blob,
          parameters: {
            prompt: input.instruction,
            strength: input.strength ?? 0.8,
          },
        });
        const bytes = new Uint8Array(await result.arrayBuffer());
        return {
          bytes,
          mimeType: result.type || "image/png",
          provider: "huggingface",
          model,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Provider failed.";
        if (/rate/i.test(message)) throw new ProviderFailure("rate_limited", message);
        if (/refus|nsfw|safety/i.test(message)) throw new ProviderFailure("refused", message);
        if (/size|too large/i.test(message)) throw new ProviderFailure("too_large", message);
        throw new ProviderFailure("failed", message);
      }
    },
  };
}
