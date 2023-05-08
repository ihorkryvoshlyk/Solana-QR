import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getMint,
} from '@solana/spl-token'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js'
import { NextApiRequest, NextApiResponse } from 'next'
import { decrypt } from '../../lib/openssl_crypto'
import { usdcAddress } from '../../lib/addresses'

type MakeTransactionGetResponse = {
  label: string
  icon: string
}

export type MakeTransactionInputData = {
  account: string
}

export type MakeTransactionOutputData = {
  transaction: string
  message: string
}

type ErrorOutput = {
  error: string
}

function get(res: NextApiResponse<MakeTransactionGetResponse>) {
  res.status(200).json({
    label: 'Cookies Inc',
    icon: 'https://freesvg.org/img/1370962427.png',
  })
}

export async function post(
  req: NextApiRequest,
  res: NextApiResponse<MakeTransactionOutputData | ErrorOutput>
) {
  try {
    const token = req.query.token as string
    let params
    if (token) {
      const tokenString = token.trim().replaceAll(' ', '+')
      params = JSON.parse(decrypt(tokenString as string))
    } else {
      params = req.query
    }

    // We pass the reference to use in the query
    const {
      box_of_cookies,
      basket_of_cookies,
      reference,
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
    console.log(percent)
    console.log(percent1)
    console.log(amount)
    console.log(country)
    console.log(city)
    console.log(secret)

    if (!reference) {
      res.status(400).json({ error: 'No reference provided' })
      return
    }

    // We pass the buyer's public key in JSON body
    const { account } = req.body as MakeTransactionInputData
    if (!account) {
      res.status(400).json({ error: 'No account provided' })
      return
    }
    const buyerPublicKey = new PublicKey(account)
    const network = WalletAdapterNetwork.Devnet
    const endpoint = clusterApiUrl(network)
    const connection = new Connection(endpoint)
    // Get details about the USDC token
    const usdcMint = await getMint(connection, usdcAddress)
    // Get the buyer's USDC token account address
    const buyerUsdcAddress = await getAssociatedTokenAddress(
      usdcAddress,
      buyerPublicKey
    )

    // Get a recent blockhash to include in the transaction
    const { blockhash } = await connection.getLatestBlockhash('finalized')

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      // The buyer pays the transaction fee
      feePayer: buyerPublicKey,
    })

    if (recipient) {
      const shopPublicKeyOne = new PublicKey(recipient)
      // Get the shop's USDC token account address
      const shopUsdcAddressOne = await getAssociatedTokenAddress(
        usdcAddress,
        shopPublicKeyOne
      )

      // Create the instruction to send USDC from the buyer to the shop
      const transferInstructionOne = createTransferCheckedInstruction(
        buyerUsdcAddress, // source
        usdcAddress, // mint (token address)
        shopUsdcAddressOne, // destination
        buyerPublicKey, // owner of source address
        Math.floor(amount * 10 ** usdcMint.decimals * (percent || 1)), // amount to transfer (in units of the USDC token)
        usdcMint.decimals // decimals of the USDC token
      )
      // This will mean this transaction is returned when we query for the reference
      transferInstructionOne.keys.push({
        pubkey: new PublicKey(reference),
        isSigner: false,
        isWritable: false,
      })
      transaction.add(transferInstructionOne)
    }

    if (recipient1) {
      const shopPublicKeyTwo = new PublicKey(recipient1)

      const shopUsdcAddressTwo = await getAssociatedTokenAddress(
        usdcAddress,
        shopPublicKeyTwo
      )

      const transferInstructionTwo = createTransferCheckedInstruction(
        buyerUsdcAddress, // source
        usdcAddress, // mint (token address)
        shopUsdcAddressTwo, // destination
        buyerPublicKey, // owner of source address
        Math.floor(amount * 10 ** usdcMint.decimals * (percent1 || 0)), // amount to transfer (in units of the USDC token)
        usdcMint.decimals // decimals of the USDC token
      )

      transferInstructionTwo.keys.push({
        pubkey: new PublicKey(reference),
        isSigner: false,
        isWritable: false,
      })
      transaction.add(transferInstructionTwo)
    }

    // Serialize the transaction and convert to base64 to return it
    const serializedTransaction = transaction.serialize({
      // We will need the buyer to sign this transaction after it's returned to them
      requireAllSignatures: false,
    })
    const base64 = serializedTransaction.toString('base64')

    // Insert into database: reference, amount

    // Return the serialized transaction
    res.status(200).json({
      transaction: base64,
      message: 'Thanks for your payment.',
    })
  } catch (err) {
    console.error(err)

    res.status(500).json({ error: 'error creating transaction' })
    return
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    MakeTransactionGetResponse | MakeTransactionOutputData | ErrorOutput
  >
) {
  if (req.method === 'GET') {
    return get(res)
  } else if (req.method === 'POST') {
    return await post(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
