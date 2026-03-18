export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="max-w-6xl mx-auto px-4 py-8 pt-24">
        {children}
      </main>
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-neutral-500">
          <p>© 2026 jimixer — Built with Next.js & AWS CDK</p>
        </div>
      </footer>
    </>
  );
}
