"use client"

import {
  addHours,
  areIntervalsOverlapping,
  differenceInMinutes,
  eachDayOfInterval,
  eachHourOfInterval,
  endOfWeek,
  format,
  getHours,
  getMinutes,
  isBefore,
  isSameDay,
  isToday,
  startOfDay,
  startOfWeek,
} from "date-fns"
import { es } from "date-fns/locale"
import { Plus } from "lucide-react"
import React, { useCallback, useMemo } from "react"

import {
  EndHour,
  StartHour,
  WeekCellsHeight,
} from "@/components/calendar/core/constants"
import { cn } from "@/lib/utils"

import type { CalendarEtiquettes, CalendarEvents } from "@/lib/data/types"
import { DraggableEvent } from "../draggable-event"
import { DroppableCell } from "../droppable-cell"
import { EventItem } from "../event/event-item"
import { useCurrentTimeIndicator } from "../hooks/use-current-time-indicator"
import { isMultiDayEvent, sortEvents } from "../utils"

interface WeekViewProps {
  currentDate: Date
  events: CalendarEvents[]
  etiquettes: CalendarEtiquettes[]
  onEventSelect: (event: CalendarEvents) => void
  onEventCreate: (startTime: Date) => void
  editable?: boolean
  canEdit?: boolean
}

interface PositionedEvent {
  event: CalendarEvents
  top: number
  height: number
  left: number
  width: number
  zIndex: number
}

// Quarter hour intervals constant
const QUARTER_HOURS = [0, 1, 2, 3] as const

