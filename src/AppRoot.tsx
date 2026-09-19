// Antarasetu — App entry point.
// Wraps the entire app in React Router.
// The original App.jsx (3D twin viewer) is preserved at src/App.jsx
// and will be integrated into the Twin page by Dev A in a future session.

import { RouterProvider } from 'react-router-dom';
import { router } from './router';

export default function App() {
  return <RouterProvider router={router} />;
}
