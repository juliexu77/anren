import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Section = ({ heading, children }: { heading: string; children: React.ReactNode }) => (
  <section>
    <h2 className="mb-2 font-editorial text-[1.15rem] text-foreground">{heading}</h2>
    <div className="space-y-3">{children}</div>
  </section>
);

export default function Terms() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[0.82rem] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
        </Link>

        <h1 className="mt-6 font-editorial text-[2.1rem] leading-tight tracking-[-0.01em]">Terms of Service</h1>
        <p className="mt-2 text-[0.8rem] uppercase tracking-[0.16em] text-muted-foreground/70">
          Last updated August 11, 2026
        </p>

        <div className="mt-8 space-y-8 text-[0.94rem] leading-relaxed text-muted-foreground">
          <Section heading="1. Agreement">
            <p>
              These terms govern your use of anren, a private voice memo notetaker. By creating an account or using the
              app you agree to them. If you do not agree, please do not use anren.
            </p>
          </Section>

          <Section heading="2. What anren does">
            <p>
              anren records voice notes you choose to record, transcribes them, writes a short summary, and lets you
              search and revisit them later. Transcription, summaries, search answers and reflections are produced by
              automated systems and may be incomplete or wrong. They are not advice of any kind — medical,
              psychological, legal or financial — and should not be relied on as such.
            </p>
          </Section>

          <Section heading="3. Your account">
            <p>
              You sign in with Google or Apple. You are responsible for keeping access to that sign-in secure, and for
              the activity in your account. Accounts are for individual personal use; do not share one account between
              people.
            </p>
          </Section>

          <Section heading="4. Your content">
            <p>
              Your recordings, transcripts and notes remain yours. You grant us only the permission needed to run the
              service for you: to store your content, process it to produce transcripts, summaries, embeddings and
              search results, and to display it back to you. We claim no other rights in it.
            </p>
            <p>
              You are responsible for what you record. Only record conversations or information you have the right to
              record and store, and follow the recording laws that apply where you are.
            </p>
          </Section>

          <Section heading="5. Acceptable use">
            <p>
              Do not use anren to break the law, infringe someone&rsquo;s rights, record people without the consent the
              law requires, attempt to access other users&rsquo; data, reverse engineer the service, or place automated
              or excessive load on it.
            </p>
          </Section>

          <Section heading="6. Availability and changes">
            <p>
              We may change, suspend or discontinue features. Where a change materially reduces what the app does, we
              will give notice in the app when reasonably possible.
            </p>
          </Section>

          <Section heading="7. Ending the agreement">
            <p>
              You may stop using anren and delete your account at any time from Settings. We may suspend or close an
              account that breaks these terms or is used to harm the service or other people.
            </p>
          </Section>

          <Section heading="8. Disclaimers">
            <p>
              anren is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind to the
              extent the law allows. We do not warrant that transcripts or summaries will be accurate, or that the
              service will be uninterrupted or error-free. Keep your own copies of anything you cannot afford to lose.
            </p>
          </Section>

          <Section heading="9. Limitation of liability">
            <p>
              To the extent permitted by law, we are not liable for indirect, incidental, special or consequential
              damages, or for lost data, profits or goodwill. Our total liability for any claim relating to anren is
              limited to the greater of the amount you paid us in the previous twelve months or USD 50.
            </p>
          </Section>

          <Section heading="10. Apple App Store">
            <p>
              If you obtained anren from the Apple App Store, this agreement is between you and us, not Apple. Apple has
              no obligation to provide support or maintenance for anren and is not responsible for any claim relating to
              it. Apple and its subsidiaries are third-party beneficiaries of these terms and may enforce them against
              you. You confirm you are not located in a country subject to a US embargo and are not on a US prohibited
              party list, and that you will comply with any applicable third-party terms.
            </p>
          </Section>

          <Section heading="11. Changes to these terms">
            <p>
              We may update these terms. If the change is material we will update the date above and surface the change
              in the app. Continuing to use anren after that means you accept the updated terms.
            </p>
          </Section>

          <Section heading="12. Governing law">
            <p>
              These terms are governed by the laws of the State of California, USA, without regard to conflict-of-law
              rules, except where local consumer law gives you stronger protection.
            </p>
          </Section>

          <Section heading="13. Contact">
            <p>
              Questions:{" "}
              <a href="mailto:juliexubi@gmail.com" className="underline underline-offset-4 hover:text-foreground">
                juliexubi@gmail.com
              </a>
              .
            </p>
          </Section>
        </div>

        <p className="mt-12 text-[0.82rem] text-muted-foreground/70">
          <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          {" · "}
          <Link to="/support" className="underline underline-offset-4 hover:text-foreground transition-colors">
            Support
          </Link>
        </p>
      </div>
    </main>
  );
}
