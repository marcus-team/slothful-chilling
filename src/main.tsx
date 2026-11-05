import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ConfigProvider, theme } from 'antd';

createRoot(document.getElementById('root')!).render(
  <ConfigProvider
    theme={{
      token: {
        colorPrimary: '#171717',
        colorLink: '#171717',
        borderRadius: 6,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      },
    }}
  >
    <App />
  </ConfigProvider>
);
