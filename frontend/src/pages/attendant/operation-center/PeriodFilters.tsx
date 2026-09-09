import type { DayFilter } from './navigation';
import { DayFilters } from './shared.styles';

export function PeriodFilters({
  value,
  onChange,
  total,
}: {
  value: DayFilter;
  onChange: (value: DayFilter) => void;
  total: number;
}) {
  const options = [
    ['ALL', 'Todos os dias'],
    ['TODAY', 'Hoje'],
    ['OLD', 'Pendências anteriores'],
  ] as const;
  return (
    <DayFilters aria-label="Filtrar por dia">
      {options.map(([day, label]) => (
        <button
          type="button"
          key={day}
          className={value === day ? `active${day === 'OLD' ? ' old' : ''}` : ''}
          aria-pressed={value === day}
          onClick={() => onChange(day)}
        >
          {label}
        </button>
      ))}
      <span role="status">{total} resultado(s)</span>
    </DayFilters>
  );
}
