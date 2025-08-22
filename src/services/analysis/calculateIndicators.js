// src/components/features/analysis/utils/calculateIndicators.js

export function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return { latest: 0, array: [] };
  let gains = 0,
    losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period || 1;
  let rs = avgGain / avgLoss;
  const rsiArray = [100 - 100 / (1 + rs)];

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
    rs = avgGain / (avgLoss || 1);
    rsiArray.push(100 - 100 / (1 + rs));
  }

  return { latest: rsiArray[rsiArray.length - 1], array: rsiArray };
}

export function calculateMACD(prices) {
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    let emaArr = [data[0]];
    for (let i = 1; i < data.length; i++) {
      emaArr.push(data[i] * k + emaArr[i - 1] * (1 - k));
    }
    return emaArr;
  };

  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  const macdLine = ema12.map((e, i) => e - ema26[i]);
  const signalLine = ema(macdLine, 9);
  const histogram = macdLine.map((m, i) => m - signalLine[i]);

  const latest = {
    macd: macdLine[macdLine.length - 1],
    signal: signalLine[signalLine.length - 1],
    histogram: histogram[histogram.length - 1],
  };

  let cross = "neutral";
  if (latest.macd > latest.signal && latest.histogram > 0) cross = "bullish";
  if (latest.macd < latest.signal && latest.histogram < 0) cross = "bearish";

  return {
    ...latest,
    macdArr: macdLine,
    signalArr: signalLine,
    histogramArr: histogram,
    cross,
  };
}

export function calculateBollingerBands(prices, period = 20, k = 2) {
  if (prices.length < period)
    return { upper: 0, middle: 0, lower: 0, position: "none" };

  const sma = prices.slice(-period).reduce((a, b) => a + b, 0) / period;
  const variance =
    prices
      .slice(-period)
      .map((p) => Math.pow(p - sma, 2))
      .reduce((a, b) => a + b, 0) / period;
  const stddev = Math.sqrt(variance);
  const upper = sma + k * stddev;
  const lower = sma - k * stddev;
  const last = prices[prices.length - 1];

  let position = "middle";
  if (last <= lower) position = "lower";
  else if (last >= upper) position = "upper";

  return { upper, middle: sma, lower, position, last };
}

export function calculateMA(prices, period = 20) {
  if (prices.length < period) return { current: 0, arr: [] };

  const arr = [];
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    arr.push(slice.reduce((a, b) => a + b, 0) / period);
  }

  return { current: arr[arr.length - 1], arr };
}

export function calculateVolumeOscillator(volumes, period = 20) {
  if (!volumes || volumes.length < period) return { latestRatio: 1, arr: [] };

  const avg = volumes.slice(-period).reduce((a, b) => a + b, 0) / period;
  const latestVolume = volumes[volumes.length - 1];

  return { latestRatio: latestVolume / avg, avg, latestVolume };
}

export function calculateAllIndicators(prices, volumes = []) {
  return {
    rsi: calculateRSI(prices),
    macd: calculateMACD(prices),
    bb: calculateBollingerBands(prices),
    ma: {
      short: calculateMA(prices, 20),
      long: calculateMA(prices, 60),
    },
    volume: calculateVolumeOscillator(volumes, 20),
  };
}
