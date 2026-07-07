import userRepository from "../repositories/UserRepository.js";

type UpdateProfilePayload = {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  address?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  complement?: string;
};

class UpdateProfileService {
  async execute(userId: number | string, profileData: UpdateProfilePayload) {
    const currentUser = await userRepository.findById(userId);

    if (!currentUser) {
      throw new Error("Usuário não encontrado!");
    }

    const nextEmail = String(profileData.email || "").trim();
    if (nextEmail && nextEmail !== currentUser.email) {
      const emailInUse = await userRepository.findByEmail(nextEmail);

      if (emailInUse && Number(emailInUse.id) !== Number(userId)) {
        throw new Error("Este e-mail já está em uso!");
      }
    }

    return userRepository.updateProfile(userId, {
      name: String(profileData.name || "").trim(),
      email: nextEmail,
      phone: String(profileData.phone || "").trim() || null,
      cpf: String(profileData.cpf || "").replace(/\D/g, "") || null,
      address: String(profileData.address || "").trim() || null,
      number: String(profileData.number || "").trim() || null,
      district: String(profileData.district || "").trim() || null,
      city: String(profileData.city || "").trim() || null,
      state: String(profileData.state || "").trim() || null,
      zipCode: String(profileData.zipCode || "").trim() || null,
      complement: String(profileData.complement || "").trim() || null,
    });
  }
}

export default new UpdateProfileService();
