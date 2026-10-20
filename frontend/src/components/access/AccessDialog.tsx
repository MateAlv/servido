import { useState } from 'react'
import { useNavigate } from 'react-router'

import type { Account } from '../../api/session'
import { Modal, SegmentedControl } from '../ui'
import { AccessForm } from './AccessForm'
import { ACCOUNT_ROLE_OPTIONS, registerPathFor, type AccountRole } from './roles'
import styles from './Access.module.css'

type AccessDialogProps = {
  open: boolean
  initialRole: AccountRole
  onClose: () => void
  onSignedIn: (account: Account) => void
}

/** The "Ingresar" popup: pick the kind of account, then sign in or register. */
export function AccessDialog({ open, initialRole, onClose, onSignedIn }: AccessDialogProps) {
  const navigate = useNavigate()
  const [role, setRole] = useState(initialRole)

  return (
    <Modal open={open} onClose={onClose} title="Ingresá a tu cuenta">
      <SegmentedControl
        label="Tipo de cuenta"
        options={ACCOUNT_ROLE_OPTIONS}
        value={role}
        onChange={setRole}
        className={styles.selector}
      />
      <AccessForm
        key={role}
        role={role}
        onSignedIn={(account) => {
          onClose()
          onSignedIn(account)
        }}
        onRegister={() => {
          onClose()
          navigate(registerPathFor(role))
        }}
      />
    </Modal>
  )
}