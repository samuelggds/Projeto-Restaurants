import api from "./api";

const imageEnhancementService = {
  async enhanceRestaurantImage(imageDataUrl: string) {
    const response = await api.post("/image-enhancement/restaurant", { imageDataUrl });
    return String(response.data?.imageDataUrl || "");
  },
};

export default imageEnhancementService;
