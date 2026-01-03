import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "MatchMyCV — Optimize your resume for any job",
  description: "AI-powered CV optimization that analyzes job descriptions, identifies gaps, and generates tailored resumes that get interviews.",
  keywords: ["CV optimization", "resume builder", "ATS optimization", "job application", "AI resume"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
