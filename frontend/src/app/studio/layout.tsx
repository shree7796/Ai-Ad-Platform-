/** Same light “AI studio” tokens as marketing (`:root` in globals.css) — no `theme-studio-dark` here. */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <div className="app-workspace min-h-screen">{children}</div>;
}
