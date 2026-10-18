#!/usr/bin/env bash
# Updates the app on the instance to a git ref (branch or commit): rebuilds the images and
# restarts what changed. Migrations run when the API starts.
# Run by the Deploy workflow through SSM Run Command, or by hand from a Session Manager shell:
#   sudo /opt/servido/infra/ec2/deploy.sh main
set -euo pipefail

# Everything runs inside main() because the checkout below can replace this very file.
main() {
  local ref="${1:-main}"
  # shellcheck source=/dev/null
  source /etc/servido.env

  cd /opt/servido
  git fetch --quiet origin "$ref"
  git checkout --quiet --force FETCH_HEAD

  (
    umask 077
    printf 'POSTGRES_PASSWORD=%s\n' "$(aws ssm get-parameter --region "$AWS_REGION" \
      --name "$PARAMETER_PREFIX/postgres-password" --with-decryption \
      --query Parameter.Value --output text)" > infra/ec2/.env
  )

  docker compose -f infra/ec2/compose.yml up --detach --build --remove-orphans
  docker image prune --force > /dev/null
  docker builder prune --force --filter until=168h > /dev/null
  echo "Deployed $(git rev-parse --short HEAD)"
}

main "$@"
exit
