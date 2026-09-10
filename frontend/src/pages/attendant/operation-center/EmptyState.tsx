import { type LucideIcon } from 'lucide-react';
import { Empty } from './shared.styles';

export function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <Empty>
      <Icon />
      <b>{title}</b>
      <span>{text}</span>
    </Empty>
  );
}
