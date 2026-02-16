import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-8 max-w-2xl mx-auto">
      <Link to="/">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </Link>

      <h1 className="text-2xl font-bold mb-6">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-4">Last updated: February 16, 2026</p>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>By using Anren, you agree to these Terms of Service. If you do not agree, please do not use the service.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. Description of Service</h2>
          <p>Anren is a personal productivity application that helps you organize notes, cards, and calendar events. Features may include Google Calendar integration, voice recording, and AI-powered note classification.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. User Accounts</h2>
          <p>You are responsible for maintaining the security of your account credentials. You must provide accurate information when creating your account.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Acceptable Use</h2>
          <p>You agree to use Anren only for lawful purposes and in accordance with these terms. You may not misuse the service or attempt to access it through unauthorized means.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Intellectual Property</h2>
          <p>Content you create within Anren remains yours. The Anren service, including its design and code, is protected by intellectual property laws.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">6. Limitation of Liability</h2>
          <p>Anren is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">7. Changes to Terms</h2>
          <p>We may update these terms from time to time. Continued use of Anren after changes constitutes acceptance of the updated terms.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">8. Contact</h2>
          <p>For questions about these terms, contact us at juliexubi@gmail.com.</p>
        </section>
      </div>
    </div>
  );
}
