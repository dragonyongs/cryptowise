// src/App.jsx (리팩토링 후)
import { AuthProvider } from '@/hooks/useAuth'
import AppRouter from '@/components/AppRouter'
import { ThemeProvider } from '@/contexts/ThemeContext'

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </AuthProvider>
  )
}