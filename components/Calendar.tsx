
import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface CalendarProps {
  selectedDate?: Date | null; // For single date mode
  onDateChange: (date: Date) => void;

  // Range Mode Props
  startDate?: Date | null;
  endDate?: Date | null;
}

const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateChange, startDate, endDate }) => {
  // Use selectedDate or startDate as the initial view anchor
  const initialDate = selectedDate || startDate || new Date();
  const [currentDate, setCurrentDate] = useState(initialDate);

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay(); // 0 = Sunday, 1 = Monday, ...
  const daysInMonth = endOfMonth.getDate();

  const days = [];
  // Add blank days for the start of the month
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`blank-start-${i}`} className="p-2"></div>);
  }
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalized to midnight

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    onDateChange(newDate);
  }

  // Helper to check date equality/ranges (ignoring time)
  const isSameDay = (d1?: Date | null, d2?: Date | null) => {
    if (!d1 || !d2) return false;
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  }

  const isBetween = (target: Date, start?: Date | null, end?: Date | null) => {
    if (!start || !end) return false;
    // Set times to allow simple comparison
    const t = new Date(target.getTime()).setHours(0, 0, 0, 0);
    const s = new Date(start.getTime()).setHours(0, 0, 0, 0);
    const e = new Date(end.getTime()).setHours(0, 0, 0, 0);
    return t > s && t < e;
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 w-full shadow-sm select-none">
      <div className="flex justify-between items-center mb-4">
        <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
          <ChevronLeftIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>
        <div className="font-bold text-slate-700 dark:text-slate-200 capitalize">
          {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
        </div>
        <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
          <ChevronRightIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 dark:text-slate-400 font-semibold mb-2">
        <div>D</div>
        <div>S</div>
        <div>T</div>
        <div>Q</div>
        <div>Q</div>
        <div>S</div>
        <div>S</div>
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, index) => {
          if (typeof day !== 'number') return day;

          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          date.setHours(0, 0, 0, 0);

          const isToday = isSameDay(date, today);

          // Single Select Logic
          const isSelected = isSameDay(date, selectedDate);

          // Range Select Logic
          const isRangeStart = isSameDay(date, startDate);
          const isRangeEnd = isSameDay(date, endDate);
          const isInRange = isBetween(date, startDate, endDate);

          const isPast = date.getTime() < today.getTime() && !startDate && !endDate && !selectedDate; // Only disable past if in booking mode (single select usually)

          let containerClasses = "flex justify-center items-center w-full h-8 rounded-full";
          let buttonClasses = "w-8 h-8 flex items-center justify-center rounded-full text-sm transition-all relative z-10 ";

          // Background for range connecting
          let rangeBg = "";
          if (isInRange) rangeBg = "bg-purple-50 dark:bg-purple-900/20 rounded-none w-full";
          if (isRangeStart && endDate) rangeBg = "bg-purple-50 dark:bg-purple-900/20 rounded-l-full w-full ml-auto";
          if (isRangeEnd && startDate) rangeBg = "bg-purple-50 dark:bg-purple-900/20 rounded-r-full w-full mr-auto";

          if (isSelected || isRangeStart || isRangeEnd) {
            buttonClasses += "bg-purple-600 text-white font-bold shadow-md hover:bg-purple-700";
          } else if (isInRange) {
            buttonClasses += "text-purple-700 dark:text-purple-300 font-semibold";
          } else if (isToday) {
            buttonClasses += "text-purple-600 dark:text-purple-400 font-bold ring-1 ring-purple-200 dark:ring-purple-800";
          } else {
            buttonClasses += "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700";
          }

          return (
            <div key={index} className={`relative flex justify-center items-center`}>
              {/* Range Background Strip */}
              {(isInRange || (isRangeStart && endDate) || (isRangeEnd && startDate)) && (
                <div className={`absolute top-0 bottom-0 left-0 right-0 my-auto h-8 ${isInRange ? 'bg-purple-100 dark:bg-purple-900/40' : ''}`}>
                  {isRangeStart && endDate && <div className="absolute top-0 right-0 h-full w-1/2 bg-purple-100 dark:bg-purple-900/40"></div>}
                  {isRangeEnd && startDate && <div className="absolute top-0 left-0 h-full w-1/2 bg-purple-100 dark:bg-purple-900/40"></div>}
                </div>
              )}

              <button
                onClick={(e) => { e.preventDefault(); handleDateClick(day); }}
                // disabled={isPast} // Optional: Disable if strict
                className={buttonClasses}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
