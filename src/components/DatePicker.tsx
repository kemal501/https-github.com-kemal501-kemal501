import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  error?: string;
}

export default function DatePicker({ value, onChange, error }: DatePickerProps) {
  // Parse input value or default to tomorrow
  const [currentDate, setCurrentDate] = React.useState(() => {
    if (value) {
      const parsed = new Date(value + 'T00:00:00');
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const handlePrevMonth = () => {
    const prevMonthDate = new Date(year, month - 1, 1);
    const limitDate = new Date(today.getFullYear(), today.getMonth(), 1);
    if (prevMonthDate >= limitDate) {
      setCurrentDate(prevMonthDate);
    }
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateSelect = (dayNum: number) => {
    const selected = new Date(year, month, dayNum);
    if (selected >= today) {
      const yyyy = selected.getFullYear();
      const mm = String(selected.getMonth() + 1).padStart(2, '0');
      const dd = String(selected.getDate()).padStart(2, '0');
      const formatted = `${yyyy}-${mm}-${dd}`;
      onChange(formatted);
    }
  };

  const selectedDateObj = React.useMemo(() => {
    if (!value) return null;
    const d = new Date(value + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const isPrevDisabled = year === today.getFullYear() && month === today.getMonth();
  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={cn(
      "p-4 rounded-2xl bg-zinc-950 border text-left space-y-3 transition-colors",
      error ? "border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.05)]" : "border-zinc-800"
    )}>
      {/* Month/Year Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 pl-1">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-white text-xs font-black uppercase tracking-tight">
            {monthNames[month]} {year}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={isPrevDisabled}
            className={cn(
              "p-1.5 rounded-lg border border-zinc-900 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-800 disabled:opacity-20 disabled:hover:text-zinc-400 disabled:hover:border-zinc-900 transition-all",
              isPrevDisabled ? "cursor-not-allowed" : "cursor-pointer"
            )}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-zinc-900 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-800 transition-all cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Week Day Labels */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {dayLabels.map(label => (
          <span key={label} className="text-[9px] font-black uppercase tracking-wider text-zinc-650 font-mono">
            {label}
          </span>
        ))}
      </div>

      {/* Actual Days of the Month */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }

          const currentDayDate = new Date(year, month, day);
          const isPast = currentDayDate < today;
          
          const isSelected = selectedDateObj && 
            selectedDateObj.getDate() === day && 
            selectedDateObj.getMonth() === month && 
            selectedDateObj.getFullYear() === year;

          return (
            <button
              key={`day-${day}`}
              type="button"
              disabled={isPast}
              onClick={() => handleDateSelect(day)}
              className={cn(
                "aspect-square rounded-xl text-[10px] font-black tracking-tight transition-all flex items-center justify-center relative",
                isPast 
                  ? "text-zinc-800 cursor-not-allowed line-through bg-zinc-950/20" 
                  : isSelected
                    ? "bg-amber-400 text-black shadow-lg shadow-amber-400/25 font-bold scale-105"
                    : "text-zinc-400 bg-zinc-900/40 hover:bg-zinc-850 hover:text-white hover:scale-105 active:scale-95"
              )}
            >
              {day}
              {!isSelected && 
                day === today.getDate() && 
                month === today.getMonth() && 
                year === today.getFullYear() && (
                <span className="absolute bottom-1 w-1 h-1 bg-amber-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
