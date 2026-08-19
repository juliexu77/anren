import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Section = ({ heading, children }: { heading: string; children: React.ReactNode }) => (
  <section>
    <h2 className="mb-2 font-editorial text-[1.15rem] text-foreground">{heading}</h2>
    <div className="space-y-3">{children}</div>
  </section>
);

export default function Support() {
  return (
    <main className="min-h-screen px-6 py-10 pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2.5rem)]">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[0.82rem] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
        </Link>

        <h1 className="mt-6 font-editorial text-[2.1rem] leading-tight tracking-[-0.01em]">Support</h1>
        <p className="mt-3 text-[0.94rem] leading-relaxed text-muted-foreground">
          anren is a private voice memo notetaker. Talk it through, and anren writes it up and remembers it for you.
        </p>

        <div className="mt-8 space-y-8 text-[0.94rem] leading-relaxed text-muted-foreground">
          <Section heading="Get in touch">
            <p>
              Email{" "}
              <a href="mailto:juliexubi@gmail.com" className="underline underline-offset-4 hover:text-foreground">
                juliexubi@gmail.com
              </a>
              . Replies usually come within two business days. It helps to include what you were doing, what you
              expected, and what happened instead.
            </p>
          </Section>

          <Section heading="Recording">
            <p>
              Tap the record button, speak as long as you like, then stop. anren transcribes the audio, writes a short
              title and summary, and files the note in your feed by day. The screen stays awake while you record.
            </p>
            <p>
              If nothing is captured, check that anren has microphone permission: iOS Settings → anren → Microphone. In a
              browser, allow the microphone prompt for the site.
            </p>
          </Section>

          <Section heading="A note is stuck processing">
            <p>
              Transcription and write-up usually finish within a minute. If a note stays unfinished, reopen the app so it
              can retry. If it is still stuck after a few minutes, email us with the note&rsquo;s date and time.
            </p>
          </Section>

          <Section heading="Ask and related notes">
            <p>
              Ask puts a question to your own notes. anren answers in a few sentences, leaning only on what you actually
              said, and lists the notes it drew on underneath so you can read the originals. On a note page,
              &ldquo;Related&rdquo; quietly links earlier notes on the same subject.
            </p>
          </Section>

          <Section heading="Privacy and your data">
            <p>
              Notes are private to your account. Deleting a note removes its audio, transcript and summary. See the{" "}
              <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground">
                Privacy Policy
              </Link>{" "}
              for the full picture.
            </p>
          </Section>

          <Section heading="Deleting your account">
            <p>
              Open Settings and choose{" "}
              <Link to="/delete-account" className="underline underline-offset-4 hover:text-foreground">
                Delete account
              </Link>
              . Everything is removed permanently and cannot be recovered.
            </p>
          </Section>
        </div>

        <p className="mt-12 text-[0.82rem] text-muted-foreground/70">
          <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          {" · "}
          <Link to="/terms" className="underline underline-offset-4 hover:text-foreground transition-colors">
            Terms of Service
          </Link>
        </p>
      </div>
    </main>
  );
}
