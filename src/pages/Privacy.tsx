import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const LegalShell = ({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) => (
  <main className="min-h-screen px-6 py-10">
    <div className="mx-auto w-full max-w-2xl">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[0.82rem] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
      </Link>

      <h1 className="mt-6 font-editorial text-[2.1rem] leading-tight tracking-[-0.01em]">{title}</h1>
      <p className="mt-2 text-[0.8rem] uppercase tracking-[0.16em] text-muted-foreground/70">Last updated {updated}</p>

      <div className="mt-8 space-y-8 text-[0.94rem] leading-relaxed text-muted-foreground">{children}</div>

      <p className="mt-12 text-[0.82rem] text-muted-foreground/70">
        <Link to="/terms" className="underline underline-offset-4 hover:text-foreground transition-colors">
          Terms of Service
        </Link>
        {" · "}
        <Link to="/support" className="underline underline-offset-4 hover:text-foreground transition-colors">
          Support
        </Link>
      </p>
    </div>
  </main>
);

const Section = ({ heading, children }: { heading: string; children: React.ReactNode }) => (
  <section>
    <h2 className="mb-2 font-editorial text-[1.15rem] text-foreground">{heading}</h2>
    <div className="space-y-3">{children}</div>
  </section>
);

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="August 11, 2026">
      <p>
        anren is a private voice memo notetaker. You talk, anren transcribes what you said and writes it up, and the
        result stays in your own account. This policy explains what we hold, why, and how you can remove it.
      </p>

      <Section heading="Who we are">
        <p>
          anren is operated by an independent developer. For any privacy question or request, write to{" "}
          <a href="mailto:juliexubi@gmail.com" className="underline underline-offset-4 hover:text-foreground">
            juliexubi@gmail.com
          </a>
          .
        </p>
      </Section>

      <Section heading="What we collect">
        <p>
          <span className="text-foreground">Account information.</span> When you sign in with Google or Apple, we
          receive your email address and, where provided, your name. We do not collect a password.
        </p>
        <p>
          <span className="text-foreground">Your recordings and notes.</span> Audio you record in the app, the
          transcript produced from it, the title and summary generated from the transcript, and any folders you create
          to organise them.
        </p>
        <p>
          <span className="text-foreground">Technical information.</span> Basic server and error logs needed to keep the
          app running and to diagnose failures.
        </p>
        <p>
          We do not collect contacts, health data, location, advertising identifiers, or browsing activity. anren
          contains no third-party advertising or analytics trackers.
        </p>
      </Section>

      <Section heading="Microphone access">
        <p>
          The microphone is used only while you are actively recording a note, and only after you grant permission. anren
          never records in the background and never listens when you have not started a recording.
        </p>
      </Section>

      <Section heading="How your information is used">
        <p>
          Your recordings are transcribed and summarised so you can search and revisit them. Text from your notes is
          also converted into numerical representations (embeddings) so that search and the &ldquo;related notes&rdquo;
          feature can find earlier notes on the same subject.
        </p>
        <p>
          We do not sell your data, share it with advertisers, or use your notes to train our own models. We do not read
          your notes except where you ask us for support and give us permission to look.
        </p>
      </Section>

      <Section heading="Processing by AI providers">
        <p>
          Transcription, summarisation and search rely on third-party AI processors accessed through our infrastructure
          provider. Audio and note text are sent to these processors solely to produce the transcript, summary,
          embeddings or answer you requested. Under our agreements, this content is not used to train their models.
        </p>
      </Section>

      <Section heading="Storage and security">
        <p>
          Notes and audio are stored on managed cloud infrastructure (Supabase, hosted on Amazon Web Services), encrypted
          in transit with TLS and encrypted at rest by the provider. Database row-level security rules restrict every
          note, folder and audio file to the account that created it.
        </p>
      </Section>

      <Section heading="Retention and deletion">
        <p>
          Notes are kept until you delete them. Deleting a note removes its transcript, summary, embeddings and audio
          file.
        </p>
        <p>
          You can delete your entire account from inside the app: open Settings and choose{" "}
          <Link to="/delete-account" className="underline underline-offset-4 hover:text-foreground">
            Delete account
          </Link>
          . This permanently removes your notes, audio, folders, reflections and sign-in record. Backups holding residual
          copies expire within 30 days.
        </p>
      </Section>

      <Section heading="Children">
        <p>anren is not directed at children under 13, and we do not knowingly collect their information.</p>
      </Section>

      <Section heading="Your rights">
        <p>
          Depending on where you live, you may have the right to access, correct, export or erase your personal
          information, and to object to certain processing. You can exercise access and erasure directly in the app, or
          email us and we will respond within 30 days.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          If this policy changes materially, we will update the date above and note the change in the app before the
          change takes effect.
        </p>
      </Section>
    </LegalShell>
  );
}
