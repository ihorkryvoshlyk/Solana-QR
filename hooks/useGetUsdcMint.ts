import { useState, useEffect } from 'react'
import { getMint, Mint } from '@solana/spl-token'
import { ConnectionContextState } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'

const useGetUsdcMint = (
  connection: ConnectionContextState['connection'],
  usdcAddress: PublicKey
) => {
  const [usdcMint, setUsdcMint] = useState<Mint | undefined>()

  useEffect(() => {
    getMint(connection, usdcAddress)
      .then((mint) => {
        setUsdcMint(mint)
      })
      .catch((err) => {
        setUsdcMint(undefined)
      })
  }, [connection, usdcAddress])

  return usdcMint
}

export default useGetUsdcMint
