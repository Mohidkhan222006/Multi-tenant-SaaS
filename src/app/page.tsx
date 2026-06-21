import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user?.organizationId) {
    redirect('/dashboard');
  } else if (session?.user) {
    redirect('/onboarding');
  } else {
    redirect('/login');
  }
}
