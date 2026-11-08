export type GuestSegment = "VIP" | "Returning" | "Corporate" | "New";

export type GuestProfile = {
  initials: string;
  name: string;
  email: string;
  country: string;
  visits: number;
  lastStay: string;
  lifetimeValue: string;
  segment: GuestSegment;
};

export const guestProfiles: GuestProfile[] = [
  { initials: "AM", name: "Amelia Morgan", email: "amelia.morgan@example.com", country: "United Kingdom", visits: 8, lastStay: "Today", lifetimeValue: "$8,420", segment: "VIP" },
  { initials: "DK", name: "Daniel Kim", email: "daniel.kim@example.com", country: "South Korea", visits: 4, lastStay: "Today", lifetimeValue: "$3,180", segment: "Returning" },
  { initials: "SO", name: "Sofia Okafor", email: "sofia.okafor@example.com", country: "Nigeria", visits: 1, lastStay: "Today", lifetimeValue: "$540", segment: "New" },
  { initials: "JW", name: "James Williams", email: "j.williams@acme.example", country: "United States", visits: 6, lastStay: "Today", lifetimeValue: "$6,950", segment: "Corporate" },
  { initials: "LP", name: "Lina Park", email: "lina.park@example.com", country: "South Korea", visits: 5, lastStay: "Oct 18, 2026", lifetimeValue: "$4,260", segment: "Returning" },
];
