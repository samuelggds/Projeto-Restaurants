import updateProfileService from "../services/UpdateProfileService.js";

class UpdateProfileController {
  async handle(req, res) {
    try {
      const userId = req.user.id;
      const profileData = req.body;

      const user = await updateProfileService.execute(userId, profileData);

      return res.status(200).json(user);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new UpdateProfileController();
