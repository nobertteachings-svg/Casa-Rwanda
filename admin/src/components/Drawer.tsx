import type { ReactNode } from "react";

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-header">
          <h3>{title}</h3>
          <button type="button" className="drawer-close" onClick={onClose}>×</button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}
