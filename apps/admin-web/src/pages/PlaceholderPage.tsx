export function PlaceholderPage({ title, note }: { title: string; note: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <div className="card">
        <p>{note}</p>
        <p className="muted">Connected to the APIs in milestone 7.</p>
      </div>
      <button className="primary" type="button" disabled>
        Coming soon
      </button>
    </section>
  );
}
