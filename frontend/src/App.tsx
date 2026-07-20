import { Suspense } from 'react';
import { Navigate, Route, Routes, HashRouter } from 'react-router-dom';
import { routes } from '@/navigation/routes';

export function App() {
  return (
    <HashRouter>
      <Suspense fallback={null}>
        <Routes>
          {routes.map((route) => (
            <Route key={route.path} path={route.path} Component={route.Component} />
          ))}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
