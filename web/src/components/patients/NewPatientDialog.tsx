import { useState, type FormEvent } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input, Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { client } from '@/lib/client'
import { ApiError } from '@/lib/api'
import type { Patient } from '@/lib/types'

/** MRN + optional name/sex/birth year. Surfaces the server's 409 verbatim on a duplicate MRN. */
export function NewPatientDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (patient: Patient) => void }) {
  const [mrn, setMrn] = useState('')
  const [name, setName] = useState('')
  const [sex, setSex] = useState<'M' | 'F' | ''>('')
  const [birthYear, setBirthYear] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = mrn.trim()
    if (!trimmed) {
      setError('MRN is required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const patient = await client.patients.create({
        mrn: trimmed,
        name: name.trim() || undefined,
        sex: sex || undefined,
        birthYear: birthYear ? Number(birthYear) : undefined,
      })
      onCreated(patient)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog onClose={onClose} label="New patient">
      <form onSubmit={onSubmit} className="flex flex-col gap-4 p-5 sm:p-6">
        <h3 className="font-serif text-[19px] font-semibold text-ink">New patient</h3>
        <Field label="MRN" htmlFor="np-mrn" error={error ?? undefined} hint={error ? undefined : 'Required, unique in your panel'}>
          <Input
            id="np-mrn"
            autoFocus
            required
            invalid={!!error}
            value={mrn}
            onChange={(e) => setMrn(e.target.value)}
            placeholder="DEMO-0013"
          />
        </Field>
        <Field label="Name" htmlFor="np-name" hint="Stored only in your database. Never sent to the AI.">
          <Input id="np-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sex" htmlFor="np-sex">
            <Select id="np-sex" value={sex} onChange={(e) => setSex(e.target.value as 'M' | 'F' | '')}>
              <option value="">Not stored</option>
              <option value="F">F</option>
              <option value="M">M</option>
            </Select>
          </Field>
          <Field label="Birth year" htmlFor="np-year">
            <Input
              id="np-year"
              type="number"
              inputMode="numeric"
              min={1900}
              max={new Date().getFullYear()}
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Add patient
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
