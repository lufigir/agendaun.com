"use client"

import { addHours, eachHourOfInterval, format, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { MapPin, Plus } from "lucide-react"
import React, { useCallback, useMemo, memo } from "react"

import { cn, getColor } from "@/lib/utils"

import {
  DaysOfWeek,
  EndHour,
  MinEventHeight,
  QuarterHourIntervals,
  StartHour,
  WeekCellsHeight,
} from "./constants"

import type { ScheduleEvents, Schedules } from "@/lib/data/types"

interface ScheduleViewProps {
  schedule: Schedules
  events: ScheduleEvents[]
  onEventSelect?: (event: ScheduleEvents) => void
  onEventCreate?: (startTime: Date) => void
  editable?: boolean
  canEdit?: boolean
}

interface PositionedEvent {
  event: ScheduleEvents
  top: number
  height: number
  left: number
  width: number
  zIndex: number
}

export function ScheduleView({
  schedule,
  events,
  onEventSelect,
  onEventCreate,
  editable = false,
  canEdit = false,
}: ScheduleViewProps) {
  // Use custom hours from schedule
  const startHour = schedule.start_hour ?? StartHour
  const endHour = schedule.end_hour ?? EndHour

  // Memoize hours generation
  const hours = useMemo(() => {
    const today = new Date()
    const dayStart = startOfDay(today)

    // If schedule crosses midnight
    if (endHour <= startHour) {
      const hoursBeforeMidnight = eachHourOfInterval({
        start: addHours(dayStart, startHour),
        end: addHours(dayStart, 23),
      })
      const hoursAfterMidnight = eachHourOfInterval({
        start: dayStart,
        end: addHours(dayStart, endHour - 1),
      })
      return [...hoursBeforeMidnight, ...hoursAfterMidnight]
    }

    return eachHourOfInterval({
      start: addHours(dayStart, startHour),
      end: addHours(dayStart, endHour - 1),
    })
  }, [startHour, endHour])

  // Memoize processed day events calculation
  const processedDayEvents = useMemo(() => {
    const scheduleEndHour = endHour <= startHour ? endHour + 24 : endHour

    return Array.from({ length: 7 }, (_, dayIndex) => {
      const mondayFirstDay = dayIndex + 1

      const dayEvents = events.filter((event) =>
        event.days_of_week.includes(mondayFirstDay),
      )

      const sortedEvents = [...dayEvents].sort((a, b) => {
        const aStartMinutes = a.start_hour * 60 + a.start_minute
        const bStartMinutes = b.start_hour * 60 + b.start_minute

        if (aStartMinutes !== bStartMinutes) {
          return aStartMinutes - bStartMinutes
        }

        const aDuration =
          a.end_hour * 60 + a.end_minute - (a.start_hour * 60 + a.start_minute)
        const bDuration =
          b.end_hour * 60 + b.end_minute - (b.start_hour * 60 + b.start_minute)
        return bDuration - aDuration
      })

      const positionedEvents: PositionedEvent[] = []
      const columns: { event: ScheduleEvents; endHour: number }[][] = []

      sortedEvents.forEach((event) => {
        let eventStartHour = event.start_hour + event.start_minute / 60
        let eventEndHour = event.end_hour + event.end_minute / 60

        if (eventEndHour < eventStartHour) {
          eventEndHour += 24
        }

        const isOutsideRange =
          endHour <= startHour
            ? eventEndHour <= startHour ||
              (eventStartHour >= scheduleEndHour &&
                eventStartHour < startHour + 24)
            : eventEndHour <= startHour || eventStartHour >= endHour

        if (isOutsideRange) return

        const clampedStartHour = Math.max(eventStartHour, startHour)
        const clampedEndHour = Math.min(eventEndHour, scheduleEndHour)

        let adjustedStartForTop = clampedStartHour
        if (endHour <= startHour && clampedStartHour < startHour) {
          adjustedStartForTop = clampedStartHour + 24
        }

        const top = (adjustedStartForTop - startHour) * WeekCellsHeight
        const height = (clampedEndHour - clampedStartHour) * WeekCellsHeight

        let columnIndex = 0
        let placed = false

        while (!placed) {
          const col = columns[columnIndex] || []
          if (col.length === 0) {
            columns[columnIndex] = col
            placed = true
          } else {
            const overlaps = col.some((c) => {
              const cStartHour = c.event.start_hour + c.event.start_minute / 60
              return clampedStartHour < c.endHour && clampedEndHour > cStartHour
            })
            if (!overlaps) {
              placed = true
            } else {
              columnIndex++
            }
          }
        }

        const currentColumn = columns[columnIndex] || []
        columns[columnIndex] = currentColumn
        currentColumn.push({ event, endHour: clampedEndHour })

        const totalColumns = Math.max(columns.length, 1)
        const width = 1 / totalColumns
        const left = columnIndex / totalColumns

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
  }, [events, startHour, endHour])

  // Memoize event click handler
  const handleEventClick = useCallback(
    (event: ScheduleEvents, e: React.MouseEvent) => {
      e.stopPropagation()
      onEventSelect?.(event)
    },
    [onEventSelect],
  )

  return (
    <div
      data-slot="schedule-view"
      className="flex h-full flex-col overflow-y-auto"
    >
      {/* Header with days of the week */}
      <div className="bg-background border-border/70 sticky top-0 z-20 grid grid-cols-8 border-y uppercase">
        <div className="text-muted-foreground/70 py-2 text-center text-xs">
          Hora
        </div>
        {DaysOfWeek.map((day) => (
          <div
            key={day}
            className="text-muted-foreground/70 py-2 text-center text-xs"
          >
            <span className="sm:hidden" aria-hidden="true">
              {day[0]}
            </span>
            <span className="max-sm:hidden">{day}</span>
          </div>
        ))}
      </div>

      {/* Schedule grid */}
      <div className="grid grid-cols-8">
        {/* Hours column */}
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

        {/* Days columns */}
        {DaysOfWeek.map((_, dayIndex) => (
          <div
            key={dayIndex}
            className="border-border/70 relative grid auto-cols-fr border-r last:border-r-0"
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
                  <ScheduleEventItem
                    event={positionedEvent.event}
                    onClick={(e) => handleEventClick(positionedEvent.event, e)}
                    height={positionedEvent.height}
                  />
                </div>
              </div>
            ))}

            {/* Hour cells with click to create functionality */}
            {hours.map((hour) => {
              const hourValue = hour.getHours()
              return (
                <div
                  key={hour.toString()}
                  className="border-border/70 relative min-h-[var(--week-cells-height)] border-b last:border-b-0"
                >
                  {/* Quarter-hour intervals for creating events */}
                  {editable &&
                    canEdit &&
                    QuarterHourIntervals.map((quarter) => {
                      const dayOfWeek = dayIndex // 0 = Monday, 6 = Sunday

                      return (
                        <div
                          key={`${hour.toString()}-${quarter}`}
                          className={cn(
                            "group hover:bg-foreground/10 absolute flex h-[calc(var(--week-cells-height)/4)] w-full cursor-pointer items-center justify-center transition-colors",
                            quarter === 0 && "top-0",
                            quarter === 1 &&
                              "top-[calc(var(--week-cells-height)/4)]",
                            quarter === 2 &&
                              "top-[calc(var(--week-cells-height)/4*2)]",
                            quarter === 3 &&
                              "top-[calc(var(--week-cells-height)/4*3)]",
                          )}
                          onClick={() => {
                            if (onEventCreate) {
                              // Create a date for this day of week and time
                              const today = new Date()
                              const currentDayOfWeek = (today.getDay() + 6) % 7 // Convert to Monday=0
                              const daysToAdd = dayOfWeek - currentDayOfWeek
                              const startTime = new Date(today)
                              startTime.setDate(today.getDate() + daysToAdd)
                              startTime.setHours(hourValue)
                              startTime.setMinutes(quarter * 15)
                              startTime.setSeconds(0)
                              startTime.setMilliseconds(0)
                              onEventCreate(startTime)
                            }
                          }}
                        >
                          <Plus className="text-muted-foreground h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
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

// Memoized event component for schedule view
interface ScheduleEventItemProps {
  event: ScheduleEvents
  onClick: (e: React.MouseEvent) => void
  height: number
}

const ScheduleEventItem = memo(function ScheduleEventItem({
  event,
  onClick,
  height,
}: ScheduleEventItemProps) {
  const startHour = event.start_hour
  const startMinute = event.start_minute
  const endHour = event.end_hour
  const endMinute = event.end_minute

  const showTime = height >= MinEventHeight
  const showDescription = height >= 80 && event.description

  const colorClass = getColor(event.color)

  return (
    <div
      className={cn(
        "flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-md px-1.5 py-1 backdrop-blur-md transition-all sm:px-2",
        colorClass,
      )}
      onClick={onClick}
    >
      <div className="flex-1 overflow-hidden">
        <div className="truncate text-[10px] font-medium sm:text-sm">
          {event.title}
        </div>
        {showTime && (
          <div className="text-[8px] opacity-75 sm:text-xs">
            {String(startHour % 12 || 12).padStart(2, "0")}:
            {String(startMinute).padStart(2, "0")}{" "}
            {startHour >= 12 ? "PM" : "AM"}
            {" - "}
            {String(endHour % 12 || 12).padStart(2, "0")}:
            {String(endMinute).padStart(2, "0")} {endHour >= 12 ? "PM" : "AM"}
          </div>
        )}
        {event.location && (
          <div className="mt-0.5 line-clamp-2 text-[8px] opacity-60 sm:mt-1 sm:text-xs">
            <MapPin className="mr-1 inline size-2 sm:size-3" />
            {event.location}
          </div>
        )}
        {showDescription && (
          <div className="mt-0.5 line-clamp-10 text-[9px] opacity-60 sm:mt-1 sm:text-xs">
            {event.description}
          </div>
        )}
      </div>
    </div>
  )
})
