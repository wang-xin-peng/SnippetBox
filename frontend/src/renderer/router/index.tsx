import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from '../components/Layout';
import HomePage from '../pages/HomePage';
import EditorPage from '../pages/EditorPage';
import SettingsPage from '../pages/SettingsPage';


const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'editor/:id?',
        element: <EditorPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
