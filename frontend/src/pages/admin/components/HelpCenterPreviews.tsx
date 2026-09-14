import { LiveHelpPreview } from '../../../features/employee-help/LiveHelpPreview';
import type { GuideSection } from './adminHelpGuides';

export function FaithfulGuidePreview({ preview, title }: GuideSection) {
  return <LiveHelpPreview area={preview} title={title} />;
}
