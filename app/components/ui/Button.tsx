// app/components/ui/Button.tsx
export default function Button({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${className}`} {...props}>
      {children}
    </button>
  );
}
