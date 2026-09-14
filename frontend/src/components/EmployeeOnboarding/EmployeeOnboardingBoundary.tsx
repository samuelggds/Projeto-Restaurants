import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';
import employeeOnboardingService from '../../Services/employeeOnboardingService';
import EmployeeOnboardingOverlay from './EmployeeOnboardingOverlay';

export default function EmployeeOnboardingBoundary() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [resolvedRole, setResolvedRole] = useState<string | null>(null);
  const [resolvedSubRole, setResolvedSubRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    employeeOnboardingService
      .claim()
      .then((result) => {
        if (!active) return;
        setResolvedRole(result.role || String(user?.role || ''));
        setResolvedSubRole(result.subRole || String(user?.subRole || ''));
        setShowOnboarding(result.showOnboarding === true);
      })
      .catch(() => {
        if (!active) return;
        setShowOnboarding(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id, user?.role, user?.subRole]);

  return (
    <>
      <Outlet />
      {showOnboarding && (
        <EmployeeOnboardingOverlay
          role={resolvedRole || String(user?.role || '')}
          subRole={resolvedSubRole || String(user?.subRole || '')}
          onFinish={() => setShowOnboarding(false)}
        />
      )}
    </>
  );
}
