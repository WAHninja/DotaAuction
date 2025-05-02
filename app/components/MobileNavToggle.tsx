'use client';

import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import MobileNav from './MobileNav';

export default function MobileNavToggle() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-gray-800 p-2 rounded-lg shadow-md"
      >
        {isOpen ? <X className="text-white" /> : <Menu className="text-white" />}
      </button>
      {isOpen && <MobileNav closeMenu={() => setIsOpen(false)} />}
    </>
  );
}
