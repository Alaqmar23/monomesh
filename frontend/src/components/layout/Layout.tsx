import React from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-slate-100 flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 pt-16 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
