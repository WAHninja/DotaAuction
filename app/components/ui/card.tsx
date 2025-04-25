import React from 'react';
import clsx from 'clsx';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('rounded-xl shadow-md overflow-hidden', className)}>{children}</div>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('p-4', className)}>{children}</div>;
}
