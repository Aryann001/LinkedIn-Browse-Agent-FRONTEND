import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // This imports your global.css
import Link from "next/link";
import { Cog6ToothIcon, CommandLineIcon } from "@heroicons/react/24/outline";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LinkedIn Agent",
  description: "Your personal LinkedIn automation dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className=" bg-gray-100">
      <body className={`${inter.className} text-gray-800`}>
        {/* Navigation Bar */}
        <nav className="bg-gray-900 shadow-sm border-b border-gray-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <Link href="/" className="flex flex-shrink-0 items-center gap-2 font-bold text-2xl text-indigo-600">
                  <CommandLineIcon className="h-7 w-7" />
                  LinkedIn Agent
                </Link>
              </div>
              <div className="flex items-center">
                <Link
                  href="/admin"
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <span className="sr-only">Admin Settings</span>
                  <Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <main className="py-10">
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}