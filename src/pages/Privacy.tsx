import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-8 max-w-2xl mx-auto">
      <Link to="/">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </Link>

      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-4">Last updated: February 16, 2026</p>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Information We Collect</h2>
          <p>When you use Anren, we collect information you provide directly, including your email address, display name, and any content you create within the app (notes, cards). If you connect Google Calendar, we access your calendar events with your explicit permission.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
          <p>We use your information to provide and improve the Anren service, including displaying your calendar events, organizing your notes, and personalizing your experience. We do not sell your personal data to third parties.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. Google Calendar Data</h2>
          <p>If you connect your Google Calendar, we access your calendar events solely to display and manage them within Anren. We store OAuth tokens securely to maintain your connection. You can disconnect Google Calendar at any time from the app settings.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Data Storage & Security</h2>
          <p>Your data is stored securely using industry-standard encryption and access controls. We use secure cloud infrastructure to protect your information.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Data Retention & Deletion</h2>
          <p>You can delete your account and associated data at any time. Upon account deletion, your personal data will be permanently removed from our systems.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">6. Contact</h2>
          <p>If you have questions about this privacy policy, please contact us at juliexubi@gmail.com.</p>
        </section>
      </div>
    </div>
  );
}
