import { useNavigate } from "react-router-dom"
import { useMyRentalsPage } from "@hooks/use-my-rentals-page"
import { MyRentalsScreen } from "@components/my-rentals-screen/my-rentals-screen"

export default function MyRentalsPage() {
  const pageProps = useMyRentalsPage()
  const navigate = useNavigate()

  function handleNavigateToSmartlock() {
    navigate("/smartlock")
  }

  return (
    <MyRentalsScreen
      {...pageProps}
      onNavigateToSmartlock={handleNavigateToSmartlock}
    />
  )
}
