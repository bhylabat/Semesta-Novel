import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface SectionProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export default function Section({ title, children, action, className = '' }: SectionProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-lg font-semibold text-white hover:text-primary-300 transition-colors"
        >
          {title}
          <ChevronDown className={`h-5 w-5 text-muted transition-transform ${expanded ? '' : '-rotate-90'}`} />
        </button>
        {action}
      </div>
      {expanded && children}
    </section>
  );
}
