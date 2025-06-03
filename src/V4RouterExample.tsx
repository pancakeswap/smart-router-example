import { Native, ChainId, CurrencyAmount, TradeType } from '@pancakeswap/sdk'
import { InfinityRouter } from '@pancakeswap/smart-router'
import { bscTokens } from '@pancakeswap/tokens'
import { useCallback, useMemo, useState } from 'react'
import { createPublicClient, http } from 'viem'
import { bsc } from 'viem/chains'

import './App.css'

const chainId = ChainId.BSC
const swapFrom = Native.onChain(chainId)
const swapTo = bscTokens.usdt

const client = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed1.binance.org'),
  batch: {
    multicall: {
      batchSize: 1024 * 200,
    },
  },
})

export function V4RouterExample() {
  const [trade, setTrade] = useState<Awaited<ReturnType<typeof InfinityRouter.getBestTrade>> | undefined>(undefined)
  const amount = useMemo(() => CurrencyAmount.fromRawAmount(swapFrom, 10 ** 16), [])
  const getBestRoute = useCallback(async () => {
    const v3Pools = await InfinityRouter.getV3CandidatePools({
      clientProvider: () => client,
      currencyA: swapFrom,
      currencyB: swapTo,
    })
    const pools = [...v3Pools]
    const trade = await InfinityRouter.getBestTrade(amount, swapTo, TradeType.EXACT_INPUT, {
      gasPriceWei: () => client.getGasPrice(),
      candidatePools: pools,
    })
    setTrade(trade)
  }, [amount])

  return (
    <div className="App">
      <header className="App-header">
        <p>Pancakeswap V4 Router Example.</p>
        <p>
          Get best quote swapping from {amount.toExact()} {amount.currency.symbol} to{' '}
          {trade?.outputAmount.toExact() || '?'} {swapTo.symbol}
        </p>
        <p>
          <button onClick={getBestRoute}>{trade ? 'Update quote' : 'Get Quote'}</button>
        </p>
      </header>
    </div>
  )
}
