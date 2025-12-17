import { useContext, useEffect } from 'react';
import App from 'components/App';
import ErrorBoundary from 'components/ErrorBoundary';
import { SketchContext } from 'contexts/Sketch';

export default function Tods() {
  const { setDisplayGeometryType, setTerrain3dVisible } =
    useContext(SketchContext);

  useEffect(() => {
    setDisplayGeometryType('polygons');
    setTerrain3dVisible(false);
  }, [setDisplayGeometryType, setTerrain3dVisible]);

  return (
    <ErrorBoundary>
      <App appType="decon" />
    </ErrorBoundary>
  );
}
