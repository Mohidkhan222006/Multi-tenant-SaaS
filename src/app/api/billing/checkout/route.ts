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
    // 1. Fetch organization details
    const org = await db.organization.findUnique({
      where: { id: session.user.organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    let customerId = org.stripeCustomerId;

    // 2. Create customer in Stripe if they don't have one
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: {
          organizationId: org.id,
        },
      });

      customerId = customer.id;

      // Update organization in DB
      await db.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // 3. Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Pro Plan Subscription',
              description: 'Unlimited projects, tasks, and members in Aether.',
            },
            unit_amount: 1900, // $19.00
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appUrl}/dashboard?billing=success`,
      cancel_url: `${appUrl}/settings?billing=cancel`,
      metadata: {
        organizationId: org.id,
      },
    });

    return NextResponse.json({ data: { url: checkoutSession.url } });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
