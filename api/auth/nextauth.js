// pages/api/auth/[...nextauth].js

import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { supabase } from '../../../lib/supabase'

export default NextAuth({
  providers: [
    // 1. 이메일/패스워드 로그인
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "패스워드", type: "password" }
      },
      async authorize(credentials) {
        try {
          // Supabase에서 사용자 확인
          const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', credentials.email)
            .single()

          if (error || !user) {
            return null
          }

          // 패스워드 검증 (실제 서비스에선 해시 비교 필요)
          if (user.password === credentials.password) {
            return {
              id: user.id,
              name: user.display_name,
              email: user.email,
              provider: 'credentials'
            }
          }

          return null
        } catch (error) {
          console.error('인증 에러:', error)
          return null
        }
      }
    }),
    
    // 2. Google OAuth 로그인
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  
  secret: process.env.NEXTAUTH_SECRET,
  
  session: {
    strategy: 'jwt'
  },
  
  callbacks: {
    async signIn({ user, account, profile }) {
      // Google 로그인시 Supabase에 사용자 정보 저장
      if (account.provider === 'google') {
        try {
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .single()

          if (!existingUser) {
            // 새 Google 사용자를 Supabase에 저장
            await supabase
              .from('users')
              .insert([
                {
                  email: user.email,
                  display_name: user.name,
                  avatar_url: user.image,
                  provider: 'google'
                }
              ])
          }
        } catch (error) {
          console.error('Google 사용자 저장 에러:', error)
        }
      }
      return true
    },
    
    async session({ session, token }) {
      // 세션에 추가 정보 포함
      session.user.id = token.sub
      return session
    },
    
    async jwt({ token, account, profile }) {
      // JWT 토큰에 추가 정보 포함
      if (account) {
        token.provider = account.provider
      }
      return token
    }
  },
  
  pages: {
    signIn: '/login' // 커스텀 로그인 페이지
  }
})
