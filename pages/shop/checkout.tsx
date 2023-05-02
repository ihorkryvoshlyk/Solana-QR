import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { TransactionRequestURLFields } from '@solana/pay'
import { Keypair } from '@solana/web3.js'
import BigNumber from 'bignumber.js'
import BackLink from '../../components/BackLink'
import PageHeading from '../../components/PageHeading'
import QrCode from '../../components/QrCode'
import { encrypt, decrypt } from '../../lib/openssl_crypto'

export default function Checkout() {
  const router = useRouter()
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

  useEffect(() => {
    const tokenString = encrypt(
      JSON.stringify({
        ...params,
        reference,
      })
    )
    const { location } = window
    const apiUrl = `${location.protocol}//${location.host}//api/makeTransaction?token=${tokenString}`
    const transactionUrl: TransactionRequestURLFields = {
      link: new URL(apiUrl),
      label: params.label,
      message: 'Thanks for your order! 🍪',
    }
    setUrlParams(transactionUrl)
  }, [params])

  return (
    <div className="flex flex-col items-center gap-8">
      <div>
        <BackLink href="/">Cancel</BackLink>
      </div>
      <PageHeading>
        {params.label} ${amount?.toString()}
      </PageHeading>
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
    </div>
  )
}
