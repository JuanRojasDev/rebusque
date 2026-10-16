#!/usr/bin/env bash
# Publica Rebusque (build estático) en S3 privado + CloudFront con OAC.
# Uso:  bash scripts/deploy-aws.sh        (desde juego-web/, después de `npm run build`)
# La primera vez crea bucket, OAC y distribución; las siguientes solo sube y invalida.
set -euo pipefail
# en Git Bash (Windows) evita que "/index.html" se convierta en una ruta de Windows
export MSYS_NO_PATHCONV=1

PROFILE="${AWS_PROFILE_NAME:-Inventio}"
REGION="us-east-1"
STATE=".deploy.env"
AWS="aws --profile $PROFILE --region $REGION"
# la CLI de Windows responde con CRLF: se limpia todo lo que se captura
q() { $AWS "$@" | tr -d '\015'; }
[ -d dist ] || { echo "Falta dist/: corre npm run build primero"; exit 1; }
[ -f "$STATE" ] && . "./$STATE"

# ---------- bucket privado ----------
if [ -z "${BUCKET:-}" ]; then
  BUCKET="rebusque-web-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')"
  echo "BUCKET=$BUCKET" >> "$STATE"
fi
if ! $AWS s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "Creando bucket $BUCKET"
  $AWS s3api create-bucket --bucket "$BUCKET" >/dev/null
  $AWS s3api put-public-access-block --bucket "$BUCKET" \
    --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  $AWS s3api put-bucket-encryption --bucket "$BUCKET" \
    --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  $AWS s3api put-bucket-tagging --bucket "$BUCKET" --tagging 'TagSet=[{Key=Project,Value=rebusque},{Key=Env,Value=demo}]'
fi

# ---------- subir archivos ----------
echo "Subiendo dist/ a s3://$BUCKET"
$AWS s3 sync dist "s3://$BUCKET" --delete --exclude index.html --exclude favicon.svg \
  --cache-control "public,max-age=31536000,immutable" --only-show-errors
$AWS s3 cp dist/favicon.svg "s3://$BUCKET/favicon.svg" --cache-control "public,max-age=3600" --content-type image/svg+xml --only-show-errors
$AWS s3 cp dist/index.html "s3://$BUCKET/index.html" --cache-control "no-cache" --content-type "text/html; charset=utf-8" --only-show-errors

# ---------- OAC ----------
if [ -z "${OAC_ID:-}" ]; then
  OAC_ID=$(q cloudfront create-origin-access-control --origin-access-control-config \
    "Name=rebusque-oac-$BUCKET,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
    --query OriginAccessControl.Id --output text)
  echo "OAC_ID=$OAC_ID" >> "$STATE"
fi

# ---------- distribución ----------
if [ -z "${DIST_ID:-}" ]; then
  echo "Creando distribución CloudFront"
  CFG=$(mktemp ./.cf-XXXXXX.json)
  cat > "$CFG" <<JSON
{
  "CallerReference": "rebusque-$(date +%s)",
  "Comment": "Rebusque - juego web (demo)",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "PriceClass": "PriceClass_100",
  "HttpVersion": "http2and3",
  "IsIPV6Enabled": true,
  "Origins": { "Quantity": 1, "Items": [{
    "Id": "s3-rebusque",
    "DomainName": "$BUCKET.s3.$REGION.amazonaws.com",
    "OriginAccessControlId": "$OAC_ID",
    "S3OriginConfig": { "OriginAccessIdentity": "" }
  }]},
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-rebusque",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"], "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] } },
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "ResponseHeadersPolicyId": "67f7725c-6f97-4210-82d7-5512b31e9d03"
  },
  "CustomErrorResponses": { "Quantity": 1, "Items": [{ "ErrorCode": 403, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 10 }] }
}
JSON
  read -r DIST_ID DIST_ARN < <(q cloudfront create-distribution --distribution-config "file://$CFG" --query "Distribution.[Id,ARN]" --output text)
  rm -f "$CFG"
  echo "DIST_ID=$DIST_ID" >> "$STATE"
  echo "DIST_ARN=$DIST_ARN" >> "$STATE"
  $AWS cloudfront tag-resource --resource "$DIST_ARN" --tags 'Items=[{Key=Project,Value=rebusque},{Key=Env,Value=demo}]'

  # solo esta distribución puede leer el bucket
  POL=$(mktemp ./.pol-XXXXXX.json)
  cat > "$POL" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "SoloCloudFront",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET/*",
    "Condition": { "StringEquals": { "AWS:SourceArn": "$DIST_ARN" } }
  }]
}
JSON
  $AWS s3api put-bucket-policy --bucket "$BUCKET" --policy "file://$POL"
  rm -f "$POL"
else
  $AWS cloudfront create-invalidation --distribution-id "$DIST_ID" --paths /index.html >/dev/null
fi

DOMAIN=$(q cloudfront get-distribution --id "$DIST_ID" --query Distribution.DomainName --output text)
STATUS=$(q cloudfront get-distribution --id "$DIST_ID" --query Distribution.Status --output text)
echo "Listo: https://$DOMAIN  (estado: $STATUS)"
