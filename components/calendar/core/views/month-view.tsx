"use client"

import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { es } from "date-fns/locale"
import { Plus } from "lucide-react"
import React, { useCallback, useEffect, useMemo, useState } from "react"

import {
  DefaultStartHour,
  EventGap,
  EventHeight,
} from "@/components/calendar/core/constants"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import type { CalendarEtiquettes, CalendarEvents } from "@/lib/data/types"
import { DraggableEvent } from "../draggable-event"
import { DroppableCell } from "../droppable-cell"
import { EventItem } from "../event/event-item"
import { useEventVisibility } from "../hooks/use-event-visibility"
import {
  getAllEventsForDay,
  getEventsForDay,
  getSpanningEventsForDay,
  sortEvents,
} from "../utils"

interface MonthViewProps {
  currentDate: Date
  events: CalendarEvents[]
  etiquettes: CalendarEtiquettes[]
  onEventSelect: (event: CalendarEvents) => void
  onEventCreate: (startTime: Date) => void
  editable?: boolean
  canEdit?: boolean
}

// Memoize weekdays outside component as it's static
const WEEKDAYS = Array.from({ length: 7 }).map((_, i) => {
  const date = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i)
  return format(date, "EEE", { locale: es })
})

// Type for pre-computed day events data
interface DayEventsData {
  dayEvents: CalendarEvents[]
  spanningEvents: CalendarEvents[]
  allDayEvents: CalendarEvents[]
  allEvents: CalendarEvents[]
  sortedAllDayEvents: CalendarEvents[]
  sortedAllEvents: CalendarEvents[]
}

