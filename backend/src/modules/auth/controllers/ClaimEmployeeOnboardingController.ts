import type { Request, Response } from 'express';
import employeeOnboardingService from '../services/EmployeeOnboardingService.js';

class ClaimEmployeeOnboardingController {
  async handle(req: Request, res: Response) {
    try {
      const result = await employeeOnboardingService.claim({
        userId: Number(req.user?.id || 0),
        role: req.user?.role,
        subRole: req.user?.subRole,
      });

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(result);
    } catch (error) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(403).json({
        error: error instanceof Error ? error.message : 'Onboarding indisponível para esta conta.',
      });
    }
  }
}

export default new ClaimEmployeeOnboardingController();
