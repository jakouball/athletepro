'use client'

import { useMemo, useRef, useState } from 'react'

type HorizontalCalendarProps = {
  selectedDate: string
  onSelectDate: (date: string) => void
  markedDates?: string[]
}

const DAY_LABELS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']
const MONTH_LABELS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
]

const DAYS_IN_WEEK = 7
const DAYS_BEFORE_CENTER = 3
const SWIPE_THRESHOLD_PX = 40

export function toDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateString(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function formatRangeLabel(start: Date, end: Date) {
  const startMonth = MONTH_LABELS[start.getMonth()]
  const endMonth = MONTH_LABELS[end.getMonth()]
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()

  if (startMonth === endMonth && startYear === endYear) {
    return `${startMonth} ${startYear}`
  }
  if (startYear === endYear) {
    return `${startMonth} – ${endMonth} ${startYear}`
  }
  return `${startMonth} ${startYear} – ${endMonth} ${endYear}`
}

export default function HorizontalCalendar({ selectedDate, onSelectDate, markedDates = [] }: HorizontalCalendarProps) {
  const todayString = useMemo(() => toDateString(new Date()), [])
  const markedSet = useMemo(() => new Set(markedDates), [markedDates])

  const [weekStart, setWeekStart] = useState(() => addDays(parseDateString(selectedDate), -DAYS_BEFORE_CENTER))
  const touchStartXRef = useRef<number | null>(null)

  const days = useMemo(() => {
    const result: Date[] = []
    for (let offset = 0; offset < DAYS_IN_WEEK; offset++) {
      result.push(addDays(weekStart, offset))
    }
    return result
  }, [weekStart])

  const goToPreviousWeek = () => setWeekStart((prev) => addDays(prev, -DAYS_IN_WEEK))
  const goToNextWeek = () => setWeekStart((prev) => addDays(prev, DAYS_IN_WEEK))

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartXRef.current = event.touches[0].clientX
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartXRef.current === null) return
    const deltaX = event.changedTouches[0].clientX - touchStartXRef.current
    touchStartXRef.current = null

    if (deltaX > SWIPE_THRESHOLD_PX) {
      goToPreviousWeek()
    } else if (deltaX < -SWIPE_THRESHOLD_PX) {
      goToNextWeek()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goToPreviousWeek}
          aria-label="Předchozí týden"
          className="rounded p-1 text-lg text-gray-500 hover:bg-gray-100"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-gray-700">
          {formatRangeLabel(days[0], days[DAYS_IN_WEEK - 1])}
        </p>
        <button
          type="button"
          onClick={goToNextWeek}
          aria-label="Následující týden"
          className="rounded p-1 text-lg text-gray-500 hover:bg-gray-100"
        >
          ›
        </button>
      </div>
      <div
        className="grid grid-cols-7 gap-1.5 sm:gap-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {days.map((date) => {
          const dateString = toDateString(date)
          const isSelected = dateString === selectedDate
          const isToday = dateString === todayString
          const isMarked = markedSet.has(dateString)

          return (
            <button
              key={dateString}
              type="button"
              onClick={() => onSelectDate(dateString)}
              className={`flex flex-col items-center gap-1 rounded-lg border py-2 transition-colors ${
                isSelected
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
              }`}
            >
              <span className="text-xs uppercase tracking-wide opacity-80">
                {isToday ? 'Dnes' : DAY_LABELS[date.getDay()]}
              </span>
              <span className="text-lg font-semibold">{date.getDate()}</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isMarked ? (isSelected ? 'bg-white' : 'bg-blue-600') : 'bg-transparent'
                }`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
