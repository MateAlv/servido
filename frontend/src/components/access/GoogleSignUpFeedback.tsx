import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { Button, TextField } from '../ui'
import { NAME_MISSING, type GoogleSignUp } from './useGoogleSignUp'
import styles from './Access.module.css'

/** What happened with the sign-up: the missing-name field, or the error. */
export function GoogleSignUpFeedback({ signUp }: { signUp: GoogleSignUp }) {
  const [nombre, setNombre] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void signUp.completeWithName(nombre)
  }

  if (signUp.needsName) {
    return (
      <form className={styles.form} onSubmit={submit} noValidate>
        <p>{NAME_MISSING}</p>
        <TextField
          label="Tu nombre *"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          autoComplete="name"
          required
          error={signUp.error}
        />
        <Button type="submit" fullWidth loading={signUp.loading}>
          Terminar de crear mi cuenta
        </Button>
      </form>
    )
  }
  if (!signUp.error) return null
  return (
    <p className={styles.error} role="alert">
      {signUp.error}
      {signUp.emailTaken && (
        <>
          {' '}
          <Link to="/ingresar?rol=comensal">Ir a ingresar</Link>
        </>
      )}
    </p>
  )
}