export function MonthView({
  currentDate,
  events,
  etiquettes,
  onEventSelect,
  onEventCreate,
  editable = false,
  canEdit = false,
}: MonthViewProps) {
  // Memoize date calculations
  const { days, weeks } = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    // Generate weeks
    const result: Date[][] = []
    let week: Date[] = []

    for (let i = 0; i < days.length; i++) {
      week.push(days[i])
      if (week.length === 7 || i === days.length - 1) {
        result.push(week)
        week = []
      }
    }

    return { days, weeks: result }
  }, [currentDate])

  // Memoize event click handler
  const handleEventClick = useCallback(
    (event: CalendarEvents, e: React.MouseEvent) => {
      e.stopPropagation()
      onEventSelect(event)
    },
    [onEventSelect],
  )

  // Pre-compute events data for all days
  const dayEventsData = useMemo(() => {
    const map = new Map<string, DayEventsData>()

    for (const day of days) {
      const dayEvents = getEventsForDay(events, day)
      const spanningEvents = getSpanningEventsForDay(events, day)
      const allDayEvents = [...spanningEvents, ...dayEvents]
      const allEvents = getAllEventsForDay(events, day)

      map.set(day.toISOString(), {
        dayEvents,
        spanningEvents,
        allDayEvents,
        allEvents,
        sortedAllDayEvents: sortEvents(allDayEvents),
        sortedAllEvents: sortEvents(allEvents),
      })
    }

    return map
  }, [days, events])

  const [isMounted, setIsMounted] = useState(false)
  const { contentRef, getVisibleEventCount } = useEventVisibility({
    eventHeight: EventHeight,
    eventGap: EventGap,
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div data-slot="month-view" className="contents">
      <div className="border-border/70 grid grid-cols-7 border-y uppercase">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-muted-foreground/70 py-2 text-center text-xs"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid flex-1 auto-rows-fr">
        {weeks.map((week, weekIndex) => (
          <div
            key={`week-${weekIndex}`}
            className="grid grid-cols-7 [&:last-child>*]:border-b-0"
          >
            {week.map((day, dayIndex) => {
              if (!day) return null // Skip if day is undefined

              const dayData = dayEventsData.get(day.toISOString())
              if (!dayData) return null

              const {
                allDayEvents,
                allEvents,
                sortedAllDayEvents,
                sortedAllEvents,
              } = dayData

              const isCurrentMonth = isSameMonth(day, currentDate)
              const cellId = `month-cell-${day.toISOString()}`

              const isReferenceCell = weekIndex === 0 && dayIndex === 0
              const visibleCount = isMounted
                ? getVisibleEventCount(allDayEvents.length)
                : undefined
              const hasMore =
                visibleCount !== undefined && allDayEvents.length > visibleCount
              const remainingCount = hasMore
                ? allDayEvents.length - visibleCount
                : 0

              return (
                <div
                  key={day.toString()}
                  className="group border-border/70 data-outside-cell:bg-muted/25 data-outside-cell:text-muted-foreground/70 border-r border-b last:border-r-0"
                  data-today={isToday(day) || undefined}
                  data-outside-cell={!isCurrentMonth || undefined}
                >
                  <DroppableCell
                    id={cellId}
                    date={day}
                    className={cn(
                      editable && "hover:bg-foreground/10 transition-colors",
                    )}
                    {...(editable && {
                      onClick: () => {
                        const startTime = new Date(day)
                        startTime.setHours(DefaultStartHour, 0, 0)
                        onEventCreate?.(startTime)
                      },
                    })}
                  >
                    <div className="flex items-center justify-between px-1">
                      <div className="group-data-today:bg-primary group-data-today:text-primary-foreground mt-1 inline-flex size-6 items-center justify-center rounded-full text-sm">
                        {format(day, "d")}
                      </div>
                      {editable && (
                        <Plus className="text-muted-foreground mt-1 size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </div>
                    <div
                      ref={isReferenceCell ? contentRef : null}
                      className="min-h-[calc((var(--event-height)+var(--event-gap))*2)] sm:min-h-[calc((var(--event-height)+var(--event-gap))*3)] lg:min-h-[calc((var(--event-height)+var(--event-gap))*4)]"
                    >
                      {sortedAllDayEvents.map((event, index) => {
                        const eventStart = new Date(event.start)
                        const eventEnd = new Date(event.end)
                        const isFirstDay = isSameDay(day, eventStart)
                        const isLastDay = isSameDay(day, eventEnd)

                        const isHidden =
                          isMounted && visibleCount && index >= visibleCount

                        if (!visibleCount) return null

                        if (!isFirstDay) {
                          return (
                            <div
                              key={`spanning-${event.$id}-${day.toISOString().slice(0, 10)}`}
                              className="aria-hidden:hidden"
                              aria-hidden={isHidden ? "true" : undefined}
                            >
                              <EventItem
                                onClick={(e) => handleEventClick(event, e)}
                                event={event}
                                etiquettes={etiquettes}
                                view="month"
                                isFirstDay={isFirstDay}
                                isLastDay={isLastDay}
                              >
                                <div className="invisible" aria-hidden={true}>
                                  {!event.all_day && (
                                    <span>
                                      {format(new Date(event.start), "h:mm", {
                                        locale: es,
                                      })}{" "}
                                    </span>
                                  )}
                                  {event.title}
                                </div>
                              </EventItem>
                            </div>
                          )
                        }

                        return (
                          <div
                            key={event.$id}
                            className="aria-hidden:hidden"
                            aria-hidden={isHidden ? "true" : undefined}
                          >
                            <DraggableEvent
                              event={event}
                              etiquettes={etiquettes}
                              view="month"
                              onClick={(e) => handleEventClick(event, e)}
                              isFirstDay={isFirstDay}
                              isLastDay={isLastDay}
                              draggable={canEdit && editable}
                            />
                          </div>
                        )
                      })}

                      {hasMore && (
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <button
                              className="focus-visible:border-ring focus-visible:ring-ring/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 mt-[var(--event-gap)] flex h-[var(--event-height)] w-full cursor-pointer items-center overflow-hidden rounded px-1 text-left text-[10px] backdrop-blur-md transition outline-none select-none focus-visible:ring-[3px] sm:px-2 sm:text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>
                                + {remainingCount}{" "}
                                <span className="max-sm:sr-only">más</span>
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="center"
                            className="max-w-52 p-3"
                            style={
                              {
                                "--event-height": `${EventHeight}px`,
                              } as React.CSSProperties
                            }
                          >
                            <div className="space-y-2">
                              <div className="text-sm font-medium">
                                {format(day, "EEE d", { locale: es })}
                              </div>
                              <div className="space-y-1">
                                {sortedAllEvents.map((event) => {
                                  const eventStart = new Date(event.start)
                                  const eventEnd = new Date(event.end)
                                  const isFirstDay = isSameDay(day, eventStart)
                                  const isLastDay = isSameDay(day, eventEnd)

                                  return (
                                    <EventItem
                                      key={event.$id}
                                      onClick={(e) =>
                                        handleEventClick(event, e)
                                      }
                                      event={event}
                                      etiquettes={etiquettes}
                                      view="month"
                                      isFirstDay={isFirstDay}
                                      isLastDay={isLastDay}
                                    />
                                  )
                                })}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </DroppableCell>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
