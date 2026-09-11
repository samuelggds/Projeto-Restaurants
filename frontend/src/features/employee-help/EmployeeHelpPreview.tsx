import type { EmployeeHelpGuide } from './employeeHelpGuides';
import { LiveHelpPreview } from './LiveHelpPreview';
export function EmployeeHelpPreview({ guide }: { guide: EmployeeHelpGuide }) {
  return <LiveHelpPreview area={guide.preview} title={guide.title} />;
}
