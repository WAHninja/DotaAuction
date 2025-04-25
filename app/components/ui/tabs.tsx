'use client';

import * as React from 'react';
import { Tab } from '@headlessui/react';
import clsx from 'clsx';

export function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  return <Tab.Group defaultIndex={defaultValue === 'ongoing' ? 0 : defaultValue === 'completed' ? 1 : 2}>{children}</Tab.Group>;
}

export function TabsList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Tab.List className={clsx('flex space-x-2', className)}>{children}</Tab.List>;
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const index = value === 'ongoing' ? 0 : value === 'completed' ? 1 : 2;
  return (
    <Tab className={({ selected }) =>
      clsx(
        'px-4 py-2 rounded-md text-sm font-medium transition',
        selected ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700'
      )
    }>
      {children}
    </Tab>
  );
}

export function TabsContent({ value, children }: { value: string; children: React.ReactNode }) {
  const index = value === 'ongoing' ? 0 : value === 'completed' ? 1 : 2;
  return <Tab.Panels>{[children][index]}</Tab.Panels>;
}
