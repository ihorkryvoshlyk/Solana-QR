import Products from '../components/Products'
import SiteHeading from '../components/SiteHeading'
import { useWallet } from '@solana/wallet-adapter-react'

export default function HomePage() {
  return (
    <div className="m-auto flex max-w-4xl flex-col items-stretch gap-8 pt-24">
      <SiteHeading>Solana Checkout</SiteHeading>
      <Products submitTarget="/checkout" enabled />
    </div>
  )
}
