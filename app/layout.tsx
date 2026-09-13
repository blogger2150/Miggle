export const metadata = {
  title: 'Miggle Search Engine',
  description: 'Fair play search infrastructure.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
