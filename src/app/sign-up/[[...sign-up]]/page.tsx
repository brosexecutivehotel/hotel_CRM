import Link from "next/link";
import { HotelLogo } from "@/components/brand/hotel-logo";

export const metadata = {
  title: "Staff account setup",
};

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <section className="auth-message">
        <HotelLogo className="auth-brand-logo" size={88} />
        <p className="auth-eyebrow">BROS EXECUTIVE HOTEL</p>
        <h1>Staff accounts are invitation-only.</h1>
        <p>Contact your hotel system administrator to receive access to the operations platform.</p>
        <Link href="/sign-in">Return to staff sign in</Link>
      </section>
    </main>
  );
}
