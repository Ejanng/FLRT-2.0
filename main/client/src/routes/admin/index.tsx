import { createFileRoute } from '@tanstack/react-router'
import AdminAuth from '@/components/adminAuth'

export const Route = createFileRoute('/admin/')({
  component: AdminAuth,
})  