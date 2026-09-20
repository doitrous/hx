import { PageHeader } from '@/components/ui/PageHeader'
import { ButtonLink } from '@/components/ui/Button'

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <PageHeader title="Page not found" description="That page doesn't exist." />
      <ButtonLink to="/" variant="tinted">
        Back home
      </ButtonLink>
    </div>
  )
}
