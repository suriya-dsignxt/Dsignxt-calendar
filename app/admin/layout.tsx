import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Dashboard - Calendar App",
  description: "Manage your appointments and availability",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
