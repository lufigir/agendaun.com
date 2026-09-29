"use client"

import {
  addHours,
  areIntervalsOverlapping,
  differenceInMinutes,
  eachHourOfInterval,
  format,
  getHours,
  getMinutes,
  isSameDay,
  startOfDay,
} from "date-fns"
import { es } from "date-fns/locale"
import { Plus } from "lucide-react"
import { useCallback, useMemo } from "react"

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

interface DayViewProps {
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

export function DayView({
  currentDate,
  events,
  etiquettes,
  onEventSelect,
  onEventCreate,
  editable = false,
  canEdit = false,
}: DayViewProps) {
  // Memoize hours calculation
  const { dayStart, hours } = useMemo(() => {
    const dayStart = startOfDay(currentDate)
    const hours = eachHourOfInterval({
      start: addHours(dayStart, StartHour),
      end: addHours(dayStart, EndHour - 1),
    })
    return { dayStart, hours }
  }, [currentDate])

  // Memoize day events filtering and sorting
  const { allDayEvents, timeEvents } = useMemo(() => {
    const dayEvents = events
      .filter((event) => {
        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)
        return (
          isSameDay(currentDate, eventStart) ||
          isSameDay(currentDate, eventEnd) ||
          (currentDate > eventStart && currentDate < eventEnd)
        )
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    const filteredAllDayEvents = dayEvents.filter(
      (event) => event.all_day || isMultiDayEvent(event),
    )

    const timeEvents = dayEvents.filter(
      (event) => !event.all_day && !isMultiDayEvent(event),
    )

    return {
      allDayEvents: sortEvents(filteredAllDayEvents),
      timeEvents,
    }
  }, [events, currentDate])

  // Memoize positioned events calculation
  const positionedEvents = useMemo((): PositionedEvent[] => {
    const result: PositionedEvent[] = []

    const sortedEvents = [...timeEvents].sort((a, b) => {
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

    // Store pre-computed dates to avoid repeated Date constructor calls
    const columns: { start: Date; end: Date }[][] = []

    sortedEvents.forEach((event) => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)

      const adjustedStart = isSameDay(currentDate, eventStart)
        ? eventStart
        : dayStart
      const adjustedEnd = isSameDay(currentDate, eventEnd)
        ? eventEnd
        : addHours(dayStart, 24)

      const startHour = getHours(adjustedStart) + getMinutes(adjustedStart) / 60
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

      result.push({
        event,
        top,
        height,
        left,
        width,
        zIndex: 10 + columnIndex,
      })
    })

    return result
  }, [timeEvents, currentDate, dayStart])

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
    "day",
  )

  return (
    <div data-slot="day-view" className="contents">
      {showAllDaySection && (
        <div className="border-border/70 bg-muted/50 border-t">
          <div className="grid grid-cols-[3rem_1fr] sm:grid-cols-[4rem_1fr]">
            <div className="relative"></div>
            <div className="border-border/70 relative border-r p-1 last:border-r-0">
              {allDayEvents.map((event) => {
                const eventStart = new Date(event.start)
                const eventEnd = new Date(event.end)
                const isFirstDay = isSameDay(currentDate, eventStart)
                const isLastDay = isSameDay(currentDate, eventEnd)

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
                    {/* Always show the title in day view for better usability */}
                    <div>{event.title}</div>
                  </EventItem>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="border-border/70 grid flex-1 grid-cols-[3rem_1fr] overflow-hidden border-t pe-4 sm:grid-cols-[4rem_1fr]">
        <div>
          {hours.map((hour, index) => (
            <div
              key={hour.toString()}
              className="border-border/70 relative h-[var(--week-cells-height)] border-b last:border-b-0"
            >
              {index > 0 && (
                <span className="bg-background text-muted-foreground/70 absolute -top-3 left-0 flex h-6 w-16 max-w-full items-center justify-end pe-2 text-[10px] sm:pe-4 sm:text-xs">
                  {format(hour, "h a", { locale: es })}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="relative">
          {/* Positioned events */}
          {positionedEvents.map((positionedEvent) => (
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
            >
              <div className="h-full w-full">
                <DraggableEvent
                  event={positionedEvent.event}
                  etiquettes={etiquettes}
                  view="day"
                  onClick={(e) => handleEventClick(positionedEvent.event, e)}
                  showTime
                  height={positionedEvent.height}
                  draggable={editable && canEdit}
                />
              </div>
            </div>
          ))}

          {/* Current time indicator */}
          {currentTimeVisible && (
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

          {/* Time grid */}
          {hours.map((hour) => {
            const hourValue = getHours(hour)
            return (
              <div
                key={hour.toString()}
                className="border-border/70 relative h-[var(--week-cells-height)] border-b last:border-b-0"
              >
                {/* Quarter-hour intervals */}
                {QUARTER_HOURS.map((quarter) => {
                  const quarterHourTime = hourValue + quarter * 0.25
                  return (
                    <DroppableCell
                      key={`${hour.toString()}-${quarter}`}
                      id={`day-cell-${currentDate.toISOString()}-${quarterHourTime}`}
                      date={currentDate}
                      time={quarterHourTime}
                      className={cn(
                        "group absolute flex h-[calc(var(--week-cells-height)/4)] w-full items-center justify-center",
                        editable && "hover:bg-foreground/10 transition-colors",
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
                          const startTime = new Date(currentDate)
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
      </div>
    </div>
  )
}
