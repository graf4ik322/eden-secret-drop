import { Navigate, useLocation } from 'react-router-dom';
import { StudioLayout } from './StudioLayout';
import { DropsSection } from './sections/DropsSection';
import { CategoriesSection } from './sections/CategoriesSection';
import { MockupsSection } from './sections/MockupsSection';

export default function StudioPage() {
  const location = useLocation();
  const path = location.pathname;

  // Default: redirect to /studio/drops
  if (path === '/studio') {
    return <Navigate to="/studio/drops" replace />;
  }

  const content = (() => {
    switch (path) {
      case '/studio/drops':
        return <DropsSection />;
      case '/studio/categories':
        return <CategoriesSection />;
      case '/studio/mockups':
        return <MockupsSection />;
      default:
        return <Navigate to="/studio/drops" replace />;
    }
  })();

  return <StudioLayout>{content}</StudioLayout>;
}
