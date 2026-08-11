import OpenAI, { toFile } from "openai";

const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/;

class EnhanceRestaurantImageService {
  async execute(imageDataUrl: unknown) {
    const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) throw new Error("OPENAI_API_KEY não configurada no servidor.");

    const match = String(imageDataUrl || "").match(DATA_URL_PATTERN);
    if (!match) throw new Error("Envie uma imagem JPG, PNG ou WebP válida.");

    const input = Buffer.from(match[2], "base64");
    if (!input.length || input.length > 5 * 1024 * 1024) {
      throw new Error("A imagem deve ter no máximo 5 MB.");
    }

    const client = new OpenAI({ apiKey });
    const editRequest: OpenAI.Images.ImageEditParams = {
      model: "gpt-image-2",
      image: await toFile(input, "restaurant-cover.webp", { type: match[1] }),
      prompt: "Create a polished high-definition square login hero from this restaurant brand image. Faithfully restore the complete original logo, lettering, colors and identity with crisp clean edges. Place the entire logo centered and clearly visible, occupying at most 55 percent of the canvas, with generous space around it. Build a tasteful, softly lit pizza restaurant background that complements the logo. Remove blur, pixelation and compression artifacts. Do not crop the logo, do not enlarge it to fill the canvas, do not alter its wording, and do not add new text, brands or watermarks.",
      size: "1024x1024",
      quality: "high",
    };
    const result = await client.images.edit(editRequest);

    const base64 = result.data?.[0]?.b64_json;
    if (!base64) throw new Error("A IA não retornou a imagem melhorada.");
    return { imageDataUrl: `data:image/png;base64,${base64}` };
  }
}

export default new EnhanceRestaurantImageService();
