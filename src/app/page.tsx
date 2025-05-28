'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    window.location.href = '/login';
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">In Development</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        Import is in Development.
      </p>
    </div>
  );
}
