import { useRef, useState, useEffect, FormEvent, useMemo } from 'react'
import { useRouter } from 'next/router'
import { Keypair } from '@solana/web3.js'
import { encrypt } from '../lib/openssl_crypto'
import { products } from '../lib/products'
import NumberInput from './NumberInput'

interface Props {
  submitTarget: string
  enabled: boolean
}

interface ProductAmounts {
  [key: string]: string | number
}

export default function Products({ submitTarget, enabled }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [productAmounts, setProductAmounts] = useState<ProductAmounts>({
    recipient: '2JNpex2erkE3MrGgVc56raugEARsEGResZCH95pskBXU',
    label: '1 Month Membership',
    recipient1: '8RZrsjy6CGYn1WpcHkZD1MenAKHVAGtBZPCMkRpzprs5',
    percent: 0.8,
    percent1: 0.2,
    amount: 1,
    country: 'France',
    city: 'Paris',
    secret: '9291d6f2e608',
  })
  const router = useRouter()

  useEffect(() => {
    let temp: ProductAmounts = {
      ...productAmounts,
    }
    products.map((product) => {
      temp[product.id] = '0'
    })
    setProductAmounts(temp)
  }, [])

  const handleInputChange = (productId: string, value: number) => {
    setProductAmounts({
      ...productAmounts,
      [productId]: `${value}`,
    })
  }

  const handleSubmitWithEncryptedURL = (e: FormEvent) => {
    e.preventDefault()
    const encodedSearchParams = encrypt(
      decodeURIComponent(JSON.stringify(productAmounts))
    )
    router.push(`/checkout?token=${encodedSearchParams}`)
  }

  const handleSubmitWithNonEncryptedURL = (e: FormEvent) => {
    e.preventDefault()
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(productAmounts)) {
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
    router.push(`/checkout?${searchParams.toString()}`)
  }

  return (
    <form
      method="get"
      action={submitTarget}
      ref={formRef}
      onSubmit={handleSubmitWithNonEncryptedURL}
    >
      <div className="flex flex-col gap-16">
        <div className="grid grid-cols-2 gap-8">
          {products.map((product) => {
            return (
              <div
                className="rounded-md bg-white p-8 text-left"
                key={product.id}
              >
                <h3 className="text-2xl font-bold">{product.name}</h3>
                <p className="text-sm text-gray-800">{product.description}</p>
                <p className="my-4">
                  <span className="mt-4 text-xl font-bold">
                    ${product.priceUsd}
                  </span>
                  {product.unitName && (
                    <span className="text-sm text-gray-800">
                      {' '}
                      /{product.unitName}
                    </span>
                  )}
                </p>
                <div className="mt-1">
                  <NumberInput
                    name={product.id}
                    onChange={(value) => {
                      handleInputChange(product.id, value)
                    }}
                    formRef={formRef}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <button
          className="max-w-fit items-center self-center rounded-md bg-gray-900 px-20 py-2 text-white hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!enabled}
          onClick={handleSubmitWithEncryptedURL}
        >
          Checkout with encrypted url
        </button>

        <button
          className="max-w-fit items-center self-center rounded-md bg-gray-900 px-20 py-2 text-white hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!enabled}
          type="submit"
        >
          Checkout with non-encrypted url
        </button>
      </div>
    </form>
  )
}
