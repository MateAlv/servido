import { useId, type ComponentProps, type ReactNode } from 'react'

import styles from './Checkbox.module.css'

type CheckboxProps = Omit<ComponentProps<'input'>, 'id' | 'type'> & {
  label: ReactNode
  id?: string
}

export function Checkbox({ label, id, ...props }: CheckboxProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className={styles.field}>
      <input {...props} id={inputId} type="checkbox" className={styles.input} />
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
    </div>
  )
}
