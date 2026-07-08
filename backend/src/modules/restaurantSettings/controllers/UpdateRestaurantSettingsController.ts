import { Request, Response } from "express";
import updateRestaurantSettingsService from "../services/UpdateRestaurantSettingsService.js";

class UpdateRestaurantSettingsController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;

      const {
        deliveryFee,
        minimumOrder,
        pixProvider,
        pixKey,
        legalDocumentType,
        companyDocument,
        companyLegalName,
        companyTradeName,
        companyAddress,
        companyCnae,
        monthlyRevenue,
        ownerFullName,
        ownerCpf,
        ownerBirthDate,
        ownerEmail,
        ownerPhone,
        ownerAddress,
        bankName,
        bankCode,
        bankAccountType,
        bankBranch,
        bankAccount,
        bankHolderDocument,
        cardGateway,
        gatewayMerchantId,
        pagbankEmail,
        pagbankToken,
        pagbankEnvironment,
        ownerDocumentFileUrl,
        bankProofFileUrl,
        companyContractFileUrl,
        whatsapp,
        instagram,
        facebook,
        restaurantName,
        restaurantLogo,
        restaurantCoverImage,
      } = req.body;

      const settings = await updateRestaurantSettingsService.execute({
        restaurantId,
        deliveryFee,
        minimumOrder,
        pixProvider,
        pixKey,
        legalDocumentType,
        companyDocument,
        companyLegalName,
        companyTradeName,
        companyAddress,
        companyCnae,
        monthlyRevenue,
        ownerFullName,
        ownerCpf,
        ownerBirthDate,
        ownerEmail,
        ownerPhone,
        ownerAddress,
        bankName,
        bankCode,
        bankAccountType,
        bankBranch,
        bankAccount,
        bankHolderDocument,
        cardGateway,
        gatewayMerchantId,
        pagbankEmail,
        pagbankToken,
        pagbankEnvironment,
        ownerDocumentFileUrl,
        bankProofFileUrl,
        companyContractFileUrl,
        whatsapp,
        instagram,
        facebook,
        restaurantName,
        restaurantLogo,
        restaurantCoverImage,
      });

      return res.status(200).json(settings);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar configuracoes do restaurante",
      });
    }
  }
}

export default new UpdateRestaurantSettingsController();
