export const formatNumber = (num: number, fixedNum = 1) => {
    const n = Math.abs(num)
    if(n >= 1000000) return (num / 1000000).toFixed(fixedNum).replace(`.${"0".repeat(fixedNum)}`, "") + "M"
    if(n >= 1000) return (num / 1000).toFixed(fixedNum).replace(`.${"0".repeat(fixedNum)}`, "") + "K"
    return `${num}`
}