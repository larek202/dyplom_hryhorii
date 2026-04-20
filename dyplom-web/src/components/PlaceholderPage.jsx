export default function PlaceholderPage({ title, description }) {
  return (
    <div className="placeholder-page">
      <h1 className="page-title">{title}</h1>
      <p className="muted">
        {description || 'Ta sekcja jest w przygotowaniu — wkrótce pojawi się tu pełna treść.'}
      </p>
    </div>
  );
}
