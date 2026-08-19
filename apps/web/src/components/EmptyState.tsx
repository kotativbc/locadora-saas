export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state__title">{title}</div>
      {body && <div className="empty-state__body">{body}</div>}
    </div>
  );
}
