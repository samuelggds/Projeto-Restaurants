import api from './api';

export type EmployeeOnboardingClaim = {
  showOnboarding: boolean;
  role: string;
  subRole: string | null;
};

class EmployeeOnboardingService {
  async claim(): Promise<EmployeeOnboardingClaim> {
    const response = await api.post<EmployeeOnboardingClaim>('/auth/employee-onboarding/claim');
    return response.data;
  }
}

export default new EmployeeOnboardingService();
