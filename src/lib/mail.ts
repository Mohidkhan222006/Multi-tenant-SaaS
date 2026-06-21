const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resendApiKey || resendApiKey === 're_mock') {
    console.warn(`Resend email not configured. Sending Mock Email:\nTo: ${to}\nSubject: ${subject}\nHTML: ${html.substring(0, 100)}...`);
    return { success: true, mock: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: emailFrom,
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to send email');
    }

    return await res.json();
  } catch (error) {
    console.error('Error sending email via Resend:', error);
    throw error;
  }
}

/**
 * Generate premium HTML template for organization invitations.
 */
export function getInviteEmailTemplate(orgName: string, inviteUrl: string) {
  return `
    <div style="font-family: sans-serif; background-color: #020617; color: #f8fafc; padding: 40px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; background: linear-gradient(135deg, #7c3aed, #4f46e5); font-weight: 800; font-size: 20px; color: #ffffff; text-align: center;">
          A
        </div>
      </div>
      <h2 style="font-size: 20px; font-weight: 700; text-align: center; margin-bottom: 8px; color: #ffffff;">
        Join ${orgName} on Aether
      </h2>
      <p style="font-size: 14px; color: #94a3b8; text-align: center; line-height: 22px; margin-bottom: 32px;">
        You have been invited to join the <strong>${orgName}</strong> workspace on Aether. Collaboratively manage columns, assign tasks, and track milestone goals.
      </p>
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 12px; text-decoration: none; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);">
          Accept Invitation
        </a>
      </div>
      <p style="font-size: 11px; color: #475569; text-align: center; margin-top: 40px; border-top: 1px solid #0f172a; padding-top: 20px;">
        If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;
}
