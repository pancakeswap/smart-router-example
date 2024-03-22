import { Native, ChainId, CurrencyAmount, TradeType, Percent } from '@pancakeswap/sdk'
import { SmartRouter, SmartRouterTrade, SMART_ROUTER_ADDRESSES, SwapRouter } from '@pancakeswap/smart-router'
import { bscTokens } from '@pancakeswap/tokens'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  WagmiConfig,
  createConfig,
  useAccount,
  useConnect,
  useSwitchNetwork,
  useNetwork,
  useSendTransaction,
} from 'wagmi'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { createPublicClient, hexToBigInt, http } from 'viem'
import { bsc } from 'viem/chains'
import { GraphQLClient } from 'graphql-request'

import './App.css'

const chainId = ChainId.BSC
const swapFrom = Native.onChain(chainId)
const swapTo = bscTokens.usdt

const publicClient = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed1.binance.org'),
  batch: {
    multicall: {
      batchSize: 1024 * 200,
    },
  },
})

const config = createConfig({
  autoConnect: true,
  connectors: [new MetaMaskConnector({ chains: [bsc] })],
  publicClient,
})

const v3SubgraphClient = new GraphQLClient('https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc')
const v2SubgraphClient = new GraphQLClient('https://proxy-worker-api.pancakeswap.com/bsc-exchange')

const quoteProvider = SmartRouter.createQuoteProvider({
  onChainProvider: () => publicClient,
})

function calculateGasMargin(value: bigint, margin = 1000n): bigint {
  return (value * (10000n + margin)) / 10000n
}

export function SmartRouterExample() {
  return (
    <WagmiConfig config={config}>
      <Main />
    </WagmiConfig>
  )
}

function Main() {
  const { chain } = useNetwork()
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { switchNetwork } = useSwitchNetwork()
  const { sendTransactionAsync } = useSendTransaction()

  const [trade, setTrade] = useState<SmartRouterTrade<TradeType> | null>(null)
  const amount = useMemo(() => CurrencyAmount.fromRawAmount(swapFrom, 10 ** 16), [])
  const getBestRoute = useCallback(async () => {
    const [v2Pools, v3Pools] = await Promise.all([
      SmartRouter.getV2CandidatePools({
        onChainProvider: () => publicClient,
        v2SubgraphProvider: () => v2SubgraphClient,
        v3SubgraphProvider: () => v3SubgraphClient,
        currencyA: amount.currency,
        currencyB: swapTo,
      }),
      SmartRouter.getV3CandidatePools({
        onChainProvider: () => publicClient,
        subgraphProvider: () => v3SubgraphClient,
        currencyA: amount.currency,
        currencyB: swapTo,
        subgraphFallback: false,
      }),
    ])
    const pools = [...v2Pools, ...v3Pools]
    const trade = await SmartRouter.getBestTrade(amount, swapTo, TradeType.EXACT_INPUT, {
      gasPriceWei: () => publicClient.getGasPrice(),
      maxHops: 2,
      maxSplits: 2,
      poolProvider: SmartRouter.createStaticPoolProvider(pools),
      quoteProvider,
      quoterOptimization: true,
    })
    setTrade(trade)
  }, [amount])

  const swapCallParams = useMemo(() => {
    if (!trade) {
      return null
    }
    const { value, calldata } = SwapRouter.swapCallParameters(trade, {
      recipient: address,
      slippageTolerance: new Percent(1),
    })
    return {
      address: SMART_ROUTER_ADDRESSES[chainId],
      calldata,
      value,
    }
  }, [trade, address])

  const swap = useCallback(async () => {
    if (!swapCallParams || !address) {
      return
    }

    const { value, calldata, address: routerAddress } = swapCallParams

    const tx = {
      account: address,
      to: routerAddress,
      data: calldata,
      value: hexToBigInt(value),
    }
    const gasEstimate = await publicClient.estimateGas(tx)
    await sendTransactionAsync({
      account: address,
      chainId,
      to: routerAddress,
      data: calldata,
      value: hexToBigInt(value),
      gas: calculateGasMargin(gasEstimate),
    })
  }, [swapCallParams, address, sendTransactionAsync])

  useEffect(() => {
    if (isConnected && chain?.id !== chainId) {
      switchNetwork?.(chainId)
    }
  }, [isConnected, switchNetwork, chain])

  return (
    <div className="App">
      <header className="App-header">
        <p>Pancakeswap Smart Router Example.</p>
        <p>
          Get best quote swapping from {amount.toExact()} {amount.currency.symbol} to{' '}
          {trade?.outputAmount.toExact() || '?'} {swapTo.symbol}
        </p>
        <p>
          {isConnected ? (
            address
          ) : (
            <button onClick={() => connect({ connector: connectors[0] })}>Connect wallet</button>
          )}
        </p>
        <p>{!trade ? <button onClick={getBestRoute}>Get Quote</button> : <button onClick={swap}>Swap</button>}</p>
      </header>
    </div>
  )
}
