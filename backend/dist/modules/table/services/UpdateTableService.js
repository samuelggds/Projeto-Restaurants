import tableRepository from "../repositories/TableRepository.js";
class UpdateTableService {
    async execute({ id, restaurantId, number, active }) {
        const table = await tableRepository.findById(id);
        if (!table || table.restaurantId !== restaurantId) {
            throw new Error("Mesa não encontrada!");
        }
        if (number !== undefined && number !== null && String(number).trim()) {
            const tableExists = await tableRepository.findByNumber(number, restaurantId);
            if (tableExists && tableExists.id !== table.id) {
                throw new Error("Já existe uma mesa com esse número!");
            }
        }
        const hasNumber = number !== undefined && number !== null && String(number).trim() !== "";
        const hasActive = typeof active === "boolean";
        if (!hasNumber && !hasActive) {
            throw new Error("Informe número e/ou status ativo da mesa.");
        }
        const updateData = {};
        if (hasNumber) {
            updateData.number = Number(number);
        }
        if (hasActive) {
            updateData.active = Boolean(active);
        }
        return await tableRepository.update(id, {
            ...updateData,
        });
    }
}
export default new UpdateTableService();
