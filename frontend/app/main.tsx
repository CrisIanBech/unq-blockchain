import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@routes/routes'
import { AppWagmiProvider } from '@/providers/wagmi-provider'
import './globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWagmiProvider>
      <RouterProvider router={router} />
    </AppWagmiProvider>
  </React.StrictMode>,
)
