export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md animate-fade-in">{children}</div>
    </div>
  );
}