export function WeekView({
  currentDate,
  events,
  etiquettes,
  onEventSelect,
  onEventCreate,
  editable = false,
  canEdit = false,
}: WeekViewProps) {
  // Memoize date calculations
  const { weekStart, days, hours } = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

    const dayStart = startOfDay(currentDate)
    const hours = eachHourOfInterval({
      start: addHours(dayStart, StartHour),
      end: addHours(dayStart, EndHour - 1),
    })

    return { weekStart, days, hours }
  }, [currentDate])

  // Memoize all-day events filtering
  const allDayEvents = useMemo(
    () =>
      events
        .filter((event) => event.all_day || isMultiDayEvent(event))
        .filter((event) => {
          const eventStart = new Date(event.start)
          const eventEnd = new Date(event.end)
          return days.some(
            (day) =>
              isSameDay(day, eventStart) ||
              isSameDay(day, eventEnd) ||
              (day > eventStart && day < eventEnd),
          )
        }),
    [events, days],
  )

  // Memoize processed day events calculation
  const processedDayEvents = useMemo(() => {
    return days.map((day) => {
      // Get events for this day that are not all-day events or multi-day events
      const dayEvents = events.filter((event) => {
        if (event.all_day || isMultiDayEvent(event)) return false

        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)

        return (
          isSameDay(day, eventStart) ||
          isSameDay(day, eventEnd) ||
          (eventStart < day && eventEnd > day)
        )
      })

      // Sort events by start time and duration
      const sortedEvents = [...dayEvents].sort((a, b) => {
        const aStart = new Date(a.start)
        const bStart = new Date(b.start)
        const aEnd = new Date(a.end)
        const bEnd = new Date(b.end)

        if (aStart < bStart) return -1
        if (aStart > bStart) return 1

        const aDuration = differenceInMinutes(aEnd, aStart)
        const bDuration = differenceInMinutes(bEnd, bStart)
        return bDuration - aDuration
      })

      // Calculate positions for each event
      const positionedEvents: PositionedEvent[] = []
      const dayStartDate = startOfDay(day)
      // Store pre-computed dates to avoid repeated Date constructor calls
      const columns: { start: Date; end: Date }[][] = []

      sortedEvents.forEach((event) => {
        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)

        const adjustedStart = isSameDay(day, eventStart)
          ? eventStart
          : dayStartDate
        const adjustedEnd = isSameDay(day, eventEnd)
          ? eventEnd
          : addHours(dayStartDate, 24)

        const startHour =
          getHours(adjustedStart) + getMinutes(adjustedStart) / 60
        const endHour = getHours(adjustedEnd) + getMinutes(adjustedEnd) / 60

        const top = (startHour - StartHour) * WeekCellsHeight
        const height = (endHour - startHour) * WeekCellsHeight

        let columnIndex = 0
        let placed = false

        while (!placed) {
          const col = columns[columnIndex] || []
          if (col.length === 0) {
            columns[columnIndex] = col
            placed = true
          } else {
            const overlaps = col.some((c) =>
              areIntervalsOverlapping(
                { start: adjustedStart, end: adjustedEnd },
                { start: c.start, end: c.end },
              ),
            )
            if (!overlaps) {
              placed = true
            } else {
              columnIndex++
            }
          }
        }

        const currentColumn = columns[columnIndex] || []
        columns[columnIndex] = currentColumn
        currentColumn.push({ start: adjustedStart, end: adjustedEnd })

        const width = columnIndex === 0 ? 1 : 0.9
        const left = columnIndex === 0 ? 0 : columnIndex * 0.1

        positionedEvents.push({
          event,
          top,
          height,
          left,
          width,
          zIndex: 10 + columnIndex,
        })
      })

      return positionedEvents
    })
  }, [days, events])

  // Pre-compute all-day events per day
  const allDayEventsPerDay = useMemo(() => {
    return days.map((day) =>
      sortEvents(
        allDayEvents.filter((event) => {
          const eventStart = new Date(event.start)
          const eventEnd = new Date(event.end)
          return (
            isSameDay(day, eventStart) ||
            (day > eventStart && day < eventEnd) ||
            isSameDay(day, eventEnd)
          )
        }),
      ),
    )
  }, [days, allDayEvents])

  // Memoize event click handler
  const handleEventClick = useCallback(
    (event: CalendarEvents, e: React.MouseEvent) => {
      e.stopPropagation()
      onEventSelect(event)
    },
    [onEventSelect],
  )

  const showAllDaySection = allDayEvents.length > 0
  const { currentTimePosition, currentTimeVisible } = useCurrentTimeIndicator(
    currentDate,
    "week",
  )

  return (
    <div data-slot="week-view" className="flex h-full flex-col">
      <div className="bg-background/80 border-border/70 sticky top-24 z-20 grid grid-cols-8 border-y uppercase backdrop-blur-md">
        <div className="text-muted-foreground/70 py-2 text-center text-xs">
          <span className="max-[479px]:sr-only">
            {format(new Date(), "O", { locale: es })}
          </span>
        </div>
        {days.map((day) => (
          <div
            key={day.toString()}
            className="data-today:text-foreground text-muted-foreground/70 py-2 text-center text-xs data-today:font-medium"
            data-today={isToday(day) || undefined}
          >
            <span className="sm:hidden" aria-hidden="true">
              {format(day, "E", { locale: es })[0].toUpperCase()}{" "}
              {format(day, "d", { locale: es })}
            </span>
            <span className="max-sm:hidden">
              {format(day, "EEE dd", { locale: es })}
            </span>
          </div>
        ))}
      </div>

      {showAllDaySection && (
        <div className="border-border/70 bg-muted/50 border-b">
          <div className="grid grid-cols-8">
            <div className="border-border/70 relative border-r"></div>
            {days.map((day, dayIndex) => {
              const dayAllDayEvents = allDayEventsPerDay[dayIndex]

              return (
                <div
                  key={day.toString()}
                  className="border-border/70 relative border-r p-1 last:border-r-0"
                  data-today={isToday(day) || undefined}
                >
                  {dayAllDayEvents.map((event) => {
                    const eventStart = new Date(event.start)
                    const eventEnd = new Date(event.end)
                    const isFirstDay = isSameDay(day, eventStart)
                    const isLastDay = isSameDay(day, eventEnd)

                    const isFirstVisibleDay =
                      dayIndex === 0 && isBefore(eventStart, weekStart)
                    const shouldShowTitle = isFirstDay || isFirstVisibleDay

                    return (
                      <EventItem
                        key={`spanning-${event.$id}`}
                        onClick={(e) => handleEventClick(event, e)}
                        event={event}
                        etiquettes={etiquettes}
                        view="month"
                        isFirstDay={isFirstDay}
                        isLastDay={isLastDay}
                      >
                        <div
                          className={cn(
                            "truncate",
                            !shouldShowTitle && "invisible",
                          )}
                          aria-hidden={!shouldShowTitle}
                        >
                          {event.title}
                        </div>
                      </EventItem>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid flex-1 grid-cols-8 overflow-hidden">
        <div className="border-border/70 grid auto-cols-fr border-r">
          {hours.map((hour, index) => (
            <div
              key={hour.toString()}
              className="border-border/70 relative min-h-[var(--week-cells-height)] border-b last:border-b-0"
            >
              {index > 0 && (
                <span className="bg-background text-muted-foreground/70 absolute -top-3 left-0 flex h-6 w-16 max-w-full items-center justify-end pe-2 text-[10px] sm:pe-4 sm:text-xs">
                  {format(hour, "h a", { locale: es })}
                </span>
              )}
            </div>
          ))}
        </div>

        {days.map((day, dayIndex) => (
          <div
            key={day.toString()}
            className="border-border/70 relative grid auto-cols-fr border-r last:border-r-0"
            data-today={isToday(day) || undefined}
          >
            {/* Positioned events */}
            {(processedDayEvents[dayIndex] ?? []).map((positionedEvent) => (
              <div
                key={positionedEvent.event.$id}
                className="absolute z-10 px-0.5"
                style={{
                  top: `${positionedEvent.top}px`,
                  height: `${positionedEvent.height}px`,
                  left: `${positionedEvent.left * 100}%`,
                  width: `${positionedEvent.width * 100}%`,
                  zIndex: positionedEvent.zIndex,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-full w-full">
                  <DraggableEvent
                    event={positionedEvent.event}
                    etiquettes={etiquettes}
                    view="week"
                    onClick={(e) => handleEventClick(positionedEvent.event, e)}
                    showTime
                    height={positionedEvent.height}
                    draggable={canEdit && editable}
                  />
                </div>
              </div>
            ))}

            {/* Current time indicator - only show for today's column */}
            {currentTimeVisible && isToday(day) && (
              <div
                className="pointer-events-none absolute right-0 left-0 z-20"
                style={{ top: `${currentTimePosition}%` }}
              >
                <div className="relative flex items-center">
                  <div className="absolute -left-1 h-2 w-2 rounded-full bg-red-500"></div>
                  <div className="h-[2px] w-full bg-red-500"></div>
                </div>
              </div>
            )}
            {hours.map((hour) => {
              const hourValue = getHours(hour)
              return (
                <div
                  key={hour.toString()}
                  className="border-border/70 relative min-h-[var(--week-cells-height)] border-b last:border-b-0"
                >
                  {/* Quarter-hour intervals */}
                  {QUARTER_HOURS.map((quarter) => {
                    const quarterHourTime = hourValue + quarter * 0.25
                    return (
                      <DroppableCell
                        key={`${hour.toString()}-${quarter}`}
                        id={`week-cell-${day.toISOString()}-${quarterHourTime}`}
                        date={day}
                        time={quarterHourTime}
                        className={cn(
                          "group absolute flex h-[calc(var(--week-cells-height)/4)] w-full items-center justify-center",
                          editable &&
                            "hover:bg-foreground/10 transition-colors",
                          quarter === 0 && "top-0",
                          quarter === 1 &&
                            "top-[calc(var(--week-cells-height)/4)]",
                          quarter === 2 &&
                            "top-[calc(var(--week-cells-height)/4*2)]",
                          quarter === 3 &&
                            "top-[calc(var(--week-cells-height)/4*3)]",
                        )}
                        {...(editable && {
                          onClick: () => {
                            const startTime = new Date(day)
                            startTime.setHours(hourValue)
                            startTime.setMinutes(quarter * 15)
                            onEventCreate(startTime)
                          },
                        })}
                      >
                        {editable && (
                          <Plus className="text-muted-foreground h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
                      </DroppableCell>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
