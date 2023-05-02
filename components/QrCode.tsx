import { FC, useEffect, useMemo, useRef, useState } from 'react'
import {
  createQR,
  encodeURL,
  findReference,
  validateTransfer,
  FindReferenceError,
  ValidateTransferError,
  TransactionRequestURLFields,
} from '@solana/pay'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { clusterApiUrl, Connection, Keypair, PublicKey } from '@solana/web3.js'
import BigNumber from 'bignumber.js'
import { time } from 'console'
import { useRouter } from 'next/router'
import BackLink from '../components/BackLink'
import PageHeading from '../components/PageHeading'
import { shopAddress, usdcAddress } from '../lib/addresses'
import calculatePrice from '../lib/calculatePrice'
import { encrypt, decrypt } from '../lib/openssl_crypto'

interface Props {
  urlParams: TransactionRequestURLFields
  amount: BigNumber
  recipient: PublicKey
  reference: PublicKey
}

const QrCode: FC<Props> = (props) => {
  const { urlParams, amount, recipient, reference } = props
  const router = useRouter()
  // Get a connection to Solana devnet
  const network = WalletAdapterNetwork.Devnet
  const endpoint = clusterApiUrl(network)
  const connection = new Connection(endpoint)
  const qrRef = useRef<HTMLDivElement>(null)

  // Show the QR code
  useEffect(() => {
    const solanaUrl = encodeURL(urlParams)
    const qr = createQR(solanaUrl, 512, 'transparent')
    if (qrRef.current && amount.isGreaterThan(0)) {
      qrRef.current.innerHTML = ''
      qr.append(qrRef.current)
    }
  })

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Check if there is any transaction for the reference
        const signatureInfo = await findReference(connection, reference, {
          finality: 'confirmed',
        })
        // Validate that the transaction has the expected recipient, amount and SPL token
        await validateTransfer(
          connection,
          signatureInfo.signature,
          {
            recipient: recipient,
            amount,
            splToken: usdcAddress,
            reference,
          },
          { commitment: 'confirmed' }
        )
        router.push('/shop/confirmed')
      } catch (e) {
        if (e instanceof FindReferenceError) {
          // No transaction found yet, ignore this error
          return
        }
        if (e instanceof ValidateTransferError) {
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
