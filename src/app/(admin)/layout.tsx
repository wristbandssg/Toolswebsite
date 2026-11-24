import type { Metadata } from "next";
import Providers from "@/components/Providers";

// Admin pages are private: keep them out of search results even if a link leaks.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
