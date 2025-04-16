'use client';

import dynamic from 'next/dynamic';

const CreateMatchForm = dynamic(() => import('../components/CreateMatchForm'));

export default function CreateMatchFormWrapper() {
  return <CreateMatchForm />;
}
