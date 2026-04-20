import { Button } from '../../ui';
import '../events/events.css';

export default function ErrorState({ title, message, hint, onRetry }) {
  return (
    <div className="mm-error-panel" role="alert">
      <h2>{title}</h2>
      {message ? <p>{message}</p> : null}
      {hint ? <p className="mm-error-hint">{hint}</p> : null}
      {onRetry ? (
        <Button type="button" variant="contained" color="primary" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      ) : null}
    </div>
  );
}
