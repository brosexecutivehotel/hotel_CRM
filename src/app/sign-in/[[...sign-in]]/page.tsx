import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-eyebrow">BROS EXECUTIVE HOTEL</p>
        <h1>Staff sign in</h1>
        <p className="auth-description">Sign in with your hotel account. We’ll take you to your assigned workspace.</p>
        <SignIn
          fallbackRedirectUrl="/"
          appearance={{
            options: {
              logoImageUrl: "/brand/bros-executive-logo.jpg",
              logoPlacement: "inside",
              logoLinkUrl: "/",
            },
          }}
        />
        <p className="auth-help">Need an account? Contact your hotel system administrator.</p>
      </section>
    </main>
  );
}
