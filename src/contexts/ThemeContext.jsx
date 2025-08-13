// src/contexts/ThemeContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    const [dark, setDark] = useState(false)

    // 로컬 스토리지에서 테마 설정 로드
    useEffect(() => {
        const savedTheme = localStorage.getItem('cryptowise-theme')
        if (savedTheme === 'dark') {
            setDark(true)
            document.documentElement.classList.add('dark')
        }
    }, [])

    const toggle = () => {
        const newDark = !dark
        setDark(newDark)

        if (newDark) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('cryptowise-theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('cryptowise-theme', 'light')
        }
    }

    return (
        <ThemeContext.Provider value={{ dark, toggle }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider')
    }
    return context
}
