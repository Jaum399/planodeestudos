param(
  [Parameter(Mandatory = $false)]
  [string]$Repo = "Jaum399/planodeestudos",

  [Parameter(Mandatory = $true)]
  [string]$P12Path,

  [Parameter(Mandatory = $true)]
  [string]$P12Password,

  [Parameter(Mandatory = $true)]
  [string]$ProvisionProfilePath,

  [Parameter(Mandatory = $true)]
  [string]$KeychainPassword,

  [Parameter(Mandatory = $true)]
  [string]$AppleTeamId,

  [Parameter(Mandatory = $false)]
  [string]$AppStoreKeyId,

  [Parameter(Mandatory = $false)]
  [string]$AppStoreIssuerId,

  [Parameter(Mandatory = $false)]
  [string]$AppStorePrivateKeyPath
)

$ErrorActionPreference = "Stop"

function To-Base64NoWrap {
  param([Parameter(Mandatory = $true)][string]$FilePath)
  if (-not (Test-Path -LiteralPath $FilePath)) {
    throw "Arquivo nao encontrado: $FilePath"
  }
  $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $FilePath))
  return [System.Convert]::ToBase64String($bytes)
}

Write-Host "Validando GitHub CLI..."
$null = gh --version
$null = gh auth status

Write-Host "Convertendo certificado e provisioning profile para Base64..."
$p12B64 = To-Base64NoWrap -FilePath $P12Path
$profileB64 = To-Base64NoWrap -FilePath $ProvisionProfilePath

Write-Host "Enviando secrets obrigatorios para $Repo..."
$p12B64 | gh secret set IOS_CERTIFICATE_P12_BASE64 -R $Repo --body -
$P12Password | gh secret set IOS_CERTIFICATE_PASSWORD -R $Repo --body -
$profileB64 | gh secret set IOS_PROVISION_PROFILE_BASE64 -R $Repo --body -
$KeychainPassword | gh secret set KEYCHAIN_PASSWORD -R $Repo --body -
$AppleTeamId | gh secret set APPLE_TEAM_ID -R $Repo --body -

if ($AppStoreKeyId -and $AppStoreIssuerId -and $AppStorePrivateKeyPath) {
  Write-Host "Configurando secrets opcionais do App Store Connect..."
  $ascP8B64 = To-Base64NoWrap -FilePath $AppStorePrivateKeyPath
  $AppStoreKeyId | gh secret set APPSTORE_KEY_ID -R $Repo --body -
  $AppStoreIssuerId | gh secret set APPSTORE_ISSUER_ID -R $Repo --body -
  $ascP8B64 | gh secret set APPSTORE_PRIVATE_KEY_BASE64 -R $Repo --body -
} else {
  Write-Host "Secrets opcionais APPSTORE_* nao enviados (TestFlight automatico sera pulado)."
}

Write-Host "Concluido. Secrets configurados com sucesso."