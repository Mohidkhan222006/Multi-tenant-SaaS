import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_API_KEY;

export const stripe = new Stripe(stripeSecretKey || 'mock_key', {
  typescript: true,
});
