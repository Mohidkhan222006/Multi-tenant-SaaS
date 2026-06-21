import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify Role: Only Owner or Admin can manage billing
  if (session.user.role !== 'owner' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Only administrators can manage billing' }, { status: 403 });
  }

  try {
    const org = await db.organization.findUnique({
      where: { id: session.user.organizationId },
    });

    if (!org || !org.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No active subscription or customer record found' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Create Stripe Portal Session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    });

    return NextResponse.json({ data: { url: portalSession.url } });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
