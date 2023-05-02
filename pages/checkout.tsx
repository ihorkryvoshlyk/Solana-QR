import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { TransactionRequestURLFields } from '@solana/pay'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Keypair, Transaction } from '@solana/web3.js'
import BigNumber from 'bignumber.js'
import BackLink from '../components/BackLink'
import PageHeading from '../components/PageHeading'
import QrCode from '../components/QrCode'
import {
  MakeTransactionInputData,
  MakeTransactionOutputData,
} from './api/makeTransaction'
import { encrypt, decrypt } from '../lib/openssl_crypto'

export default function Checkout() {
  const router = useRouter()
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  // State to hold API response fields
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [createdQrCode, setCreatedQrCode] = useState(false)
  const [urlParams, setUrlParams] = useState<TransactionRequestURLFields>()

  const { token } = router.query
  const params = useMemo(() => {
    if (token) {
      const tokenString = String(token).trim().replaceAll(' ', '+')
      return JSON.parse(decrypt(tokenString as string))
    } else {
      return router.query
    }
  }, [router.query])

  useEffect(() => {
    if (params) {
      const {
        box_of_cookies,
        basket_of_cookies,
        recipient,
        label,
        recipient1,
        percent,
        percent1,
        amount,
        country,
        city,
        secret,
      } = params

      console.log(box_of_cookies)
      console.log(basket_of_cookies)
      console.log(reference)
      console.log(recipient)
      console.log(label)
      console.log(recipient1)
      console.log(percent1)
      console.log(amount)
      console.log(country)
      console.log(city)
      console.log(secret)
    }
  }, [params])

  const amount = useMemo(() => {
    return new BigNumber(params.amount)
  }, [params])

  // Generate the unique reference which will be used for this transaction
  const reference = useMemo(() => Keypair.generate().publicKey, [])

  // Use our API to fetch the transaction for the selected items
  async function getTransaction() {
    if (!publicKey || !params) {
      return
    }
    const body: MakeTransactionInputData = {
      account: publicKey.toString(),
    }

    let response

    if (token) {
      const tokenString = encrypt(
        JSON.stringify({
          ...params,
          reference,
        })
      )

      response = await fetch(`/api/makeTransaction?token=${tokenString}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    } else {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value) {
          if (Array.isArray(value)) {
            for (const v of value) {
              searchParams.append(key, v)
            }
          } else {
            searchParams.append(key, value as string)
          }
        }
      }

      // Add reference to the params we'll pass to the API
      searchParams.append('reference', reference.toString())
      response = await fetch(
        `/api/makeTransaction?${searchParams.toString()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      )
    }

    const json = (await response.json()) as MakeTransactionOutputData

    if (response.status !== 200) {
      console.error(json)
      return
    }

    // Deserialize the transaction from the response
    const transaction = Transaction.from(
      Buffer.from(json.transaction, 'base64')
    )
    setTransaction(transaction)
    setMessage(json.message)
  }

  const handleSignatureStatus = async (signature: string) => {
    try {
      const result = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      })
      if (result.value?.confirmationStatus === 'confirmed') {
        const response = await fetch(
          'https://webhook.site/914619b0-2bd1-4c12-b1b2-0d71f04736e2',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...params,
              signature,
            }),
          }
        )
        if (response.status === 200) {
          router.push('/confirmed')
        } else {
          alert('Can not set parameter to webhook, checkout your connection.')
        }
        return
      }
      handleSignatureStatus(signature)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    const tokenString = encrypt(
      JSON.stringify({
        ...params,
        reference,
      })
    )
    const { location } = window
    const apiUrl = `https://solana-qr.onrender.com/api/makeTransaction?token=${tokenString}`
    const transactionUrl: TransactionRequestURLFields = {
      link: new URL(apiUrl),
      label: 'Cookies Inc',
      message: 'Thanks for your order! 🍪',
    }
    setUrlParams(transactionUrl)
  }, [params])

  async function trySendTransaction() {
    if (!transaction) {
      return
    }
    try {
      const signature = await sendTransaction(transaction, connection)
      handleSignatureStatus(signature)
    } catch (e) {
      console.error(e)
    }
  }

  // Send the transaction once it's fetched
  useEffect(() => {
    trySendTransaction()
  }, [transaction])

  const handleClickPayWallet = () => {
    if (!publicKey) {
      alert('Please select wallet before pay')
    } else {
      getTransaction()
    }
  }

  const handleClickCreateQR = () => {
    setCreatedQrCode(true)
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div>
        <BackLink href="/">Cancel</BackLink>
      </div>
      <PageHeading>
        {params.label} ${amount?.toString()}
      </PageHeading>
      <WalletMultiButton />

      <button
        className="rounded-md bg-violet-500 py-2 px-3 text-lg font-semibold text-white shadow hover:bg-violet-600 focus:outline-none focus:outline-none focus:ring focus:ring-violet-300 active:bg-violet-700"
        onClick={handleClickPayWallet}
      >
        Pay Online Wallet
      </button>

      {!createdQrCode ? (
        <button
          className="rounded-md bg-violet-500 py-2 px-3 text-lg font-semibold text-white shadow hover:bg-violet-600 focus:outline-none focus:outline-none focus:ring focus:ring-violet-300 active:bg-violet-700"
          onClick={handleClickCreateQR}
        >
          Create QR Code
        </button>
      ) : (
        <>
          {urlParams ? (
            <QrCode
              urlParams={urlParams}
              amount={amount}
              recipient={params.recipient1}
              reference={reference}
            />
          ) : (
            <p>Invalid URL</p>
          )}
        </>
      )}

      {message ? (
        <p>{message} Please approve the transaction using your wallet</p>
      ) : (
        <p>Please select payment method</p>
      )}
    </div>
  )
}
