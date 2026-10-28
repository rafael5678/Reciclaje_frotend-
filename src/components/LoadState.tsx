export function LoadState({ error, onRetry, loading = "Cargando..." }: { error: string; onRetry: () => void; loading?: string }) {
  if (!error) return <p className="loading">{loading}</p>;
  return (
    <div className="load-error">
      <strong>No pude traer tus datos</strong>
      <p>{error}</p>
      <button className="cta cta-inline" onClick={onRetry}>Reintentar</button>
    </div>
  );
}
