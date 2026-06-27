import { createBrowserRouter, Navigate } from "react-router-dom"
import { AppLayout } from "@components/app-layout/app-layout"
import MyPropertiesPage from "../pages/my-properties.page"
import MyRentalsPage from "../pages/my-rentals.page"
import SmartlockPage from "../pages/smartlock.page"
import SearchPage from "../pages/search.page"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <SearchPage />,
      },
      {
        path: "propiedades",
        element: <MyPropertiesPage />,
      },
      {
        path: "alquileres",
        element: <MyRentalsPage />,
      },
      {
        path: "smartlock",
        element: <SmartlockPage />,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
])
