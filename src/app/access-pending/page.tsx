import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { HotelLogo } from "@/components/brand/hotel-logo";

export const metadata = {
  title: "Access pending",
};

export default async function AccessPendingPage() {
  await auth.protect();
  const user = await currentUser();
  const role = user?.privateMetadata?.role;
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? "—";

  return (
    <main className="auth-page">
      <section className="auth-message">
        <HotelLogo className="auth-brand-logo" size={88} />
        <p className="auth-eyebrow">BROS EXECUTIVE HOTEL</p>
        <h1>Your workspace is being prepared.</h1>
        <p>Your account is signed in, but an administrator still needs to assign your hotel dashboard role.</p>
        <p className="auth-help">Ask your system administrator to set your Clerk user&apos;s private metadata <code>role</code> to <code>management</code>, <code>front_desk</code>, or <code>crm</code>.</p>
        <div className="auth-help" style={{ marginTop: 12, textAlign: "left", fontSize: 12 }}>
          <p style={{ margin: "0 0 4px" }}><strong>Signed in as:</strong> {email}</p>
          <p style={{ margin: "0 0 4px" }}><strong>User ID:</strong> {user?.id ?? "—"}</p>
          <p style={{ margin: 0 }}><strong>Detected role:</strong> {typeof role === "string" ? role : JSON.stringify(role ?? null)}</p>
        </div>
        <Link href="/sign-in">Return to sign in</Link>
      </section>
    </main>
  );
}
