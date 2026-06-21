import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organizationId;
        const subscriptionId = session.subscription as string;

        if (!orgId || !subscriptionId) {
          console.warn('Checkout Session completed without organizationId or subscriptionId metadata');
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEndTimestamp = subscription.items.data[0]?.current_period_end;
        if (!periodEndTimestamp) {
          throw new Error('Subscription does not contain billing period end items');
        }

        // Idempotent Upsert for Subscription and Organization upgrade
        await db.$transaction(async (tx) => {
          await tx.subscription.upsert({
            where: { stripeSubscriptionId: subscriptionId },
            create: {
              organizationId: orgId,
              stripeSubscriptionId: subscriptionId,
              plan: 'pro',
              status: subscription.status,
              currentPeriodEnd: new Date(periodEndTimestamp * 1000),
            },
            update: {
              status: subscription.status,
              currentPeriodEnd: new Date(periodEndTimestamp * 1000),
            },
          });

          await tx.organization.update({
            where: { id: orgId },
            data: { plan: 'pro' },
          });
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const status = subscription.status;
        const orgId = subscription.metadata?.organizationId;
        const periodEndTimestamp = subscription.items.data[0]?.current_period_end;

        if (!periodEndTimestamp) {
          throw new Error('Subscription does not contain billing period end items');
        }

        const plan = status === 'active' || status === 'trialing' ? 'pro' : 'free';

        // Update database subscription record
        const dbSub = await db.subscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (dbSub) {
          await db.$transaction(async (tx) => {
            await tx.subscription.update({
              where: { stripeSubscriptionId: subscriptionId },
              data: {
                status,
                currentPeriodEnd: new Date(periodEndTimestamp * 1000),
              },
            });

            await tx.organization.update({
              where: { id: dbSub.organizationId },
              data: { plan },
            });
          });
        } else if (orgId) {
          // If subscription doesn't exist in DB yet, create it idempotently
          await db.$transaction(async (tx) => {
            await tx.subscription.create({
              data: {
                organizationId: orgId,
                stripeSubscriptionId: subscriptionId,
                plan: 'pro',
                status,
                currentPeriodEnd: new Date(periodEndTimestamp * 1000),
              },
            });

            await tx.organization.update({
              where: { id: orgId },
              data: { plan },
            });
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        const dbSub = await db.subscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (dbSub) {
          await db.$transaction(async (tx) => {
            await tx.subscription.update({
              where: { stripeSubscriptionId: subscriptionId },
              data: { status: 'canceled' },
            });

            await tx.organization.update({
              where: { id: dbSub.organizationId },
              data: { plan: 'free' },
            });
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceAny = invoice as any;
        const subscriptionId = (typeof invoiceAny.subscription === 'string'
          ? invoiceAny.subscription
          : invoiceAny.subscription?.id) || invoiceAny.parent?.subscription_details?.subscription;

        if (subscriptionId) {
          const dbSub = await db.subscription.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
          });

          if (dbSub) {
            await db.$transaction(async (tx) => {
              await tx.subscription.update({
                where: { stripeSubscriptionId: subscriptionId },
                data: { status: 'past_due' },
              });

              await tx.organization.update({
                where: { id: dbSub.organizationId },
                data: { plan: 'free' },
              });
            });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
