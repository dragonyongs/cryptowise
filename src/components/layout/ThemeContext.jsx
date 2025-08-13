// src/contexts/ThemeContext.jsx
import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    const [dark, setDark] = useState(false)

    const toggle = () => {
        setDark(!dark)
        document.documentElement.classList.toggle('dark')
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
