import App from 'components/App';
import ErrorBoundary from 'components/ErrorBoundary';

export default function Home() {
  return (
    <ErrorBoundary>
      <App appType="sampling" />
    </ErrorBoundary>
  );
}
