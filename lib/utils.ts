import { Colors } from "@/lib/data/types"
import { clsx, type ClassValue } from "clsx"
import {
  BookOpen,
  BookUserIcon,
  Building2,
  Bus,
  Calendar,
  Clock,
  Dumbbell,
  FlaskConical,
  GraduationCap,
  Landmark,
  MapPin,
  School,
  Stethoscope,
  University,
  Users,
  Utensils,
  Wifi,
  type LucideIcon,
} from "lucide-react"
import { twMerge } from "tailwind-merge"
import { APPWRITE } from "./appwrite/config"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ICON_MAP: Record<string, LucideIcon> = {
  // Calendarios
  Calendar,
  Landmark,
  School,
  University,
  GraduationCap,

  // Horarios/Servicios
  Clock,
  Users,
  Building2,
  FlaskConical,
  BookOpen,
  Bus,
  Utensils,
  Stethoscope,
  Wifi,
  MapPin,
  Dumbbell,
  BookUserIcon,
}

export function getIcon(
  iconName: string | null | undefined,
  fallback: LucideIcon = Calendar,
): LucideIcon {
  if (!iconName) return fallback

  const icon = ICON_MAP[iconName]
  return icon || fallback
}

export function hasIcon(iconName: string): boolean {
  return iconName in ICON_MAP
}

export function getAvailableIcons(): string[] {
  return Object.keys(ICON_MAP)
}

const COLOR_CLASSES: Record<Colors, string> = {
  [Colors.GRAY]:
    "bg-gray-200/50 hover:bg-gray-200/40 text-gray-900/90 shadow-gray-700/8 dark:bg-gray-400/25 dark:hover:bg-gray-400/20 dark:text-gray-200",
  [Colors.BLUE]:
    "bg-blue-200/50 hover:bg-blue-200/40 text-blue-900/90 shadow-blue-700/8 dark:bg-blue-400/25 dark:hover:bg-blue-400/20 dark:text-blue-200",
  [Colors.RED]:
    "bg-red-200/50 hover:bg-red-200/40 text-red-900/90 shadow-red-700/8 dark:bg-red-400/25 dark:hover:bg-red-400/20 dark:text-red-200",
  [Colors.GREEN]:
    "bg-green-200/50 hover:bg-green-200/40 text-green-900/90 shadow-green-700/8 dark:bg-green-400/25 dark:hover:bg-green-400/20 dark:text-green-200",
  [Colors.PURPLE]:
    "bg-purple-200/50 hover:bg-purple-200/40 text-purple-900/90 shadow-purple-700/8 dark:bg-purple-400/25 dark:hover:bg-purple-400/20 dark:text-purple-200",
  [Colors.ORANGE]:
    "bg-orange-200/50 hover:bg-orange-200/40 text-orange-900/90 shadow-orange-700/8 dark:bg-orange-400/25 dark:hover:bg-orange-400/20 dark:text-orange-200",
  [Colors.PINK]:
    "bg-pink-200/50 hover:bg-pink-200/40 text-pink-900/90 shadow-pink-700/8 dark:bg-pink-400/25 dark:hover:bg-pink-400/20 dark:text-pink-200",
  [Colors.TEAL]:
    "bg-teal-200/50 hover:bg-teal-200/40 text-teal-900/90 shadow-teal-700/8 dark:bg-teal-400/25 dark:hover:bg-teal-400/20 dark:text-teal-200",
  [Colors.YELLOW]:
    "bg-yellow-200/50 hover:bg-yellow-200/40 text-yellow-900/90 shadow-yellow-700/8 dark:bg-yellow-400/25 dark:hover:bg-yellow-400/20 dark:text-yellow-200",
  [Colors.LIME]:
    "bg-lime-200/50 hover:bg-lime-200/40 text-lime-900/90 shadow-lime-700/8 dark:bg-lime-400/25 dark:hover:bg-lime-400/20 dark:text-lime-200",
}

const DEFAULT_COLOR_CLASS = COLOR_CLASSES[Colors.GRAY]

export function getColor(color?: Colors): string {
  return COLOR_CLASSES[color as Colors] ?? DEFAULT_COLOR_CLASS
}
const COLOR_INDICATOR_CLASSES: Record<Colors, string> = {
  [Colors.GRAY]: "bg-gray-400 dark:bg-gray-500",
  [Colors.BLUE]: "bg-blue-500 dark:bg-blue-400",
  [Colors.RED]: "bg-red-500 dark:bg-red-400",
  [Colors.GREEN]: "bg-green-500 dark:bg-green-400",
  [Colors.PURPLE]: "bg-purple-500 dark:bg-purple-400",
  [Colors.ORANGE]: "bg-orange-500 dark:bg-orange-400",
  [Colors.PINK]: "bg-pink-500 dark:bg-pink-400",
  [Colors.TEAL]: "bg-teal-500 dark:bg-teal-400",
  [Colors.YELLOW]: "bg-yellow-500 dark:bg-yellow-400",
  [Colors.LIME]: "bg-lime-500 dark:bg-lime-400",
}

const DEFAULT_COLOR_INDICATOR = COLOR_INDICATOR_CLASSES[Colors.GRAY]

export function getColorIndicator(color?: Colors): string {
  return COLOR_INDICATOR_CLASSES[color as Colors] ?? DEFAULT_COLOR_INDICATOR
}

const BORDER_RADIUS_CLASSES = {
  both: "rounded",
  first: "rounded-l rounded-r-none not-in-data-[slot=popover-content]:w-[calc(100%+5px)]",
  last: "rounded-r rounded-l-none not-in-data-[slot=popover-content]:w-[calc(100%+4px)] not-in-data-[slot=popover-content]:-translate-x-[4px]",
  neither: "rounded-none not-in-data-[slot=popover-content]:w-[calc(100%+9px)] not-in-data-[slot=popover-content]:-translate-x-[4px]",
} as const

export function getBorderRadiusClasses(
  isFirstDay: boolean,
  isLastDay: boolean,
): string {
  if (isFirstDay && isLastDay) return BORDER_RADIUS_CLASSES.both
  if (isFirstDay) return BORDER_RADIUS_CLASSES.first
  if (isLastDay) return BORDER_RADIUS_CLASSES.last
  return BORDER_RADIUS_CLASSES.neither
}

export const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export const formatUserName = (name: string | undefined, email: string) => {
  return (name || email)?.replace(/@unal\.edu\.co$/, "")
}

export function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:00 ${period}`
}

export const formatTime = (hour: number, minute: number) => {
  const period = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`
}

export function extractImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parts = url.split("/files/")
    if (parts.length !== 2) return null
    const fileId = parts[1].split("/")[0]
    return fileId || null
  } catch {
    return null
  }
}

export function buildImageUrl(bucketId: string, fileId: string): string {
  const baseUrl = APPWRITE.ENDPOINT || ""
  const proj = APPWRITE.PROJECT_ID || ""
  return `${baseUrl}/storage/buckets/${bucketId}/files/${fileId}/preview?project=${proj}`
}
