import api from "./api";

class AuthService {
  async login(data) {
    const response = await api.post("/auth/login", data);

    return response.data;
  }

  async updateProfile(data) {
    const response = await api.put("/auth/profile", data);

    return response.data;
  }

  async register(data) {
    const response = await api.post("/auth/register", data);

    return response.data;
  }

  async loginWithGoogle(idToken) {
    const response = await api.post("/auth/google", { idToken });

    return response.data;
  }

  async getGoogleClientId() {
    const response = await api.get("/auth/google/client-id");

    return response.data?.clientId || null;
  }
}

export default new AuthService();
