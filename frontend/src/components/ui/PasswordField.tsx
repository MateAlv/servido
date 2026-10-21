import { useState, type ComponentProps } from 'react'

import { IconEye, IconEyeOff } from './icons'
import { TextField } from './TextField'
import styles from './PasswordField.module.css'

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, 'type' | 'action'>

/** A password input with a button that shows or hides what was typed. Starts hidden. */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      action={
        <button
          type="button"
          className={styles.toggle}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <IconEyeOff size={20} /> : <IconEye size={20} />}
        </button>
      }
    />
  )
}
