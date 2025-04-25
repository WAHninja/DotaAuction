'use client';

import dynamic from 'next/dynamic';

const CreateMatchForm = dynamic(() => import('../components/CreateMatchForm'), {
  ssr: false,
});

export default function CreateMatchFormWrapper() {
  return <CreateMatchForm />;
}
