import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import './index.css'
import reportWebVitals from './reportWebVitals'
import { SmartRouterExample } from './SmartRouterExample'
import { App } from './App'
import { InfinityRouterExample } from './InfinityRouterExample'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/infinity-router',
    element: <InfinityRouterExample />,
  },
  {
    path: '/smart-router',
    element: <SmartRouterExample />,
  },
])

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
