import crypto from "crypto";
import tableRepository from "../repositories/TableRepository.js";
class CreateTableService {
    async execute({ number, restaurantId }) {
        const tableExists = await tableRepository.findByNumber(number, restaurantId);
        if (tableExists) {
            throw new Error("Já existe uma mesa com esse número!");
        }
        const token = crypto.randomBytes(16).toString("hex");
        return tableRepository.create({
            number: Number(number),
            restaurantId,
            token,
        });
    }
}
export default new CreateTableService();
