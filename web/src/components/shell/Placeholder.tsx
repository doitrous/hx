import { Construction } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from '@/components/ui/Panel'

/** A screen not yet built. Names who builds it, so nobody mistakes this for the real page. */
export function Placeholder({ title, description, builtBy }: { title: string; description?: string; builtBy: string }) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={title} description={description} />
      <Panel>
        <EmptyState icon={Construction} title="Not built yet" description={builtBy} />
      </Panel>
    </div>
  )
}
