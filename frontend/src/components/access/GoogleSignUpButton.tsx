import type { Account } from '../../api/session'
import { GoogleButton } from './GoogleButton'
import { GoogleSignUpFeedback } from './GoogleSignUpFeedback'
import { useGoogleSignUp } from './useGoogleSignUp'
import styles from './Access.module.css'

type GoogleSignUpButtonProps = {
  onSignedIn: (account: Account) => void
}

/** "Registrarse con Google" for diners (US-58): creates the account and signs it in. */
export function GoogleSignUpButton({ onSignedIn }: GoogleSignUpButtonProps) {
  const signUp = useGoogleSignUp(onSignedIn)

  return (
    <div className={styles.google}>
      <GoogleButton
        text="signup_with"
        onCredential={(credential) => signUp.createAccount(credential)}
      />
      <GoogleSignUpFeedback signUp={signUp} />
    </div>
  )
}
