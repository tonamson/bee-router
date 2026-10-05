import { OPENAI_BLOCK } from "../schema/index.js";

// Text-only content works with providers that require string messages. Keep
// multimodal arrays intact so images and other content parts retain their order.
export function collapseTextParts(parts) {
  return parts.length > 0 && parts.every(part => part?.type === OPENAI_BLOCK.TEXT)
    ? parts.map(part => part.text).join("\n")
    : parts;
}
