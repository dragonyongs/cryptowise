import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export default function DashboardMain() {
    const [prices, setPrices] = useState([])

    useEffect(() => {
        fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=krw&per_page=3')
            .then(res => res.json())
            .then(setPrices)
    }, [])

    return (
        <section className="grid gap-6 md:grid-cols-3">
            {prices.map(c => (
                <Card key={c.id}>
                    <header className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">{c.name}</h3>
                        {c.price_change_percentage_24h >= 0
                            ? <TrendingUp className="text-green-600" />
                            : <TrendingDown className="text-red-600" />}
                    </header>
                    <p className="text-2xl font-mono">
                        ₩{c.current_price.toLocaleString()}
                    </p>
                    <p className={c.price_change_percentage_24h >= 0 ? 'price-up' : 'price-down'}>
                        {c.price_change_percentage_24h.toFixed(2)}%
                    </p>
                </Card>
            ))}
        </section>
    )
}
