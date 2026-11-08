export const frontDeskArrivals = [
  { initials: "AM", name: "Amelia Morgan", booking: "BEH-2048 · Returning guest", room: "302", arrival: "09:30", nights: 3, status: "Arriving" },
  { initials: "SO", name: "Sofia Okafor", booking: "BEH-2051 · Booking.com", room: "405", arrival: "11:00", nights: 3, status: "Arriving" },
  { initials: "JW", name: "James Williams", booking: "BEH-2053 · Corporate", room: "217", arrival: "12:30", nights: 2, status: "Arriving" },
  { initials: "DK", name: "Daniel Kim", booking: "BEH-2042 · Direct booking", room: "118", arrival: "08:45", nights: 1, status: "Checked in" },
];

export const frontDeskRooms = [
  { number: "101", type: "Standard twin", state: "Ready" },
  { number: "204", type: "Deluxe king", state: "Cleaning" },
  { number: "302", type: "Executive suite", state: "Reserved" },
  { number: "405", type: "Deluxe king", state: "Reserved" },
  { number: "118", type: "Standard king", state: "Occupied" },
  { number: "217", type: "Executive suite", state: "Reserved" },
] as const;
