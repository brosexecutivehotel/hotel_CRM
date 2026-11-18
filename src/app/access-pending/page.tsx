import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { HotelLogo } from "@/components/brand/hotel-logo";

export const metadata = {
  title: "Access pending",
};

export default async function AccessPendingPage() {
  await auth.protect();

  return (
    <main className="auth-page">
      <section className="auth-message">
        <HotelLogo className="auth-brand-logo" size={88} />
        <p className="auth-eyebrow">BROS EXECUTIVE HOTEL</p>
        <h1>Your workspace is being prepared.</h1>
        <p>Your account is signed in, but an administrator still needs to assign your hotel dashboard role.</p>
        <p className="auth-help">Ask your system administrator to set your Clerk user&apos;s private metadata <code>role</code> to <code>management</code>, <code>front_desk</code>, or <code>crm</code>.</p>
        <Link href="/sign-in">Return to sign in</Link>
      </section>
    </main>
  );
}
