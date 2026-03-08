

## Send Weekly Synthesis via Email (SendGrid)

### What changes

1. **Add SendGrid API key secret** — You have SendGrid for inbound but no `SENDGRID_API_KEY` stored yet. We need to add it so the edge function can send outbound email.

2. **Update `send-weekly-synthesis` edge function** — Replace the APNs push notification section with a SendGrid email send. The email will contain:
   - The AI narrative (warm, reflective tone)
   - Domain breakdown with percentage bars (HTML email)
   - Stale item nudges with "What's my next step?" suggestion
   - Styled to match Anren's warm aesthetic

3. **Email template** — Build an inline HTML email template within the edge function that renders:
   - A header ("Your week in review")
   - The narrative paragraph
   - A visual domain breakdown (colored bars with percentages and counts)
   - A stale items section with gentle nudges
   - A footer linking back to the app

4. **Sender address** — Will use your SendGrid verified sender (need to confirm: likely `notes@anren.app` or a different from address like `hello@anren.app`).

### Technical details

- **SendGrid v3 API**: `POST https://api.sendgrid.com/v3/mail/send` with `Authorization: Bearer $SENDGRID_API_KEY`
- The function already fetches user email from profiles table (needed for recipient address)
- Keep the existing AI analysis logic unchanged — only replace the delivery mechanism (push → email)
- The push notification code will be removed from this function (daily brief still handles push separately)

### Steps
1. Request `SENDGRID_API_KEY` secret from you
2. Update the edge function to fetch user email from `profiles` and send via SendGrid instead of APNs
3. Build the HTML email template inline in the function

