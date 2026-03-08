interface SidebarSectionHeaderProps {
  title: string;
  collapsed?: boolean;
}

export default function SidebarSectionHeader({ title, collapsed }: SidebarSectionHeaderProps) {
  if (collapsed) {
    return <div className="h-px bg-gray-100 mx-2 my-3" />;
  }

  if (!title) return <div className="mt-4" />;

  return (
    <div className="px-3 pt-5 pb-1">
      <p className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider">{title}</p>
    </div>
  );
}
