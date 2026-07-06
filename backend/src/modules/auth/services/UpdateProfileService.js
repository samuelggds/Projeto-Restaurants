import userRepository from "../repositories/UserRepository.js";

class UpdateProfileService {
  async execute(userId, profileData) {
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
