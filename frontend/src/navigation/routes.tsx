import type { ComponentType } from 'react';
import { HomePage } from '@/pages/Home/HomePage';
import { DropDetailPage } from '@/pages/DropDetail/DropDetailPage';
import { StudioPage } from '@/pages/Studio/StudioPage';
import { ProfilePage } from '@/pages/Profile/ProfilePage';

interface Route {
  path: string;
  Component: ComponentType;
  title?: string;
}

export const routes: Route[] = [
  { path: '/', Component: HomePage, title: 'Home' },
  { path: '/drop/:id', Component: DropDetailPage, title: 'Drop Detail' },
  { path: '/studio', Component: StudioPage, title: 'Drop Studio' },
  { path: '/studio/new', Component: StudioPage, title: 'New Drop' },
  { path: '/studio/edit/:id', Component: StudioPage, title: 'Edit Drop' },
  { path: '/profile', Component: ProfilePage, title: 'Profile' },
];
