"use client"

import { addDays, format, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar } from "lucide-react"
import { useMemo, useCallback } from "react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

import type { CalendarEtiquettes, CalendarEvents } from "@/lib/data/types"
import { AgendaDaysToShow } from "../constants"
import { EventItem } from "../event/event-item"
import { getAgendaEventsForDay } from "../utils"

interface AgendaViewProps {
  currentDate: Date
  events: CalendarEvents[]
  etiquettes: CalendarEtiquettes[]
  onEventSelect: (event: CalendarEvents) => void
}

export function AgendaView({
  currentDate,
  events,
  etiquettes,
  onEventSelect,
}: AgendaViewProps) {
  // Memoize days array to avoid recalculation on re-renders
  const days = useMemo(
    () =>
      Array.from({ length: AgendaDaysToShow }, (_, i) =>
        addDays(new Date(currentDate), i),
      ),
    [currentDate],
  )

  // Memoize event click handler
  const handleEventClick = useCallback(
    (event: CalendarEvents, e: React.MouseEvent) => {
      e.stopPropagation()
      onEventSelect(event)
    },
    [onEventSelect],
  )

  // Pre-compute events for all days to avoid repeated filtering
  const dayEventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvents[]>()
    for (const day of days) {
      map.set(day.toISOString(), getAgendaEventsForDay(events, day))
    }
    return map
  }, [days, events])

  // Check if there are any days with events
  const hasEvents = useMemo(
    () => Array.from(dayEventsMap.values()).some((events) => events.length > 0),
    [dayEventsMap],
  )

  return (
    <div className="border-border/70 border-t px-4">
      {!hasEvents ? (
        <Empty className="min-h-[70svh]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Calendar />
            </EmptyMedia>
            <EmptyTitle>No se encontraron eventos</EmptyTitle>
            <EmptyDescription>
              No hay eventos programados para este periodo de tiempo.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        days.map((day) => {
          const dayEvents = dayEventsMap.get(day.toISOString()) ?? []

          if (dayEvents.length === 0) return null

          return (
            <div
              key={day.toString()}
              className="border-border/70 relative my-12 border-t"
            >
              <span
                className="bg-background absolute -top-3 left-0 flex h-6 items-center pe-4 text-[10px] uppercase data-today:font-medium sm:pe-4 sm:text-xs"
                data-today={isToday(day) || undefined}
              >
                <span>{format(day, "EEEE, d MMM", { locale: es })}</span>
              </span>
              <div className="mt-6 space-y-2">
                {dayEvents.map((event) => (
                  <EventItem
                    key={event.$id}
                    event={event}
                    etiquettes={etiquettes}
                    view="agenda"
                    onClick={(e) => handleEventClick(event, e)}
                  />
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
