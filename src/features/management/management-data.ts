import type { IconName } from "@/components/ui/icon";

type NavigationItem = {
  label: string;
  icon: IconName;
  section?: string;
  href?: string;
};

export const managementNavigation: NavigationItem[] = [
  { label: "Overview", icon: "grid", section: "Workspace", href: "/management" },
  { label: "Reservations", icon: "calendar", href: "/management/reservations" },
  { label: "Rooms", icon: "bed", section: "Hotel operations", href: "/management/rooms" },
  { label: "Housekeeping", icon: "sparkles" },
  { label: "Payments", icon: "wallet" },
  { label: "Restaurant & bar", icon: "utensils" },
  { label: "Inventory", icon: "boxes" },
  { label: "Maintenance", icon: "wrench" },
  { label: "Reports", icon: "chart", section: "Management" },
  { label: "Settings", icon: "settings" },
];

export const arrivals = [
  { initials: "AM", name: "Amelia Morgan", detail: "Returning guest · VIP", room: "302", time: "09:30 AM", status: "Arriving" },
  { initials: "DK", name: "Daniel Kim", detail: "Direct booking", room: "118", time: "10:15 AM", status: "Checked in" },
  { initials: "SO", name: "Sofia Okafor", detail: "Booking.com · 3 nights", room: "405", time: "11:00 AM", status: "Arriving" },
  { initials: "JW", name: "James Williams", detail: "Corporate · 2 nights", room: "217", time: "12:30 PM", status: "Arriving" },
];

export const activities = [
  { title: "Guest checked in", detail: "Daniel Kim · Room 118", time: "10:18 AM", icon: "check" as const, tone: "green" },
  { title: "Room marked ready", detail: "Room 206 · Housekeeping", time: "10:04 AM", icon: "sparkles" as const, tone: "blue" },
  { title: "Payment received", detail: "Amelia Morgan · $540.00", time: "09:42 AM", icon: "wallet" as const, tone: "amber" },
  { title: "New reservation", detail: "Sofia Okafor · 3 nights", time: "09:16 AM", icon: "calendar" as const, tone: "purple" },
];

export const chartSets = {
  Week: { values: [38, 52, 45, 70, 56, 76, 62, 86, 66, 75, 58, 92], labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
  Month: { values: [50, 42, 63, 48, 70, 56, 80, 68, 91, 73, 84, 64], labels: ["1", "5", "10", "15", "20", "25", "30"] },
  Year: { values: [48, 58, 52, 68, 62, 82, 72, 90, 77, 86, 68, 95], labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"] },
};

export type ChartRange = keyof typeof chartSets;
