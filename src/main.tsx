import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './glass.css';
import './scroll-scenes.css';
const root = document.getElementById('root')!;
const app = <React.StrictMode><App/></React.StrictMode>;
if (root.children.length > 0) hydrateRoot(root, app); else createRoot(root).render(app);
