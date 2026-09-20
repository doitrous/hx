import { useState, type FormEvent } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input, Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { client } from '@/lib/client'
import { ApiError } from '@/lib/api'
import type { Patient } from '@/lib/types'

/** Name/sex/birth year only — MRN is immutable once a patient exists (see api.patients.update's type). */
export function EditPatientDialog({
  patient,
  onClose,
  onSaved,
}: {
  patient: Patient
  onClose: () => void
  onSaved: (patient: Patient) => void
}) {
  const [name, setName] = useState(patient.name ?? '')
  const [sex, setSex] = useState<'M' | 'F' | ''>(patient.sex ?? '')
  const [birthYear, setBirthYear] = useState(patient.birthYear ? String(patient.birthYear) : '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const updated = await client.patients.update(patient.id, {
        name: name.trim() || undefined,
        sex: sex || undefined,
        birthYear: birthYear ? Number(birthYear) : undefined,
      })
      onSaved(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog onClose={onClose} label="Edit patient details">
      <form onSubmit={onSubmit} className="flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <h3 className="font-serif text-[19px] font-semibold text-ink">Edit patient details</h3>
          <p className="mt-1 text-[12.5px] text-ink-3">
            MRN <span className="font-mono text-ink-2">{patient.mrn}</span> cannot be changed here.
          </p>
        </div>
        {error && (
          <p className="text-[12.5px] text-danger" role="alert">
            {error}
          </p>
        )}
        <Field label="Name" htmlFor="ep-name" hint="Stored only in your database. Never sent to the AI.">
          <Input id="ep-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sex" htmlFor="ep-sex">
            <Select id="ep-sex" value={sex} onChange={(e) => setSex(e.target.value as 'M' | 'F' | '')}>
              <option value="">Not stored</option>
              <option value="F">F</option>
              <option value="M">M</option>
            </Select>
          </Field>
          <Field label="Birth year" htmlFor="ep-year">
            <Input
              id="ep-year"
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
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
