'use client'

import { useEffect, useRef, useState } from 'react'

interface MiniChartProps {
  ticker: string
  isCrypto?: boolean
  height?: number
  days?: number
  resolution?: string
}

export default function MiniChart({ ticker, isCrypto = false, height = 180, days = 90, resolution = 'D' }: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!containerRef.current) return

    let chart: any = null

    async function init() {
      try {
        const { createChart, ColorType } = await import('lightweight-charts')
        const el = containerRef.current!
        if (!el) return

        chart = createChart(el, {
          width: el.clientWidth || 300,
          height,
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#444',
          },
          grid: {
            vertLines: { color: '#111' },
            horzLines: { color: '#111' },
          },
          crosshair: { vertLine: { labelBackgroundColor: '#1a1a1a' }, horzLine: { labelBackgroundColor: '#1a1a1a' } },
          rightPriceScale: { borderColor: '#1a1a1a', textColor: '#444' },
          timeScale: { borderColor: '#1a1a1a', timeVisible: true, secondsVisible: false },
          handleScroll: false,
          handleScale: false,
        })
        chartRef.current = chart

        const series = chart.addCandlestickSeries({
          upColor: '#4ade80',
          downColor: '#f87171',
          borderUpColor: '#4ade80',
          borderDownColor: '#f87171',
          wickUpColor: '#4ade80',
          wickDownColor: '#f87171',
        })

        const res = await fetch(`/api/candles?ticker=${ticker}&resolution=${resolution}&days=${days}${isCrypto ? '&crypto=true' : ''}`)
        const candles = await res.json()

        if (Array.isArray(candles) && candles.length > 0) {
          series.setData(candles)
          chart.timeScale().fitContent()
          setLoading(false)
        } else {
          setError(true)
          setLoading(false)
        }
      } catch {
        setError(true)
        setLoading(false)
      }
    }

    init()

    const ro = new ResizeObserver(entries => {
      if (chartRef.current && entries[0]) {
        chartRef.current.applyOptions({ width: entries[0].contentRect.width })
      }
    })
    if (containerRef.current) ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      if (chartRef.current) {
        try { chartRef.current.remove() } catch {}
        chartRef.current = null
      }
    }
  }, [ticker, isCrypto, height, days, resolution])

  if (error) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a2a2a', fontSize: '11px' }}>
        Chart unavailable
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a2a2a', fontSize: '11px', zIndex: 1 }}>
          Loading chart...
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height, opacity: loading ? 0 : 1, transition: 'opacity 0.3s' }} />
    </div>
  )
}
