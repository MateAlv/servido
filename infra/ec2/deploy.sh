#!/usr/bin/env bash
# Updates the app on the instance to a git ref (branch or commit): rebuilds the images and
# restarts what changed. Migrations run when the API starts.
# Run by the Deploy workflow through SSM Run Command, or by hand from a Session Manager shell:
#   sudo /opt/servido/infra/ec2/deploy.sh main
set -euo pipefail

parameter() {
  aws ssm get-parameter --region "$AWS_REGION" --name "$PARAMETER_PREFIX/$1" \
    --with-decryption --query Parameter.Value --output text
}

# Everything runs inside main() because the checkout below can replace this very file.
main() {
  local ref="${1:-main}"
  # shellcheck source=/dev/null
  source /etc/servido.env

  cd /opt/servido
  if [ "${SERVIDO_CHECKED_OUT:-}" != 1 ]; then
    git fetch --quiet origin "$ref"
    git checkout --quiet --force FETCH_HEAD
    # Continue with the version of this script that was just checked out.
    SERVIDO_CHECKED_OUT=1 exec infra/ec2/deploy.sh "$ref"
  fi

  (
    umask 077
    {
      printf 'POSTGRES_PASSWORD=%s\n' "$(parameter postgres-password)"
      printf 'JWT_SECRET=%s\n' "$(parameter jwt-secret)"
      # Optional: while it exists, mail goes through the team's Gmail instead of SES.
      if smtp_password="$(parameter smtp-password 2> /dev/null)"; then
        printf 'MAIL_BACKEND=smtp\nSMTP_PASSWORD=%s\n' "$smtp_password"
      fi
      # Optional: Mercado Pago's test credentials turn on electronic payment (spec 032).
      if mp_token="$(parameter mercadopago-access-token 2> /dev/null)" &&
        mp_key="$(parameter mercadopago-public-key 2> /dev/null)"; then
        printf 'MERCADOPAGO_ACCESS_TOKEN=%s\nMERCADOPAGO_PUBLIC_KEY=%s\n' "$mp_token" "$mp_key"
      fi
    } > infra/ec2/.env
  )

  docker compose -f infra/ec2/compose.yml up --detach --build --remove-orphans
  docker image prune --force > /dev/null
  docker builder prune --force --filter until=168h > /dev/null
  echo "Deployed $(git rev-parse --short HEAD)"
}

main "$@"
exit
