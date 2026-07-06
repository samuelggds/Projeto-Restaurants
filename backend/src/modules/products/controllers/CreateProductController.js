import createProductService from "../services/CreateProductService.js";

class CreateProductController {
  async handle(req, res) {
    try {
      const {
        name,
        description,
        image,
        price,
        categoryId,
        active,
        featured,
        preparationTime,
        stock,
      } = req.body;

      const product = await createProductService.execute(
        {
          name,
          description,
          image,
          price,
          categoryId,
          active,
          featured,
          preparationTime,
          stock,
        },
        req.user.restaurantId,
      );

      return res.status(201).json(product);
    } catch (error) {
      return res.status(400).json({
        message: error.message,
      });
    }
  }
}

export default new CreateProductController();
