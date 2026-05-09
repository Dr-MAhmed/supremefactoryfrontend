interface ViewOnlyNoticeProps {
  entity: string;
}

export default function ViewOnlyNotice({ entity }: ViewOnlyNoticeProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-400">
      Viewers can only view {entity}. If you need edit access, ask an administrator to upgrade your role.
    </div>
  );
}
