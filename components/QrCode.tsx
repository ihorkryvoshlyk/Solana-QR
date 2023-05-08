import { FC, useEffect, useMemo, useRef } from 'react'
import {
  createQR,
  encodeURL,
  findTransactionSignature,
  FindTransactionSignatureError,
  validateTransactionSignature,
  ValidateTransactionSignatureError,
} from '@solana/pay'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { clusterApiUrl, Connection, Keypair, PublicKey } from '@solana/web3.js'
import BigNumber from 'bignumber.js'
import { useRouter } from 'next/router'
import { usdcAddress } from '../lib/addresses'

interface Props {
  recipient: PublicKey
  splToken: PublicKey
  amount: BigNumber
  label: string
  message: string
  onValidateTransfer: (recipient: string) => void
}

const QrCode: FC<Props> = (props) => {
  const { recipient, splToken, amount, label, message, onValidateTransfer } =
    props
  const router = useRouter()
  // Get a connection to Solana devnet
  const network = WalletAdapterNetwork.Devnet
  const endpoint = clusterApiUrl(network)
  const connection = new Connection(endpoint)
  const qrRef = useRef<HTMLDivElement>(null)
  const reference = useMemo(() => Keypair.generate().publicKey, [])

  // Show the QR code
  useEffect(() => {
    const url = encodeURL({
      reference,
      recipient,
      splToken,
      amount,
      label,
      message,
    })
    const qr = createQR(url, 340, 'transparent')
    if (qrRef.current && amount?.isGreaterThan(0)) {
      qrRef.current.innerHTML = ''
      qr.append(qrRef.current)
    }
  })

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Check if there is any transaction for the reference
        const signatureInfo = await findTransactionSignature(
          connection,
          reference as PublicKey,
          {},
          'confirmed' //If you’re dealing with really big transactions you might prefer to use 'finalized' instead 'confirmed'.
        )
        // Validate that the transaction has the expected recipient, amount and SPL token
        await validateTransactionSignature(
          connection,
          signatureInfo.signature,
          recipient,
          amount,
          usdcAddress,
          reference as PublicKey
        )
        // router.push('/confirmed')
        clearInterval(interval)
        onValidateTransfer(recipient.toString())
      } catch (e) {
        if (e instanceof FindTransactionSignatureError) {
          // No transaction found yet, ignore this error
          console.log('not found yet')
          return
        }
        if (e instanceof ValidateTransactionSignatureError) {
          // Transaction is invalid
          console.error('Transaction is invalid', e)
          return
        }
        console.error('Unknown error', e)
      }
    }, 500)
    return () => {
      clearInterval(interval)
    }
  }, [])

  return <div ref={qrRef} />
}

export default QrCode
