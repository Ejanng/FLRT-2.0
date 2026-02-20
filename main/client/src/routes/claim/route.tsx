import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'
import Claimant from '../../components/Claimant'

export const Route = createFileRoute('/claim')({
  component: RouteComponent,
})

function RouteComponent() {
  const matchRoute = useMatchRoute()
  const isClaimForm = matchRoute({ to: '/claim/claimForm' })

  return (
    <>
      {!isClaimForm && <Claimant />}
      <Outlet />
    </>
  )
}