import { redirect } from '@tanstack/react-router'

export const getAdminToken = () => localStorage.getItem('admin_token')

export const isJwtExpired = (token: string): boolean => {
  try {
    const base64Payload = token.split('.')[1]
    if (!base64Payload) return true

    const payloadJson = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson)
    const exp = payload?.exp

    if (!exp || typeof exp !== 'number') return true

    const nowSeconds = Math.floor(Date.now() / 1000)
    return exp <= nowSeconds
  } catch {
    return true
  }
}

export const hasValidAdminSession = (): boolean => {
  const token = getAdminToken()
  if (!token) return false
  return !isJwtExpired(token)
}

export const requireAdminAuth = () => {
  if (!hasValidAdminSession()) {
    localStorage.removeItem('admin_token')
    throw redirect({ to: '/admin' })
  }
}
